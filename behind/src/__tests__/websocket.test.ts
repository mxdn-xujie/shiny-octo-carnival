import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { AddressInfo } from 'net';

describe('WebSocket Server', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  test('应该能发送和接收语音消息', (done) => {
    const mockAudioData = {
      roomId: 'test-room',
      data: Buffer.from('test-audio-data'),
      messageId: 'test-message-id',
      timestamp: Date.now()
    };

    serverSocket.on('voice-message', (data: any) => {
      expect(data).toMatchObject({
        roomId: mockAudioData.roomId,
        messageId: mockAudioData.messageId
      });
      done();
    });

    clientSocket.emit('voice-message', mockAudioData);
  });

  test('应该能加入和离开房间', (done) => {
    const roomData = {
      roomId: 'test-room',
      userId: 'test-user'
    };

    serverSocket.on('join_room', (data: any) => {
      expect(data).toEqual(roomData);
      serverSocket.join(data.roomId);
      done();
    });

    clientSocket.emit('join_room', roomData);
  });
});