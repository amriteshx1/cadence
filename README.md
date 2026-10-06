# Cadence

End-to-end email scheduler. A campaign is accepted over HTTP, persisted in PostgreSQL, and executed later as BullMQ delayed jobs. Delivery goes through Ethereal SMTP. A React dashboard is the operator surface.

Send time is not computed by OS cron, `node-cron`, Agenda, or by polling the database. Each email row stores `scheduledAt`. The same instant is the delay on a BullMQ job in Redis.

## Repository

npm workspaces:

| Path | Role |
|---|---|
| `backend/` | Express API, Prisma schema, BullMQ workers |
| `frontend/` | Vite + React dashboard |
| `docker-compose.yml` | PostgreSQL 16, Redis 7, Elasticsearch 8 |

Root scripts delegate with `npm run <script> -w backend` or `-w frontend`.

## Local setup

Compose publishes Postgres and Redis on non-default host ports so they do not collide with a local install on `5432` / `6379`. Inside the containers the services still listen on `5432` and `6379`.

| Service | Host port | Notes |
|---|---|---|
| PostgreSQL 16 | `5433` | User, password, and database are set in `docker-compose.yml`. `DATABASE_URL` in `.env.example` must match. |
| Redis 7 | `6380` | AOF (`everysec`) plus an RDB snapshot (`save 60 1`). Holds queues, sessions, and rate-limit counters. |
| Elasticsearch 8.15 | `9200` | Single-node, security disabled. Search falls back to Postgres if this process is down. |

```bash
npm install
cp .env.example backend/.env
# set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
# optional Slack: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_CALLBACK_URL
# optional: cp frontend/.env.example frontend/.env   # VITE_API_URL, default http://localhost:3001

docker compose up -d
# or: npm run docker:up

cd backend && npx prisma migrate deploy && cd ..
```

Prisma reads `backend/.env`. The API also loads `backend/.env` and, if present, a repo-root `.env`.

Google OAuth is required to sign in. Register `http://localhost:3001/auth/google/callback` as an authorized redirect URI and set `GOOGLE_CALLBACK_URL` to that same URL. Slack OAuth is optional. Empty `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` disables Connect Slack; a rate-limit hit then skips notification instead of failing the send.

Three processes:

```bash
npm run dev          # Express API — http://localhost:3001
npm run dev:worker   # BullMQ workers: email-send, search-index, slack-notify
npm run dev:web      # Vite — http://localhost:5173
```

`WORKER_ENABLED` defaults to `false`, so the API process does not consume jobs. Set it to `true` only when one Node process should both serve HTTP and run workers. The dedicated worker (`src/worker.ts`) always starts workers, then runs `reconcileScheduledEmails`.

The dashboard calls the API with `credentials: "include"`. `VITE_API_URL` is the API origin (default `http://localhost:3001`).

## HTTP API

JSON error bodies use `{ error: { code, message, details? } }`. Authenticated routes require the `sid` session. Request JSON is limited to 2 MB. Campaign file uploads (multer, memory storage) are limited to 5 MB.

| Method | Path | Auth | Behavior |
|---|---|---|---|
| `GET` | `/health` | no | Process liveness. `{ status: "ok" }`. |
| `GET` | `/ready` | no | `200` when Postgres and Redis answer. Elasticsearch is reported in `checks` and does not fail readiness. `503` if Postgres or Redis is down. |
| `GET` | `/auth/google` | no | Stores an OAuth `state` on the session and redirects to Google. |
| `GET` | `/auth/google/callback` | no | Checks `state`, upserts the user, bootstraps senders, redirects to `{FRONTEND_URL}/dashboard`. |
| `GET` | `/auth/me` | session | `{ user }` or `401`. |
| `POST` | `/auth/logout` | session | Destroys the Redis session and clears `sid`. `204`. |
| `GET` | `/auth/slack` | session | Redirects to Slack OAuth when Slack is configured. |
| `GET` | `/auth/slack/callback` | no | Stores the incoming webhook, redirects to the dashboard. |
| `GET` | `/api/slack/status` | session | Connection status plus `configured`. |
| `DELETE` | `/api/slack` | session | Removes the Slack connection. `204`. |
| `GET` | `/api/senders` | session | Senders for the current user. SMTP passwords are omitted. |
| `GET` | `/api/campaigns` | session | Campaigns for the current user. |
| `POST` | `/api/campaigns` | session | Creates a campaign. `201`. |
| `GET` | `/api/emails` | session | Paginated list. Query `status`: `scheduled` (includes `sending`), `sending`, `sent` (includes `failed`), or `failed`. Default `limit` 50, max 100. |
| `GET` | `/api/emails/search` | session | Search by recipient, subject, and body. Response header `X-Search-Source` is `elasticsearch` or `postgres`. |
| `POST` | `/api/emails/reindex` | session | Enqueues an index job for each of the user's emails. |
| `GET` | `/admin/queues` | session | Bull Board, read-only, for `email-send`, `search-index`, and `slack-notify`. HTML requests without a session redirect to `{FRONTEND_URL}/login`. |

