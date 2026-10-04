import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  MapPin,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import { cartService, orderService, paymentService } from '../../services';
import { formatCurrency, categoryIcons } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

/**
 * BuyerCart - shopping cart with quantity controls and checkout.
 */
const BuyerCart = () => {
  const { cart, loading, updateQuantity, removeFromCart, clearCart, refresh } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [form, setForm] = useState({
    deliveryAddress: user?.address || '',
    deliveryLocation: user?.location || '',
    paymentMethod: 'Cash on Delivery',
    notes: '',
  });

  useEffect(() => {
    if (!checkoutOpen || !cart.items.length) return undefined;
    let active = true;
    setQuoteLoading(true);
    cartService.quote({ deliveryLocation: form.deliveryLocation || form.deliveryAddress })
      .then(({ data }) => { if (active) setCheckoutQuote(data.data); })
      .catch((error) => { if (active) toast.error(error?.response?.data?.message || 'Could not calculate delivery fee'); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [checkoutOpen, form.deliveryLocation, form.deliveryAddress, cart.items.length, cart.total]);

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setShowPaymentScreen(false);
  };

  const handleQty = async (productId, qty, min, max) => {
    if (qty < min) {
      toast.warning(`Minimum order quantity is ${min}`);
      return;
    }
    if (qty > max) {
      toast.warning(`Only ${max} available in stock`);
      return;
    }
    try {
      await updateQuantity(productId, qty);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update quantity');
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error('Could not remove item');
    }
  };

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!form.deliveryAddress) {
      toast.warning('Please enter a delivery address');
      return;
    }
    if (form.paymentMethod !== 'Cash on Delivery') return;

    try {
      setPlacing(true);
      const { data } = await orderService.create({ ...form, paymentMethod: 'Cash on Delivery' });
      toast.success('Order placed with Cash on Delivery.');
      await refresh();
      closeCheckout();
      const firstOrder = data.data?.[0];
      if (firstOrder) navigate(`/buyer/orders/${firstOrder._id}`);
      else navigate('/buyer/orders');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!form.deliveryAddress) {
      toast.warning('Please enter a delivery address');
      return;
    }

    setPlacing(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay Checkout could not be loaded. Check your internet connection.');

      const { data: sessionResponse } = await paymentService.initiate({
        deliveryLocation: form.deliveryLocation || form.deliveryAddress,
        deliveryAddress: form.deliveryAddress,
      });
      const session = sessionResponse.data;
      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        name: 'AgriConnect',
        description: 'Farm produce order',
        order_id: session.gatewayOrderId,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#15803d' },
        handler: async (gatewayResponse) => {
          try {
            await paymentService.verify(gatewayResponse);
            const { data } = await orderService.create({
              ...form,
              paymentMethod: 'Online Payment',
              gatewayOrderId: gatewayResponse.razorpay_order_id,
            });
            toast.success('Payment verified and order placed.');
            await refresh();
            closeCheckout();
            const firstOrder = data.data?.[0];
            navigate(firstOrder ? `/buyer/orders/${firstOrder._id}` : '/buyer/orders');
          } catch (error) {
            toast.error(error?.response?.data?.message || 'Payment verification or order placement failed. Contact support if your bank was charged.');
          } finally {
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
      });
      checkout.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed. No order was placed.');
        setPlacing(false);
      });
      checkout.open();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not start online payment');
      setPlacing(false);
    }
  };

  const handlePaymentMethodChange = (value) => {
    setForm((prev) => ({ ...prev, paymentMethod: value }));
    setShowPaymentScreen(value === 'Online Payment');
  };

  if (loading && cart.items.length === 0) {
    return <LoadingSpinner fullScreen label="Loading cart..." />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          message="Add fresh produce from the marketplace to get started."
          action={
            <Link to="/marketplace" className="btn-primary">
              <Store className="w-4 h-4" /> Browse Marketplace
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          My Cart <span className="text-gray-400 font-normal">({cart.items.length} items)</span>
        </h2>
        <button
          onClick={async () => {
            await clearCart();
            toast.success('Cart cleared');
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Clear cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={p._id} className="card p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{categoryIcons[p.category] || '🌱'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${p._id}`}
                        className="font-bold text-gray-900 hover:text-primary-600 truncate block"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {p.location}
                      </p>
                      <p className="text-sm text-primary-700 font-semibold mt-1">
                        {formatCurrency(item.unitPrice ?? p.pricePerUnit)}{' '}
                        <span className="text-xs text-gray-400 font-normal">/ {p.unit}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(p._id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleQty(p._id, item.quantity - 1, p.minOrderQuantity || 1, p.quantity)
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {item.quantity} <span className="text-xs text-gray-400">{p.unit}</span>
                      </span>
                      <button
                        onClick={() =>
                          handleQty(p._id, item.quantity + 1, p.minOrderQuantity || 1, p.quantity)
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(item.lineTotal)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-4 h-4" /> Delivery (distance estimate)
                </span>
                <span className="font-medium">{formatCurrency(cart.deliveryFee)}</span>
              </div>
              <p className="text-[11px] text-gray-400">Calculated per farmer order: ₹20 base + ₹5 per estimated km. Final estimate updates for your checkout location.</p>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(cart.total)}</span>
              </div>
            </div>
            <button onClick={() => setCheckoutOpen(true)} className="btn-primary w-full mt-5">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/marketplace" className="btn-secondary w-full mt-2">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      <Modal isOpen={checkoutOpen} onClose={closeCheckout} title="Checkout" size="md">
        {showPaymentScreen ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
              <p className="text-sm font-semibold text-primary-700">Secure payment with Razorpay</p>
              <p className="mt-1 text-sm text-gray-600">Choose UPI, card, or net banking in the Razorpay window. The order is placed only after the gateway payment is verified.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Order Total</span>
                <span>{formatCurrency(checkoutQuote?.total ?? cart.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentScreen(false)}
                className="btn-secondary"
              >
                Back
              </button>
              <button type="button" onClick={handleOnlinePayment} disabled={placing} className="btn-primary">
                {placing ? 'Opening secure checkout…' : 'Continue to Razorpay'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="label">Delivery Address *</label>
              <textarea
                required
                rows={2}
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                className="input"
                placeholder="House / street / area"
              />
            </div>
            <div>
              <label className="label">Delivery Location (City)</label>
              <input
                value={form.deliveryLocation}
                onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })}
                className="input"
                placeholder="e.g. Pune, Maharashtra"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="input"
              >
                <option>Cash on Delivery</option>
                <option>Online Payment</option>
              </select>
            </div>

            <div>
              <label className="label">Order Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
                placeholder="Any special instructions"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(checkoutQuote?.subtotal ?? cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery · estimated by distance</span>
                <span>{formatCurrency(checkoutQuote?.deliveryFee ?? cart.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 mt-1 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(checkoutQuote?.total ?? cart.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeCheckout} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={placing || quoteLoading} className="btn-primary">
                {quoteLoading ? 'Calculating delivery…' : placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default BuyerCart;
