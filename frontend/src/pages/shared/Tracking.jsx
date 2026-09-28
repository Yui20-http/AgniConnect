import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Phone,
  Package,
  Navigation,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { orderService, deliveryService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import OrderTimeline from '../../components/OrderTimeline';

/**
 * Tracking - buyer-facing live tracking page for an order.
 * Shows the order timeline, delivery partner details, pickup/delivery
 * locations and (when coordinates exist) a Leaflet map with the route.
 */

// Custom coloured markers so pickup / delivery are easy to tell apart.
const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="background:#16a34a;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="background:#dc2626;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const Tracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lastOrderUpdate } = useSocket();
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const orderRes = await orderService.getById(id);
      setOrder(orderRes.data.data);
      // Delivery may not exist yet (before a partner is assigned).
      try {
        const delRes = await deliveryService.getByOrder(id);
        setDelivery(delRes.data.data);
      } catch {
        setDelivery(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load tracking info');
      navigate('/buyer/orders');
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

  if (loading) return <LoadingSpinner fullScreen label="Loading tracking..." />;
  if (!order) return null;

  const pickup = delivery?.coordinates?.pickup || order?.coordinates?.pickup;
  const drop = delivery?.coordinates?.delivery || order?.coordinates?.delivery;
  const hasCoords =
    pickup?.lat != null &&
    pickup?.lng != null &&
    drop?.lat != null &&
    drop?.lng != null;

  const center = hasCoords
    ? [(pickup.lat + drop.lat) / 2, (pickup.lng + drop.lng) / 2]
    : [19.076, 72.8777]; // Mumbai fallback

  const partner = delivery?.deliveryPartner || order?.deliveryPartner;

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
              <Navigation className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Track Order</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> {order.orderNumber}
              </p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: map + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" />
              <h3 className="font-bold text-gray-900">Live Route</h3>
            </div>
            {hasCoords ? (
              <div className="h-72 w-full">
                <MapContainer
                  center={center}
                  zoom={11}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                    <Popup>
                      <strong>Pickup</strong>
                      <br />
                      {delivery?.pickupLocation || order.pickupLocation || 'Farm'}
                    </Popup>
                  </Marker>
                  <Marker position={[drop.lat, drop.lng]} icon={deliveryIcon}>
                    <Popup>
                      <strong>Delivery</strong>
                      <br />
                      {delivery?.deliveryLocation || order.deliveryAddress}
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[
                      [pickup.lat, pickup.lng],
                      [drop.lat, drop.lng],
                    ]}
                    pathOptions={{ color: '#16a34a', weight: 3, dashArray: '8 8' }}
                  />
                </MapContainer>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-center px-6 bg-gray-50">
                <MapPin className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Map coordinates are not available for this order yet.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Pickup: {delivery?.pickupLocation || order.pickupLocation || '—'}
                </p>
                <p className="text-xs text-gray-400">
                  Delivery: {delivery?.deliveryLocation || order.deliveryAddress || '—'}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" /> Delivery Timeline
            </h3>
            <OrderTimeline order={order} />
          </div>
        </div>

        {/* Right: partner + route details */}
        <div className="space-y-5">
          {/* Delivery partner */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Delivery Partner
            </h3>
            {partner ? (
              <>
                <p className="font-medium text-gray-800">{partner.name}</p>
                {partner.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" /> {partner.phone}
                  </p>
                )}
                {partner.vehicleNumber && (
                  <p className="text-sm text-gray-500 mt-1">
                    {partner.vehicleType} · {partner.vehicleNumber}
                  </p>
                )}
                {delivery?.status && (
                  <div className="mt-3">
                    <StatusBadge status={delivery.status} />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-600">
                A delivery partner has not been assigned yet.
              </p>
            )}
          </div>

          {/* Route */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" /> Route
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-600 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Pickup</p>
                  <p className="text-gray-700">
                    {delivery?.pickupLocation || order.pickupLocation || '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Delivery</p>
                  <p className="text-gray-700">
                    {delivery?.deliveryLocation || order.deliveryAddress || '—'}
                  </p>
                </div>
              </div>
              {delivery?.distanceKm > 0 && (
                <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                  Estimated distance: {delivery.distanceKm} km
                </p>
              )}
              {delivery?.estimatedDelivery && (
                <p className="text-xs text-gray-500">
                  ETA: {formatDateTime(delivery.estimatedDelivery)}
                </p>
              )}
            </div>
          </div>

          {/* Order summary */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-600" /> Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items</span>
                <span>{order.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Placed</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
            <Link
              to={`/buyer/orders/${order._id}`}
              className="btn-secondary w-full justify-center mt-4 !py-2 text-sm"
            >
              View Full Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
