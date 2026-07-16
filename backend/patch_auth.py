import re
with open('../backend/controllers/AuthController.js', 'r') as f:
    code = f.read()

# Replace file validation
validation_old = """            // Check if files are uploaded
            if (!req.files || !req.files.aadharImages || !req.files.documentation) {
                return res.status(400).json({
                    message: 'Aadhar card files and professional documents are required for provider registration',
                    success: false
                });
            }"""

validation_new = """            // Check if files are uploaded
            if (!req.files || !req.files.aadharImages) {
                return res.status(400).json({
                    message: 'Aadhar card files are required for provider registration',
                    success: false
                });
            }
            if (category !== 'Ambulance' && !req.files.documentation) {
                return res.status(400).json({
                    message: 'Professional documents are required for provider registration',
                    success: false
                });
            }"""

code = code.replace(validation_old, validation_new)

# Replace documentation validation
doc_val_old = """            // Validate documentation
            if (req.files.documentation.length === 0) {
                return res.status(400).json({
                    message: 'At least one professional document is required',
                    success: false
                });
            }"""
doc_val_new = """            // Validate documentation
            if (category !== 'Ambulance' && (!req.files.documentation || req.files.documentation.length === 0)) {
                return res.status(400).json({
                    message: 'At least one professional document is required',
                    success: false
                });
            }"""

code = code.replace(doc_val_old, doc_val_new)

# Replace cloudinary upload
upload_old = """                // Store uploaded URLs
                providerDocuments = {
                    aadharImages: aadharUploadResult.urls,
                    documentation: documentationUploadResult.urls
                };"""

upload_new = """                // Store uploaded URLs
                providerDocuments = {
                    aadharImages: aadharUploadResult.urls,
                    documentation: documentationUploadResult ? documentationUploadResult.urls : []
                };

                // Handle single file uploads for Ambulance
                const singleFiles = [
                    'rcDocument', 'driverLicenseDocument', 'ambulancePhoto',
                    'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument'
                ];
                
                for (const field of singleFiles) {
                    if (req.files[field] && req.files[field][0]) {
                        const file = req.files[field][0];
                        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                        const uploadRes = await uploadToCloudinary(base64, `provider-${field.toLowerCase()}`);
                        if (uploadRes.success) {
                            providerDocuments[field] = uploadRes.url;
                        }
                    }
                }"""

# Need to make documentation upload optional
doc_up_old = """                // Convert documentation to base64
                const documentationBase64 = req.files.documentation.map(file =>
                    `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                );

                // Upload aadhar images
                const aadharUploadResult = await uploadMultipleToCloudinary(
                    aadharImagesBase64,
                    'provider-aadhar'
                );

                if (!aadharUploadResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload Aadhar card images',
                        error: 'Some files could not be uploaded to cloud storage'
                    });
                }

                // Upload documentation
                const documentationUploadResult = await uploadMultipleToCloudinary(
                    documentationBase64,
                    'provider-documentation'
                );

                if (!documentationUploadResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload documentation',
                        error: 'Some files could not be uploaded to cloud storage'
                    });
                }"""

doc_up_new = """                // Upload aadhar images
                const aadharUploadResult = await uploadMultipleToCloudinary(
                    aadharImagesBase64,
                    'provider-aadhar'
                );

                if (!aadharUploadResult.success) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload Aadhar card images',
                        error: 'Some files could not be uploaded to cloud storage'
                    });
                }

                let documentationUploadResult = null;
                if (req.files.documentation && req.files.documentation.length > 0) {
                    const documentationBase64 = req.files.documentation.map(file =>
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
                    );
                    documentationUploadResult = await uploadMultipleToCloudinary(
                        documentationBase64,
                        'provider-documentation'
                    );

                    if (!documentationUploadResult.success) {
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to upload documentation',
                            error: 'Some files could not be uploaded to cloud storage'
                        });
                    }
                }"""

code = code.replace(doc_up_old, doc_up_new)
code = code.replace(upload_old, upload_new)

# Finally, inject the imports if needed. Let's see if uploadToCloudinary is imported.
import_old = "import { uploadMultipleToCloudinary } from '../utils/uploadToCloudinary.js';"
import_new = "import { uploadMultipleToCloudinary, uploadToCloudinary } from '../utils/uploadToCloudinary.js';"
if import_old in code:
    code = code.replace(import_old, import_new)
else:
    # If it's already there, do nothing. If not, just patch the import line manually later if needed.
    pass

# Patch the Provider.create calls in AuthController to pass the new providerDocuments fields
create_fallback_old = """            if (role === 'provider') {
                await Provider.create({
                    userId: user._id,
                    aadharImages: providerDocuments?.aadharImages || [],
                    documentation: providerDocuments?.documentation || [],
                    status: 'pending',
                    category: category,
                    specialization: specialization,
                    // Note: these default values should be updated later
                    qualification: 'N/A',
                    fees: 0,
                    experience: 0,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        pincode: ''
                    }
                });
            }"""

