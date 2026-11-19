import type { NextConfig } from "next"

// Local dev and `next start` serve the app from the root.
// For GitHub Pages, set NEXT_PUBLIC_BASE_PATH (for example "/CS35L-Project-1"),
// which turns on a static export under that path. See docs/dev/DEPLOY.md.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig: NextConfig = basePath
  ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } }
  : {}

export default nextConfig
