// ... existing code ...
// 原代码可能为：
// socket.on('error', (error) => { console.error(error.message); });
// 修改为安全访问
socket.on('error', (error) => {
  if (error instanceof Error) {
    console.error(error.message); // 仅当error是Error实例时访问message
  } else {
    console.error('Unknown error occurred');
  }
});
// ... existing code ...