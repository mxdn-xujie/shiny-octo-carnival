import { Request, Response } from 'express';
import Parse from 'parse/node';
import { generateJWT } from '../utils';

// 用户注册
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const user = new Parse.User();
    user.set('username', username);
    user.set('email', email);
    user.set('password', password);

    await user.signUp();
    const token = generateJWT(user.id);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
        },
        token,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

// 用户登录
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await Parse.User.logIn(username, password);
    const token = generateJWT(user.id);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
        },
        token,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      status: 'error',
      message: '用户名或密码错误',
    });
  }
};