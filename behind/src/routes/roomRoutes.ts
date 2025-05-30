import { Router } from 'express';
import { createRoom, getPublicRooms, joinRoom, leaveRoom } from '../controllers/roomController';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/public', getPublicRooms);
router.post('/create', protect, createRoom);
router.post('/:roomId/join', protect, joinRoom);
router.post('/:roomId/leave', protect, leaveRoom);

export default router;