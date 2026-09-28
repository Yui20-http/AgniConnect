import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  User,
  Truck,
  Calendar,
  CreditCard,
  Navigation,
} from 'lucide-react';
import { orderService, userService, deliveryService, paymentService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { formatCurrency, formatDateTime, categoryIcons } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import OrderTimeline from '../../components/OrderTimeline';
import Modal from '../../components/Modal';

/**
 * OrderDetails - full order view shared by farmer / buyer / admin.
 * `role` prop controls which actions and sections are shown.
 */
const OrderDetails = ({ role = 'buyer' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lastOrderUpdate } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await orderService.getById(id);
      setOrder(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load order');
      navigate(`/${role}/orders`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (lastOrderUpdate && lastOrderUpdate._id === id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOrderUpdate]);

  useEffect(() => {
    if (role === 'buyer' && order?.status === 'Ready for Pickup') {
      loadPartners();
    }
  }, [role, order?.status]);

  const updateStatus = async (status) => {
    try {
      setBusy(true);
      await orderService.updateStatus(order._id, status);
      toast.success(`Order marked as ${status}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update order');
    } finally {
      setBusy(false);
    }
  };

  const loadPartners = async () => {
    try {
      const { data } = await userService.getDeliveryPartners();
      setPartners(data.data || []);
    } catch (err) {
      setPartners([]);
    }
  };

  const handleAssignDelivery = async () => {
    if (!selectedPartner) {
      toast.warning('Please choose a delivery partner');
      return;
    }

    try {
      setAssigning(true);
      await deliveryService.assign(order._id, selectedPartner);
      toast.success('Delivery partner assigned');
      setAssignOpen(false);
      setSelectedPartner('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not assign partner');
    } finally {
      setAssigning(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await paymentService.getInvoice(order._id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber || order._id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not download invoice');
    }
  };

  if (loading) return <LoadingSpinner fullScreen label="Loading order..." />;
  if (!order) return null;

  const farmerActions = {
    Pending: { label: 'Accept Order', status: 'Accepted' },
    Accepted: { label: 'Start Processing', status: 'Processing' },
    Processing: { label: 'Mark Ready for Pickup', status: 'Ready for Pickup' },
  };
  const action = role === 'farmer' ? farmerActions[order.status] : null;

  return (
    <div className="space-y-5 max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{order.orderNumber}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Placed {formatDateTime(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} />
            {role === 'buyer' && order.status === 'Ready for Pickup' && !order.deliveryPartner && (
              <button onClick={() => setAssignOpen(true)} className="btn-primary !py-1.5 !px-3 text-xs">
                <Truck className="w-3.5 h-3.5" /> Assign Delivery
              </button>
            )}
            {role === 'buyer' && ['Ready for Pickup', 'Picked Up', 'In Transit', 'Delivered'].includes(order.status) && (
              <Link to={`/buyer/orders/${order._id}/track`} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Navigation className="w-3.5 h-3.5" /> Track
              </Link>
            )}
            <button onClick={handleDownloadInvoice} className="btn-secondary !py-1.5 !px-3 text-xs">
              Download Invoice
            </button>
            {action && (
              <button
                onClick={() => updateStatus(action.status)}
                disabled={busy}
                className="btn-primary !py-1.5 !px-3 text-xs"
              >
                {busy ? '...' : action.label}
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Delivery Partner" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Pick a delivery partner for order <strong>{order.orderNumber}</strong>.
          </p>
          <label className="label">Select delivery partner</label>
          <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="input">
            <option value="">-- Choose a partner --</option>
            {partners.map((partner) => (
              <option key={partner._id} value={partner._id}>
                {partner.name} {partner.vehicleType ? `(${partner.vehicleType})` : ''}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAssignOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAssignDelivery} disabled={assigning} className="btn-primary">
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: items + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{categoryIcons[item.product?.category] || '🌱'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} {item.unit} × {formatCurrency(item.pricePerUnit)}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="text-primary-700">{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Order Timeline</h3>
            <OrderTimeline order={order} />
          </div>
        </div>

        {/* Right: parties + delivery */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-600" /> Buyer
            </h3>
            <p className="font-medium text-gray-800">{order.buyer?.name}</p>
            {order.buyer?.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {order.buyer.phone}
              </p>
            )}
            <p className="text-sm text-gray-500 flex items-start gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {order.deliveryAddress}
            </p>
          </div>

          {/* Farmer */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-earth-600" /> Farmer
            </h3>
            <p className="font-medium text-gray-800">{order.farmer?.farmName || order.farmer?.name}</p>
            {order.farmer?.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {order.farmer.phone}
              </p>
            )}
            <p className="text-sm text-gray-500 flex items-start gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {order.pickupLocation || order.farmer?.farmLocation}
            </p>
          </div>

          {/* Delivery partner */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Delivery Partner
            </h3>
            {order.deliveryPartner ? (
              <>
                <p className="font-medium text-gray-800">{order.deliveryPartner.name}</p>
                {order.deliveryPartner.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" /> {order.deliveryPartner.phone}
                  </p>
                )}
                {order.deliveryPartner.vehicleNumber && (
                  <p className="text-sm text-gray-500 mt-1">
                    {order.deliveryPartner.vehicleType} · {order.deliveryPartner.vehicleNumber}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-600">Not assigned yet</p>
            )}
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" /> Payment
            </h3>
            <p className="text-sm text-gray-600">Method: {order.paymentMethod}</p>
            <p className="text-sm text-gray-600 mt-1">
              Status:{' '}
              <span
                className={`badge ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {order.paymentStatus}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
