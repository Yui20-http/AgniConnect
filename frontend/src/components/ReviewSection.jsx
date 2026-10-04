import { useEffect, useState } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import { reviewService } from '../services';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';

const ReviewSection = ({ type, targetId, title }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = type === 'product'
        ? await reviewService.getProductReviews(targetId)
        : await reviewService.getFarmerReviews(targetId);
      setReviews(response.data?.data || []);
    } catch {
      toast.error(`Could not load ${title.toLowerCase()}`);
    }
  };

  useEffect(() => {
    if (targetId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, type]);

  const submit = async (event) => {
    event.preventDefault();
    if (user?.role !== 'buyer') {
      toast.warning('Sign in as a buyer to leave a review.');
      return;
    }

    try {
      setSaving(true);
      const payload = { rating: Number(rating), comment };
      if (type === 'product') await reviewService.addProductReview(targetId, payload);
      else await reviewService.addFarmerReview(targetId, payload);
      setComment('');
      toast.success('Review saved');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save review');
    } finally {
      setSaving(false);
    }
  };

  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <section className="card p-5 mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="inline-flex items-center gap-1 text-sm text-amber-600">
          <Star className="w-4 h-4 fill-amber-400" /> {average} ({reviews.length})
        </span>
      </div>

      {user?.role === 'buyer' && (
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-[130px_1fr_auto] gap-2">
          <label className="sr-only" htmlFor={`${type}-rating`}>Rating</label>
          <select id={`${type}-rating`} className="input" value={rating} onChange={(event) => setRating(event.target.value)}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>)}
          </select>
          <label className="sr-only" htmlFor={`${type}-comment`}>Review</label>
          <input id={`${type}-comment`} className="input" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share your experience" />
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Review'}</button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {reviews.map((review) => (
          <article key={review._id} className="border-t border-gray-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-gray-800">{review.buyer?.name || 'Buyer'}</span>
              <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Star className="w-3 h-3 fill-amber-400" /> {review.rating}/5</span>
              {review.verifiedBuyer && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"><BadgeCheck className="w-3.5 h-3.5" /> Verified purchase</span>}
              <time className="ml-auto text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</time>
            </div>
            {review.comment && <p className="mt-1 text-sm text-gray-600">{review.comment}</p>}
          </article>
        ))}
        {!reviews.length && <p className="text-sm text-gray-500">No reviews yet.</p>}
      </div>
    </section>
  );
};

export default ReviewSection;