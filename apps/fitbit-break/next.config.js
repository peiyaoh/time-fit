/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @time-fit/web-components ships JSX in plain .js files; Next only transpiles its own
  // app code by default, so workspace packages with JSX need to be opted in explicitly.
  transpilePackages: ["@time-fit/web-components"],
}

module.exports = nextConfig
