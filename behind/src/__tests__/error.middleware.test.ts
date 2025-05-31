import { Request, Response, NextFunction } from 'express';
import { errorMiddleware } from '../middlewares/error';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  test('should handle known errors', () => {
    const error = new Error('Test error');
    error.name = 'ValidationError';
    
    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Test error'
    });
  });

  test('should handle unknown errors', () => {
    const error: Error = new Error('Unknown error');
    
    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error'
    });
  });
});