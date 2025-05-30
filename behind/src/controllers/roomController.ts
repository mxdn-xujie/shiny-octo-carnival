import { Request, Response } from 'express';
import Room, { IRoom } from '../models/Room';
import Message from '../models/Message';
import { AuthRequest } from '../middlewares/auth';

// 创建新聊天室
export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, isPrivate } = req.body;
    const room = await Room.create({
      name,
      owner: req.user.id,
      isPrivate,
      participants: [req.user.id]
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: '创建聊天室失败' });
  }
};

// 获取所有公开聊天室
export const getPublicRooms = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('owner', 'username')
      .populate('participants', 'username');
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: '获取聊天室列表失败' });
  }
};

// 加入聊天室
export const joinRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      res.status(404).json({ message: '聊天室不存在' });
      return;
    }

    if (room.isPrivate && room.owner.toString() !== req.user.id) {
      res.status(403).json({ message: '无权加入私密聊天室' });
      return;
    }

    // 获取最近的消息历史
    const recentMessages = await Message.find({ roomId: room._id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', 'username')
      .lean();

    // 如果用户不在参与者列表中，添加用户
    if (!room.participants.includes(req.user.id)) {
      room.participants.push(req.user.id);
      await room.save();
    }

    // 返回房间信息和历史消息
    res.json({
      room,
      messages: recentMessages.reverse()
    });
  } catch (error) {
    res.status(500).json({ message: '加入聊天室失败' });
  }
};

// 离开聊天室
export const leaveRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      res.status(404).json({ message: '聊天室不存在' });
      return;
    }

    room.participants = room.participants.filter(
      participant => participant.toString() !== req.user.id
    );
    await room.save();

    res.json({ message: '已离开聊天室' });
  } catch (error) {
    res.status(500).json({ message: '离开聊天室失败' });
  }
};