declare global {
  namespace NodeJS {
    interface Global {
      server: import('http').Server; // 根据实际类型调整
    }
  }
}