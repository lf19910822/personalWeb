export function getDistDir(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "development" ? ".next-dev" : ".next";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 输出 standalone,便于 Docker / 云托管容器部署(镜像更小)
  output: "standalone",
  // next dev 与 next build 不能并发写同一个目录,否则开发服务器可能加载到缺失的 chunk。
  distDir: getDistDir(),
};

export default nextConfig;
