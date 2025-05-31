# 语音对讲应用

这是一个基于 WebRTC 的实时语音对讲应用，支持智能部署和移动端适配。

## 一键部署

只需一个命令即可完成部署，系统会自动：
- 识别操作系统类型（Windows/Linux/macOS）
- 配置相应的 Docker 环境
- 设置国内镜像源
- 安装必要的依赖
- 启动所有服务

### Windows 系统
```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/deploy.sh

# 在 Git Bash 中运行（需要管理员权限）
./deploy.sh
```

### Linux 系统
```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/deploy.sh

# 添加执行权限并运行（需要root权限）
chmod +x deploy.sh
sudo ./deploy.sh
```

### macOS 系统
```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/deploy.sh

# 添加执行权限并运行
chmod +x deploy.sh
./deploy.sh
```

## 自动配置说明

脚本会根据不同系统自动进行以下配置：

### Windows
- 自动配置 Docker Desktop 设置
- 配置国内镜像加速
- 优化 WSL2 配置（如果使用）

### Linux
- 自动安装 Docker 和 Docker Compose
- 配置系统级镜像加速
- 优化系统参数
- 配置日志轮转

### macOS
- 配置 Docker Desktop 设置
- 配置国内镜像加速
- 优化性能参数

## 快速开始

### Docker 一键部署（推荐）

1. 确保已安装 Docker 和 Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose -y

# CentOS
sudo yum install docker docker-compose -y
```

2. 启动 Docker 服务
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

3. 克隆仓库
```bash
git clone https://github.com/mxdn-xujie/shiny-octo-carnival.git
cd shiny-octo-carnival
```

4. 启动服务
```bash
sudo docker-compose up -d
```

### 常用命令

- 查看服务状态：`sudo docker-compose ps`
- 查看日志：`sudo docker-compose logs -f`
- 停止服务：`sudo docker-compose down`
- 重启服务：`sudo docker-compose restart`

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|---------|
| NODE_ENV | 运行环境 | production |
| MONGODB_URI | MongoDB连接地址 | mongodb://mongodb:27017/voicechat |
| JWT_SECRET | JWT密钥 | 自动生成 |
| JWT_EXPIRES_IN | JWT过期时间 | 7d |

### 端口说明

- 3500: 应用主端口
- 27017: MongoDB端口（内部使用）

### 存储卷

- mongodb_data: 数据库文件
- app_logs: 应用日志

## 功能特点

- PTT（按键通话）模式
- 实时语音通话
- 移动端优化
- 触觉反馈
- 房间管理
- 用户认证
- 系统监控
- 音频质量控制

## 移动端特性

- 手势控制：
  - 左滑：静音控制
  - 右滑：切换PTT模式
  - 双击：快速静音

- 触觉反馈：
  - 按钮操作振动
  - 状态变化提示
  - 错误警告震动

- 自适应布局：
  - 安全区域适配
  - 响应式设计
  - 触控优化

## 系统要求

- Docker 20.10.0 或更高版本
- Docker Compose 2.0.0 或更高版本
- 4GB RAM（推荐）
- 10GB 可用磁盘空间

## 开发环境搭建

1. 安装依赖
```bash
npm install
cd behind && npm install
```

2. 启动开发服务器
```bash
# Windows
.\dev.bat

# Linux/Mac
./dev.sh
```

## 问题排查

### 常见问题

1. 服务无法启动
   - 检查端口 3500 是否被占用
   - 确认 Docker 服务正在运行
   - 查看日志 `docker-compose logs -f`

2. 音频问题
   - 确认浏览器麦克风权限
   - 检查音频设备设置
   - 验证网络连接状态

3. 数据库连接失败
   - 等待 MongoDB 完全启动
   - 检查数据库连接配置
   - 确认数据卷权限

### 日志位置

- 应用日志：`./logs/`
- Docker 日志：使用 `docker-compose logs`
- MongoDB 日志：在容器内的 `/data/db/`

## 安全建议

1. 生产环境配置
   - 修改默认端口
   - 设置强密码
   - 配置 SSL 证书
   - 启用防火墙

2. 数据安全
   - 定期备份数据
   - 加密敏感信息
   - 限制访问权限

## 性能优化

- 启用 MongoDB 索引
- 配置合适的音频质量
- 调整 WebRTC 参数
- 使用 CDN（可选）

## 许可证

MIT License

## 支持与反馈

如有问题，请通过以下方式联系：

1. 提交 GitHub Issue
2. 发送邮件至：support@example.com