import { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { orderService, paymentService } from '../../services';
import { formatCurrency, categoryIcons } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

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
  const [form, setForm] = useState({
    deliveryAddress: user?.address || '',
    deliveryLocation: user?.location || '',
    paymentMethod: 'Cash on Delivery',
    notes: '',
  });

  const farmerPaymentList = Array.from(
    new Map(
      (cart.items || [])
        .filter((item) => item.product?.farmer)
        .map((item) => {
          const farmer = item.product.farmer;
          const farmerId = typeof farmer === 'string' ? farmer : farmer._id;
          const farmerName = typeof farmer === 'string' ? 'Farmer' : farmer.name || 'Farmer';
          const upiId = typeof farmer === 'string' ? '' : farmer.upiId || 'UPI not added';
          return [farmerId, { farmerId, farmerName, upiId }];
        })
    ).values()
  );

  const farmerUpiIds = farmerPaymentList.map((entry) => entry.upiId).filter((upi) => upi && upi !== 'UPI not added');

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

    try {
      setPlacing(true);

      let paymentReference = '';
      if (form.paymentMethod === 'Online Payment' || form.paymentMethod === 'UPI Payment') {
        toast.info('Preparing payment for the selected farmer UPI(s)...');
        const paymentResponse = await paymentService.initiate({
          amount: cart.total,
          orderNumber: 'AGC-ORDER',
          paymentMethod: form.paymentMethod,
          payeeUpis: farmerUpiIds,
        });
        paymentReference = paymentResponse.data?.data?.paymentReference || '';
      }

      const { data } = await orderService.create({
        ...form,
        paymentReference,
      });
      toast.success(
        form.paymentMethod === 'Online Payment' || form.paymentMethod === 'UPI Payment'
          ? 'Payment request confirmed and order placed!'
          : 'Order placed successfully!'
      );
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

  const handlePaymentMethodChange = (value) => {
    setForm((prev) => ({ ...prev, paymentMethod: value }));
    setShowPaymentScreen(value === 'Online Payment' || value === 'UPI Payment');
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
                        {formatCurrency(p.pricePerUnit)}{' '}
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
                  <Truck className="w-4 h-4" /> Delivery Fee
                </span>
                <span className="font-medium">{formatCurrency(cart.deliveryFee)}</span>
              </div>
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
              <p className="text-sm font-semibold text-primary-700 mb-3">Pay Now</p>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-5 gap-1">
                  {[
                    [1, 1, 1, 1, 1],
                    [1, 0, 1, 0, 1],
                    [1, 1, 1, 1, 1],
                    [1, 0, 1, 0, 1],
                    [1, 1, 1, 1, 1],
                  ].flat().map((cell, index) => (
                    <span
                      key={index}
                      className={`h-2.5 w-2.5 rounded-[2px] ${cell ? 'bg-gray-900' : 'bg-transparent'}`}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">Pay to farmer UPI(s)</p>
                  <div className="mt-2 space-y-1">
                    {farmerPaymentList.length ? (
                      farmerPaymentList.map((entry) => (
                        <p key={entry.farmerId} className="text-primary-700 font-bold">
                          {entry.farmerName}: {entry.upiId}
                        </p>
                      ))
                    ) : (
                      <p className="text-primary-700 font-bold">No farmer UPI found</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Amount: {formatCurrency(cart.total)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Order Total</span>
                <span>{formatCurrency(cart.total)}</span>
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
              <button type="button" onClick={handleCheckout} disabled={placing} className="btn-primary">
                {placing ? 'Processing...' : 'Pay & Place Order'}
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
                <option>UPI Payment</option>
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

            {farmerPaymentList.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold mb-2">Pay each farmer using their own UPI</p>
                <ul className="space-y-1">
                  {farmerPaymentList.map((entry) => (
                    <li key={entry.farmerId} className="font-medium">
                      {entry.farmerName}: {entry.upiId}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>{formatCurrency(cart.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 mt-1 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(cart.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeCheckout} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={placing} className="btn-primary">
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default BuyerCart;
