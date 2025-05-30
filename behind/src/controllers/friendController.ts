import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';

// 发送好友请求
export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user.id;

    // 检查用户是否存在
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    // 检查是否已经是好友
    if (targetUser.friends.includes(userId)) {
      res.status(400).json({ message: '已经是好友了' });
      return;
    }

    // 添加好友关系（双向）
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { friends: userId } });

    res.status(200).json({ message: '好友添加成功' });
  } catch (error) {
    res.status(500).json({ message: '添加好友失败' });
  }
};

// 获取好友列表
export const getFriendList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username email');
    
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: '获取好友列表失败' });
  }
};

// 删除好友
export const removeFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // 双向移除好友关系
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    res.json({ message: '好友删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除好友失败' });
  }
};