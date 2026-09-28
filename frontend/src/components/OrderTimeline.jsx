import { Check, Clock } from 'lucide-react';
import { orderStatusFlow, formatDateTime } from '../utils/helpers';

/**
 * OrderTimeline - visual vertical timeline of an order's status history.
 * Shows the full expected flow with completed / current / upcoming states.
 */
const OrderTimeline = ({ order }) => {
  const history = order?.statusHistory || [];
  const currentStatus = order?.status;
  const isCancelled = currentStatus === 'Cancelled';

  // Map each status to the time it was reached (if ever).
  const reachedAt = {};
  history.forEach((h) => {
    reachedAt[h.status] = h.at || h.changedAt || h.createdAt || h.date;
  });

  const currentIndex = orderStatusFlow.indexOf(currentStatus);

  return (
    <div className="space-y-1">
      {orderStatusFlow.map((status, idx) => {
        const reached = !!reachedAt[status] || (currentIndex >= 0 && idx <= currentIndex);
        const isCurrent = status === currentStatus;
        const time = reachedAt[status];

        return (
          <div key={status} className="flex gap-3">
            {/* Marker + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  reached
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-200 text-gray-300'
                } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
              >
                {reached ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              {idx < orderStatusFlow.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[28px] ${
                    reached && idx < currentIndex ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-4 pt-1">
              <p
                className={`text-sm font-semibold ${
                  isCurrent ? 'text-primary-700' : reached ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                {status}
                {isCurrent && (
                  <span className="ml-2 badge bg-primary-100 text-primary-700 text-[10px]">Current</span>
                )}
              </p>
              {time && <p className="text-xs text-gray-400">{formatDateTime(time)}</p>}
            </div>
          </div>
        );
      })}

      {isCancelled && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-red-500 text-white">
            <Check className="w-4 h-4" />
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-red-600">Cancelled</p>
            {order.cancelReason && <p className="text-xs text-gray-400">{order.cancelReason}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
