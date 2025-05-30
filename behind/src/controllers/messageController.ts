import { Request, Response } from 'express';
import Message from '../models/Message';
import { AuthRequest } from '../middlewares/auth';

// 获取房间历史消息
export const getRoomMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { type = 'all', page = 1, limit = 50 } = req.query;
    
    const query = { roomId };
    if (type !== 'all') {
      query['type'] = type;
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('senderId', 'username')
      .lean();
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: '获取消息失败' });
  }
};

// 发送新消息
export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, content, type = 'text', voiceData } = req.body;
    
    const message = await Message.create({
      roomId,
      senderId: req.user.id,
      content,
      type,
      voiceData
    });

    const populatedMessage = await message.populate('senderId', 'username');
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: '发送消息失败' });
  }
};

// 获取语音消息
export const getVoiceMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { limit = 20 } = req.query;
    
    const messages = await Message.find({
      roomId,
      type: 'voice'
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', 'username')
      .lean();
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: '获取语音消息失败' });
  }
};