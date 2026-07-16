import Settings from '../models/Settings.js';
import { clearSettingsCache } from '../middlewares/SettingsCache.js';

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
export const getSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        
        // Don't send sensitive data to frontend
        const settingsData = settings.toObject();
        if (settingsData.smtpPassword) {
            settingsData.smtpPassword = '••••••••••';
        }
        if (settingsData.razorpaySecret) {
            settingsData.razorpaySecret = '••••••••••';
        }

        res.status(200).json({
            success: true,
            settings: settingsData,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message,
        });
    }
};

// @desc    Update platform settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
export const updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        
        // Remove fields that shouldn't be updated this way
        delete updates._id;
        delete updates.__v;
        delete updates.createdAt;
        delete updates.updatedAt;

        // Don't update password fields if they contain masked values
        if (updates.smtpPassword && updates.smtpPassword.includes('•')) {
            delete updates.smtpPassword;
        }
        if (updates.razorpaySecret && updates.razorpaySecret.includes('•')) {
            delete updates.razorpaySecret;
        }

        // Get current settings
        const settings = await Settings.getSettings();

        // Update settings
        Object.keys(updates).forEach(key => {
            if (settings[key] !== undefined) {
                settings[key] = updates[key];
            }
        });

        settings.lastUpdatedBy = req.user._id;
        await settings.save();

        // Clear settings cache to reflect new changes
        clearSettingsCache();

        // Don't send sensitive data back
        const settingsData = settings.toObject();
        if (settingsData.smtpPassword) {
            settingsData.smtpPassword = '••••••••••';
        }
        if (settingsData.razorpaySecret) {
            settingsData.razorpaySecret = '••••••••••';
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            settings: settingsData,
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message,
        });
    }
};

// @desc    Update specific settings section
// @route   PUT /api/admin/settings/:section
// @access  Private (Admin)
export const updateSettingsSection = async (req, res) => {
    try {
        const { section } = req.params;
        const updates = req.body;

        const settings = await Settings.getSettings();

        // Validate section
        const validSections = ['general', 'email', 'payment', 'coins', 'appointment', 'security', 'legal'];
        if (!validSections.includes(section)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid settings section',
            });
        }

        // Don't update password fields if they contain masked values
        if (updates.smtpPassword && updates.smtpPassword.includes('•')) {
            delete updates.smtpPassword;
        }
        if (updates.razorpaySecret && updates.razorpaySecret.includes('•')) {
            delete updates.razorpaySecret;
        }

        // Update only the fields for this section
        Object.keys(updates).forEach(key => {
            if (settings[key] !== undefined) {
                settings[key] = updates[key];
            }
        });

        settings.lastUpdatedBy = req.user._id;
        await settings.save();

        // Clear settings cache to reflect new changes
        clearSettingsCache();

        // Don't send sensitive data back
        const settingsData = settings.toObject();
        if (settingsData.smtpPassword) {
            settingsData.smtpPassword = '••••••••••';
        }
        if (settingsData.razorpaySecret) {
            settingsData.razorpaySecret = '••••••••••';
        }

        res.status(200).json({
            success: true,
            message: `${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully`,
            settings: settingsData,
        });
    } catch (error) {
        console.error('Update settings section error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message,
        });
    }
};

// @desc    Reset settings to default
// @route   POST /api/admin/settings/reset
// @access  Private (Admin)
export const resetSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        
        // Reset to defaults
        await Settings.findByIdAndDelete(settings._id);
        const newSettings = await Settings.create({
            lastUpdatedBy: req.user._id,
        });

        // Clear settings cache to reflect new changes
        clearSettingsCache();

        const settingsData = newSettings.toObject();
        if (settingsData.smtpPassword) {
            settingsData.smtpPassword = '••••••••••';
        }
        if (settingsData.razorpaySecret) {
            settingsData.razorpaySecret = '••••••••••';
        }

        res.status(200).json({
            success: true,
            message: 'Settings reset to default values',
            settings: settingsData,
        });
    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset settings',
            error: error.message,
        });
    }
};

// @desc    Get public settings (for frontend display)
// @route   GET /api/settings/public
// @access  Public
export const getPublicSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();

        // Only return non-sensitive public settings
        const publicSettings = {
            siteName: settings.siteName,
            siteUrl: settings.siteUrl,
            supportEmail: settings.supportEmail,
            contactPhone: settings.contactPhone,
            siteDescription: settings.siteDescription,
            siteKeywords: settings.siteKeywords,

            // Booking/appointment constraints (safe to expose)
            minBookingTime: settings.minBookingTime,
            maxBookingDays: settings.maxBookingDays,
            cancellationHours: settings.cancellationHours,
            slotDuration: settings.slotDuration,
            autoApproveAppointments: settings.autoApproveAppointments,

            // Payment display/config (safe to expose key_id, not secret)
            paymentGateway: settings.paymentGateway,
            razorpayKey: settings.razorpayKey,
            commissionRate: settings.commissionRate,
            gstPercentage: settings.gstPercentage,
            coinValueInRupees: settings.coinValueInRupees,
            currency: settings.currency,

            // Legal text (safe to expose)
            termsAndConditions: settings.termsAndConditions,
            privacyPolicy: settings.privacyPolicy,
            refundPolicy: settings.refundPolicy,
            disclaimerText: settings.disclaimerText,

            facebookUrl: settings.facebookUrl,
            twitterUrl: settings.twitterUrl,
            instagramUrl: settings.instagramUrl,
            linkedinUrl: settings.linkedinUrl,
            maintenanceMode: settings.maintenanceMode,
            maintenanceMessage: settings.maintenanceMessage,
            metaTitle: settings.metaTitle,
            metaDescription: settings.metaDescription,
            metaKeywords: settings.metaKeywords,
        };

        res.status(200).json({
            success: true,
            settings: publicSettings,
        });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public settings',
            error: error.message,
        });
    }
};