`POST /api/campaigns` accepts `multipart/form-data` or JSON:

- `subject` (1–500), `body` (1–50_000)
- `startAt`, `delayMs`, `hourlyLimit`
- optional `senderId` (defaults to the user's default sender)
- leads as a file, a `leads` array (or newline-separated string), or `leadsText`

Lead parsing lowercases addresses, drops invalid rows, and drops in-file duplicates. The response includes `skippedInvalid` and `skippedDuplicate`. Zero valid addresses is `400 NO_VALID_LEADS`. More than `MAX_LEADS_PER_CAMPAIGN` is rejected. `(campaignId, toEmail)` is unique in Postgres.

## Data model

Prisma models in `backend/prisma/schema.prisma`:

- **User** — Google subject, email, name, avatar. Owns senders, campaigns, emails, and at most one Slack connection.
- **Sender** — SMTP credentials for Ethereal. `smtpPass` is stored and never returned by the public sender JSON. Three senders are created on first login (`SENDER_COUNT`). If `ETHEREAL_USER` and `ETHEREAL_PASS` are unset, each sender is a `nodemailer.createTestAccount()` mailbox. If they are set, all three share that mailbox on `ETHEREAL_HOST`:`ETHEREAL_PORT` (default `smtp.ethereal.email:587`).
- **Campaign** — subject, body, `startAt`, `delayMs`, `hourlyLimit`, `leadCount`, status `scheduled | sending | completed | failed`.
- **Email** — one recipient. Status `scheduled | sending | sent | failed`. Stores `scheduledAt`, `sentAt`, `failedAt`, `providerMessageId`, Ethereal `previewUrl`, `failureReason`, and `attempts`.
- **SlackConnection** — team, access token, incoming-webhook URL and channel. One row per user.

Email indexes: `(userId, status, scheduledAt)`, `(userId, status, sentAt)`, `(senderId, scheduledAt)`, `(status, scheduledAt)`.

## Processes and queues

| Queue | Job name | Job id | Attempts | Backoff |
|---|---|---|---|---|
| `email-send` | `send` | `send-<emailId>` | 5 | exponential, 2s |
| `search-index` | `upsert` | `index-<emailId>-<op>-<timestamp>` | 10 | exponential, 1s |
| `slack-notify` | `rate-limit` | `slack-<userId>-<senderId>-<utcHour>` | 3 | exponential, 2s |

All three use `BULLMQ_PREFIX` (default `bull`). Send jobs are added in bulk chunks of 250. A duplicate `send-<emailId>` is rejected by BullMQ. A duplicate Slack job id for the same user, sender, and UTC hour is ignored.

`email-send` concurrency is `WORKER_CONCURRENCY` (default 5). Lock duration is `WORKER_LOCK_DURATION_MS` (default 30s). Stalled check interval is half the lock duration (minimum 500ms), with `maxStalledCount` 2. `slack-notify` concurrency is 2.

Bull Board adapters are read-only. Completed send jobs are retained up to 200; failed send jobs up to 1_000.

## Scheduling and rate limits

BullMQ's built-in limiter is queue-global. It cannot spill overflow into the next hour while keeping a per-sender gap. Cadence enforces both with Postgres at schedule time and a Redis Lua script at send time.

Defaults from `backend/src/config/env.ts`:

| Variable | Default | Effect |
|---|---|---|
| `WORKER_CONCURRENCY` | `5` | Parallel `email-send` jobs per worker process |
| `MIN_INTER_EMAIL_MS` | `2000` | Minimum gap between sends for one sender. Campaign `delayMs` is raised to this floor at send time. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Hard per-sender cap. Campaign `hourlyLimit` is lowered to this ceiling. |
| `MAX_EMAILS_PER_HOUR` | `1000` | Global cap across senders, UTC hour |
| `MAX_LEADS_PER_CAMPAIGN` | `5000` | Reject larger lead lists |
| `WORKER_LOCK_DURATION_MS` | `30000` | BullMQ lock; also the age after which a stuck `sending` row can be taken over |

Hour buckets are UTC (`YYYY-MM-DDTHH`).

**At create time (`packSlots`).** Existing `scheduled` and `sending` rows for that sender, and globally, are counted per UTC hour. Leads are placed from `max(startAt, now)` using `delayMs`, the sender cap, and the global cap. A full hour jumps the cursor to the next hour boundary. If the pack would pass a 48-hour horizon, the API returns `400 SCHEDULE_HORIZON` and writes nothing. Campaign create holds `lock:alloc:<senderId>` (20s, NX) so two packs for the same sender cannot overlap. Contention returns `409 SENDER_BUSY`.

**At send time (`tryAcquireSendPermit`).** One Lua script checks, in order:

1. `permit:<emailId>` — if it already exists, the attempt is a retry and does not increment the hour again.
2. `lastsend:<senderId>` — if `now - last < MIN_INTER_EMAIL_MS`, the job is not sent.
3. `rl:s:<senderId>:<utcHour>` and `rl:g:<utcHour>` — if either counter is at its cap, the job is not sent.

On success the script sets `lastsend`, increments both hourly counters (first increment sets a 3-hour TTL), decrements `gap:s:<senderId>:<utcHour>` when a schedule reservation exists, and writes `permit:<emailId>` with a 3-hour TTL. The counters live in Redis, so several worker processes share one view.

**Minimum-delay miss.** `job.moveToDelayed(now + waitMs)`. The job is not failed and the row stays open.

**Hourly-cap miss (`reserveNextSlot`).** A second Lua script walks the next 48 UTC hours, skipping hours where live counters plus `gap` reservations already fill the sender or global cap. It reserves a slot inside the first open hour (`hourStart + (n - 1) * delayMs`, clamped to that hour), updates `email.scheduledAt`, moves the same job to that time, and enqueues one Slack notification for that user, sender, and hour. The email is not dropped and is not marked `failed` for hitting the cap. `slack-notify` posts the stored incoming webhook when a `SlackConnection` exists; otherwise it no-ops. Connecting Slack later does not require a process restart.

A batch that shares one `startAt` is spread across hours by delay and caps, then enqueued as delayed jobs. Ethereal is a test sink, so the scheduler accepts and spaces a large batch instead of attempting to deliver it in one burst.

Redis counters are the live throttle and expire after about three hours. Postgres remains the record of which emails exist and when they should send. After a Redis flush, counters reset (that hour can admit more sends) while rows and AOF-backed jobs remain.

## Delivery, restarts, and idempotency

Redis AOF plus RDB snapshots keep delayed jobs across a Redis process restart.

On worker boot, `reconcileScheduledEmails` loads every `scheduled` and `sending` row. A missing `send-<emailId>` job is added again with the same id and a delay taken from `scheduledAt`. A job that is already `completed` or `failed` while the row is still open is removed and added again. Rows already `sent` are not replayed. Future mail still fires at the stored time.

Send path in `email-send`:

1. Missing row: skip. `sent`: re-enqueue search index and return. `failed`: return.
2. `sending` with `providerMessageId`, or a Redis `smtp-receipt:<emailId>`: mark `sent` and do not call SMTP again. The receipt TTL is 7 days.
3. If `scheduledAt` is still more than 250ms ahead, `moveToDelayed` back to that time.
4. Acquire the permit. On miss, delay as described above.
5. Compare-and-set `scheduled` → `sending` where `providerMessageId` is null. If that updates zero rows, a `sending` row with no message id and `updatedAt` older than the lock duration may be taken over. Otherwise the worker returns without releasing the permit, so an in-flight send is not double-counted.
6. SMTP via Nodemailer. HTML bodies are detected and also sent as plain text.
7. On accept: write `smtp-receipt:<emailId>` first, then set `sent`, `sentAt`, `providerMessageId`, and Ethereal's `getTestMessageUrl` preview link. Then enqueue `search-index` and refresh campaign status.
8. If the process dies after SMTP and before the row update, the next attempt sees the receipt or `providerMessageId` and does not send again.
9. SMTP failure with no receipt releases the hourly permit, sets the row back to `scheduled` (or `failed` when the attempt budget is spent), increments `attempts`, and rethrows so BullMQ retries. Exhausted jobs are `failed`. `finalizeFailure` will not overwrite a row that already reached `sent`.

`refreshCampaignStatus` recounts the campaign's emails. Any still `scheduled` or `sending` alongside a `sent` or `failed` row sets the campaign to `sending`. If nothing is still open and every row `failed`, the campaign is `failed`. If nothing is still open otherwise, it is `completed` (including a mix of `sent` and `failed`). A campaign that has not finished or failed any row stays `scheduled`.

## Search

The `emails` index is created at API startup and again at worker startup. Failure to reach Elasticsearch is logged; sending does not depend on it.

`search-index` upserts the email document (recipient, subject, plain-text body, status, times, preview URL, failure reason), scoped by `userId`. `GET /api/emails/search` queries Elasticsearch when a ping succeeds, and Postgres `contains` (case-insensitive) when Elasticsearch is down or the query throws. List endpoints always read Postgres. `POST /api/emails/reindex` rebuilds a user's documents through the same queue.

## Auth and sessions

Google OAuth (authorization code, `state` checked against the session). The session cookie name is `sid`, stored in Redis under `sess:`, `httpOnly`, path `/`, `maxAge` 7 days, `rolling: true`, `saveUninitialized: false`. `trust proxy` is on.

Local and test origins use `SameSite=Lax` and `secure=false`. When `NODE_ENV=production`, or when `FRONTEND_URL` is public HTTPS (not `localhost` or `127.0.0.1`), the cookie is `SameSite=None; Secure` so a browser on another origin can send it. CORS allows only the `FRONTEND_URL` origin, with credentials.

Slack uses the `incoming-webhook` OAuth scope, not a bot `chat.postMessage` call.

## Dashboard

Vite, React, TypeScript, Tailwind, TanStack Query. Routes: `/` (landing, or dashboard if a session exists), `/login`, `/dashboard`.

After Google login the sidebar shows name, email, avatar, logout, scheduled and sent counts, compose, Slack connect or disconnect, and a link to Bull Board. Compose collects subject, HTML body, a lead file or pasted text (detected address count), start time, delay in seconds (UI minimum 2), hourly limit, and sender. The scheduled tab lists `scheduled` and `sending` rows and shows scheduled time. The sent tab lists `sent` and `failed` rows. Both show recipient, subject, status, preview link, and failure text. Sidebar counts refetch every 5 seconds. The scheduled table refetches every 5 seconds only while search is empty. Search calls `GET /api/emails/search`. Toasts surface API errors. Every `fetch` sends the session cookie.

## Configuration

Copy `.env.example` to `backend/.env`. Validation is Zod in `backend/src/config/env.ts`; a missing or invalid variable exits the process at startup.

| Variable | Default | Required |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `3001` | |
| `FRONTEND_URL` | `http://localhost:5173` | |
| `API_PUBLIC_URL` | `http://localhost:3001` | |
| `DATABASE_URL` | — | yes |
| `REDIS_URL` | `redis://localhost:6379` (example uses `6380`) | |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | |
| `SESSION_SECRET` | — | yes, at least 16 characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | — | yes |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | empty | no |
| `SLACK_CALLBACK_URL` | `http://localhost:3001/auth/slack/callback` | |
| `WORKER_ENABLED` | `false` | |
| `BULLMQ_PREFIX` | `bull` | |
| `ETHEREAL_USER`, `ETHEREAL_PASS` | empty | no; empty means one Ethereal test account per sender |
| `ETHEREAL_HOST`, `ETHEREAL_PORT` | `smtp.ethereal.email`, `587` | |

Frontend: `VITE_API_URL` (see `frontend/.env.example`).

Compose is optional if `DATABASE_URL`, `REDIS_URL`, and `ELASTICSEARCH_URL` already point at running services. Use the host ports above when they do come from this Compose file.

## Trade-offs

- PostgreSQL via Prisma. MySQL is not supported.
- Elasticsearch is best-effort. `/ready` can return `200` while `checks.elasticsearch` is false. Index jobs retry on their own queue.
- Slack's "this hour" window is the same UTC bucket as the rate-limit counters.
- There is no production SMTP provider. Delivery is Ethereal only.
- Local development is two Node processes (API and worker). `WORKER_ENABLED=true` collapses them into the API process.
- A Redis wipe resets hourly counters. It does not delete Postgres rows. Jobs survive only if AOF or RDB still has them; reconciliation rebuilds missing `send-<emailId>` jobs from open rows.

## Scripts and tests

From the repo root:

```bash
npm run docker:up
npm run docker:down
npm run dev
npm run dev:worker
npm run dev:web
npm run build          # tsc backend, then tsc + vite build frontend
npm run typecheck
npm test               # vitest, backend
npm run db:migrate     # prisma migrate dev
npm run db:generate
```

Backend-only: `npm run test:unit -w backend` (hours, leads, slot allocator, no-cron guard) and `npm run test:int -w backend`.

Integration tests expect the Compose data plane and `backend/.env`, the same as `npm run dev`. There is no lint script.
