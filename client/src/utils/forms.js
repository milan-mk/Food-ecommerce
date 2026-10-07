// Copies the API's field-level validation errors onto react-hook-form fields; anything else becomes a form-level error.
export function applyServerErrors(err, setError) {
  const fieldErrors = (err.errors || []).filter((e) => e.field);
  if (fieldErrors.length) {
    fieldErrors.forEach((e) => setError(e.field, { type: 'server', message: e.message }));
  } else {
    setError('root.server', { type: 'server', message: err.message });
  }
}

export const ADDRESS_FIELDS = ['fullName', 'phone', 'address', 'city', 'state', 'postalCode'];

// The API reports address problems as "deliveryAddress.city"; the form fields are just "city".
export function flattenAddressErrors(err) {
  // Not { ...err }: an Error's message is not an enumerable property, so a spread would silently drop it.
  return {
    message: err.message,
    status: err.status,
    errors: (err.errors || []).map((e) => ({ ...e, field: String(e.field).replace(/^deliveryAddress\./, '') })).filter((e) => ADDRESS_FIELDS.includes(e.field)),
  };
}
