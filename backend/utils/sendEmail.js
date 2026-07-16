import nodemailer from 'nodemailer';
import { getEmailTemplate } from './emailTemplates.js';
import Settings from '../models/Settings.js';

/**
 * Send email utility
 * @param {string} email - Recipient email or options.email
 * @param {string} subject - Email subject or options.subject  
 * @param {string} html - HTML content or options.html
 * @param {string} otp - OTP code (optional, for OTP emails)
 * @param {string} fromEmail - Custom sender email (optional)
 * @param {string} fromName - Custom sender name (optional)
 */
const sendEmail = async (email, subject, html, otp = null, fromEmail = null, fromName = null) => {
    // Handle both old and new calling conventions
    let recipientEmail, emailSubject, htmlContent, senderEmail, senderName;
    
    if (typeof email === 'object') {
        // Old format: sendEmail({ email, subject, otp, fromEmail, fromName })
        recipientEmail = email.email;
        emailSubject = email.subject;
        otp = email.otp;
        const resetToken = email.resetToken;
        htmlContent = email.html || null;
        senderEmail = email.fromEmail || null;
        senderName = email.fromName || null;

        if (resetToken) {
            const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://healthytouch24.com').replace(/\/+$/, '');
            const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
                <h2>Password Reset - Healthy Touch</h2>
                <p>You requested a password reset.</p>
                <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
                <p>
                  <a href="${resetUrl}" style="display: inline-block; background: #0f8ea0; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
                    Reset Password
                  </a>
                </p>
                <p>If the button does not work, open this link:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p>If you did not request this, you can ignore this email.</p>
              </div>
            `;
        }
    } else {
        // New format: sendEmail(email, subject, html, otp, fromEmail, fromName)
        recipientEmail = email;
        emailSubject = subject;
        htmlContent = html;
        senderEmail = fromEmail;
        senderName = fromName;
    }

    // Get SMTP & platform settings from database
    let smtpSettings;
    let platform = { name: 'Healthy Touch', supportEmail: 'support@healthytouch.com' };
    try {
        const settings = await Settings.getSettings();
        const smtpUser = settings.smtpUser || process.env.EMAIL_USER;
        const configuredFromEmail = settings.emailFromAddress;
        const fromEmail = configuredFromEmail && configuredFromEmail !== 'noreply@healthytouch.com'
            ? configuredFromEmail
            : smtpUser;

        smtpSettings = {
            host: settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(settings.smtpPort) || parseInt(process.env.SMTP_PORT) || 587,
            user: smtpUser,
            password: settings.smtpPassword || process.env.EMAIL_PASSWORD,
            fromEmail,
        fromName: settings.emailFromName || settings.siteName || 'Healthy Touch',
        };

      platform = {
        name: settings.siteName || 'Healthy Touch',
        supportEmail: settings.supportEmail || 'support@healthytouch.com',
      };
    } catch (error) {
        console.error('Error fetching email settings:', error);
        // Fallback to environment variables
        smtpSettings = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            fromEmail: process.env.EMAIL_USER,
        fromName: 'Healthy Touch',
        };
    }

    // Use custom sender or default from settings
    const finalFromEmail = senderEmail || smtpSettings.fromEmail;
    const finalFromName = senderName || smtpSettings.fromName;

    // Create transporter with dynamic SMTP settings
    const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.port === 465, // true for 465, false for other ports
        auth: {
            user: smtpSettings.user,
            pass: smtpSettings.password,
        },
    });

    // If OTP provided, use OTP template
    if (otp) {
      const platformName = platform.name;
      const supportEmail = platform.supportEmail;
        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 50px auto;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-align: center;
              padding: 30px 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .content h2 {
              color: #333333;
              margin-bottom: 20px;
            }
            .content p {
              color: #666666;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .otp-box {
              background-color: #f8f9fa;
              border: 2px dashed #667eea;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              display: inline-block;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 8px;
              margin: 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
            }
            .warning p {
              margin: 0;
              color: #856404;
              font-size: 14px;
            }
            .footer {
              background-color: #f8f9fa;
              text-align: center;
              padding: 20px;
              color: #666666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 ${platformName}</h1>
            </div>
            <div class="content">
              <h2>Welcome to ${platformName}!</h2>
              <p>Thank you for registering with us. Please verify your account using the OTP below:</p>
              
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
              </div>
              
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>• Never share this OTP with anyone</p>
                <p>• Healthy Touch will never ask for your OTP via phone or email</p>
                <p>• If you didn't request this, please ignore this email</p>
              </div>
            </div>
            <div class="footer">
              <p><strong>${platformName} - Your Healthcare Partner</strong></p>
              <p>Need help? Contact us at ${supportEmail}</p>
              <p>&copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
        `;
    }

    if (!htmlContent) {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
            <h2>${emailSubject || 'Healthy Touch'}</h2>
            <p>This email was sent from Healthy Touch.</p>
            <p>If you requested a password reset, please request it again from the login page.</p>
          </div>
        `;
    }

    // Email options
    const mailOptions = {
        from: `"${finalFromName}" <${finalFromEmail}>`,
        to: recipientEmail,
        subject: emailSubject,
        html: htmlContent,
        text: htmlContent ? htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : undefined,
        replyTo: finalFromEmail // Reply will go to sender
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

/**
 * Send template-based email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template type (providerApproval, providerRejection, etc.)
 * @param {Object} options.data - Data for template
 * @param {string} options.fromEmail - Custom sender email (defaults to admin email)
 * @param {string} options.fromName - Custom sender name (defaults to 'Healthy Touch Admin')
 */
export const sendTemplateEmail = async (options) => {
    try {
        const {
            to,
            subject,
            template,
            data,
            fromEmail = null,
            fromName = null
        } = options;

        let smtpSettings;
        try {
            const settings = await Settings.getSettings();
            const smtpUser = settings.smtpUser || process.env.EMAIL_USER;
            const configuredFromEmail = settings.emailFromAddress;
            const resolvedFromEmail = configuredFromEmail && configuredFromEmail !== 'noreply@healthytouch.com'
                ? configuredFromEmail
                : smtpUser;

            smtpSettings = {
                host: settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(settings.smtpPort) || parseInt(process.env.SMTP_PORT) || 587,
                user: smtpUser,
                password: settings.smtpPassword || process.env.EMAIL_PASSWORD,
                fromEmail: resolvedFromEmail,
                fromName: settings.emailFromName || settings.siteName || 'Healthy Touch',
            };
        } catch (error) {
            console.error('Error fetching template email settings:', error);
            smtpSettings = {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                user: process.env.EMAIL_USER,
                password: process.env.EMAIL_PASSWORD,
                fromEmail: process.env.EMAIL_USER,
                fromName: 'Healthy Touch',
            };
        }

        const finalFromEmail = fromEmail || smtpSettings.fromEmail;
        const finalFromName = fromName || smtpSettings.fromName;

        // Get HTML content from template
        const htmlContent = getEmailTemplate(template, data);

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.port === 465,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password,
            },
        });

        // Email options
        const mailOptions = {
            from: `"${finalFromName}" <${finalFromEmail}>`,
            to,
            subject,
            html: htmlContent,
            replyTo: finalFromEmail
        };

        // Send email asynchronously (don't wait for response)
        transporter.sendMail(mailOptions).catch(error => {
            console.error('Email sending error:', error);
        });

        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Template email error:', error);
        return { success: false, message: error.message };
    }
};

export default sendEmail;
