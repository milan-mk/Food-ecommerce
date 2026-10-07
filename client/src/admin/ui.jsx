// Small building blocks shared by the admin screens.
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-muted">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Card = ({ title, children, className = '', action }) => (
  <section className={`rounded-xl border border-line bg-white p-5 ${className}`}>
    {(title || action) && <div className="mb-4 flex items-center justify-between gap-3">{title && <h2 className="text-lg">{title}</h2>}{action}</div>}
    {children}
  </section>
);

export const TableWrap = ({ children, label }) => (
  <div className="overflow-x-auto rounded-xl border border-line bg-white">
    <table className="w-full min-w-[640px] text-left text-sm" aria-label={label}>{children}</table>
  </div>
);
export const Th = ({ children, className = '' }) => <th scope="col" className={`whitespace-nowrap border-b border-line px-4 py-3 font-bold text-muted ${className}`}>{children}</th>;
export const Td = ({ children, className = '' }) => <td className={`border-b border-line/60 px-4 py-3 align-middle ${className}`}>{children}</td>;

export const StatCard = ({ label, value, note }) => (
  <div className="rounded-xl border border-line bg-white p-5">
    <p className="text-sm font-bold text-muted">{label}</p>
    <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    {note && <p className="mt-1 text-sm text-muted">{note}</p>}
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div>
    <label className="sr-only" htmlFor={props.id}>{label}</label>
    <select className="input pr-8" {...props}>{children}</select>
  </div>
);

export const TableSkeleton = ({ rows = 6 }) => (
  <div className="space-y-2" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-12" />)}</div>
);
