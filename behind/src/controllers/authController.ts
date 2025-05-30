import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// 生成 JWT token
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

// 用户注册
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400).json({ message: '用户名或邮箱已存在' });
      return;
    }

    // 创建新用户
    const user = (await User.create({
      username,
      email,
      password,
    })) as IUser;

    res.status(201).json({
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
};

// 用户登录
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = (await User.findOne({ email })) as IUser | null;
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: '邮箱或密码错误' });
      return;
    }

    res.json({
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
};