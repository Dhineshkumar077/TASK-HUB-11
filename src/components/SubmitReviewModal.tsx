import React, { useState } from 'react';
import { Star, X, CheckCircle, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../services/api.ts';
import type { Review, RatingBreakdown } from '../types.ts';

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  revieweeId: string;
  revieweeName: string;
  revieweeRole: string;
  division: 'MICRO_GIG' | 'LOCAL_SERVICE';
  gigId?: string;
  bookingId?: string;
  jobTitle: string;
  onReviewSubmitted?: (review: Review, breakdown: RatingBreakdown) => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: '1 Star — Poor Experience',
  2: '2 Stars — Fair, Needed Improvement',
  3: '3 Stars — Good, Met Expectations',
  4: '4 Stars — Very Good, High Quality',
  5: '5 Stars — Outstanding & Highly Recommended!',
};

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({
  isOpen,
  onClose,
  revieweeId,
  revieweeName,
  revieweeRole,
  division,
  gigId,
  bookingId,
  jobTitle,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comment.trim() || comment.trim().length < 3) {
      setError('Please provide a constructive review comment (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitReview({
        revieweeId,
        division,
        gigId,
        bookingId,
        rating,
        comment: comment.trim(),
      });

      setSuccessMsg(res.message || 'Review submitted successfully!');
      if (onReviewSubmitted) {
        onReviewSubmitted(res.review, res.breakdown);
      }
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setComment('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel =
    revieweeRole === 'TECH_PARTNER'
      ? 'Tech Partner / Service Professional'
      : revieweeRole === 'SERVICE_SEEKER'
      ? 'Service Seeker / Customer'
      : revieweeRole === 'GIG_PARTNER'
      ? 'Gig Partner / Shift Worker'
      : 'Gig Host / Employer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Verified Counter-Party Review</h3>
              <p className="text-[11px] text-slate-400">E-Commerce Style Dynamic Rating Aggregation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Context Info */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Reviewee:</span>
              <span className="font-bold text-white">{revieweeName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Portal Role:</span>
              <span className="text-indigo-400 font-semibold">{roleLabel}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-1.5 mt-1.5">
              <span className="text-slate-400">Completed Work:</span>
              <span className="text-slate-200 font-mono truncate max-w-[200px]">{jobTitle}</span>
            </div>
          </div>

          {/* Interactive Star Selection */}
          <div className="text-center space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Rate Your Experience (1 to 5 Stars)
            </label>

            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 transition transform hover:scale-125 active:scale-95 cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      s <= displayRating
                        ? 'text-amber-400 fill-amber-400 filter drop-shadow(0 0 6px rgba(251,191,36,0.4))'
                        : 'text-slate-700 hover:text-slate-500'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-amber-300 min-h-5 transition">
              {RATING_DESCRIPTIONS[displayRating]}
            </div>
          </div>

          {/* Written Feedback Comment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Detailed Written Feedback</span>
              <span className="text-[10px] text-slate-500 font-normal">Displayed on public profile</span>
            </label>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe punctuality, quality of work, professional conduct, communication..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
            />
          </div>

          {/* Escrow & Integrity Guarantee Note */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Real-time aggregation: Your rating directly updates the arithmetic mean and star distribution on the user's public profile.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'Aggregating...' : 'Submit Verified Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
