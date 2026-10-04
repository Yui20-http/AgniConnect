import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { reportService } from '../../services';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const AdminReports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const load = async () => {
    try { const { data } = await reportService.getAll(); setReports(data.data || []); }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not load reports'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const update = async (report, status) => {
    try {
      await reportService.update(report._id, { status, adminNote: notes[report._id] ?? report.adminNote });
      toast.success('Report updated'); load();
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not update report'); }
  };
  if (loading) return <LoadingSpinner fullScreen label="Loading reports..." />;
  return <div className="space-y-5">
    <header><h2 className="text-xl font-bold text-gray-900">Reports & disputes</h2><p className="text-sm text-gray-500">Review buyer and seller reports and record the resolution.</p></header>
    {!reports.length ? <div className="card"><EmptyState icon={Flag} title="No reports" message="New reports will appear here." /></div> : <div className="space-y-4">{reports.map((report) => <article key={report._id} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-gray-500">{report.targetType} · {String(report.targetId).slice(-8)}</p><h3 className="mt-1 font-bold">{report.reason}</h3><p className="mt-1 text-xs text-gray-500">From {report.reporter?.name || 'User'} · {new Date(report.createdAt).toLocaleString()}</p></div><span className="badge bg-amber-50 text-amber-800">{report.status}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{report.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input className="input" placeholder="Internal review note" value={notes[report._id] ?? report.adminNote ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [report._id]: event.target.value }))} /><select className="input" defaultValue={report.status} onChange={(event) => update(report, event.target.value)}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><button className="btn-secondary" onClick={() => update(report, report.status)}>Save note</button></div>
      {report.adminNote && <p className="mt-2 text-xs text-gray-500">Previous note: {report.adminNote}</p>}
    </article>)}</div>}
  </div>;
};
export default AdminReports;
