#!/bin/bash

# 导入系统检测和配置函数
. ./docker-setup.sh

# 检查执行权限
check_permissions() {
    if [ "$OS_TYPE" = "Linux" ] && [ "$EUID" -ne 0 ]; then 
        echo "请使用root权限运行此脚本 (sudo ./deploy.sh)"
        exit 1
    fi
}

# 安装Docker和依赖
install_docker() {
    echo "检查并安装Docker..."
    case $OS_TYPE in
        "Linux")
            if [ -f /etc/debian_version ]; then
                # Debian/Ubuntu系统
                apt-get update
                apt-get install -y docker.io docker-compose
            elif [ -f /etc/redhat-release ]; then
                # CentOS/RHEL系统
                yum install -y yum-utils
                yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                systemctl start docker
                systemctl enable docker
            fi
            ;;
        "Darwin")
            if ! command -v docker >/dev/null 2>&1; then
                echo "请先安装Docker Desktop for Mac"
                echo "访问: https://www.docker.com/products/docker-desktop"
                exit 1
            fi
            ;;
        "Windows")
            if ! command -v docker >/dev/null 2>&1; then
                echo "请先安装Docker Desktop for Windows"
                echo "访问: https://www.docker.com/products/docker-desktop"
                exit 1
            fi
            ;;
    esac
}

# 创建必要的目录和文件
setup_directories() {
    echo "创建必要的目录..."
    mkdir -p logs data/db
}

# 生成环境变量文件
generate_env() {
    if [ ! -f ".env" ]; then
        echo "生成环境变量文件..."
        cat > .env <<EOF
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/voicechat
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
EOF
    fi
}

# 启动服务
start_services() {
    echo "启动服务..."
    docker-compose up -d

    echo "等待服务启动..."
    sleep 5

    if docker-compose ps | grep -q "Up"; then
        echo "=================================="
        echo "部署成功！"
        echo "服务已启动，访问地址: http://localhost:3500"
        echo "查看日志: docker-compose logs -f"
        echo "停止服务: docker-compose down"
        echo "=================================="
    else
        echo "服务启动失败，请检查日志: docker-compose logs"
        exit 1
    fi
}

# 主函数
main() {
    echo "开始部署语音对讲应用..."
    
    # 检测系统类型
    detect_os
    echo "检测到操作系统: $OS ($OS_TYPE)"
    
    # 检查权限
    check_permissions
    
    # 安装Docker
    install_docker
    
    # 配置Docker环境
    main_docker_setup
    
    # 创建目录
    setup_directories
    
    # 生成环境变量
    generate_env
    
    # 启动服务
    start_services
}

# 执行主函数
main