import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middlewares/error';

describe('Error Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
  });

  it('should handle validation errors', () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';

    errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Validation failed',
      stack: expect.any(String)
    });
  });

  it('should handle authentication errors', () => {
    const authError = new Error('Authentication failed');
    authError.name = 'AuthenticationError';

    errorHandler(authError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Authentication failed',
      stack: expect.any(String)
    });
  });

  it('should handle general errors', () => {
    const generalError = new Error('Something went wrong');

    errorHandler(generalError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Something went wrong',
      stack: expect.any(String)
    });
  });
});