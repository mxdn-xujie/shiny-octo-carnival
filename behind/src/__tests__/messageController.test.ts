import { Request, Response } from 'express';
import { messageController } from '../controllers/messageController';

describe('Message Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      user: { id: '1', username: 'testUser' }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('should handle message sending', async () => {
    mockRequest.body = {
      content: 'Test message',
      roomId: '123'
    };

    await messageController.sendMessage(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true
      })
    );
  });
});