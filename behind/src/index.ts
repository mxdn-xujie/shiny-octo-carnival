import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ParseServer } from 'parse-server';
import Parse from 'parse/node';
import parseConfig from './config/parseConfig';
import { errorHandler } from './middlewares/error';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';
import friendRoutes from './routes/friendRoutes';
import { WebSocketManager } from './utils/WebSocketManager';
import { TypedSocket } from './types/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 初始化 Parse
Parse.initialize(process.env.PARSE_APP_ID!, process.env.PARSE_CLIENT_KEY!);
Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:3500/parse';

// 创建 Parse Server 实例
const parseServer = new ParseServer(parseConfig);

// 中间件配置
app.use(cors());
app.use(express.json());
app.use('/parse', parseServer);

// WebSocket 配置
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// WebSocket 管理器
const wsManager = new WebSocketManager(io);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 3500;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});