import { Router } from 'express';
import type { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { authMiddleware } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import type { Review } from '../types.ts';

const router = Router();

// 1. Submit a Counter-Party Dynamic Review (Ratings can ONLY be submitted by active counter-parties upon job completion)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const reviewer = req.user!;
  const { revieweeId, division, gigId, bookingId, rating, comment } = req.body;

  if (!revieweeId || !division) {
    res.status(400).json({ error: 'Reviewee ID and division are required.' });
    return;
  }

  const numRating = parseInt(String(rating), 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({ error: 'Rating must be an integer between 1 and 5 stars.' });
    return;
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
    res.status(400).json({ error: 'Please provide a detailed review comment (minimum 3 characters).' });
    return;
  }

  const reviewee = db.findUserById(revieweeId);
  if (!reviewee) {
    res.status(404).json({ error: 'Reviewee user account not found.' });
    return;
  }

  let jobTitle = 'Completed Task';

  if (division === 'LOCAL_SERVICE') {
    if (!bookingId) {
      res.status(400).json({ error: 'Booking ID is required for local service reviews.' });
      return;
    }

    const booking = db.findBookingById(bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking record not found.' });
      return;
    }

    // Verify booking is completed / approved
    const isCompleted =
      booking.status === 'COMPLETED' ||
      booking.customerApproved === true ||
      booking.paymentStatus === 'RELEASED_TO_PARTNER';

    if (!isCompleted) {
      res.status(400).json({
        error: 'Rating restriction: Counter-party reviews can ONLY be submitted after work is marked completed and settled.',
      });
      return;
    }

    // Counter-party authorization check
    const isSeekerReviewingTech = reviewer.id === booking.seekerId && revieweeId === booking.techPartnerId;
    const isTechReviewingSeeker = reviewer.id === booking.techPartnerId && revieweeId === booking.seekerId;

    if (!isSeekerReviewingTech && !isTechReviewingSeeker) {
      res.status(403).json({
        error: 'Unauthorized: Only the active counter-parties of this completed booking can rate each other.',
      });
      return;
    }

    // Duplicate check
    const existingReview = db.findReview(reviewer.id, revieweeId, undefined, bookingId);
    if (existingReview) {
      res.status(400).json({ error: 'You have already submitted a review for this completed booking.' });
      return;
    }

    jobTitle = booking.serviceTitle;
  } else if (division === 'MICRO_GIG') {
    if (!gigId) {
      res.status(400).json({ error: 'Gig ID is required for micro-gig reviews.' });
      return;
    }

    const gig = db.findGigById(gigId);
    if (!gig) {
      res.status(404).json({ error: 'Gig record not found.' });
      return;
    }

    // Check attendance records for completion
    const isHostReviewingPartner = reviewer.id === gig.hostId;
    const isPartnerReviewingHost = revieweeId === gig.hostId;

    if (!isHostReviewingPartner && !isPartnerReviewingHost) {
      res.status(403).json({
        error: 'Unauthorized: Only active counter-parties for this gig can submit ratings.',
      });
      return;
    }

    const partnerId = isHostReviewingPartner ? revieweeId : reviewer.id;
    const attendance = db.findGigAttendance(gigId, partnerId);

    const isGigCompleted =
      gig.status === 'COMPLETED' ||
      (attendance && (attendance.status === 'APPROVED' || attendance.hostApproved === true || attendance.checkOutTime));

    if (!isGigCompleted) {
      res.status(400).json({
        error: 'Rating restriction: Reviews can only be submitted after work has been completed and approved.',
      });
      return;
    }

    // Duplicate check
    const existingReview = db.findReview(reviewer.id, revieweeId, gigId, undefined);
    if (existingReview) {
      res.status(400).json({ error: 'You have already submitted a review for this gig.' });
      return;
    }

    jobTitle = gig.title;
  } else {
    res.status(400).json({ error: 'Invalid platform division.' });
    return;
  }

  const newReview: Review = {
    id: crypto.randomUUID(),
    reviewerId: reviewer.id,
    reviewerName: reviewer.fullName,
    reviewerRole: reviewer.role,
    revieweeId: reviewee.id,
    revieweeName: reviewee.fullName,
    revieweeRole: reviewee.role,
    division,
    gigId: gigId || undefined,
    bookingId: bookingId || undefined,
    jobTitle,
    rating: numRating,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };

  const breakdown = db.addReview(newReview);

  // Send system notification to reviewee
  db.addNotification({
    id: crypto.randomUUID(),
    userId: reviewee.id,
    title: '⭐ New Rating & Review Received!',
    message: `${reviewer.fullName} gave you ${numRating} stars: "${comment.trim().slice(0, 80)}${comment.trim().length > 80 ? '...' : ''}". New average: ${breakdown.averageRating}★ (${breakdown.totalReviews} review${breakdown.totalReviews === 1 ? '' : 's'}).`,
    type: 'INFO',
    link: '/profile',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    message: `Thank you! Your verified ${numRating}-star review was submitted and aggregated into ${reviewee.fullName}'s profile.`,
    review: newReview,
    breakdown,
  });
});

