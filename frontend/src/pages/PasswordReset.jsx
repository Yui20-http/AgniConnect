import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Leaf, Mail, ShieldCheck } from 'lucide-react';
import { authService } from '../services';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/helpers';

const PasswordReset = () => {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const requestOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.requestPasswordReset(email);
      setRequested(true);
      toast.success('Reset code sent. Check your email.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.resetPassword({ email, otp, newPassword });
      toast.success('Password changed. You can now sign in.');
      window.location.assign('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <section className="mx-auto max-w-md card p-6 sm:p-8">
        <Link to="/" className="mb-7 flex items-center gap-2 text-xl font-extrabold text-gray-900"><span className="rounded-lg bg-primary-600 p-2"><Leaf className="h-5 w-5 text-white" /></span>Agri<span className="-ml-2 text-primary-600">Connect</span></Link>
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-500">We’ll email you a one-time code that expires in 15 minutes.</p>
        {!requested ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <label className="block"><span className="label">Email address</span><span className="relative block"><Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input pl-10" placeholder="you@example.com" /></span></label>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</button>
          </form>
        ) : (
          <form onSubmit={reset} className="mt-6 space-y-4">
            <label className="block"><span className="label">Email address</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></label>
            <label className="block"><span className="label">6-digit email code</span><span className="relative block"><ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value)} className="input pl-10" placeholder="123456" /></span></label>
            <label className="block"><span className="label">New password</span><input type="password" minLength={6} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input" /></label>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</button>
            <button type="button" onClick={requestOtp} disabled={busy} className="w-full text-sm text-primary-700 hover:underline">Send a new code</button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      </section>
    </main>
  );
};

export default PasswordReset;