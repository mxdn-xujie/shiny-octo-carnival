import { Router } from 'express';
import { getRoomMessages, createMessage, getVoiceMessages } from '../controllers/messageController';
import { protect } from '../middlewares/auth';

const router = Router();

// 获取房间所有消息
router.get('/:roomId', protect, getRoomMessages);

// 发送新消息
router.post('/', protect, createMessage);

// 获取语音消息
router.get('/:roomId/voice', protect, getVoiceMessages);

export default router;