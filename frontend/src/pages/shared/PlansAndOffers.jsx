import { useEffect, useState } from 'react';
import { Repeat2, Tags } from 'lucide-react';
import { offerService, subscriptionService } from '../../services';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const PlansAndOffers = ({ role }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [counterPrices, setCounterPrices] = useState({});
  const [addresses, setAddresses] = useState({});

  const load = async () => {
    try {
      const [offerResponse, subscriptionResponse] = await Promise.all([offerService.getAll(), subscriptionService.getAll()]);
      setOffers(offerResponse.data.data || []);
      setSubscriptions(subscriptionResponse.data.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load offers and plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const respond = async (offer, action) => {
    try {
      setBusyId(offer._id);
      await offerService.respond(offer._id, { action, counterPricePerUnit: counterPrices[offer._id] });
      toast.success(`Offer ${action}ed`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update offer');
    } finally { setBusyId(''); }
  };

  const checkout = async (offer) => {
    const deliveryAddress = addresses[offer._id] || user?.address || '';
    if (!deliveryAddress.trim()) {
      toast.warning('Enter a delivery address before placing this accepted offer.');
      return;
    }
    try {
      setBusyId(offer._id);
      const { data } = await offerService.checkout(offer._id, { deliveryAddress, deliveryLocation: user?.location || '' });
      toast.success(`Bulk order ${data.data.orderNumber} placed with Cash on Delivery.`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not place the bulk order');
    } finally { setBusyId(''); }
  };

  const updatePlan = async (plan, action) => {
    try {
      setBusyId(plan._id);
      await subscriptionService.update(plan._id, action);
      toast.success(`Weekly plan ${action}d`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update weekly plan');
    } finally { setBusyId(''); }
  };

  if (loading) return <LoadingSpinner fullScreen label="Loading plans and offers..." />;

  return (
    <div className="space-y-8">
      <header><h2 className="text-2xl font-bold text-gray-900">{role === 'farmer' ? 'Buyer Requests' : 'My Offers & Plans'}</h2><p className="mt-1 text-sm text-gray-500">Negotiate bulk quantities and manage weekly Cash on Delivery plans.</p></header>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Tags className="h-5 w-5 text-primary-700" />Bulk offers</h3>
        {!offers.length ? <div className="card"><EmptyState icon={Tags} title="No offers yet" message={role === 'farmer' ? 'Buyer bulk offers will appear here.' : 'Make a bulk offer from a product details page.'} /></div> : offers.map((offer) => (
          <article key={offer._id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h4 className="font-semibold text-gray-900">{offer.product?.name || 'Product'} · {offer.quantity} {offer.product?.unit}</h4><p className="mt-1 text-sm text-gray-600">{role === 'farmer' ? `Buyer: ${offer.buyer?.name || 'Buyer'}` : `Farmer: ${offer.farmer?.farmName || offer.farmer?.name || 'Farmer'}`}</p><p className="text-sm text-gray-600">Offer: {formatCurrency(offer.askingPricePerUnit)} / {offer.product?.unit} · list {formatCurrency(offer.product?.pricePerUnit)} / {offer.product?.unit}</p>{offer.counterPricePerUnit && <p className="text-sm font-medium text-primary-700">Counter: {formatCurrency(offer.counterPricePerUnit)} / {offer.product?.unit}</p>}<p className="mt-1 text-xs text-gray-400">Expires {formatDateTime(offer.expiresAt)}</p></div>
              <span className="badge bg-gray-100 text-gray-700">{offer.status}</span>
            </div>
            {role === 'farmer' && offer.status === 'Pending' && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs text-gray-600">Counter price / unit<input className="input mt-1 !py-2" type="number" min="0.01" step="0.01" value={counterPrices[offer._id] ?? ''} onChange={(event) => setCounterPrices((current) => ({ ...current, [offer._id]: event.target.value }))} /></label><button disabled={busyId === offer._id} onClick={() => respond(offer, 'accept')} className="btn-primary !py-2">Accept</button><button disabled={busyId === offer._id} onClick={() => respond(offer, 'counter')} className="btn-secondary !py-2">Counter</button><button disabled={busyId === offer._id} onClick={() => respond(offer, 'reject')} className="btn-secondary !py-2">Reject</button></div>}
            {role === 'buyer' && offer.status === 'Countered' && <div className="mt-3 flex gap-2"><button disabled={busyId === offer._id} onClick={() => respond(offer, 'accept')} className="btn-primary !py-2">Accept counter</button><button disabled={busyId === offer._id} onClick={() => respond(offer, 'reject')} className="btn-secondary !py-2">Reject counter</button></div>}
            {role === 'buyer' && offer.status === 'Accepted' && <div className="mt-3 flex flex-wrap gap-2"><input className="input max-w-md" placeholder="Delivery address" value={addresses[offer._id] ?? user?.address ?? ''} onChange={(event) => setAddresses((current) => ({ ...current, [offer._id]: event.target.value }))} /><button disabled={busyId === offer._id} onClick={() => checkout(offer)} className="btn-primary">Place COD order</button></div>}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Repeat2 className="h-5 w-5 text-primary-700" />Weekly plans</h3>
        {!subscriptions.length ? <div className="card"><EmptyState icon={Repeat2} title="No weekly plans" message={role === 'farmer' ? 'Buyer weekly-plan requests will appear here.' : 'Start a weekly plan from a product details page.'} /></div> : subscriptions.map((plan) => (
          <article key={plan._id} className="card p-4 flex flex-wrap items-center justify-between gap-4">
            <div><h4 className="font-semibold text-gray-900">{plan.product?.name || 'Product'} · {plan.quantity} {plan.product?.unit} weekly</h4><p className="text-sm text-gray-600">{role === 'farmer' ? `Buyer: ${plan.buyer?.name || 'Buyer'}` : `Farm: ${plan.farmer?.farmName || plan.farmer?.name || 'Farmer'}`}</p><p className="text-xs text-gray-500">Next order: {formatDateTime(plan.nextOrderAt)} · Cash on Delivery</p>{plan.lastError && <p className="mt-1 text-xs text-amber-700">{plan.lastError}</p>}</div>
            <div className="flex items-center gap-2"><span className="badge bg-gray-100 text-gray-700">{plan.status}</span>{role === 'farmer' && plan.status === 'Pending' && <><button onClick={() => updatePlan(plan, 'accept')} disabled={busyId === plan._id} className="btn-primary !py-2">Accept</button><button onClick={() => updatePlan(plan, 'reject')} disabled={busyId === plan._id} className="btn-secondary !py-2">Reject</button></>}{role === 'buyer' && plan.status === 'Active' && <button onClick={() => updatePlan(plan, 'pause')} disabled={busyId === plan._id} className="btn-secondary !py-2">Pause</button>}{role === 'buyer' && plan.status === 'Paused' && <button onClick={() => updatePlan(plan, 'resume')} disabled={busyId === plan._id} className="btn-primary !py-2">Resume</button>}{plan.status !== 'Cancelled' && <button onClick={() => updatePlan(plan, 'cancel')} disabled={busyId === plan._id} className="btn-secondary !py-2 text-red-700">Cancel</button>}</div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default PlansAndOffers;
