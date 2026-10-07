import Field from './Field';

// The six delivery fields, shared by checkout and the profile page. Pass react-hook-form's register() and errors.
export default function AddressFields({ register, errors }) {
  const msg = (k) => errors[k] && errors[k].message;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Full name" autoComplete="name" error={msg('fullName')}
        {...register('fullName', { required: 'Enter the recipient name', minLength: { value: 2, message: 'Name is too short' } })} />
      <Field className="sm:col-span-2" label="Phone" type="tel" autoComplete="tel" hint="The rider may call this number." error={msg('phone')}
        {...register('phone', { required: 'Enter a phone number', pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' } })} />
      <Field className="sm:col-span-2" label="Street address" autoComplete="street-address" error={msg('address')}
        {...register('address', { required: 'Enter the street address', minLength: { value: 5, message: 'Address is too short' } })} />
      <Field label="City" autoComplete="address-level2" error={msg('city')} {...register('city', { required: 'Enter the city' })} />
      <Field label="State" autoComplete="address-level1" error={msg('state')} {...register('state', { required: 'Enter the state' })} />
      <Field label="Postal code" autoComplete="postal-code" inputMode="text" error={msg('postalCode')}
        {...register('postalCode', { required: 'Enter the postal code', pattern: { value: /^[A-Za-z0-9\- ]{3,10}$/, message: 'Enter a valid postal code' } })} />
    </div>
  );
}
