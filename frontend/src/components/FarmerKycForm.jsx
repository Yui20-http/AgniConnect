import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { userService } from '../services';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';

const FarmerKycForm = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState(user?.kycDocumentType || 'Aadhaar');
  const [lastFour, setLastFour] = useState(user?.kycLastFour || '');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const { data } = await userService.submitKyc({ documentType, lastFour });
      updateUser(data.data);
      toast.success('Verification request sent to the admin team');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit verification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary-600" />
        <div><h2 className="font-bold text-gray-900">Farmer verification</h2><p className="text-sm text-gray-500">Listings are enabled after admin review.</p></div>
        <span className={`ml-auto badge ${user?.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : user?.kycStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{user?.kycStatus || 'not submitted'}</span>
      </div>
      {user?.kycStatus === 'verified' ? <p className="text-sm text-green-700">Your farmer account is verified and can publish listings.</p> : <>
        {user?.kycReviewNote && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Admin note: {user.kycReviewNote}</p>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label><span className="label">Identity document</span><select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="input"><option>Aadhaar</option><option>Voter ID</option><option>Driving Licence</option><option>Other government ID</option></select></label>
          <label><span className="label">Last four digits only</span><input className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
          <button className="btn-primary" disabled={saving}>{saving ? 'Submitting...' : user?.kycStatus === 'pending' ? 'Resubmit details' : 'Submit for review'}</button>
        </form>
        <p className="text-xs text-gray-400">Only the last four digits are stored. Do not enter your full ID number here.</p>
      </>}
    </section>
  );
};

export default FarmerKycForm;
