/**
 * Email Templates for Healthy Touch Platform
 * All HTML templates for various email notifications
 */

// Base email wrapper
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Healthy Touch</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #667eea;
            margin-top: 0;
            font-size: 24px;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .info-box strong {
            display: block;
            color: #667eea;
            margin-bottom: 5px;
        }
        .warning-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .success-box {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .danger-box {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Healthy Touch</h1>
        </div>
        ${content}
        <div class="footer">
            <p>This is an automated message from Healthy Touch Platform.</p>
            <p>For support, contact: <a href="mailto:admin@healthytouch.com">admin@healthytouch.com</a></p>
            <p>&copy; 2025 Healthy Touch. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// 1. Provider Approval Email
export const providerApprovalTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>🎉 Congratulations! Your Profile Has Been Approved</h2>
            <p>Dear Dr. ${data.providerName},</p>
            <p>We are pleased to inform you that your provider profile on <strong>Healthy Touch</strong> has been successfully approved!</p>
            
            <div class="success-box">
                <strong>✅ What's Next?</strong>
                <p style="margin: 10px 0 0 0;">
                    • Start receiving appointment bookings<br>
                    • Manage your availability schedule<br>
                    • Update your profile anytime<br>
                    • Serve patients in your area
                </p>
            </div>

            <div class="info-box">
                <strong>📋 Profile Details</strong>
                <p style="margin: 5px 0 0 0;">
                    Status: <strong style="color: #28a745;">Approved</strong><br>
                    Approved on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <p>You can now login to your account and start managing your appointments.</p>
            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/login" class="button">Login to Dashboard</a>
            </center>

            <p>Thank you for joining Healthy Touch. We look forward to working with you!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Admin Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 2. Provider Rejection Email
export const providerRejectionTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>Provider Profile - Action Required</h2>
            <p>Dear Dr. ${data.providerName},</p>
            <p>Thank you for your interest in joining Healthy Touch. After careful review, we regret to inform you that your provider profile has not been approved at this time.</p>
            
            <div class="warning-box">
                <strong>⚠️ Reason for Rejection</strong>
                <p style="margin: 10px 0 0 0;">${data.reason || 'Profile does not meet our current requirements.'}</p>
            </div>

            <div class="info-box">
                <strong>📝 What You Can Do</strong>
                <p style="margin: 10px 0 0 0;">
                    • Review and update your profile information<br>
                    • Upload any missing or updated documents<br>
                    • Ensure all credentials are valid and clear<br>
                    • Resubmit your profile for approval
                </p>
            </div>

            <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/login" class="button">Update Profile</a>
            </center>
            
            <p>We appreciate your understanding and hope to have you onboard soon.</p>
            
            <p>Best regards,<br><strong>Healthy Touch Admin Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 3. User/Provider Suspension Email
export const suspensionNoticeTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>⚠️ Account Suspended - Important Notice</h2>
            <p>Dear ${data.userName},</p>
            <p>We regret to inform you that your account on Healthy Touch has been temporarily suspended.</p>
            
            <div class="danger-box">
                <strong>🚫 Suspension Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Reason:</strong> ${data.reason || 'Violation of platform policies'}<br>
                    <strong>Suspended on:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                    <strong>Status:</strong> <span style="color: #dc3545;">Account Suspended</span>
                </p>
            </div>

            <div class="info-box">
                <strong>📋 What This Means</strong>
                <p style="margin: 10px 0 0 0;">
                    • You cannot access your account<br>
                    • ${data.role === 'provider' ? 'You cannot receive new bookings' : 'You cannot book appointments'}<br>
                    • All pending activities are on hold<br>
                    • You can request account reactivation
                </p>
            </div>

            <div class="info-box">
                <strong>🔄 Request Reactivation</strong>
                <p style="margin: 10px 0 0 0;">
                    If you believe this suspension was made in error or would like to appeal, you can request account reactivation:
                </p>
                <ol style="margin: 10px 0 0 20px;">
                    <li>Visit the login page</li>
                    <li>Click on "Request Unsuspension"</li>
                    <li>Provide necessary details and explanation</li>
                    <li>Our team will review your request</li>
                </ol>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/login" class="button">Request Reactivation</a>
            </center>

            <p>For immediate assistance, please contact our support team at <a href="mailto:admin@healthytouch.com">admin@healthytouch.com</a></p>
            
            <p>Best regards,<br><strong>Healthy Touch Admin Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 4. Account Reactivation Email
export const accountReactivationTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>✅ Great News! Your Account Has Been Reactivated</h2>
            <p>Dear ${data.userName},</p>
            <p>We are pleased to inform you that your Healthy Touch account has been successfully reactivated!</p>
            
            <div class="success-box">
                <strong>🎉 Account Status</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Status:</strong> <span style="color: #28a745;">Active</span><br>
                    <strong>Reactivated on:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                    <strong>Full Access:</strong> Restored
                </p>
            </div>

            <div class="info-box">
                <strong>✨ You Can Now</strong>
                <p style="margin: 10px 0 0 0;">
                    • Access your account fully<br>
                    • ${data.role === 'provider' ? 'Receive and manage appointments' : 'Book appointments with providers'}<br>
                    • Use all platform features<br>
                    • Update your profile
                </p>
            </div>

            <p>Thank you for your patience and cooperation. We're glad to have you back!</p>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/login" class="button">Login to Your Account</a>
            </center>

            <p>Please ensure you comply with our platform policies to avoid future issues.</p>
            
            <p>Best regards,<br><strong>Healthy Touch Admin Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 5. Appointment Confirmation Email (Patient)
export const appointmentConfirmationTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>✅ Appointment Confirmed!</h2>
            <p>Dear ${data.patientName},</p>
            <p>Great news! Your appointment has been confirmed by the provider.</p>
            
            <div class="success-box">
                <strong>📅 Appointment Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Provider:</strong> Dr. ${data.providerName}<br>
                    <strong>Specialization:</strong> ${data.specialization || 'Healthcare Provider'}<br>
                    <strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
                    <strong>Time:</strong> ${data.timeSlot}<br>
                    <strong>Status:</strong> <span style="color: #28a745;">Confirmed</span>
                </p>
            </div>

            ${data.location ? `
            <div class="info-box">
                <strong>📍 Location</strong>
                <p style="margin: 10px 0 0 0;">${data.location}</p>
            </div>
            ` : ''}

            ${data.payment ? `
            <div class="info-box">
                <strong>💰 Payment Summary</strong>
                <p style="margin: 10px 0 0 0;">
                    ${data.payment.travelFare > 0 ? `Travel Fare: ₹${data.payment.travelFare}<br>` : ''}
                    <strong>Total Amount: ₹${data.payment.totalAmount || 0}</strong>
                </p>
            </div>
            ` : ''}

            <div class="info-box">
                <strong>📝 Important Notes</strong>
                <p style="margin: 10px 0 0 0;">
                    • Please arrive 10 minutes before your scheduled time<br>
                    • Bring any relevant medical documents<br>
                    • ${data.payment ? 'Payment has been processed' : 'Please complete payment before the appointment'}<br>
                    • For cancellation, contact at least 24 hours in advance
                </p>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/appointments" class="button">View Appointment</a>
            </center>

            <p>If you have any questions, please contact us or the provider directly.</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 6. Unsuspension Request Email (to Admin)
export const unsuspensionRequestTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>🔔 Unsuspension Request Received</h2>
            <p>Hello Admin,</p>
            <p>A user has requested to have their account unsuspended.</p>
            
            <div class="info-box">
                <strong>👤 User Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Name:</strong> ${data.userName}<br>
                    <strong>Email:</strong> ${data.userEmail}<br>
                    <strong>Role:</strong> ${data.role}<br>
                    <strong>User ID:</strong> ${data.userId}
                </p>
            </div>

            <div class="info-box">
                <strong>🚫 Suspension Information</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Suspended on:</strong> ${data.suspendedAt ? new Date(data.suspendedAt).toLocaleDateString('en-IN') : 'N/A'}<br>
                    <strong>Original Reason:</strong> ${data.suspensionReason || 'Not specified'}<br>
                    <strong>Days Suspended:</strong> ${data.daysSuspended || 'N/A'}
                </p>
            </div>

            <div class="warning-box">
                <strong>💬 User's Request Reason</strong>
                <p style="margin: 10px 0 0 0;">${data.requestReason || 'No reason provided'}</p>
            </div>

            <p>Please review this request and take appropriate action.</p>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/admin/users/${data.userId}" class="button">Review Request</a>
            </center>
            
            <p>Best regards,<br><strong>Healthy Touch System</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 7. Caretaker Assignment Email (to Patient)
export const caretakerAssignmentTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>👨‍⚕️ Caretaker Assigned to Your Care</h2>
            <p>Dear ${data.patientName},</p>
            <p>We are pleased to inform you that a dedicated caretaker has been assigned to support your healthcare journey.</p>
            
            <div class="success-box">
                <strong>✅ Assignment Confirmed</strong>
                <p style="margin: 10px 0 0 0;">
                    Your caretaker has been assigned and will be in touch with you shortly.
                </p>
            </div>

            <div class="info-box">
                <strong>👤 Caretaker Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Name:</strong> ${data.caretakerName}<br>
                    <strong>Email:</strong> ${data.caretakerEmail}<br>
                    <strong>Mobile:</strong> ${data.caretakerMobile}<br>
                    ${data.specialization ? `<strong>Specialization:</strong> ${data.specialization.join(', ')}<br>` : ''}
                    <strong>Experience:</strong> ${data.experience} years<br>
                    ${data.qualifications ? `<strong>Qualifications:</strong> ${data.qualifications}<br>` : ''}
                </p>
            </div>

            ${data.notes ? `
            <div class="info-box">
                <strong>📝 Assignment Notes</strong>
                <p style="margin: 10px 0 0 0;">${data.notes}</p>
            </div>
            ` : ''}

            <div class="info-box">
                <strong>📅 Assignment Information</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Assigned Date:</strong> ${new Date(data.assignedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
                    <strong>Status:</strong> <span style="color: #28a745;">Active</span>
                </p>
            </div>

            <div class="info-box">
                <strong>📞 What to Expect</strong>
                <p style="margin: 10px 0 0 0;">
                    • Your caretaker will contact you within 24 hours<br>
                    • They will coordinate with you for care schedule<br>
                    • You can reach out to them anytime during their availability<br>
                    • For emergencies, please contact emergency services (112/108)
                </p>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/patient/caretakers" class="button">View Caretaker Profile</a>
            </center>

            <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// 8. Create caretaker created by admini to email template (to caretaker)

export const caretakerCreatedByAdminTemplate = (data) => {
    const content = `
        <div class="content">    
            <h2>👨‍⚕️ Caretaker Created Successfully</h2>
            <p>Dear ${data.caretakerName},</p>
            <p>Your caretaker profile has been successfully created by the admin on Healthy Touch platform.</p>
            <div class="success-box">
                <strong>✅ Account Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Name:</strong> ${data.caretakerName}<br>
                    <strong>Email:</strong> ${data.caretakerEmail}<br>
                    <strong>Mobile:</strong> ${data.caretakerMobile}<br>
                    ${data.specialization ? `<strong>Specialization:</strong> ${data.specialization.join(', ')}<br>` : ''}
                    <strong>Experience:</strong> ${data.experience} years<br>
                    ${data.qualifications ? `<strong>Qualifications:</strong> ${data.qualifications}<br>` : ''}
                </p>
            </div>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
            `;
    return emailWrapper(content);
};

// Appointment Reminder Email (15 minutes before)
export const appointmentReminderTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>⏰ Appointment Reminder - 15 Minutes!</h2>
            <p>Dear ${data.patientName},</p>
            <p><strong>Your appointment is in just 15 minutes!</strong></p>
            
            <div class="warning-box">
                <strong>📅 Appointment Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Provider:</strong> Dr. ${data.providerName}<br>
                    <strong>Specialization:</strong> ${data.specialization || 'Healthcare Provider'}<br>
                    <strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br>
                    <strong>Time:</strong> ${data.timeSlot}<br>
                    <strong>Reason:</strong> ${data.reason || 'Consultation'}
                </p>
            </div>

            ${data.location ? `
            <div class="info-box">
                <strong>📍 Location</strong>
                <p style="margin: 10px 0 0 0;">${data.location}</p>
            </div>
            ` : ''}

            ${data.contactNumber ? `
            <div class="info-box">
                <strong>📞 Contact Provider</strong>
                <p style="margin: 10px 0 0 0;">${data.contactNumber}</p>
            </div>
            ` : ''}

            <div class="success-box">
                <strong>✅ Before You Go</strong>
                <p style="margin: 10px 0 0 0;">
                    • Bring any relevant medical documents<br>
                    • Bring your previous prescriptions<br>
                    • Arrive a few minutes early<br>
                    • Keep contact details handy
                </p>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/patient/appointments" class="button">View Appointment Details</a>
            </center>

            <p>We hope you have a successful consultation!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// Provider Payment Released Email
export const paymentReleasedTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>💰 Payment Released</h2>
            <p>Dear ${data.providerName},</p>
            <p>Great news! Your payment has been successfully released by the admin.</p>
            
            <div class="success-box">
                <strong>💳 Payment Details</strong>
                <p style="margin: 10px 0 0 0;">
                    <strong>Amount:</strong> ₹${data.amount}<br>
                    <strong>Payment Mode:</strong> ${data.paymentMode}<br>
                    <strong>Transaction ID:</strong> ${data.transactionId}<br>
                    <strong>Date:</strong> ${data.date}<br>
                    <strong>Payout Count:</strong> ${data.payoutCount} appointment(s)
                </p>
            </div>

            <div class="info-box">
                <strong>📋 Next Steps</strong>
                <p style="margin: 10px 0 0 0;">
                    • Check your bank account or UPI for the credited amount<br>
                    • View detailed payment history in your dashboard<br>
                    • Download payment receipt for your records
                </p>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/provider/earnings" class="button">View Earnings Dashboard</a>
            </center>

            <p>Thank you for being a valued provider on Healthy Touch!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Admin Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// New Contact Query Notification Email (for Admin)
export const newContactQueryTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>💬 New Question Received</h2>
            <p>Hello ${data.adminName},</p>
            <p>A new question has been submitted on the Healthy Touch platform.</p>
            
            <div class="info-box">
                <strong>📧 From:</strong>
                <p style="margin: 5px 0 0 0;">${data.userEmail}</p>
            </div>

            <div class="info-box">
                <strong>💭 Message:</strong>
                <p style="margin: 10px 0 0 0;">${data.message}</p>
            </div>

            <div class="info-box">
                <strong>🕐 Submitted At:</strong>
                <p style="margin: 5px 0 0 0;">${data.submittedAt}</p>
            </div>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/admin/queries" class="button">View & Reply</a>
            </center>

            <p>Please review and respond to the query at your earliest convenience.</p>
            
            <p>Best regards,<br><strong>Healthy Touch System</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// Query Reply Email (for User)
export const queryReplyTemplate = (data) => {
    const content = `
        <div class="content">
            <h2>✉️ Response to Your Question</h2>
            <p>Hello,</p>
            <p>Thank you for reaching out to Healthy Touch. We have reviewed your question and here is our response:</p>
            
            <div class="info-box">
                <strong>Your Question:</strong>
                <p style="margin: 10px 0 0 0; font-style: italic;">"${data.originalMessage}"</p>
            </div>

            <div class="success-box">
                <strong>💬 Our Response:</strong>
                <p style="margin: 10px 0 0 0;">${data.adminReply}</p>
            </div>

            <div class="info-box">
                <strong>📝 Replied By:</strong>
                <p style="margin: 5px 0 0 0;">${data.repliedBy}</p>
                <strong>🕐 Replied At:</strong>
                <p style="margin: 5px 0 0 0;">${data.repliedAt}</p>
            </div>

            <p>If you have any further questions, feel free to submit another query on our website.</p>

            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}" class="button">Visit Website</a>
            </center>
            
            <p>Thank you for choosing Healthy Touch!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// Appointment Cancelled Template
export const appointmentCancelledTemplate = (data) => {
    const {
        recipientName,
        recipientRole, // 'patient' or 'provider'
        cancelledBy, // 'Patient', 'Provider', or 'Admin'
        cancellerName,
        providerName,
        appointmentDate,
        appointmentTime,
        reason,
        refundMessage,
        appointmentId,
    } = data;

    const content = `
        <div class="email-content">
            <h1 style="color: #ef4444;">❌ Appointment Cancelled</h1>
            
            <p>Dear <strong>${recipientName}</strong>,</p>
            
            <p>We regret to inform you that your appointment has been cancelled.</p>
            
            <div class="details-box" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #dc2626;">Cancellation Details</h3>
                ${appointmentId ? `<p><strong>Appointment ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${appointmentId}</code></p>` : ''}
                <p><strong>Cancelled by:</strong> ${cancelledBy} ${cancellerName ? `(${cancellerName})` : ''}</p>
                ${providerName ? `<p><strong>Provider:</strong> ${providerName}</p>` : ''}
                <p><strong>Appointment Date:</strong> ${appointmentDate}</p>
                <p><strong>Appointment Time:</strong> ${appointmentTime}</p>
                <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            ${refundMessage ? `
                <div class="details-box" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #16a34a;">💰 Refund Information</h3>
                    <p>${refundMessage}</p>
                </div>
            ` : ''}
            
            ${recipientRole === 'patient' ? `
                <p>We apologize for any inconvenience. You can book another appointment anytime.</p>
            ` : `
                <p>The patient's slot is now available for other bookings.</p>
            `}
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}" class="button">Visit Dashboard</a>
            </center>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// Refund Initiated Template
export const refundInitiatedTemplate = (data) => {
    const {
        patientName,
        appointmentDate,
        appointmentTime,
        providerName,
        refundAmount,
        processingTime,
        transactionId,
        appointmentId,
    } = data;

    const content = `
        <div class="email-content">
            <h1 style="color: #22c55e;">💰 Refund Initiated</h1>
            
            <p>Dear <strong>${patientName}</strong>,</p>
            
            <p>Good news! Your refund request has been initiated and is being processed.</p>
            
            <div class="details-box" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #16a34a;">Refund Details</h3>
                <p><strong>Refund Amount:</strong> ₹${refundAmount}</p>
                <p><strong>Processing Time:</strong> ${processingTime}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                ${appointmentId ? `<p><strong>Appointment ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${appointmentId}</code></p>` : ''}
                <p><strong>Cancelled Appointment:</strong> ${appointmentDate} at ${appointmentTime}</p>
                <p><strong>Provider:</strong> ${providerName}</p>
            </div>
            
            <div class="details-box" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #d97706;">⏰ What Happens Next?</h3>
                <p>✓ Your refund will be credited to the original payment method</p>
                <p>✓ You will receive another email once the refund is completed</p>
                <p>✓ The amount will reflect in your account within ${processingTime}</p>
            </div>
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/patient/appointments" class="button">View My Appointments</a>
            </center>
            
            <p>Thank you for your patience!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

// Refund Completed Template
export const refundCompletedTemplate = (data) => {
    const {
        patientName,
        refundAmount,
        transactionId,
        appointmentId,
    } = data;

    const content = `
        <div class="email-content">
            <h1 style="color: #22c55e;">✅ Refund Completed</h1>
            
            <p>Dear <strong>${patientName}</strong>,</p>
            
            <p>Great news! Your refund has been successfully completed.</p>
            
            <div class="details-box" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #16a34a;">✓ Refund Completed</h3>
                <p><strong>Amount Refunded:</strong> ₹${refundAmount}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                ${appointmentId ? `<p><strong>Appointment ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${appointmentId}</code></p>` : ''}
                <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Completed</span></p>
            </div>
            
            <p>The refund amount has been credited to your original payment method. It may take 5-7 business days to reflect in your account depending on your bank.</p>
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'https://healthytouch24.com'}/patient/appointments" class="button">Book Another Appointment</a>
            </center>
            
            <p>Thank you for using Healthy Touch!</p>
            
            <p>Best regards,<br><strong>Healthy Touch Team</strong></p>
        </div>
    `;
    return emailWrapper(content);
};

export const getEmailTemplate = (templateType, data) => {
    const templates = {
        providerApproval: providerApprovalTemplate,
        providerRejection: providerRejectionTemplate,
        suspensionNotice: suspensionNoticeTemplate,
        accountReactivation: accountReactivationTemplate,
        appointmentConfirmation: appointmentConfirmationTemplate,
        appointmentReminder: appointmentReminderTemplate,
        unsuspensionRequest: unsuspensionRequestTemplate,
        caretakerAssignment: caretakerAssignmentTemplate,
        caretakerCreatedByAdmin: caretakerCreatedByAdminTemplate,
        paymentReleased: paymentReleasedTemplate,
        newContactQuery: newContactQueryTemplate,
        queryReply: queryReplyTemplate,
        appointmentCancelled: appointmentCancelledTemplate,
        refundInitiated: refundInitiatedTemplate,
        refundCompleted: refundCompletedTemplate,
    };

    const template = templates[templateType];
    if (!template) {
        throw new Error(`Email template '${templateType}' not found`);
    }

    return template(data);
};



export default {
    getEmailTemplate,
    providerApprovalTemplate,
    providerRejectionTemplate,
    suspensionNoticeTemplate,
    accountReactivationTemplate,
    appointmentConfirmationTemplate,
    appointmentReminderTemplate,
    unsuspensionRequestTemplate,
    caretakerAssignmentTemplate,
    caretakerCreatedByAdminTemplate
};

