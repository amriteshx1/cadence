const type = "Inter, Open Sans, ui-sans-serif, system-ui, sans-serif";

const phases = [
  ["EMAIL-7F3", "scheduled"],
  ["EMAIL-7F3", "queued"],
  ["EMAIL-7F3", "capacity check"],
  ["lane 02", "executing"],
  ["EMAIL-7F3", "delivered"],
];

export function ExecutionPlane() {
  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-wash">
      <figcaption className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div className="phase-stack min-w-36" aria-hidden>
          {phases.map(([id, state]) => (
            <p key={state} className="phase">
              <span className="block font-sans text-[12px] text-ink">{id}</span>
              <span className="block font-sans text-[11px] text-muted">{state}</span>
            </p>
          ))}
        </div>
        <span className="font-sans text-[11px] text-muted">Not live state</span>
      </figcaption>
      <div className="flex justify-center overflow-x-auto px-4 py-6">
        <svg viewBox="0 0 520 700" className="h-auto w-130 max-w-full" aria-hidden>
          <text x="20" y="28" fill="#8a8a8a" fontSize="12" fontFamily={type}>
            Hour window
          </text>
          <text x="500" y="28" textAnchor="end" fill="#8a8a8a" fontSize="12" fontFamily={type}>
            sample, not a clock
          </text>

          <line x1="28" y1="72" x2="492" y2="72" stroke="#2a2a2a" />
          <line x1="48" y1="64" x2="48" y2="80" stroke="#8a8a8a" />
          <text x="48" y="100" textAnchor="middle" fill="#c8c8c8" fontSize="12" fontFamily={type}>
            10:00
          </text>
          <line x1="360" y1="64" x2="360" y2="80" stroke="#8a8a8a" />
          <text x="360" y="100" textAnchor="middle" fill="#c8c8c8" fontSize="12" fontFamily={type}>
            11:00
          </text>

          {[88, 124, 160, 196, 232].map((x) => (
            <line key={x} x1={x} y1="67" x2={x} y2="77" stroke="#f2f2f2" strokeWidth="1.1" />
          ))}
          <text x="160" y="122" textAnchor="middle" fill="#8a8a8a" fontSize="11" fontFamily={type}>
            ready, 2s apart
          </text>

          <text x="286" y="122" textAnchor="middle" fill="#a3a3a3" fontSize="11" fontFamily={type}>
            waiting
          </text>
          <g>
            <circle cx="286" cy="72" r="3.25" fill="none" stroke="#a3a3a3" strokeWidth="0.9" />
            <animateTransform
              className="motion-shift"
              attributeName="transform"
              type="translate"
              values="0 0; 0 0; 90 0; 90 0; 0 0"
              keyTimes="0; 0.2; 0.5; 0.75; 1"
              dur="10s"
              repeatCount="indefinite"
            />
          </g>
          <text x="455" y="100" textAnchor="middle" fill="#8a8a8a" fontSize="11" fontFamily={type}>
            future bucket
          </text>

          <line x1="20" y1="142" x2="500" y2="142" stroke="#2a2a2a" />

          <Panel x={160} y={158} w={200} h={48} title="Scheduler" detail="assigns scheduledAt" />
          <line x1="260" y1="206" x2="260" y2="224" stroke="#2a2a2a" />

          <rect x="120" y="224" width="280" height="150" rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
          <text x="136" y="248" fill="#f2f2f2" fontSize="13" fontFamily={type}>
            Execution slots
          </text>
          <SlotRow y={276} time="10:42:00" state="ready" />
          <SlotRow y={300} time="10:42:02" state="ready" />
          <SlotRow y={324} time="10:42:04" state="ready" />
          <SlotRow y={348} time="11:00:00" state="rescheduled" warn />

          <line x1="260" y1="374" x2="260" y2="392" stroke="#2a2a2a" />
          <rect x="120" y="392" width="280" height="108" rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
          <text x="136" y="416" fill="#f2f2f2" fontSize="13" fontFamily={type}>
            Rate gate
          </text>
          <text x="136" y="442" fill="#8a8a8a" fontSize="11" fontFamily={type}>
            sender
          </text>
          <rect x="210" y="432" width="160" height="8" rx="2" fill="#2a2a2a" />
          <rect className="meter meter-sender" x="210" y="432" width="160" height="8" rx="2" fill="#f2f2f2" />
          <text x="136" y="468" fill="#8a8a8a" fontSize="11" fontFamily={type}>
            global
          </text>
          <rect x="210" y="458" width="160" height="8" rx="2" fill="#2a2a2a" />
          <rect className="meter meter-global" x="210" y="458" width="160" height="8" rx="2" fill="#f2f2f2" />
          <text x="136" y="488" fill="#8a8a8a" fontSize="11" fontFamily={type}>
            sample 18/200 and 74/1000
          </text>

          <path d="M260 500 V528 H96 V548" fill="none" stroke="#2a2a2a" />
          <path className="pipe-pulse" d="M260 500 V548" fill="none" stroke="#f2f2f2" strokeWidth="0.75" />
          <path d="M260 528 H424 V548" fill="none" stroke="#2a2a2a" />

          <Lane x={32} y={548} title="lane 01" detail="idle" />
          <Lane x={196} y={548} title="lane 02" detail="executing" live />
          <Lane x={360} y={548} title="lane 03" detail="idle" />

          <line x1="96" y1="598" x2="96" y2="620" stroke="#2a2a2a" />
          <line className="pipe-pulse" x1="260" y1="598" x2="260" y2="620" stroke="#f2f2f2" strokeWidth="0.75" />
          <line x1="424" y1="598" x2="424" y2="620" stroke="#2a2a2a" />

          <Smtp x={32} y={620} />
          <Smtp x={196} y={620} />
          <Smtp x={360} y={620} />
        </svg>
      </div>
    </figure>
  );
}

