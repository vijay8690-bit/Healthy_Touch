import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const API_PUBLIC_BASE_URL = (process.env.API_PUBLIC_BASE_URL || process.env.BACKEND_URL || '').replace(/\/+$/, '');

const extensionFromMime = (mime) => {
    const map = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };

    return map[String(mime || '').toLowerCase()] || 'bin';
};

const saveDataUriLocally = async (value, folder = 'documents') => {
    const match = typeof value === 'string'
        ? value.match(/^data:([^;]+);base64,(.+)$/i)
        : null;

    if (!match) {
        throw new Error('Local upload fallback only supports base64 data URI files');
    }

    const mime = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    const safeFolder = String(folder || 'documents').replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extensionFromMime(mime)}`;
    const uploadDir = path.join(UPLOADS_ROOT, safeFolder);
    const filePath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const publicPath = `/uploads/${safeFolder}/${fileName}`;
    return API_PUBLIC_BASE_URL ? `${API_PUBLIC_BASE_URL}${publicPath}` : publicPath;
};

const detectResourceTypeFromDataUri = (value) => {
    if (typeof value !== 'string') return null;
    const match = value.match(/^data:([^;]+);base64,/i);
    if (!match) return null;
    const mime = match[1].toLowerCase();

    // Important: Cloudinary may block direct delivery of PDFs uploaded as image.
    // Upload document types as raw to ensure they are deliverable.
    if (
        mime === 'application/pdf' ||
        mime === 'application/msword' ||
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
        return 'raw';
    }

    if (mime.startsWith('image/')) return 'image';
    return null;
};

/**
 * Upload file to Cloudinary
 * @param {string} fileBuffer - Base64 encoded file or file path
 * @param {string} folder - Folder name in Cloudinary (e.g., 'provider-documents', 'medical-records')
 * @param {string} resourceType - Resource type ('image', 'raw', 'auto')
 * @returns {Promise<Object>} - Cloudinary response with secure_url
 */
export const uploadToCloudinary = async (fileBuffer, folder = 'documents', resourceType = 'auto') => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            const localUrl = await saveDataUriLocally(fileBuffer, folder);
            return {
                success: true,
                url: localUrl,
                publicId: null,
                storage: 'local',
            };
        }

        const detected = resourceType === 'auto' ? detectResourceTypeFromDataUri(fileBuffer) : null;
        const finalResourceType = detected || resourceType;

        const result = await cloudinary.uploader.upload(fileBuffer, {
            folder: `healthy-touch/${folder}`,
            resource_type: finalResourceType,
            transformation: finalResourceType === 'image' ? [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto' }
            ] : undefined
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        try {
            const localUrl = await saveDataUriLocally(fileBuffer, folder);
            return {
                success: true,
                url: localUrl,
                publicId: null,
                storage: 'local',
                warning: error.message,
            };
        } catch (fallbackError) {
            console.error('Local upload fallback error:', fallbackError);
        }

        return {
            success: false,
            message: error.message,
        };
    }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Resource type ('image', 'raw')
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return {
            success: true,
            result,
        };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return {
            success: false,
            message: error.message,
        };
    }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array<string>} files - Array of base64 encoded files
 * @param {string} folder - Folder name
 * @returns {Promise<Array>}
 */
export const uploadMultipleToCloudinary = async (files, folder = 'documents') => {
    try {
        const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
        const results = await Promise.all(uploadPromises);
        
        const successfulUploads = results.filter(r => r.success).map(r => r.url);
        const failedUploads = results.filter(r => !r.success);

        return {
            success: failedUploads.length === 0,
            urls: successfulUploads,
            failed: failedUploads,
        };
    } catch (error) {
        console.error('Multiple upload error:', error);
        return {
            success: false,
            message: error.message,
        };
    }
};
