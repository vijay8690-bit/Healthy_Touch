import express from 'express';
import { getPublicTeamMembers } from '../controllers/TeamController.js';

const router = express.Router();

router.get('/', getPublicTeamMembers);

export default router;