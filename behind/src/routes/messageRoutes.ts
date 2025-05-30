import { Router } from 'express';
import { getRoomMessages, createMessage, getVoiceMessages } from '../controllers/messageController';
import { auth } from '../middlewares/auth';

const router = Router();

// 获取房间所有消息
router.get('/:roomId', auth, getRoomMessages);

// 发送新消息
router.post('/', auth, createMessage);

// 获取语音消息
router.get('/:roomId/voice', auth, getVoiceMessages);

export default router;