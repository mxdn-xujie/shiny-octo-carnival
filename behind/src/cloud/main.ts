import Parse from 'parse/node';

interface CreateRoomParams {
  name: string;
  isPrivate: boolean;
}

interface SendMessageParams {
  roomId: string;
  content: string;
  type?: 'text' | 'voice' | 'system';
  voiceData?: {
    duration: number;
    url: string;
  }
}

// 房间相关云函数
Parse.Cloud.define('createRoom', function(request) {
  const { name, isPrivate } = request.params as CreateRoomParams;
  const user = request.user;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, '需要登录');
  }
  
  const Room = Parse.Object.extend('Room');
  const room = new Room();
  
  room.set('name', name);
  room.set('isPrivate', isPrivate);
  room.set('createdBy', user);
  room.set('participants', [user.id]);
  
  return room.save(null, { useMasterKey: true });
});

// 消息相关云函数
Parse.Cloud.define('sendMessage', function(request) {
  const { roomId, content, type = 'text', voiceData } = request.params as SendMessageParams;
  const user = request.user;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, '需要登录');
  }
  
  const Message = Parse.Object.extend('Message');
  const message = new Message();
  
  message.set('roomId', roomId);
  message.set('content', content);
  message.set('type', type);
  message.set('sender', user);
  if (voiceData) {
    message.set('voiceData', voiceData);
  }
  
  return message.save(null, { useMasterKey: true });
});

// 权限设置
Parse.Cloud.beforeSave('Room', (request) => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, '需要登录');
  }
});

Parse.Cloud.beforeSave('Message', (request) => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, '需要登录');
  }
});