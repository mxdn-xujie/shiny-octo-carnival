import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './config/db';
import { errorHandler } from './middlewares/error';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';
import friendRoutes from './routes/friendRoutes';
import metricsRoutes from './routes/metricsRoutes';
import {
  activeConnections,
  messagesSent,
  roomParticipants,
  audioLatency,
  audioQuality
} from './utils/metrics';
import Message from './models/Message';
import { AuthRequest } from './middlewares/auth';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents,
  SocketData,
  TypedSocket
} from './types/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 用户在线状态映射
const onlineUsers = new Map<string, string>();
// 房间用户映射
const roomUsers = new Map<string, Set<string>>();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/', metricsRoutes);

// 添加健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// WebSocket 事件处理
io.on('connection', (socket: TypedSocket) => {
  // 更新连接计数
  activeConnections.inc();

  socket.on('ping', (callback) => {
    callback();
  });

  socket.on('user-online', (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit('user-status-change', { userId, status: 'online' });
  });

  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId)?.add(userId);
    
    const users = Array.from(roomUsers.get(roomId) || []);
    io.to(roomId).emit('room-users-update', { roomId, users });
    io.to(roomId).emit('user-joined', { userId, socketId: socket.id });

    roomParticipants.labels(roomId).inc();
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    socket.leave(roomId);
    
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId)?.delete(userId);
      if (roomUsers.get(roomId)?.size === 0) {
        roomUsers.delete(roomId);
      }
    }
    
    io.to(roomId).emit('user-left', { userId, socketId: socket.id });
    io.to(roomId).emit('room-users-update', { 
      roomId, 
      users: Array.from(roomUsers.get(roomId) || [])
    });

    roomParticipants.labels(roomId).dec();
  });

  socket.on('voice-message', async ({ roomId, audioData, duration, messageId, timestamp }) => {
    messagesSent.inc();
    const startTime = Date.now();
    
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      try {
        const message = await Message.create({
          roomId,
          senderId: userId,
          content: '语音消息',
          type: 'voice',
          voiceData: {
            duration,
            url: audioData // 实际生产环境中应该先保存到文件系统或云存储
          }
        });

        const populatedMessage = await message.populate('senderId', 'username');
        io.to(roomId).emit('new-voice-message', populatedMessage);
      } catch (error) {
        console.error('保存语音消息失败:', error);
        socket.emit('error', { message: '保存语音消息失败' });
      }
    }

    const latency = (Date.now() - startTime) / 1000;
    audioLatency.observe(latency);
  });

  socket.on('speaking-state', ({ roomId, isSpeaking }) => {
    const userId = onlineUsers.get(socket.id);
    socket.to(roomId).emit('user-speaking', { userId, isSpeaking });
  });

  socket.on('pause-voice', ({ roomId }) => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      io.to(roomId).emit('user-paused', { userId });
    }
  });

  socket.on('resume-voice', ({ roomId }) => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      io.to(roomId).emit('user-resumed', { userId });
    }
  });

  socket.on('audio-quality', ({ roomId, quality }) => {
    audioQuality.labels(roomId).set(quality);
  });

  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      io.emit('user-status-change', { userId, status: 'offline' });
      onlineUsers.delete(socket.id);
      
      roomUsers.forEach((users, roomId) => {
        if (users.has(userId)) {
          users.delete(userId);
          if (users.size === 0) {
            roomUsers.delete(roomId);
          } else {
            io.to(roomId).emit('room-users-update', { 
              roomId, 
              users: Array.from(users)
            });
          }
        }
      });
    }
    activeConnections.dec();
  });
});

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});