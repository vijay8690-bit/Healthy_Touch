import express from 'express';
import {
  getAdminHomeContent,
  getPublicHomeContent,
  updateAdminHomeContent,
} from '../controllers/HomeContentController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';

const router = express.Router();

router.get('/public', getPublicHomeContent);
router.get('/admin', auth, adminOnly, getAdminHomeContent);
router.put('/admin', auth, adminOnly, updateAdminHomeContent);

export default router;
