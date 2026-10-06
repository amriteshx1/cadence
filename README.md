# Cadence

Cadence is an email scheduler. You sign in, write a campaign (subject, body, a list of recipients, a start time, a delay between emails, and an hourly cap), and each recipient is stored as its own email. Nothing is sent inside that request. The API writes the rows, then puts a delayed job on a queue for each one. When the job wakes up, a worker checks the rate limits and sends the message through Ethereal, which is a fake SMTP inbox meant for testing. The dashboard shows what is still scheduled, what is going out, and what already went.

That sounds ordinary until more than one worker is sending at once, or a process dies after the mail server has already accepted the message. Those cases are what the rest of the system is for. Send times live on the email row (`scheduledAt`) and as the delay on a BullMQ job in Redis. There is no cron, no `node-cron`, no Agenda, and no loop that polls the database looking for due mail. Hourly caps and the minimum gap between sends are enforced in Redis with a Lua script, so two workers cannot spend the same slot. If SMTP succeeds and the process dies before Postgres is updated, the next attempt sees a receipt and does not send the same email again.

## Setup

Postgres and Redis are published on odd host ports so they do not collide with a local install on `5432` and `6379`. Inside the containers they still use `5432` and `6379`.

| Service | Host port | Notes |
|---|---|---|
| PostgreSQL 16 | `5433` | User, password, and database come from `docker-compose.yml`. `DATABASE_URL` in `.env.example` has to match. |
| Redis 7 | `6380` | AOF every second, plus an RDB snapshot. Queues, sessions, and rate-limit counters live here. |
| Elasticsearch 8 | `9200` | Security off. If it is down, search falls back to Postgres. Sending does not need it. |

```bash
npm install
cp .env.example backend/.env
# set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
# Slack is optional: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_CALLBACK_URL
# optional: cp frontend/.env.example frontend/.env   # VITE_API_URL, default http://localhost:3001

docker compose up -d
cd backend && npx prisma migrate deploy && cd ..
```

Prisma reads `backend/.env`. Sign-in is Google OAuth. For local login, register `http://localhost:3001/auth/google/callback` as the redirect URI and put that same URL in `GOOGLE_CALLBACK_URL`. If the Slack client id and secret are empty, Connect Slack is disabled and a rate-limit hit simply does not notify.

You need three processes:

```bash
npm run dev          # API on http://localhost:3001
npm run dev:worker   # workers: email-send, search-index, slack-notify
npm run dev:web      # dashboard on http://localhost:5173
```

The API starts with `WORKER_ENABLED=false`, so sending happens in the worker process. Set `WORKER_ENABLED=true` only if you want the API process to run the workers too. Open `http://localhost:5173` and sign in. The dashboard calls the API with cookies (`credentials: "include"`).

A few routes worth knowing:

- `GET /health` — process is up
- `GET /ready` — Postgres and Redis must answer; Elasticsearch is reported and can be down
- `GET /auth/google` — start Google login
- `POST /api/campaigns` — create a campaign (session, leads as CSV, text, or JSON)
- `GET /admin/queues` — Bull Board, read-only, logged-in session

## How a send actually works

```
React dashboard  --session cookie-->  Express API
                                       |  Postgres: users, senders, campaigns, emails, Slack webhook
                                       |  Redis session store
                                       |  enqueue delayed jobs
                                       v
                                  Redis + BullMQ
                                       |
                          workers (email-send, search-index, slack-notify)
                                       |
                    Ethereal SMTP    Elasticsearch (optional)    Slack webhook
```

Three queues, all on Redis:

| Queue | What it does | Job id |
|---|---|---|
| `email-send` | Sends one email | `send-<emailId>` (stable, so the same email is not queued twice) |
| `search-index` | Copies the row into Elasticsearch | per attempt |
| `slack-notify` | Posts when a sender hits the hourly cap | one per user, sender, and UTC hour |

On first login the API creates three Ethereal senders for that user. If `ETHEREAL_USER` and `ETHEREAL_PASS` are unset, each sender gets its own `createTestAccount()` mailbox. If they are set, all three share that mailbox (`smtp.ethereal.email:587` by default). SMTP passwords are stored and left out of the JSON the dashboard sees. A successful send saves Ethereal’s message id and preview URL; the dashboard links Preview when that URL is there.

Leads can be a CSV, a pasted list, or JSON. Invalid addresses and duplicates in the file are skipped and counted in the response. `(campaignId, toEmail)` is unique. Lists bigger than `MAX_LEADS_PER_CAMPAIGN` (5000) are rejected. Jobs are enqueued in chunks of 250.

## Rate limits

This is not BullMQ’s built-in limiter. That limiter is one number for the whole queue, and it cannot push overflow into the next hour while still keeping a gap between one sender’s emails. The limits below are applied in our own code.

