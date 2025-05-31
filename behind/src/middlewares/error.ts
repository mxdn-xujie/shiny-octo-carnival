import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown, // 修改为unknown类型以覆盖所有可能的错误
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let processedError: AppError;
    if (err instanceof AppError) {
    processedError = err;
  } else if (err instanceof Error) {
    processedError = new AppError(err.message, 500);
  } else {
    // 非Error类型（如字符串、数字等）
    processedError = new AppError('服务器内部错误', 500);
  }

  res.status(processedError.statusCode).json({
    status: processedError.status,
    message: processedError.message,
    stack: process.env.NODE_ENV === 'development' ? processedError.stack : undefined
  });
};