// Copies the API's field-level validation errors onto react-hook-form fields; anything else becomes a form-level error.
export function applyServerErrors(err, setError) {
  const fieldErrors = (err.errors || []).filter((e) => e.field);
  if (fieldErrors.length) {
    fieldErrors.forEach((e) => setError(e.field, { type: 'server', message: e.message }));
  } else {
    setError('root.server', { type: 'server', message: err.message });
  }
}
