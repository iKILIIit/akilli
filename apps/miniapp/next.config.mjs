import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: [
    "@yield-copilot/agents",
    "@yield-copilot/celo",
    "@yield-copilot/shared",
    "@yield-copilot/ui"
  ]
};

export default nextConfig;
