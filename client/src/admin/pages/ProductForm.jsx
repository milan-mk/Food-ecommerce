import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { getCategories, getProduct } from '../../services/catalogService';
import { createProduct, updateProduct } from '../../services/adminService';
import Field from '../../components/Field';
import SafeImage from '../../components/SafeImage';
import Spinner from '../../components/Spinner';
import { ErrorState } from '../../components/States';
import { applyServerErrors } from '../../utils/forms';
import { toFormValues, toProductPayload } from '../productPayload';
import { Card } from '../ui';

const EMPTY = { name: '', description: '', price: '', stock: '0', category: '', image: '', featured: false, isAvailable: true, ingredients: '', nutrition: { calories: '', protein: '', carbs: '', fat: '' } };
const nonNegative = (label) => (v) => v === '' || (Number(v) >= 0 && !Number.isNaN(Number(v))) || `${label} must be 0 or more`;

function Form({ product, categories }) {
  const editing = Boolean(product);
  const toast = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: product ? toFormValues(product) : EMPTY });
  const m = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), errors)?.message;

  const onSubmit = async (values) => {
    try {
      const payload = toProductPayload(values);
      if (editing) await updateProduct(product._id, payload); else await createProduct(payload);
      toast.success(editing ? 'Product saved' : 'Product created');
      navigate('/admin/products');
    } catch (err) { applyServerErrors(err, setError); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {errors.root && errors.root.server && <div role="alert" className="rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{errors.root.server.message}</div>}
        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Name" error={m('name')} {...register('name', { required: 'Enter a name', minLength: { value: 2, message: 'Name is too short' } })} />
            <div className="sm:col-span-2">
              <label htmlFor="description" className="label">Description</label>
              <textarea id="description" rows={4} className={`input ${m('description') ? 'input-error' : ''}`} aria-invalid={Boolean(m('description'))} {...register('description', { required: 'Enter a description', minLength: { value: 10, message: 'Description must be at least 10 characters' } })} />
              {m('description') && <p role="alert" className="mt-1 text-sm font-medium text-ketchup-dark">{m('description')}</p>}
            </div>
            <Field label="Price" inputMode="decimal" error={m('price')} {...register('price', { required: 'Enter a price', validate: (v) => Number(v) > 0 || 'Price must be greater than 0' })} />
            <Field label="Stock" inputMode="numeric" error={m('stock')} {...register('stock', { validate: (v) => (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Stock must be a whole number, 0 or more' })} />
            <div>
              <label htmlFor="category" className="label">Category</label>
              <select id="category" className={`input ${m('category') ? 'input-error' : ''}`} {...register('category', { required: 'Choose a category' })}>
                <option value="">Select a category</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {m('category') && <p role="alert" className="mt-1 text-sm font-medium text-ketchup-dark">{m('category')}</p>}
            </div>
            <Field label="Ingredients" hint="Separate with commas." error={m('ingredients')} {...register('ingredients')} />
          </div>
        </Card>

        <Card title="Nutrition (optional)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']].map(([k, label]) => (
              <Field key={k} label={label} inputMode="decimal" error={m(`nutrition.${k}`)} {...register(`nutrition.${k}`, { validate: nonNegative(label) })} />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6 xl:self-start">
        <Card title="Image">
          <SafeImage src={watch('image')} alt="Product preview" width="400" height="300" className="aspect-[4/3] w-full rounded-lg border border-line object-cover" />
          <Field className="mt-4" label="Image URL or path" hint="For example /images/products/cheese-burger.jpg or a full https:// link." error={m('image')}
            {...register('image', { validate: (v) => !v.trim() || /^(\/|https?:\/\/)/i.test(v.trim()) || 'Use a /path or a full http(s) link' })} />
        </Card>
        <Card title="Visibility">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-ketchup" {...register('isAvailable')} /> Visible on the menu</label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-ketchup" {...register('featured')} /> Show as a customer favourite</label>
        </Card>
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create product'}</button>
          <Link to="/admin/products" className="btn-ghost">Cancel</Link>
        </div>
      </div>
    </form>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  useDocumentTitle(id ? 'Edit product' : 'New product');
  const categories = useFetch((signal) => getCategories({ signal }), []);
  const product = useFetch((signal) => (id ? getProduct(id, { signal }) : Promise.resolve(null)), [id]);

  return (
    <>
      <Link to="/admin/products" className="inline-flex items-center gap-1 font-bold underline"><ArrowLeft size={16} aria-hidden="true" /> All products</Link>
      <h1 className="mb-6 mt-3 text-3xl">{id ? 'Edit product' : 'New product'}</h1>
      {(categories.loading || product.loading) && <Spinner />}
      {categories.error && <ErrorState error={categories.error} onRetry={categories.reload} />}
      {product.error && <ErrorState error={product.error} onRetry={product.reload} title="Product not found" />}
      {categories.data && !product.loading && !product.error && <Form product={product.data ? product.data.data : null} categories={categories.data.data} />}
    </>
  );
}
