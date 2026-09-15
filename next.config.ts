import type { NextConfig } from "next";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { isServer, webpack }) {
    if (isServer && process.env.PRISMA_CLIENT_RUNTIME === "cloudflare") {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /[/\\]generated[/\\]prisma[/\\]client(?:\.ts)?$/,
        path.resolve(process.cwd(), "generated/prisma-cloudflare/client.ts"),
      ));
      // Leave WASM modules to OpenNext/Wrangler instead of compiling them in Webpack.
      config.externals.push((
        { context, request }: { context?: string; request?: string },
        callback: (error?: Error | null, result?: string) => void,
      ) => {
        if (context && request?.endsWith(".wasm?module")) {
          return callback(null, `import ${path.resolve(context, request.slice(0, -7))}`);
        }
        callback();
      });
    }
    return config;
  },
};

export default nextConfig;
