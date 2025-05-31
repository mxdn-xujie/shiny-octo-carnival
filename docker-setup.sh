#!/bin/bash

# 检测操作系统类型
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        OS_TYPE="Linux"
    elif [ "$(uname)" == "Darwin" ]; then
        OS="macOS"
        OS_TYPE="Darwin"
    elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ] || [ "$(expr substr $(uname -s) 1 10)" == "MSYS_NT-10" ]; then
        OS="Windows"
        OS_TYPE="Windows"
    else
        OS="Unknown"
        OS_TYPE="Unknown"
    fi
}

# Linux系统的配置
setup_linux() {
    echo "正在配置Linux系统的Docker环境..."
    
    # 检查是否有root权限
    if [ "$EUID" -ne 0 ]; then 
        echo "请使用root权限运行此脚本 (sudo ./docker-setup.sh)"
        exit 1
    fi

    # 创建Docker配置目录
    mkdir -p /etc/docker

    # 配置镜像加速
    cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "max-concurrent-downloads": 10,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF

    # 重启Docker服务
    systemctl daemon-reload
    systemctl restart docker
}

# macOS系统的配置
setup_macos() {
    echo "正在配置macOS系统的Docker环境..."
    
    # 创建Docker配置目录
    mkdir -p ~/.docker

    # 配置镜像加速
    cat > ~/.docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "max-concurrent-downloads": 10
}
EOF

    # 重启Docker Desktop
    osascript -e 'quit app "Docker"'
    open -a Docker
    echo "请等待Docker Desktop完全启动..."
    sleep 20
}

# Windows系统的配置
setup_windows() {
    echo "正在配置Windows系统的Docker环境..."
    
    # 检查PowerShell是否可用
    if command -v powershell.exe >/dev/null 2>&1; then
        # 创建Docker配置目录
        powershell.exe -Command "if (-not (Test-Path '$env:USERPROFILE\.docker')) { New-Item -ItemType Directory -Path '$env:USERPROFILE\.docker' }"
        
        # 配置镜像加速
        cat > "$HOME/.docker/daemon.json" <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "max-concurrent-downloads": 10
}
EOF

        # 重启Docker服务
        powershell.exe -Command "Restart-Service docker"
    else
        echo "未检测到PowerShell，请手动配置Docker环境"
        exit 1
    fi
}

# 主函数
main() {
    echo "开始自动配置Docker环境..."
    
    # 检测操作系统
    detect_os
    echo "检测到操作系统: $OS ($OS_TYPE)"
    
    # 根据操作系统类型执行相应配置
    case $OS_TYPE in
        "Linux")
            setup_linux
            ;;
        "Darwin")
            setup_macos
            ;;
        "Windows")
            setup_windows
            ;;
        *)
            echo "不支持的操作系统类型: $OS_TYPE"
            exit 1
            ;;
    esac
    
    echo "Docker环境配置完成！"
    echo "正在验证Docker配置..."
    
    # 验证Docker是否正常工作
    if command -v docker >/dev/null 2>&1; then
        docker info >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "Docker配置验证成功！"
        else
            echo "警告: Docker似乎未正常运行，请检查Docker服务状态"
        fi
    else
        echo "警告: 未检测到Docker命令，请确保Docker已正确安装"
    fi
}

# 运行主函数
main