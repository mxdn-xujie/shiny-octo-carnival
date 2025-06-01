import client from 'prom-client';

// 创建指标收集器
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
const register = new Registry();

// 启用默认指标收集
collectDefaultMetrics({ register });

// 创建自定义指标
const activeConnections = new client.Gauge({
  name: 'voice_chat_active_connections',
  help: '当前活动连接数',
  registers: [register]
});

const messagesSent = new client.Counter({
  name: 'voice_chat_messages_sent_total',
  help: '发送的消息总数',
  registers: [register]
});

const roomParticipants = new client.Gauge({
  name: 'voice_chat_room_participants',
  help: '房间参与者数量',
  labelNames: ['room_id'],
  registers: [register]
});

const audioLatency = new client.Histogram({
  name: 'voice_chat_audio_latency_seconds',
  help: '音频延迟分布',
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 2],
  registers: [register]
});

const audioQuality = new client.Gauge({
  name: 'voice_chat_audio_quality',
  help: '音频质量分数(0-100)',
  labelNames: ['room_id'],
  registers: [register]
});

export {
  register,
  activeConnections,
  messagesSent,
  roomParticipants,
  audioLatency,
  audioQuality
};