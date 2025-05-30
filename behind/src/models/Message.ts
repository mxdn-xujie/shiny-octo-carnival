import mongoose, { Document } from 'mongoose';

export interface IMessage extends Document {
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'system' | 'voice';
  voiceData?: {
    duration: number;
    url: string;
  };
  createdAt: Date;
}

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'system', 'voice'],
    default: 'text'
  },
  voiceData: {
    duration: Number,
    url: String
  }
}, {
  timestamps: true
});

// 添加索引以优化查询性能
messageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);