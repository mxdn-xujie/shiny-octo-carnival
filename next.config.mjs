/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 启用 ESLint 检查
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 启用类型检查
    ignoreBuildErrors: false,
  },
  images: {
    // 启用图片优化
    unoptimized: false,
  },
  // 添加安全配置
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