function Panel({
  x,
  y,
  w,
  h,
  title,
  detail,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  detail: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
      <text x={x + 16} y={y + 20} fill="#f2f2f2" fontSize="13" fontFamily={type}>
        {title}
      </text>
      <text x={x + 16} y={y + 36} fill="#8a8a8a" fontSize="11" fontFamily={type}>
        {detail}
      </text>
    </g>
  );
}

function SlotRow({ y, time, state, warn }: { y: number; time: string; state: string; warn?: boolean }) {
  const fill = warn ? "#a3a3a3" : "#8a8a8a";
  return (
    <g>
      <text x="136" y={y} fill="#c8c8c8" fontSize="12" fontFamily={type}>
        {time}
      </text>
      <text x="384" y={y} textAnchor="end" fill={fill} fontSize="12" fontFamily={type}>
        {state}
      </text>
    </g>
  );
}

function Lane({ x, y, title, detail, live }: { x: number; y: number; title: string; detail: string; live?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width="128" height="50" rx="8" fill={live ? "#1a1a1a" : "#060606"} stroke="#2a2a2a" strokeWidth="0.75" />
      {live ? (
        <rect className="lane-live" x={x} y={y} width="128" height="50" rx="8" fill="none" stroke="#f2f2f2" strokeWidth="0.75" />
      ) : null}
      <text x={x + 14} y={y + 22} fill="#f2f2f2" fontSize="12" fontFamily={type}>
        {title}
      </text>
      <text x={x + 14} y={y + 38} fill={live ? "#c8c8c8" : "#8a8a8a"} fontSize="11" fontFamily={type}>
        {detail}
      </text>
    </g>
  );
}

function Smtp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="128" height="40" rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
      <text x={x + 14} y={y + 25} fill="#c8c8c8" fontSize="12" fontFamily={type}>
        Ethereal
      </text>
    </g>
  );
}

