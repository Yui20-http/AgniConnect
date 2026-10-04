import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminService } from '../../services';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const AdminAuditLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminService.getAuditLogs().then(({ data }) => setLogs(data.data || []))
      .catch((error) => toast.error(error?.response?.data?.message || 'Could not load audit history'))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingSpinner fullScreen label="Loading audit history..." />;
  return <div className="space-y-5"><header><h2 className="text-xl font-bold text-gray-900">Audit history</h2><p className="text-sm text-gray-500">Recent admin and moderation actions.</p></header>
    {!logs.length ? <div className="card"><EmptyState icon={ScrollText} title="No audit actions yet" message="Admin actions will be recorded here." /></div> : <div className="card divide-y">{logs.map((log) => <div key={log._id} className="p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{log.action}</strong><time className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-gray-600">{log.actor?.name || 'System'} · {log.targetType} {log.targetId}</p>{log.details && <p className="mt-1 text-sm text-gray-500">{log.details}</p>}</div>)}</div>}
  </div>;
};
export default AdminAuditLogs;
