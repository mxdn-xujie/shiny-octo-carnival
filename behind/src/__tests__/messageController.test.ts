import { Request, Response } from 'express';
import { getRoomMessages, createMessage, getVoiceMessages } from '../controllers/messageController';
import Message from '../models/Message';

jest.mock('../models/Message');

describe('Message Controller Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };
  });

  describe('getRoomMessages', () => {
    it('should get messages for a room successfully', async () => {
      const mockMessages = [
        { id: '1', content: 'test message 1' },
        { id: '2', content: 'test message 2' }
      ];

      mockRequest = {
        params: { roomId: 'room1' },
        query: { type: 'all', page: '1', limit: '50' }
      };

      (Message.find as jest.Mock).mockImplementation(() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: () => ({
                lean: () => mockMessages
              })
            })
          })
        })
      }));

      await getRoomMessages(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('createMessage', () => {
    it('should create a new message successfully', async () => {
      const mockMessage = {
        roomId: 'room1',
        content: 'test message',
        type: 'text',
        populate: jest.fn().mockResolvedValue({ id: '1', content: 'test message' })
      };

      mockRequest = {
        body: {
          roomId: 'room1',
          content: 'test message',
          type: 'text'
        },
        user: { id: 'user1' }
      };

      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      await createMessage(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('getVoiceMessages', () => {
    it('should get voice messages successfully', async () => {
      const mockVoiceMessages = [
        { id: '1', type: 'voice', content: 'voice message 1' },
        { id: '2', type: 'voice', content: 'voice message 2' }
      ];

      mockRequest = {
        params: { roomId: 'room1' },
        query: { limit: '20' }
      };

      (Message.find as jest.Mock).mockImplementation(() => ({
        sort: () => ({
          limit: () => ({
            populate: () => ({
              lean: () => mockVoiceMessages
            })
          })
        })
      }));

      await getVoiceMessages(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.any(Array));
    });
  });
});