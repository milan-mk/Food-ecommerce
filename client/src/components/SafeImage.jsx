import { imageUrl } from '../utils/format';

// Lazy-loaded image that swaps to a local placeholder if the URL is broken.
export default function SafeImage({ src, alt, className = '', ...rest }) {
  return (
    <img
      src={imageUrl(src)} alt={alt} loading="lazy" decoding="async" className={className}
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
      {...rest}
    />
  );
}
