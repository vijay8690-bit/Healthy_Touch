import User from '../models/User.js';
import Provider from '../models/Provider.js';

/**
 * @desc    Update patient location
 * @route   POST /api/patient/location
 * @access  Private (Patient only)
 */
export const updatePatientLocation = async (req, res) => {
    const { latitude, longitude, address } = req.body;

    try {
        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required',
            });
        }

        // Validate latitude range
        if (latitude < -90 || latitude > 90) {
            return res.status(400).json({
                success: false,
                message: 'Latitude must be between -90 and 90',
            });
        }

        // Validate longitude range
        if (longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Longitude must be between -180 and 180',
            });
        }

        // Find user
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Verify user is a patient
        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only patients can update patient location',
            });
        }

        // Update location (overwrites old location)
        user.location = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address || null,
            updatedAt: new Date(),
        };

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Patient location updated successfully',
            location: user.location,
        });
    } catch (error) {
        console.error('Update patient location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating patient location',
            error: error.message,
        });
    }
};

/**
 * @desc    Update provider location
 * @route   POST /api/provider/location
 * @access  Private (Provider only)
 */
export const updateProviderLocation = async (req, res) => {
    const { latitude, longitude, address } = req.body;

    try {
        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required',
            });
        }

        // Validate latitude range
        if (latitude < -90 || latitude > 90) {
            return res.status(400).json({
                success: false,
                message: 'Latitude must be between -90 and 90',
            });
        }

        // Validate longitude range
        if (longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: 'Longitude must be between -180 and 180',
            });
        }

        // Find user
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Verify user is a provider
        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only providers can update provider location',
            });
        }

        // Find provider profile
        const provider = await Provider.findOne({ userId: user._id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        // Update provider location (overwrites old location)
        provider.location = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address || null,
            updatedAt: new Date(),
        };
        if (address) {
            provider.address = {
                ...(provider.address?.toObject ? provider.address.toObject() : provider.address || {}),
                street: address,
            };
        }

        await provider.save();

        // Also update user location for consistency
        user.location = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address || null,
            updatedAt: new Date(),
        };

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Provider location updated successfully',
            location: provider.location,
        });
    } catch (error) {
        console.error('Update provider location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating provider location',
            error: error.message,
        });
    }
};

/**
 * @desc    Get patient location
 * @route   GET /api/patient/location
 * @access  Private (Patient only)
 */
export const getPatientLocation = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('location');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. User is not a patient',
            });
        }

        res.status(200).json({
            success: true,
            location: user.location || null,
        });
    } catch (error) {
        console.error('Get patient location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching patient location',
            error: error.message,
        });
    }
};

/**
 * @desc    Get provider location
 * @route   GET /api/provider/location
 * @access  Private (Provider only)
 */
export const getProviderLocation = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. User is not a provider',
            });
        }

        const provider = await Provider.findOne({ userId: user._id }).select('location');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found',
            });
        }

        res.status(200).json({
            success: true,
            location: provider.location || null,
        });
    } catch (error) {
        console.error('Get provider location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider location',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all user locations (Admin only)
 * @route   GET /api/admin/locations
 * @access  Private (Admin only)
 */
export const getAllLocations = async (req, res) => {
    try {
        // Get all patients with location
        const patients = await User.find(
            { 
                role: 'patient',
                'location.latitude': { $exists: true, $ne: null }
            },
            'name email mobile location createdAt'
        );

        // Get all providers with location
        const providers = await Provider.find(
            {
                'location.latitude': { $exists: true, $ne: null }
            },
            'userId category location createdAt'
        ).populate('userId', 'name email mobile');

        // Format patient locations
        const patientLocations = patients.map(patient => ({
            _id: patient._id,
            name: patient.name,
            email: patient.email,
            mobile: patient.mobile,
            role: 'patient',
            latitude: patient.location?.latitude,
            longitude: patient.location?.longitude,
            address: patient.location?.address,
            updatedAt: patient.location?.updatedAt || patient.createdAt,
        }));

        // Format provider locations
        const providerLocations = providers.map(provider => ({
            _id: provider._id,
            name: provider.userId?.name,
            email: provider.userId?.email,
            mobile: provider.userId?.mobile,
            role: 'provider',
            category: provider.category,
            latitude: provider.location?.latitude,
            longitude: provider.location?.longitude,
            address: provider.location?.address,
            updatedAt: provider.location?.updatedAt || provider.createdAt,
        }));

        // Combine both
        const allLocations = [...patientLocations, ...providerLocations];

        res.status(200).json({
            success: true,
            total: allLocations.length,
            patients: patientLocations.length,
            providers: providerLocations.length,
            locations: allLocations,
        });
    } catch (error) {
        console.error('Get all locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching locations',
            error: error.message,
        });
    }
};
