import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private (Admin)
export const createNotification = async (req, res) => {
    try {
        const {
            title,
            message,
            type,
            recipient,
            recipientIds,
            relatedUser,
            relatedProvider,
            relatedAppointment,
            relatedPayment,
            priority,
            scheduledFor
        } = req.body;

        // If recipient is 'all', get all user IDs
        let finalRecipientIds = recipientIds || [];
        
        if (recipient === 'all') {
            const allUsers = await User.find({}, '_id');
            finalRecipientIds = allUsers.map(user => user._id);
        } else if (recipient === 'admin') {
            const admins = await User.find({ role: 'admin' }, '_id');
            finalRecipientIds = admins.map(user => user._id);
        } else if (recipient === 'provider') {
            const providers = await User.find({ category: { $in: ['provider', 'doctor', 'nurse'] } }, '_id');
            finalRecipientIds = providers.map(user => user._id);
        } else if (recipient === 'patient') {
            const patients = await User.find({ category: 'patient' }, '_id');
            finalRecipientIds = patients.map(user => user._id);
        }

        const notification = await Notification.create({
            title,
            message,
            type,
            recipient,
            recipientIds: finalRecipientIds,
            relatedUser,
            relatedProvider,
            relatedAppointment,
            relatedPayment,
            priority: priority || 'medium',
            status: scheduledFor ? 'scheduled' : 'sent',
            scheduledFor
        });

        res.status(201).json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error.message
        });
    }
};

// @desc    Get all notifications for admin
// @route   GET /api/notifications/admin
// @access  Private (Admin)
export const getAdminNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, isRead, priority } = req.query;

        const query = {
            $or: [
                { recipient: 'admin' },
                { recipient: 'all' },
                { recipientIds: req.user._id }
            ]
        };

        if (type) query.type = type;
        if (isRead !== undefined) {
            if (isRead === 'true') {
                query['readBy.userId'] = req.user._id;
            } else {
                query['readBy.userId'] = { $ne: req.user._id };
            }
        }
        if (priority) query.priority = priority;

        const notifications = await Notification.find(query)
            .populate('relatedUser', 'name email profileImage')
            .populate('relatedProvider', 'specialization')
            .populate('relatedAppointment')
            .populate('relatedPayment')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Notification.countDocuments(query);

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            ...query,
            'readBy.userId': { $ne: req.user._id }
        });

        res.status(200).json({
            success: true,
            notifications,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count,
            unreadCount
        });
    } catch (error) {
        console.error('Get admin notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// @desc    Get user notifications
// @route   GET /api/notifications/my
// @access  Private
export const getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, isRead } = req.query;

        const query = {
            $or: [
                { recipientIds: req.user._id },
                { recipient: 'all' }
            ]
        };

        if (type) query.type = type;
        if (isRead !== undefined) {
            if (isRead === 'true') {
                query['readBy.userId'] = req.user._id;
            } else {
                query['readBy.userId'] = { $ne: req.user._id };
            }
        }

        const notifications = await Notification.find(query)
            .populate('relatedUser', 'name email profileImage')
            .populate('relatedProvider', 'specialization')
            .populate('relatedAppointment')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Notification.countDocuments(query);

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            ...query,
            'readBy.userId': { $ne: req.user._id }
        });

        res.status(200).json({
            success: true,
            notifications,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count,
            unreadCount
        });
    } catch (error) {
        console.error('Get my notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Check if already read by this user
        const alreadyRead = notification.readBy.some(
            read => read.userId.toString() === req.user._id.toString()
        );

        if (!alreadyRead) {
            notification.readBy.push({
                userId: req.user._id,
                readAt: new Date()
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { recipientIds: req.user._id },
                { recipient: 'all' }
            ],
            'readBy.userId': { $ne: req.user._id }
        });

        for (const notification of notifications) {
            notification.readBy.push({
                userId: req.user._id,
                readAt: new Date()
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            count: notifications.length
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private (Admin)
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await notification.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            $or: [
                { recipientIds: req.user._id },
                { recipient: 'all' }
            ],
            'readBy.userId': { $ne: req.user._id }
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message
        });
    }
};

// Helper function to create notification (used by other controllers)
export const createSystemNotification = async ({
    title,
    message,
    type,
    recipient = 'admin',
    relatedUser,
    relatedProvider,
    relatedAppointment,
    relatedPayment,
    priority = 'medium'
}) => {
    try {
        let recipientIds = [];

        if (recipient === 'all') {
            const allUsers = await User.find({}, '_id');
            recipientIds = allUsers.map(user => user._id);
        } else if (recipient === 'admin') {
            const admins = await User.find({ role: 'admin' }, '_id');
            recipientIds = admins.map(user => user._id);
        } else if (recipient === 'provider') {
            const providers = await User.find({ category: { $in: ['provider', 'doctor', 'nurse'] } }, '_id');
            recipientIds = providers.map(user => user._id);
        } else if (recipient === 'patient') {
            const patients = await User.find({ category: 'patient' }, '_id');
            recipientIds = patients.map(user => user._id);
        }

        const notification = await Notification.create({
            title,
            message,
            type,
            recipient,
            recipientIds,
            relatedUser,
            relatedProvider,
            relatedAppointment,
            relatedPayment,
            priority,
            status: 'sent'
        });

        return notification;
    } catch (error) {
        console.error('Create system notification error:', error);
        throw error;
    }
};
