// ... existing code ...
// 原代码可能为：const value = global.someProperty;
// 添加类型声明（推荐在全局类型文件中）
declare global {
  namespace NodeJS {
    interface Global {
      someProperty: string; // 根据实际类型调整
    }
  }
}

// 或直接添加类型注解
const value: string = global.someProperty;
// ... existing code ...