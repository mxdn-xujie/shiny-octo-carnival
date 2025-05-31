import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5秒

async function connectWithRetry(retries: number = MAX_RETRIES): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/voicechat', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB数据库连接成功');
  } catch (error) {
    console.error(`数据库连接失败，剩余重试次数: ${retries - 1}`);
    if (retries > 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      return connectWithRetry(retries - 1);
    }
    throw new AppError('数据库连接失败，请检查配置或联系管理员', 500);
  }
}

export const initDatabase = async (): Promise<void> => {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB连接错误:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB连接断开，尝试重新连接...');
    connectWithRetry();
  });

  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB连接已安全关闭');
      process.exit(0);
    } catch (err) {
      console.error('关闭MongoDB连接时出错:', err);
      process.exit(1);
    }
  });

  await connectWithRetry();
};