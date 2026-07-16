import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import { createSystemNotification } from './NotificationController.js';

// @desc    Add review for a provider
// @route   POST /api/reviews
// @access  Private (Patient only)
export const addReview = async (req, res) => {
    const { providerId, appointmentId, rating, comment } = req.body;

    try {
        // Validation
        if (!providerId || !appointmentId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Please provide providerId, appointmentId, rating, and comment',
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5',
            });
        }

        // Check if user is patient
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can add reviews',
            });
        }

        // Check if appointment exists and belongs to this patient
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        if (appointment.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only review your own appointments',
            });
        }

        if (appointment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'You can only review completed appointments',
            });
        }

        // Check if review already exists for this appointment
        const existingReview = await Review.findOne({ appointmentId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this appointment',
            });
        }

        // Create review
        const review = await Review.create({
            patientId: req.user.id,
            providerId,
            appointmentId,
            rating,
            comment,
        });

        const populatedReview = await Review.findById(review._id)
            .populate('patientId', 'name')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            });

        // Create admin notification for new review
        try {
            const provider = await Provider.findById(providerId).populate('userId', 'name');
            await createSystemNotification({
                title: '⭐ New Review Submitted',
                message: `${user.name} gave ${rating}-star review for ${provider.userId.name}`,
                type: 'general',
                recipient: 'admin',
                relatedUser: req.user.id,
                relatedProvider: providerId,
                priority: 'low'
            });
        } catch (error) {
            console.error('Notification error:', error);
        }

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            review: populatedReview,
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding review',
            error: error.message,
        });
    }
};

// @desc    Get all reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
export const getProviderReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ providerId: req.params.providerId })
            .populate('patientId', 'name')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 4;

        res.status(200).json({
            success: true,
            count: reviews.length,
            averageRating: parseFloat(averageRating),
            reviews,
        });
    } catch (error) {
        console.error('Get provider reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews',
            error: error.message,
        });
    }
};

// @desc    Get my reviews (as patient)
// @route   GET /api/reviews/my-reviews
// @access  Private (Patient only)
export const getMyReviews = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can view their reviews',
            });
        }

        const reviews = await Review.find({ patientId: req.user.id })
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate('appointmentId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            reviews,
        });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews',
            error: error.message,
        });
    }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (Patient only)
export const updateReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            });
        }

        // Check if review belongs to this patient
        if (review.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review',
            });
        }

        if (rating) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5',
                });
            }
            review.rating = rating;
        }

        if (comment) {
            review.comment = comment;
        }

        await review.save();

        const updatedReview = await Review.findById(review._id)
            .populate('patientId', 'name')
            .populate({
                path: 'providerId',
                populate: { path: 'userId', select: 'name' }
            });

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            review: updatedReview,
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating review',
            error: error.message,
        });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Patient only)
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            });
        }

        // Check if review belongs to this patient
        if (review.patientId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review',
            });
        }

        await Review.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting review',
            error: error.message,
        });
    }
};

// @desc    Get my reviews as provider (reviews I received)
// @route   GET /api/reviews/provider/me
// @access  Private (Provider only)
export const getMyProviderReviews = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only providers can access this route',
            });
        }

        // Find provider profile
        const provider = await Provider.findOne({ userId: req.user.id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        const reviews = await Review.find({ providerId: provider._id })
            .populate('patientId', 'name email')
            .populate('appointmentId', 'date timeSlot')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 4;

        res.status(200).json({
            success: true,
            count: reviews.length,
            averageRating: parseFloat(averageRating),
            reviews,
        });
    } catch (error) {
        console.error('Get my provider reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews',
            error: error.message,
        });
    }
};
