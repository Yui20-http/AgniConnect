import { useMemo, useState } from 'react';
import { BadgeCheck, Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import { userService } from '../services';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';

const identityTypes = ['Aadhaar', 'Voter ID', 'Driving Licence', 'Passport', 'Other government ID'];
const supportingOptions = {
  farmer: {
    title: 'Farm proof',
    types: ['Land record', 'Lease agreement', 'FPO registration', 'Other farm document'],
    profile: ['farmName', 'farmLocation'],
  },
  buyer: {
    title: 'Address proof',
    types: ['Utility bill', 'Bank statement', 'Ration card', 'Other address document'],
    profile: [],
  },
  delivery: {
    title: 'Vehicle proof',
    types: ['Vehicle registration certificate', 'Commercial permit', 'Other vehicle document'],
    profile: ['vehicleType', 'vehicleNumber'],
  },
};

const roleLabels = { farmer: 'Farmer', buyer: 'Buyer', delivery: 'Delivery partner' };

const KycVerificationForm = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const config = supportingOptions[user?.role];
  const [documentType, setDocumentType] = useState(user?.kycDocumentType || (user?.role === 'delivery' ? 'Driving Licence' : 'Aadhaar'));
  const [lastFour, setLastFour] = useState(user?.kycLastFour || '');
  const [supportingDocumentType, setSupportingDocumentType] = useState(user?.kycSupportingDocumentType || config?.types?.[0] || '');
  const [supportingLastFour, setSupportingLastFour] = useState(user?.kycSupportingLastFour || '');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const missingProfile = useMemo(() => {
    if (!config || !user) return [];
    return ['address', 'location', ...config.profile].filter((key) => !String(user[key] || '').trim());
  }, [config, user]);

  if (!config) return null;

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const { data } = await userService.submitKyc({ documentType, lastFour, supportingDocumentType, supportingLastFour, consent });
      updateUser(data.data);
      setConsent(false);
      toast.success('Verification request sent for admin review');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not submit verification');
    } finally {
      setSaving(false);
    }
  };

  const status = user?.kycStatus || 'not_submitted';
  const statusClass = status === 'verified' ? 'bg-green-100 text-green-800' : status === 'pending' ? 'bg-amber-100 text-amber-800' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';

  return (
    <section className="card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700"><ShieldCheck className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-900">{roleLabels[user.role]} verification</h2>
          <p className="mt-1 text-sm text-gray-500">Identity plus {config.title.toLowerCase()} details are reviewed by the AgriConnect admin team.</p>
        </div>
        <span className={`badge capitalize ${statusClass}`}>{status.replace('_', ' ')}</span>
      </div>

      {status === 'verified' ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Your account is verified</p><p className="mt-1">Submitted {user.kycSubmittedAt ? new Date(user.kycSubmittedAt).toLocaleDateString('en-IN') : ''}{user.kycReviewedAt ? ` · reviewed ${new Date(user.kycReviewedAt).toLocaleDateString('en-IN')}` : ''}.</p></div>
        </div>
      ) : (
        <>
          {status === 'pending' && <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Clock3 className="h-4 w-4 shrink-0" />Your request is in the review queue. You may update and resubmit it.</div>}
          {user?.kycReviewNote && status === 'rejected' && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Admin feedback:</strong> {user.kycReviewNote}</span></div>}
          {missingProfile.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Complete your profile first: {missingProfile.map((key) => key.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}.</div>}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="label">Government identity document</span><select className="input" value={documentType} onChange={(event) => setDocumentType(event.target.value)} required>{identityTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label><span className="label">Identity number · last four characters</span><input className="input" autoComplete="off" pattern="[A-Za-z0-9]{4}" maxLength={4} placeholder="••••" value={lastFour} onChange={(event) => setLastFour(event.target.value.replace(/[^a-z\d]/gi, '').slice(-4).toUpperCase())} required /></label>
              <label><span className="label">{config.title} document</span><select className="input" value={supportingDocumentType} onChange={(event) => setSupportingDocumentType(event.target.value)} required>{config.types.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label><span className="label">Reference number · last four characters</span><input className="input" autoComplete="off" pattern="[A-Za-z0-9]{4}" maxLength={4} placeholder="••••" value={supportingLastFour} onChange={(event) => setSupportingLastFour(event.target.value.replace(/[^a-z\d]/gi, '').slice(-4).toUpperCase())} required /></label>
            </div>
            <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3 text-xs leading-5 text-gray-600">
              Privacy: enter only the last four characters. Never enter a full Aadhaar or ID number, password, PIN, or OTP. This prototype stores document types and masked endings only; it does not perform government database or document authenticity checks.
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-600"><input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I confirm that my profile and the document details above are accurate, and consent to admin review for marketplace verification.</span></label>
            <button type="submit" className="btn-primary" disabled={saving || missingProfile.length > 0}>{saving ? 'Submitting…' : status === 'pending' ? 'Update request' : 'Submit for review'}</button>
          </form>
        </>
      )}
    </section>
  );
};

export default KycVerificationForm;
