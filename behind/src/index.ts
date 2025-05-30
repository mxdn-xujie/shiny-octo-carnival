import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import { errorHandler } from './middlewares/error';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';
import friendRoutes from './routes/friendRoutes';
import Message from './models/Message';
import { AuthRequest } from './middlewares/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 用户在线状态映射
const onlineUsers = new Map();
// 房间用户映射
const roomUsers = new Map();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);

// 错误处理中间件
app.use(errorHandler);

// 数据库连接
connectDB();

// WebSocket 连接处理
io.on('connection', (socket) => {
  console.log('用户已连接:', socket.id);
  
  // 用户上线
  socket.on('user-online', (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit('user-status-change', { userId, status: 'online' });
  });

  // 加入房间
  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    
    // 更新房间用户列表
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(userId);
    
    // 广播房间用户列表更新
    const users = Array.from(roomUsers.get(roomId));
    io.to(roomId).emit('room-users-update', { roomId, users });
    io.to(roomId).emit('user-joined', { userId, socketId: socket.id });
  });

  // 离开房间
  socket.on('leave-room', ({ roomId, userId }) => {
    socket.leave(roomId);
    
    // 更新房间用户列表
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(userId);
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      }
    }
    
    // 广播用户离开消息
    io.to(roomId).emit('user-left', { userId, socketId: socket.id });
    io.to(roomId).emit('room-users-update', { 
      roomId, 
      users: roomUsers.has(roomId) ? Array.from(roomUsers.get(roomId)) : []
    });
  });

  // 处理语音数据
  socket.on('voice-data', ({ roomId, data }) => {
    const userId = onlineUsers.get(socket.id);
    socket.to(roomId).emit('voice-data', { userId, socketId: socket.id, data });
  });

  // 发送消息
  socket.on('send-message', async ({ roomId, content }) => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      try {
        const message = await Message.create({
          roomId,
          senderId: userId,
          content,
          type: 'text'
        });

        const populatedMessage = await message.populate('senderId', 'username');
        io.to(roomId).emit('new-message', populatedMessage);
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  });

  // 用户正在说话状态
  socket.on('speaking-state', ({ roomId, isSpeaking }) => {
    const userId = onlineUsers.get(socket.id);
    socket.to(roomId).emit('user-speaking', { userId, isSpeaking });
  });

  // 语音消息处理
  socket.on('voice-message', async ({ roomId, audioData, duration }) => {
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
  });

  // 暂停通话状态
  socket.on('pause-voice', ({ roomId }) => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      io.to(roomId).emit('user-paused', { userId });
    }
  });

  // 恢复通话状态
  socket.on('resume-voice', ({ roomId }) => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      io.to(roomId).emit('user-resumed', { userId });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      // 广播用户下线状态
      io.emit('user-status-change', { userId, status: 'offline' });
      onlineUsers.delete(socket.id);
      
      // 从所有房间中移除用户
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
    console.log('用户已断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});