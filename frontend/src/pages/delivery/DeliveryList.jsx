import { useEffect, useRef, useState } from 'react';
import { Truck, MapPin, Phone, Package, Filter, Navigation, Radio } from 'lucide-react';
import { deliveryService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Modal from '../../components/Modal';

const FILTERS = ['All', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];

/**
 * DeliveryList - the delivery partner's workflow: pick up, transit, deliver.
 */
const DeliveryList = () => {
  const { toast } = useToast();
  const { socket } = useSocket();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);
  const [gpsDeliveryId, setGpsDeliveryId] = useState('');
  const [completeDelivery, setCompleteDelivery] = useState(null);
  const [proof, setProof] = useState({ otp: '', recipientName: '', proofNote: '' });
  const [proofPhoto, setProofPhoto] = useState(null);
  const watchId = useRef(null);
  const lastGpsSentAt = useRef(0);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await deliveryService.getMy();
      setDeliveries(data.data);
    } catch (err) {
      toast.error('Could not load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when a new delivery is assigned in real time.
  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on('delivery:assigned', handler);
    return () => socket.off('delivery:assigned', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (!gpsDeliveryId) return undefined;
    if (!navigator.geolocation) {
      toast.warning('This device does not support GPS location sharing.');
      setGpsDeliveryId('');
      return undefined;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastGpsSentAt.current < 8000) return;
        lastGpsSentAt.current = now;
        deliveryService.updateLocation(gpsDeliveryId, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
          speedKph: position.coords.speed == null ? null : position.coords.speed * 3.6,
        }).catch((error) => toast.error(error?.response?.data?.message || 'Could not share GPS location'));
      },
      () => {
        toast.error('GPS access was denied or unavailable.');
        setGpsDeliveryId('');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [gpsDeliveryId, toast]);

  const updateStatus = async (delivery, status, payload = {}) => {
    try {
      setBusyId(delivery._id);
      const requestBody = payload instanceof FormData ? payload : { status, ...payload };
      if (payload instanceof FormData) requestBody.set('status', status);
      await deliveryService.updateStatus(delivery._id, requestBody);
      toast.success(`Marked as ${status}`);
      if (status === 'Delivered') {
        setGpsDeliveryId('');
        setCompleteDelivery(null);
        setProof({ otp: '', recipientName: '', proofNote: '' });
        setProofPhoto(null);
      }
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update delivery');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelivery = async (event) => {
    event.preventDefault();
    const form = new FormData();
    form.append('status', 'Delivered');
    form.append('otp', proof.otp);
    form.append('recipientName', proof.recipientName);
    form.append('proofNote', proof.proofNote);
    if (proofPhoto) form.append('proofPhoto', proofPhoto);
    await updateStatus(completeDelivery, 'Delivered', form);
  };

  const nextAction = (d) => {
    switch (d.status) {
      case 'Assigned':
        return { label: 'Mark Picked Up', status: 'Picked Up' };
      case 'Picked Up':
        return { label: 'Start Transit', status: 'In Transit' };
      case 'In Transit':
        return { label: 'Mark Delivered', status: 'Delivered' };
      default:
        return null;
    }
  };

  const filtered = filter === 'All' ? deliveries : deliveries.filter((d) => d.status === filter);

  if (loading) return <LoadingSpinner fullScreen label="Loading deliveries..." />;

  return (
    <div className="space-y-5">
      <Modal isOpen={!!completeDelivery} onClose={() => setCompleteDelivery(null)} title="Confirm proof of delivery" size="sm">
        <form onSubmit={confirmDelivery} className="space-y-4">
          <p className="text-sm text-gray-600">Enter the OTP provided by the buyer. The order cannot be completed without this verification.</p>
          <label className="block"><span className="label">6-digit buyer OTP *</span><input className="input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={proof.otp} onChange={(event) => setProof((current) => ({ ...current, otp: event.target.value }))} /></label>
          <label className="block"><span className="label">Received by *</span><input className="input" required maxLength={100} value={proof.recipientName} onChange={(event) => setProof((current) => ({ ...current, recipientName: event.target.value }))} placeholder="Recipient name" /></label>
          <label className="block"><span className="label">Delivery note</span><textarea className="input" maxLength={500} rows={2} value={proof.proofNote} onChange={(event) => setProof((current) => ({ ...current, proofNote: event.target.value }))} placeholder="Optional handoff details" /></label>
          <label className="block"><span className="label">Photo proof (optional)</span><input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProofPhoto(event.target.files?.[0] || null)} /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setCompleteDelivery(null)} className="btn-secondary">Cancel</button><button className="btn-primary" disabled={busyId === completeDelivery?._id}>{busyId === completeDelivery?._id ? 'Verifying…' : 'Verify & deliver'}</button></div>
        </form>
      </Modal>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Deliveries</h2>
          <p className="text-sm text-gray-500">{deliveries.length} assignment(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-2 sm:w-44">
            {FILTERS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Truck}
            title="No deliveries found"
            message={filter === 'All' ? 'You have no assigned deliveries yet.' : `No deliveries with status "${filter}".`}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((d) => {
            const action = nextAction(d);
            return (
              <div key={d._id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{d.order?.orderNumber || 'Order'}</p>
                      <p className="text-xs text-gray-500">{formatDate(d.createdAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Pickup from</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {d.farmer?.farmName || d.farmer?.name || 'Farmer'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{d.pickupLocation}</p>
                      {d.farmer?.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {d.farmer.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-earth-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Navigation className="w-3.5 h-3.5 text-earth-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Deliver to</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {d.buyer?.name || 'Buyer'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{d.deliveryLocation}</p>
                      {d.buyer?.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {d.buyer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Order Value</p>
                    <p className="font-bold text-primary-700">
                      {formatCurrency(d.order?.grandTotal || 0)}
                    </p>
                  </div>
                  {action ? (
                    <button
                      onClick={() => action.status === 'Delivered' ? setCompleteDelivery(d) : updateStatus(d, action.status)}
                      disabled={busyId === d._id}
                      className="btn-primary !py-2"
                    >
                      {busyId === d._id ? 'Updating...' : action.label}
                    </button>
                  ) : (
                    <span className="badge bg-green-100 text-green-700">Completed</span>
                  )}
                </div>
                {['Picked Up', 'In Transit'].includes(d.status) && (
                  <button onClick={() => setGpsDeliveryId((current) => current === d._id ? '' : d._id)} className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${gpsDeliveryId === d._id ? 'bg-red-50 text-red-700' : 'btn-secondary'}`}>
                    <Radio className={`h-4 w-4 ${gpsDeliveryId === d._id ? 'animate-pulse' : ''}`} />{gpsDeliveryId === d._id ? 'Stop live GPS' : 'Share live GPS'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryList;
