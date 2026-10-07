import { forwardRef } from 'react';

// Label + input + inline error, wired together for screen readers.
const Field = forwardRef(function Field({ label, error, hint, id, className = '', inputClassName = '', children, ...props }, ref) {
  const inputId = id || props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="label">{label}</label>
      <div className="relative">
        <input ref={ref} id={inputId} className={`input ${error ? 'input-error' : ''} ${inputClassName}`} aria-invalid={error ? 'true' : 'false'} aria-describedby={describedBy} {...props} />
        {children}
      </div>
      {hint && !error && <p id={`${inputId}-hint`} className="mt-1 text-sm text-muted">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm font-medium text-ketchup-dark">{error}</p>}
    </div>
  );
});
export default Field;
