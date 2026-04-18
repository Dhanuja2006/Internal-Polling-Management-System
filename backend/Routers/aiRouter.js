import express from 'express';
import { generatePoll } from '../Controller/aiController.js';
import { authMiddleware, adminMiddleware } from '../Middleware/authMiddleware.js';

const router = express.Router();

// Only admins can generate polls with AI
router.post('/generate-poll', authMiddleware, adminMiddleware, generatePoll);

export default router;
