/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 输出 standalone,便于 Docker / 云托管容器部署(镜像更小)
  output: "standalone",
};

export default nextConfig;
