import { useEffect, useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { paymentService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const FarmerEarnings = () => {
  const { toast } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentService.getPayouts()
      .then(({ data }) => setReport(data.data))
      .catch((error) => toast.error(error?.response?.data?.message || 'Could not load earnings'))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <LoadingSpinner fullScreen label="Loading earnings..." />;
  const totals = report?.totals || {};

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h2>
        <p className="mt-1 text-sm text-gray-500">Completed-order earnings, platform commission, and settlement status.</p>
      </header>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          ['Completed produce sales', totals.grossProduceSales],
          [`Platform commission (${report?.commissionRate ?? 6}%)`, totals.platformCommission],
          ['Net earnings', totals.earned],
          ['Awaiting delivery', totals.awaitingDelivery],
          ['Pending settlement', totals.pendingSettlement],
          ['Settled', totals.settled],
        ].map(([label, amount]) => (
          <section key={label} className="card p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(amount || 0)}</p>
          </section>
        ))}
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{report?.settlementNote}</p>
      {!report?.orders?.length ? (
        <div className="card"><EmptyState icon={IndianRupee} title="No earnings yet" message="Order earnings will appear here as buyers purchase your products." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr><th className="px-4 py-3">Order / Buyer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Produce sales</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-right">Net to farmer</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.orders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-4 py-3"><p className="font-semibold text-gray-800">{order.orderNumber}</p><p className="text-xs text-gray-500">{order.buyer}</p></td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(order.deliveredAt || order.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(order.grossProduceSales || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(order.commissionAmount || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.farmerPayoutAmount || 0)}</td>
                    <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-700">{order.payoutStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerEarnings;
