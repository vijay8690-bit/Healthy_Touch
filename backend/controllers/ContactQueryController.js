import ContactQuery from '../models/ContactQuery.js';
import User from '../models/User.js';
import { createSystemNotification } from './NotificationController.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';

// @desc    Submit a question (Public - No authentication)
// @route   POST /api/contact/submit
// @access  Public
export const submitQuestion = async (req, res) => {
    try {
        const { email, message } = req.body;

        // Validation
        if (!email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and message',
            });
        }

        // Get IP and user agent (optional)
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Create query
        const query = await ContactQuery.create({
            email,
            message,
            ipAddress,
            userAgent,
        });

        // Notify all admins
        try {
            const admins = await User.find({ role: 'admin' }, '_id email name');
            
            // Create notification for admins
            await createSystemNotification({
                title: '💬 New Question Received',
                message: `New question from ${email}: ${message.substring(0, 50)}...`,
                type: 'contact_query',
                recipient: 'admin',
                priority: 'medium',
            });

            // Send email to all admins
            const emailPromises = admins.map((admin) =>
                sendTemplateEmail({
                    to: admin.email,
                    subject: 'New Question Received - Healthy Touch',
                    template: 'newContactQuery',
                    data: {
                        adminName: admin.name,
                        userEmail: email,
                        message,
                        queryId: query._id,
                        submittedAt: new Date().toLocaleString('en-IN'),
                    },
                }).catch(err => console.error(`Email to ${admin.email} failed:`, err))
            );

            await Promise.all(emailPromises);
        } catch (notifError) {
            console.error('Admin notification error:', notifError);
            // Don't fail submission if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'Your question has been submitted successfully. We will respond soon!',
            queryId: query._id,
        });
    } catch (error) {
        console.error('Submit question error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting question',
            error: error.message,
        });
    }
};

// @desc    Get all queries (Admin only)
// @route   GET /api/admin/queries
// @access  Private/Admin
export const getAllQueries = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const queries = await ContactQuery.find(filter)
            .populate('repliedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ContactQuery.countDocuments(filter);
        const stats = await ContactQuery.getStatistics();

        res.status(200).json({
            success: true,
            queries,
            stats,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get all queries error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching queries',
            error: error.message,
        });
    }
};

// @desc    Reply to a query (Admin only)
// @route   POST /api/admin/queries/:id/reply
// @access  Private/Admin
export const replyToQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        if (!reply) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reply',
            });
        }

        const query = await ContactQuery.findById(id);

        if (!query) {
            return res.status(404).json({
                success: false,
                message: 'Query not found',
            });
        }

        // Update query
        query.adminReply = reply;
        query.status = 'REPLIED';
        query.repliedBy = req.user.id;
        query.repliedAt = new Date();
        await query.save();

        // Send email to user
        try {
            await sendTemplateEmail({
                to: query.email,
                subject: 'Response to Your Question - Healthy Touch',
                template: 'queryReply',
                data: {
                    userEmail: query.email,
                    originalMessage: query.message,
                    adminReply: reply,
                    repliedBy: req.user.name,
                    repliedAt: new Date().toLocaleString('en-IN'),
                },
            });
        } catch (emailError) {
            console.error('Reply email error:', emailError);
            // Don't fail the reply if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Reply sent successfully',
            query,
        });
    } catch (error) {
        console.error('Reply to query error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending reply',
            error: error.message,
        });
    }
};

// @desc    Update query status (Admin only)
// @route   PUT /api/admin/queries/:id/status
// @access  Private/Admin
export const updateQueryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['OPEN', 'REPLIED', 'CLOSED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be OPEN, REPLIED, or CLOSED',
            });
        }

        const query = await ContactQuery.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate('repliedBy', 'name email');

        if (!query) {
            return res.status(404).json({
                success: false,
                message: 'Query not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Query status updated',
            query,
        });
    } catch (error) {
        console.error('Update query status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating status',
            error: error.message,
        });
    }
};

// @desc    Delete a query (Admin only)
// @route   DELETE /api/admin/queries/:id
// @access  Private/Admin
export const deleteQuery = async (req, res) => {
    try {
        const { id } = req.params;

        const query = await ContactQuery.findByIdAndDelete(id);

        if (!query) {
            return res.status(404).json({
                success: false,
                message: 'Query not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Query deleted successfully',
        });
    } catch (error) {
        console.error('Delete query error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting query',
            error: error.message,
        });
    }
};
