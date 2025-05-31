// ... existing code ...
// 原函数可能为：
// function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void {
//   res.status(500).json({ error: err.message });
// }
// 修改返回类型为Response
function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction): Response {
  return res.status(500).json({ error: err.message });
}
// ... existing code ...