| Variable | Default | What it does |
|---|---|---|
| `WORKER_CONCURRENCY` | `5` | How many `email-send` jobs a worker runs at once |
| `MIN_INTER_EMAIL_MS` | `2000` | Minimum gap between sends for one sender. A campaign’s delay cannot go under this. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Per-sender cap. A campaign’s hourly limit cannot go over this. |
| `MAX_EMAILS_PER_HOUR` | `1000` | Cap across all senders in one UTC hour |
| `MAX_LEADS_PER_CAMPAIGN` | `5000` | Reject bigger lists |
| `WORKER_LOCK_DURATION_MS` | `30000` | BullMQ lock, and how long a stuck `sending` row sits before another worker may take it |

Hour buckets are UTC.

When the campaign is created, `packSlots` looks at mail already `scheduled` or `sending` and lays the new recipients out from the start time using the delay, the sender cap, and the global cap. If that layout would run past 48 hours, the API rejects the campaign and writes nothing. Creating a campaign takes a short Redis lock per sender so two creates cannot pack the same sender at once.

When a job runs, `tryAcquireSendPermit` does the check in one Lua script:

- `permit:<emailId>` — a retry of an email that already holds a permit does not increment the hour again
- `lastsend:<senderId>` — too soon since the last send for this sender
- `rl:s:<senderId>:<utcHour>` and `rl:g:<utcHour>` — sender cap or global cap already full

If the minimum gap has not elapsed, the same job is delayed by the remaining wait. It is not failed and it is not dropped. If the hour is full, `reserveNextSlot` finds the next UTC hour (up to 48 hours ahead) that still has room, updates `scheduledAt`, delays that same job, and enqueues a Slack message. Hitting the cap does not fail the email. If Slack is not connected, the notify job does nothing. Connecting Slack later does not need a restart.

A thousand emails with the same start time are spread across hours by the delay and the caps, then queued as delayed jobs. Ethereal is a test sink, so the point is to accept the batch and space it out, not to deliver thousands of messages at once.

The Redis counters expire after about three hours. They are the live throttle. Postgres is still the record of which emails exist and when they should go out. If Redis is wiped, the counters reset and that hour can let more mail through, but the rows are still there, and delayed jobs survive as long as Redis AOF is intact. Campaign create holds `lock:alloc:<senderId>` so two overlapping packs cannot run for the same sender.

## Crashes and duplicates

Redis is started with AOF (`everysec`) and an RDB snapshot so delayed jobs survive a Redis restart.

When the worker boots, `reconcileScheduledEmails` scans `scheduled` and `sending` rows and puts back any missing `send-<emailId>` job, with the delay taken from `scheduledAt`. If the queue copy is already completed or failed but the row is still open, that job is replaced. Already-`sent` rows are not sent again.

Before SMTP, the row moves from `scheduled` to `sending` with a compare-and-set, so two workers do not both send it. After SMTP accepts, a Redis key `smtp-receipt:<emailId>` is written, and only then is the row marked `sent` with the provider message id. If the process dies in between, the next attempt sees the receipt (or the message id already on the row) and does not call SMTP again.

An SMTP error with no receipt releases the hourly permit and throws, so BullMQ retries (5 attempts, exponential backoff). The row goes back to `scheduled` until the attempts run out, then it is `failed`. A `sending` row with no message id can be taken over after the lock duration. A row that is already `sent` is never marked `failed` afterward.

Search is a separate queue. Emails are indexed into Elasticsearch (`emails`) for recipient, subject, and body. List and search fall back to Postgres if Elasticsearch is down or errors. `/ready` can still return 200 in that case. Index jobs retry on their own; a failed index does not block the send.

## Dashboard

Vite, React, TypeScript, Tailwind. After Google login:

- Sidebar with name, email, avatar, logout, scheduled and sent counts, compose, Slack, and a link to Bull Board.
- Compose: subject, body, file upload or paste, how many addresses were detected, start time, delay in seconds (minimum 2 in the UI), hourly limit, sender.
- Scheduled tab shows `scheduled` and `sending`. Sent tab shows `sent` and `failed`. Columns are recipient, subject, time, status, preview, and the failure text when there is one.
- Scheduled rows and the sidebar counts refresh every 5 seconds. Search goes to Elasticsearch, with Postgres as the fallback. The session cookie is sent on every request.

The session cookie is `sid`, stored in Redis. Locally it is `httpOnly`, `SameSite=Lax`, `secure=false`. In production, or whenever `FRONTEND_URL` is a public `https` origin, it becomes `SameSite=None; Secure` so the dashboard and the API can live on different hosts. CORS allows only `FRONTEND_URL`, with credentials.

Slack, when configured, uses an incoming webhook from OAuth (`incoming-webhook`), not a bot post API. The hour in that message is the same UTC hour as the rate-limit counters.

## Tests

Same Compose services and `backend/.env` as local dev.

```bash
npm test
npm run typecheck
```

`npm run test:unit -w backend` covers hour buckets, lead parsing, slot packing, and a check that the scheduler is not implemented with cron. `npm run test:int -w backend` runs the integration tests.
