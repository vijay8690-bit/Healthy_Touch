import express from 'express';
import { viewAsset } from '../controllers/AssetController.js';

const router = express.Router();

// Streams Cloudinary assets for <img>/<iframe> (supports token via header or query)
router.get('/view', ...viewAsset);

export default router;
