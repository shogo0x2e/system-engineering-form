import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(import.meta.url))

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev()
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: rootDir,
  },
}

export default nextConfig
