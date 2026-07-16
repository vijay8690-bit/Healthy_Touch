import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const CLOUDINARY_DELIVERY_HOST = 'res.cloudinary.com';

const authFromHeaderOrQuery = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
      token = req.query.token.trim();
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended',
        isSuspended: true,
        suspension: {
          reason: user.suspension?.reason,
          suspendedAt: user.suspension?.suspendedAt,
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Asset auth error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const parseCloudinarySrc = (src) => {
  if (!src) return null;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    const u = new URL(src);
    const configuredCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== CLOUDINARY_DELIVERY_HOST) {
      return null;
    }

    // Expect: /<cloud_name>/<resource_type>/<type>/v123/.../<public_id>[.<ext>]
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 5) return null;
    if (configuredCloudName && parts[0] !== configuredCloudName) return null;

    const resourceType = parts[1];
    const deliveryType = parts[2];
    const versionIndex = parts.findIndex((p) => /^v\d+$/.test(p));
    if (versionIndex === -1 || versionIndex + 1 >= parts.length) return null;

    const publicIdWithExt = parts.slice(versionIndex + 1).join('/');
    const extMatch = publicIdWithExt.match(/\.([a-z0-9]+)$/i);
    const format = extMatch ? extMatch[1].toLowerCase() : null;
    const publicId = extMatch ? publicIdWithExt.replace(/\.[^/.]+$/i, '') : publicIdWithExt;

    return {
      originalUrl: src,
      resourceType,
      deliveryType,
      publicId,
      format,
    };
  }

  // Non-URL: treat as publicId
  const extMatch = src.match(/\.([a-z0-9]+)$/i);
  const format = extMatch ? extMatch[1].toLowerCase() : null;
  const publicId = extMatch ? src.replace(/\.[^/.]+$/i, '') : src;

  return {
    originalUrl: src,
    resourceType: 'raw',
    deliveryType: 'upload',
    publicId,
    format,
  };
};

const contentTypeFromFormat = (format) => {
  switch ((format || '').toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
};

const safeFileName = (value, fallback = 'document') => {
  const name = String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '-');
  return name || fallback;
};

const ensureExtension = (fileName, format) => {
  const cleanFormat = String(format || '').trim().replace(/^\./, '').toLowerCase();
  if (!cleanFormat) return fileName;
  return new RegExp(`\\.${cleanFormat}$`, 'i').test(fileName) ? fileName : `${fileName}.${cleanFormat}`;
};

const getLocalUploadPath = (src) => {
  if (!src || typeof src !== 'string') return null;
  let pathname = src;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      pathname = new URL(src).pathname;
    } catch {
      return null;
    }
  }

  pathname = pathname.replace(/\\/g, '/');
  if (pathname.startsWith('uploads/')) pathname = `/${pathname}`;
  if (!pathname.startsWith('/uploads/')) return null;

  const relativePath = pathname.replace(/^\/uploads\//, '');
  const filePath = path.resolve(UPLOADS_ROOT, relativePath);
  if (!filePath.startsWith(`${UPLOADS_ROOT}${path.sep}`)) return null;
  return filePath;
};

export const viewAsset = [authFromHeaderOrQuery, async (req, res) => {
  try {
    const src = typeof req.query.src === 'string' ? req.query.src : '';
    const disposition = (req.query.disposition === 'attachment' ? 'attachment' : 'inline');
    const requestedFormat = typeof req.query.format === 'string' ? req.query.format.trim().toLowerCase() : '';
    const requestedFileName = safeFileName(req.query.filename, 'document');

    if (!src) {
      return res.status(400).json({ success: false, message: 'Missing src' });
    }

    const localFilePath = getLocalUploadPath(src);
    if (localFilePath) {
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }
      const format = requestedFormat || path.extname(localFilePath).replace('.', '').toLowerCase();
      const fileName = ensureExtension(requestedFileName || path.basename(localFilePath), format);
      res.setHeader('Content-Type', contentTypeFromFormat(format));
      res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
      return res.sendFile(localFilePath);
    }

    const parsed = parseCloudinarySrc(src);
    if (!parsed) {
      return res.status(400).json({ success: false, message: 'Invalid src' });
    }

    let format = requestedFormat || parsed.format;
    try {
      // Fetch metadata to infer format when missing and to validate existence
      const meta = await cloudinary.api.resource(parsed.publicId, {
        resource_type: parsed.resourceType,
        type: parsed.deliveryType,
      });
      if (meta && meta.format) format = meta.format;
    } catch (e) {
      // If metadata fetch fails, we still attempt to stream the URL as-is
    }

    // Cloudinary security: PDFs uploaded under image/upload often return 401.
    // Workaround: render first page as PNG (always deliverable as image).
    if (parsed.resourceType === 'image' && (format || '').toLowerCase() === 'pdf') {
      const previewUrl = cloudinary.url(parsed.publicId, {
        secure: true,
        resource_type: 'image',
        type: parsed.deliveryType,
        format: 'png',
        transformation: [{ page: 1 }],
      });

      const upstream = await fetch(previewUrl, {
        headers: { 'User-Agent': 'HealthyTouch-Portal' },
      });

      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 500).json({
          success: false,
          message: 'Failed to load asset',
          status: upstream.status,
        });
      }

      res.status(200);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `${disposition}; filename=\"document-page-1.png\"`);
      Readable.fromWeb(upstream.body).pipe(res);
      return;
    }

    const upstream = await fetch(parsed.originalUrl, {
      headers: { 'User-Agent': 'HealthyTouch-Portal' },
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 500).json({
        success: false,
        message: 'Failed to load asset',
        status: upstream.status,
      });
    }

    if (!format) {
      const upstreamType = upstream.headers.get('content-type') || '';
      if (upstreamType.includes('application/pdf')) format = 'pdf';
      else if (upstreamType.includes('image/png')) format = 'png';
      else if (upstreamType.includes('image/jpeg')) format = 'jpg';
    }

    const fileName = ensureExtension(requestedFileName, format);
    res.status(200);
    res.setHeader('Content-Type', contentTypeFromFormat(format));
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    const status = error?.status || 500;
    console.error('Asset view error:', status, error?.message);
    return res.status(status).json({
      success: false,
      message: 'Failed to load asset',
      status,
    });
  }
}];
