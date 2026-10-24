import { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { capturePaypalOrder, createPaypalOrder, getPaymentConfig } from '../services/paymentService';
import Spinner from './Spinner';
import { ErrorState } from './States';

// PayPal buttons for ONE saved order. The browser never decides that an order is paid:
// after approval it asks OUR server to capture, and the server verifies the payment with PayPal.
export default function PayPalPayment({ order, onPaid }) {
  const toast = useToast();
  const cfg = useFetch((signal) => getPaymentConfig({ signal }), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (cfg.loading) return <Spinner label="Loading secure payment..." />;
  if (cfg.error) return <ErrorState error={cfg.error} onRetry={cfg.reload} title="Payment is unavailable" />;
  const c = cfg.data.data;
  if (!c.enabled) {
    return <p role="alert" className="rounded-lg bg-mustard-light px-4 py-3 font-medium">Online payment is not available right now. Your order is saved, so you can pay later from My orders.</p>;
  }

  return (
    <PayPalScriptProvider options={{ clientId: c.clientId, currency: c.currency, intent: 'capture' }}>
      {busy && <Spinner label="Confirming your payment..." className="py-4" />}
      <div className={busy ? 'pointer-events-none opacity-40' : ''}>
        <PayPalButtons
          style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
          forceReRender={[order._id, c.currency]}
          disabled={busy}
          createOrder={async () => {
            setError('');
            const r = await createPaypalOrder(order._id);
            return r.data.paypalOrderId;
          }}
          onApprove={async (data) => {
            setBusy(true);
            try {
              const r = await capturePaypalOrder(order._id, data.orderID);
              onPaid(r.data);
            } catch (err) {
              setError(err.message);
              toast.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => toast.info('Payment cancelled. Your order is saved. You can pay any time from My orders.')}
          onError={(err) => setError(err && err.message ? err.message : 'The payment could not be completed. Please try again.')}
        />
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">{error}</p>}
    </PayPalScriptProvider>
  );
}