// 2. Get Aggregated Dynamic Rating Breakdown & Reviews for any user
router.get('/user/:userId', (req, res: Response) => {
  const { userId } = req.params;
  const user = db.findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const breakdown = db.calculate_average_rating(userId);
  const reviews = db.getReviews(userId);

  res.json({
    userId,
    userName: user.fullName,
    role: user.role,
    breakdown,
    reviews,
  });
});

// 3. Get pending unrated completed tasks for the current authenticated user
router.get('/pending', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const pending: Array<{
    division: 'LOCAL_SERVICE' | 'MICRO_GIG';
    jobId: string;
    bookingId?: string;
    gigId?: string;
    title: string;
    counterpartId: string;
    counterpartName: string;
    counterpartRole: string;
    date: string;
  }> = [];

  // 1. Check Local Service Bookings
  const bookings = db.getBookings().filter((b) => b.seekerId === userId || b.techPartnerId === userId);
  for (const b of bookings) {
    const isCompleted = b.status === 'COMPLETED' || b.customerApproved === true;
    if (isCompleted) {
      const counterpartId = b.seekerId === userId ? b.techPartnerId : b.seekerId;
      const counterpartName = b.seekerId === userId ? b.techPartnerName : b.seekerName;
      const counterpartRole = b.seekerId === userId ? 'TECH_PARTNER' : 'SERVICE_SEEKER';

      const hasReviewed = db.findReview(userId, counterpartId, undefined, b.id);
      if (!hasReviewed) {
        pending.push({
          division: 'LOCAL_SERVICE',
          jobId: b.id,
          bookingId: b.id,
          title: b.serviceTitle,
          counterpartId,
          counterpartName,
          counterpartRole,
          date: b.serviceDate,
        });
      }
    }
  }

  // 2. Check Micro-Gigs
  if (userRole === 'GIG_HOST') {
    const hostGigs = db.getGigs().filter((g) => g.hostId === userId);
    for (const gig of hostGigs) {
      const attendances = db.getGigAttendance(gig.id);
      for (const att of attendances) {
        if (att.hostApproved || att.status === 'APPROVED' || gig.status === 'COMPLETED') {
          const hasReviewed = db.findReview(userId, att.partnerId, gig.id, undefined);
          if (!hasReviewed) {
            pending.push({
              division: 'MICRO_GIG',
              jobId: gig.id,
              gigId: gig.id,
              title: gig.title,
              counterpartId: att.partnerId,
              counterpartName: att.partnerName,
              counterpartRole: 'GIG_PARTNER',
              date: gig.workDate,
            });
          }
        }
      }
    }
  } else if (userRole === 'GIG_PARTNER') {
    const partnerAttendances = db.getAttendanceByPartner(userId);
    for (const att of partnerAttendances) {
      if (att.hostApproved || att.status === 'APPROVED') {
        const gig = db.findGigById(att.gigId);
        if (gig) {
          const hasReviewed = db.findReview(userId, gig.hostId, gig.id, undefined);
          if (!hasReviewed) {
            pending.push({
              division: 'MICRO_GIG',
              jobId: gig.id,
              gigId: gig.id,
              title: gig.title,
              counterpartId: gig.hostId,
              counterpartName: gig.hostName,
              counterpartRole: 'GIG_HOST',
              date: gig.workDate,
            });
          }
        }
      }
    }
  }

  res.json({ pending });
});

export default router;