export function ConstraintTimeline() {
  const ready = [72, 132, 192, 252, 312];
  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-wash">
      <div className="flex justify-center px-4 py-5">
      <svg viewBox="0 0 840 186" className="h-auto w-210 max-w-full" role="img" aria-label="Jobs packed into an hour, with overflow moved to the next hour">
        <text x="24" y="20" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Current hour
        </text>
        <text x="560" y="20" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Next hour
        </text>
        <line x1="24" y1="40" x2="816" y2="40" stroke="#2a2a2a" strokeWidth="0.75" />
        <line x1="40" y1="34" x2="40" y2="46" stroke="#8a8a8a" strokeWidth="0.75" />
        <text x="40" y="64" textAnchor="middle" fill="#c8c8c8" fontSize="12" fontFamily={type}>
          10:00
        </text>
        <line x1="520" y1="34" x2="520" y2="46" stroke="#8a8a8a" strokeWidth="0.75" />
        <text x="520" y="64" textAnchor="middle" fill="#c8c8c8" fontSize="12" fontFamily={type}>
          11:00
        </text>

        {ready.map((x, i) => (
          <g key={x}>
            <line x1={x} y1="40" x2={x} y2="92" stroke="#2a2a2a" strokeWidth="0.75" />
            <circle cx={x} cy="92" r="2.5" fill="#f2f2f2" />
            <text x={x} y="112" textAnchor="middle" fill="#c8c8c8" fontSize="12" fontFamily={type}>
              {`job ${i + 1}`}
            </text>
          </g>
        ))}
        <text x="192" y="132" textAnchor="middle" fill="#8a8a8a" fontSize="11" fontFamily={type}>
          ready, 2000 ms apart
        </text>

        <g>
          <line x1="400" y1="40" x2="400" y2="92" stroke="#333333" strokeWidth="0.75" />
          <circle cx="400" cy="92" r="2.75" fill="none" stroke="#a3a3a3" strokeWidth="0.9" />
          <text x="400" y="112" textAnchor="middle" fill="#a3a3a3" fontSize="12" fontFamily={type}>
            job 6
          </text>
          <text x="400" y="132" textAnchor="middle" fill="#a3a3a3" fontSize="11" fontFamily={type}>
            waiting
          </text>
          <animateTransform
            className="motion-shift"
            attributeName="transform"
            type="translate"
            values="0 0; 0 0; 220 0; 220 0; 0 0"
            keyTimes="0; 0.25; 0.55; 0.8; 1"
            dur="11s"
            repeatCount="indefinite"
          />
        </g>

        <g>
          <line x1="740" y1="40" x2="740" y2="92" stroke="#2a2a2a" strokeWidth="0.75" strokeDasharray="2 3" />
          <circle cx="740" cy="92" r="2.75" fill="none" stroke="#8a8a8a" strokeWidth="0.9" />
          <text x="740" y="112" textAnchor="middle" fill="#8a8a8a" fontSize="12" fontFamily={type}>
            open slot
          </text>
        </g>
        <text x="740" y="132" textAnchor="middle" fill="#8a8a8a" fontSize="11" fontFamily={type}>
          future bucket
        </text>
        <text x="24" y="164" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Saturated hour: the job moves. It is not dropped.
        </text>
      </svg>
      </div>
    </div>
  );
}

export function CoordinationMap() {
  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-wash">
      <div className="flex justify-center px-4 py-5">
      <svg viewBox="0 0 760 300" className="h-auto w-190 max-w-full" role="img" aria-label="Workers sharing one Redis rate gate">
        {["Worker A", "Worker B", "Worker C"].map((name, i) => (
          <g key={name}>
            <rect x="24" y={28 + i * 72} width="150" height="52" rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
            <text x="40" y={58 + i * 72} fill="#f2f2f2" fontSize="12" fontFamily={type}>
              {name}
            </text>
          </g>
        ))}
        <path d="M174 54 H212 V198" fill="none" stroke="#2a2a2a" strokeWidth="0.75" />
        <path d="M174 126 H250" fill="none" stroke="#2a2a2a" strokeWidth="0.75" />
        <path d="M174 198 H212" fill="none" stroke="#2a2a2a" strokeWidth="0.75" />
        <rect x="250" y="82" width="180" height="88" rx="8" fill="#1a1a1a" stroke="#f2f2f2" strokeWidth="0.75" />
        <text x="266" y="116" fill="#f2f2f2" fontSize="13" fontFamily={type}>
          Redis
        </text>
        <text x="266" y="138" fill="#c8c8c8" fontSize="11" fontFamily={type}>
          shared state
        </text>
        <line x1="430" y1="126" x2="490" y2="126" stroke="#f2f2f2" strokeWidth="0.6" className="pipe-pulse" />
        <rect x="490" y="28" width="240" height="196" rx="8" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
        <text x="508" y="60" fill="#f2f2f2" fontSize="13" fontFamily={type}>
          Rate gate
        </text>
        <text x="508" y="92" fill="#c8c8c8" fontSize="12" fontFamily={type}>
          Sender limit 200 / hour
        </text>
        <text x="508" y="120" fill="#c8c8c8" fontSize="12" fontFamily={type}>
          Global limit 1000 / hour
        </text>
        <text x="508" y="148" fill="#c8c8c8" fontSize="12" fontFamily={type}>
          Minimum spacing 2000 ms
        </text>
        <text x="508" y="188" fill="#a3a3a3" fontSize="11" fontFamily={type}>
          Capacity exhausted
        </text>
        <text x="24" y="268" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Atomic reservation
        </text>
        <text x="250" y="268" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Execution slot
        </text>
        <text x="490" y="268" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Future bucket
        </text>
      </svg>
      </div>
    </div>
  );
}