create_fallback_new = """            if (role === 'provider') {
                const extraFields = {};
                if (providerDocuments) {
                    ['rcDocument', 'driverLicenseDocument', 'ambulancePhoto', 'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument'].forEach(f => {
                        if (providerDocuments[f]) extraFields[f] = providerDocuments[f];
                    });
                }
                const ambulanceFields = req.body;
                
                // Allow frontend body fields matching ambulance if present
                const extraTextData = {};
                const textKeys = [
                    'ambulanceType', 'medicalEquipment', 'vehicleNumber', 'vehicleModel', 'vehicleYear', 
                    'driverLicenseNumber', 'driverName', 'driverMobileNo', 'serviceArea', 'availabilityType',
                    'baseCharges', 'perKmCharge', 'bankAccountNumber', 'bankIfscCode', 'policeVerificationStatus'
                ];
                textKeys.forEach(k => {
                    if (ambulanceFields[k] !== undefined) extraTextData[k] = ambulanceFields[k];
                });

                await Provider.create({
                    userId: user._id,
                    aadharImages: providerDocuments?.aadharImages || [],
                    documentation: providerDocuments?.documentation || [],
                    ...extraFields,
                    ...extraTextData,
                    status: 'pending',
                    category: category,
                    specialization: specialization,
                    qualification: 'N/A',
                    fees: ambulanceFields.baseCharges || 0,
                    experience: 0,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        pincode: ''
                    }
                });
            }"""
code = code.replace(create_fallback_old, create_fallback_new)

verify_old = """            if (pending.role === 'provider') {
                await Provider.create({
                    userId: user._id,
                    aadharImages: pending.providerDocuments?.aadharImages || [],
                    documentation: pending.providerDocuments?.documentation || [],
                    status: 'pending',
                    category: pending.category,
                    specialization: 'General', // Fallback
                    qualification: 'N/A',
                    fees: 0,
                    experience: 0,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        pincode: ''
                    },
                    location: pending.location,
                });
            }"""

verify_new = """            if (pending.role === 'provider') {
                const pDocs = pending.providerDocuments || {};
                const extraFields = {};
                ['rcDocument', 'driverLicenseDocument', 'ambulancePhoto', 'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument'].forEach(f => {
                    if (pDocs[f]) extraFields[f] = pDocs[f];
                });

                // Get stored ambulance text data if any from pending.extraData
                const extraTextData = pending.extraData || {};

                await Provider.create({
                    userId: user._id,
                    aadharImages: pDocs.aadharImages || [],
                    documentation: pDocs.documentation || [],
                    ...extraFields,
                    ...extraTextData,
                    status: 'pending',
                    category: pending.category,
                    specialization: extraTextData.specialization || 'General',
                    qualification: 'N/A',
                    fees: extraTextData.baseCharges || 0,
                    experience: 0,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        pincode: ''
                    },
                    location: pending.location,
                });
            }"""
code = code.replace(verify_old, verify_new)

# Wait we need to capture req.body into pending.extraData for verification fallback
# Where is pending being created?
pending_create_old = """            // Create pending registration
            const pendingRegistration = await PendingRegistration.create({
                email: normalizedEmail,
                mobile: normalizedMobile,
                name,
                password,
                role,
                category, // only for providers
                providerDocuments,
                otp: {
                    code: otp.toString(),
                    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
                },
                location: locationPayload, // Add location to pending
            });"""

pending_create_new = """            // Capture ambulance specific text fields to extraData
            const textKeys = [
                'specialization', 'ambulanceType', 'medicalEquipment', 'vehicleNumber', 'vehicleModel', 'vehicleYear', 
                'driverLicenseNumber', 'driverName', 'driverMobileNo', 'serviceArea', 'availabilityType',
                'baseCharges', 'perKmCharge', 'bankAccountNumber', 'bankIfscCode', 'policeVerificationStatus'
            ];
            const extraData = {};
            if (role === 'provider') {
                textKeys.forEach(k => {
                    if (req.body[k] !== undefined) extraData[k] = req.body[k];
                });
            }

            // Create pending registration
            const pendingRegistration = await PendingRegistration.create({
                email: normalizedEmail,
                mobile: normalizedMobile,
                name,
                password,
                role,
                category, // only for providers
                providerDocuments,
                extraData, // Keep extra fields safe
                otp: {
                    code: otp.toString(),
                    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
                },
                location: locationPayload, // Add location to pending
            });"""
code = code.replace(pending_create_old, pending_create_new)


with open('../backend/controllers/AuthController.js', 'w') as f:
    f.write(code)
print("done")
