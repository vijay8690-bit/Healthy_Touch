import multer from 'multer';

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Memory storage - files will be stored in memory as Buffer objects
const storage = multer.memoryStorage();

// File filter - accept only specific file types
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, PDF, DOC, DOCX allowed'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
    },
    fileFilter: fileFilter,
});

const collectAllUploadedFiles = (req) => {
    const collected = [];

    if (req.file) {
        collected.push(req.file);
    }

    if (req.files) {
        if (Array.isArray(req.files)) {
            collected.push(...req.files);
        } else {
            Object.values(req.files).forEach((entry) => {
                if (Array.isArray(entry)) {
                    collected.push(...entry);
                }
            });
        }
    }

    return collected;
};

// Enforce: images <= 3MB, documents <= 5MB
export const enforceUploadSizeLimits = (req, res, next) => {
    const files = collectAllUploadedFiles(req);

    for (const file of files) {
        const isImage = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
        const maxSize = isImage ? MAX_IMAGE_SIZE_BYTES : MAX_DOC_SIZE_BYTES;

        if (typeof file.size === 'number' && file.size > maxSize) {
            return res.status(413).json({
                success: false,
                message: isImage
                    ? 'Image size must be 3MB or less'
                    : 'Document size must be 5MB or less',
                details: {
                    field: file.fieldname,
                    fileName: file.originalname,
                    sizeBytes: file.size,
                    maxBytes: maxSize,
                },
            });
        }
    }

    next();
};

// Export different upload configurations
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10); // Max 10 files
export const uploadLabReportFiles = upload.fields([
    { name: 'mainReportPdf', maxCount: 1 },
    { name: 'summaryPdf', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 },
    { name: 'file', maxCount: 1 },
]);
export const uploadGeneratedLabReportFiles = upload.fields([
    { name: 'resultAttachment', maxCount: 1 },
    { name: 'resultAttachmentPreview', maxCount: 1 },
    { name: 'summaryAttachment', maxCount: 1 },
    { name: 'signatureImage', maxCount: 1 },
]);
export const uploadFields = upload.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'aadharImages', maxCount: 5 },
    { name: 'documentation', maxCount: 10 },
    { name: 'rcDocument', maxCount: 1 },
    { name: 'driverLicenseDocument', maxCount: 1 },
    { name: 'ambulancePhoto', maxCount: 1 },
    { name: 'panCardPhoto', maxCount: 1 },
    { name: 'cancelledChequePhoto', maxCount: 1 },
    { name: 'policeVerificationDocument', maxCount: 1 },
    { name: 'labRegistrationCertificate', maxCount: 1 },
    { name: 'nablCertificate', maxCount: 5 }
]);

// Provider registration specific upload configuration
export const uploadProviderDocs = upload.fields([
    { name: 'aadharImages', maxCount: 5 }, // Multiple images for front, back, etc.
    { name: 'profileImage', maxCount: 1 },
    { name: 'documentation', maxCount: 10 }, // Professional certificates, licenses, etc.
    { name: 'rcDocument', maxCount: 1 },
    { name: 'driverLicenseDocument', maxCount: 1 },
    { name: 'ambulancePhoto', maxCount: 1 },
    { name: 'panCardPhoto', maxCount: 1 },
    { name: 'cancelledChequePhoto', maxCount: 1 },
    { name: 'policeVerificationDocument', maxCount: 1 },
    { name: 'labRegistrationCertificate', maxCount: 1 },
    { name: 'nablCertificate', maxCount: 5 }
]);

export default upload;
