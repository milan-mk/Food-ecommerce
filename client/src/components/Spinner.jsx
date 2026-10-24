export default function Spinner({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-12 text-muted ${className}`} role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-ketchup" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
