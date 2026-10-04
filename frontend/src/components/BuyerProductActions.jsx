import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Repeat2, Tags } from 'lucide-react';
import { offerService, subscriptionService } from '../services';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';
import Modal from './Modal';

const BuyerProductActions = ({ product, farmer }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [offerOpen, setOfferOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(product.minOrderQuantity || 1));
  const [offerPrice, setOfferPrice] = useState(String((Number(product.pricePerUnit) * 0.9).toFixed(2)));
  const [address, setAddress] = useState(user?.address || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);

  if (user?.role !== 'buyer' || !farmer?._id) return null;

  const requireBuyer = () => {
    if (user?.role === 'buyer') return true;
    toast.warning('Sign in as a buyer to contact the farm.');
    navigate('/login');
    return false;
  };

  const sendOffer = async (event) => {
    event.preventDefault();
    if (!requireBuyer()) return;
    try {
      setSaving(true);
      await offerService.create({ productId: product._id, quantity: Number(quantity), askingPricePerUnit: Number(offerPrice), message: '' });
      toast.success('Bulk offer sent to the farmer. It is valid for 48 hours.');
      setOfferOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not send your offer');
    } finally {
      setSaving(false);
    }
  };

  const subscribe = async (event) => {
    event.preventDefault();
    if (!requireBuyer()) return;
    try {
      setSaving(true);
      await subscriptionService.create({ productId: product._id, quantity: Number(quantity), deliveryAddress: address, deliveryLocation: location });
      toast.success('Weekly Cash on Delivery plan request sent. The farmer must accept before scheduled orders begin.');
      setSubscriptionOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not create weekly plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => { if (requireBuyer()) setOfferOpen(true); }} className="btn-secondary !py-2 text-xs"><Tags className="h-4 w-4" /> Make bulk offer</button>
        <button onClick={() => { if (requireBuyer()) setSubscriptionOpen(true); }} className="btn-secondary !py-2 text-xs"><Repeat2 className="h-4 w-4" /> Weekly box</button>
        <button onClick={() => requireBuyer() && navigate(`/buyer/messages?farmerId=${farmer._id}`)} className="btn-secondary !py-2 text-xs"><MessageCircle className="h-4 w-4" /> Chat with farmer</button>
      </div>

      <Modal isOpen={offerOpen} onClose={() => setOfferOpen(false)} title="Make a bulk offer" size="sm">
        <form onSubmit={sendOffer} className="space-y-4">
          <p className="text-sm text-gray-600">Offer a lower per-unit price for {product.name}. The farmer can accept, reject, or counter within 48 hours.</p>
          <label className="block"><span className="label">Quantity ({product.unit})</span><input className="input" type="number" min={product.minOrderQuantity || 1} max={product.quantity} step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label className="block"><span className="label">Your offer per {product.unit} (₹)</span><input className="input" type="number" min="0.01" max={Math.max(0.01, Number(product.pricePerUnit) - 0.01)} step="0.01" required value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} /></label>
          <p className="text-xs text-gray-500">Listed price: {formatCurrency(product.pricePerUnit)} / {product.unit}. Accepted orders are Cash on Delivery.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOfferOpen(false)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Sending…' : 'Send offer'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} title="Weekly produce plan" size="sm">
        <form onSubmit={subscribe} className="space-y-4">
          <p className="text-sm text-gray-600">Receive {product.name} every week. Each scheduled order is created as Cash on Delivery; pause or cancel the plan from My Plans.</p>
          <label className="block"><span className="label">Quantity each week ({product.unit})</span><input className="input" type="number" min={product.minOrderQuantity || 1} max={product.quantity} step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label className="block"><span className="label">Delivery address</span><textarea className="input" required rows={2} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
          <label className="block"><span className="label">City / location</span><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Pune" /></label>
          <p className="text-xs text-amber-700">After the farmer accepts, the first order is scheduled 7 days from signup. Stock is checked before each order; unavailable orders are retried the following day.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setSubscriptionOpen(false)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Start weekly plan'}</button></div>
        </form>
      </Modal>
    </>
  );
};

export default BuyerProductActions;
