import { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } from '../utils/uploadToCloudinary.js';

const getCloudinaryDeleteTarget = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
        const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
        if (
            parsed.protocol !== 'https:' ||
            parsed.hostname.toLowerCase() !== 'res.cloudinary.com' ||
            (cloudName && parts[0] !== cloudName) ||
            versionIndex < 3 ||
            versionIndex + 1 >= parts.length
        ) {
            return null;
        }

        const resourceType = parts[1] === 'raw' ? 'raw' : 'image';
        const idWithExtension = parts.slice(versionIndex + 1).join('/');
        const publicId = resourceType === 'raw'
            ? idWithExtension
            : idWithExtension.replace(/\.[^/.]+$/i, '');

        return { publicId, resourceType };
    } catch {
        return null;
    }
};

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private
export const uploadSingleFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const { folder } = req.body;
        const folderName = folder || 'general';

        // Convert buffer to base64
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Upload to Cloudinary
        const result = await uploadToCloudinary(fileBase64, folderName);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file',
                error: result.message,
            });
        }

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            url: result.url,
            publicId: result.publicId,
        });
    } catch (error) {
        console.error('Upload single file error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading file',
            error: error.message,
        });
    }
};

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
        }

        const { folder } = req.body;
        const folderName = folder || 'general';

        // Convert all files to base64
        const filesBase64 = req.files.map(file => 
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
        );

        // Upload to Cloudinary
        const result = await uploadMultipleToCloudinary(filesBase64, folderName);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Some files failed to upload',
                urls: result.urls,
                failed: result.failed,
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.urls.length} files uploaded successfully`,
            urls: result.urls,
        });
    } catch (error) {
        console.error('Upload multiple files error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading files',
            error: error.message,
        });
    }
};

// @desc    Delete file from Cloudinary
// @route   DELETE /api/upload
// @access  Admin
export const deleteFile = async (req, res) => {
    try {
        const parsedTarget = getCloudinaryDeleteTarget(req.body.url);
        const publicId = parsedTarget?.publicId || req.body.publicId;
        const resourceType = parsedTarget?.resourceType || req.body.resourceType || 'image';

        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: 'A valid Cloudinary URL or public ID is required',
            });
        }

        const result = await deleteFromCloudinary(publicId, resourceType);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete file',
                error: result.message,
            });
        }

        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
        });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting file',
            error: error.message,
        });
    }
};
