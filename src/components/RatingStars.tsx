import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp, CheckCircle, ShieldCheck } from 'lucide-react';
import type { RatingBreakdown, Review } from '../types.ts';

interface RatingStarsProps {
  rating: number;
  totalReviews?: number;
  breakdown?: RatingBreakdown;
  reviews?: Review[];
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showBreakdownToggle?: boolean;
  interactiveModal?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  totalReviews = 0,
  breakdown,
  reviews = [],
  size = 'md',
  showCount = true,
  showBreakdownToggle = false,
}) => {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  const starSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-bold',
  };

  // If no reviews have been submitted yet
  if (!totalReviews || totalReviews === 0 || rating === 0) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs font-semibold">
          <Star className="w-3 h-3 text-slate-500 fill-transparent" />
          <span>New</span>
        </span>
        {showCount && <span className="text-[11px] text-slate-500">(0 reviews)</span>}
      </div>
    );
  }

  // Flipkart/Amazon style badge color
  const badgeColorClass =
    rating >= 4.0
      ? 'bg-emerald-600 text-white'
      : rating >= 3.0
      ? 'bg-amber-600 text-white'
      : 'bg-rose-600 text-white';

  return (
    <div className="relative inline-block text-left">
      <div className="inline-flex items-center gap-2">
        {/* Amazon/Flipkart Pill Badge */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold tracking-tight shadow-sm ${badgeColorClass} ${textSizeClasses[size]}`}
        >
          <span>{rating.toFixed(1)}</span>
          <Star className={`${starSizeClasses[size]} fill-current text-white`} />
        </div>

        {/* Total verified count */}
        {showCount && (
          <span className="text-xs text-slate-400 font-medium hover:text-slate-200 transition">
            {totalReviews.toLocaleString()} verified review{totalReviews === 1 ? '' : 's'}
          </span>
        )}

        {/* Optional Toggle for Breakdown */}
        {showBreakdownToggle && (breakdown || reviews.length > 0) && (
          <button
            type="button"
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-0.5 ml-1 transition cursor-pointer"
          >
            <span>Rating Details</span>
            {showDetailedBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Flipkart / Amazon Style Detailed Rating Breakdown Dropdown / Card */}
      {showDetailedBreakdown && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-slate-200 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-black text-white">{rating.toFixed(1)}</div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600 fill-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-slate-400">
                  Based on {totalReviews} counter-party rating{totalReviews === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Only
            </div>
          </div>

          {/* Star Rating Distribution Bars (5★ to 1★) */}
          <div className="space-y-1.5 text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = breakdown ? breakdown.starCounts[stars as 1 | 2 | 3 | 4 | 5] || 0 : 0;
              const percentage = breakdown ? breakdown.starPercentages[stars as 1 | 2 | 3 | 4 | 5] || 0 : 0;
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="w-7 text-right text-slate-400 font-semibold">{stars} ★</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-9 text-right font-mono text-[11px] text-slate-400">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Reviews Sample */}
          {reviews && reviews.length > 0 && (
            <div className="border-t border-slate-800 pt-3 space-y-2.5 max-h-48 overflow-y-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Recent Completed Job Reviews
              </span>
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1">
                      {r.reviewerName}
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      {r.rating} ★
                    </span>
                  </div>
                  {r.jobTitle && (
                    <div className="text-[10px] text-indigo-400 truncate font-mono">
                      {r.jobTitle}
                    </div>
                  )}
                  <p className="text-slate-300 text-[11px] italic">"{r.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
