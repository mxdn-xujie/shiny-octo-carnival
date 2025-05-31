// ... existing code ...
import { Request } from 'express';

// 扩展Express的Request类型（添加到测试文件顶部或全局类型声明文件）
declare global {
  namespace Express {
    interface Request {
      user?: any; // 根据实际用户类型替换any（如User类型）
    }
  }
}

// 或使用类型断言（临时方案）
const mockRequest: Partial<Request> & { user?: any } = { /* ... */ };
// ... existing code ...