export function RestartMap() {
  const before = ["Scheduled job", "Delayed queue", "Worker processing"];
  const after = ["Persisted schedule", "Reconciliation", "Queue restored", "Worker resumes"];
  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-wash">
      <div className="flex justify-center px-4 py-5">
      <svg viewBox="0 0 760 248" className="h-auto w-190 max-w-full" role="img" aria-label="Schedule before a worker restart and after reconciliation">
        <text x="24" y="20" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          Before restart
        </text>
        <text x="436" y="20" fill="#8a8a8a" fontSize="12" fontFamily={type}>
          After restart
        </text>
        <line x1="380" y1="40" x2="380" y2="108" stroke="#2a2a2a" strokeWidth="0.75" />
        <text x="380" y="128" textAnchor="middle" fill="#8a8a8a" fontSize="11" fontFamily={type}>
          stops
        </text>
        <line x1="380" y1="140" x2="380" y2="228" stroke="#2a2a2a" strokeWidth="0.75" />
        {before.map((label, i) => (
          <g key={label}>
            <rect x="24" y={40 + i * 52} width="300" height="40" rx="4" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
            <text x="40" y={64 + i * 52} fill="#8a8a8a" fontSize="12" fontFamily={type}>
              {i + 1}
            </text>
            <text x="60" y={64 + i * 52} fill="#f2f2f2" fontSize="12" fontFamily={type}>
              {label}
            </text>
          </g>
        ))}
        {after.map((label, i) => (
          <g key={label}>
            <rect x="436" y={40 + i * 48} width="300" height="40" rx="4" fill="#060606" stroke="#2a2a2a" strokeWidth="0.75" />
            <text x="452" y={64 + i * 48} fill="#8a8a8a" fontSize="12" fontFamily={type}>
              {i + 1}
            </text>
            <text x="472" y={64 + i * 48} fill="#f2f2f2" fontSize="12" fontFamily={type}>
              {label}
            </text>
          </g>
        ))}
      </svg>
      </div>
    </div>
  );
}

export function LoginTrace() {
  const steps = [
    ["Scheduled", "delayed job"],
    ["Queue", "BullMQ"],
    ["Rate gate", "Redis permit"],
    ["Worker", "sending"],
    ["Delivery", "receipt, then sent"],
  ];
  return (
    <svg viewBox="0 0 320 300" className="h-auto w-full" aria-hidden>
      <line x1="22" y1="16" x2="22" y2="284" stroke="#2a2a2a" />
      <line className="pipe-pulse" x1="22" y1="16" x2="22" y2="284" stroke="#f2f2f2" />
      {steps.map(([title, detail], i) => (
        <g key={title}>
          <circle cx="22" cy={28 + i * 64} r="4" fill="#f2f2f2" />
          <text x="44" y={24 + i * 64} fill="#f2f2f2" fontSize="13" fontFamily={type}>
            {title}
          </text>
          <text x="44" y={42 + i * 64} fill="#8a8a8a" fontSize="12" fontFamily={type}>
            {detail}
          </text>
        </g>
      ))}
      <circle className="motion-job" r="3.5" fill="#f2f2f2">
        <animateMotion dur="12s" repeatCount="indefinite" path="M22 28 V284" />
      </circle>
    </svg>
  );
}
