import "./cube-loader.css";

function CubeLoader() {
  return (
    <div className="cube-loader">
      <div className="box box0">
        <div />
      </div>
      <div className="box box1">
        <div />
      </div>
      <div className="box box2">
        <div />
      </div>
      <div className="box box3">
        <div />
      </div>
      <div className="box box4">
        <div />
      </div>
      <div className="box box5">
        <div />
      </div>
      <div className="box box6">
        <div />
      </div>
      <div className="box box7">
        <div />
      </div>
      <div className="ground">
        <div />
      </div>
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  const large = /\bh-8\b|\bh-10\b|\bh-12\b/.test(className);
  return (
    <span
      className={`cube-loader-frame ${large ? "cube-loader-frame--lg" : "cube-loader-frame--sm"}`}
      aria-hidden
    >
      <CubeLoader />
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 md:px-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-card px-4 py-3 md:rounded-none md:border-x-0 md:border-t-0 md:bg-transparent">
          <div className="h-3 w-16 animate-pulse rounded bg-accent" />
          <div className="mt-2 h-4 w-2/3 max-w-full animate-pulse rounded bg-accent" />
          <div className="mt-3 h-3 w-24 animate-pulse rounded bg-accent" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-accent" />
        </div>
      ))}
    </div>
  );
}
