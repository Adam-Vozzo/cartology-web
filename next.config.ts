const nextConfig = {
  output: 'export',
  basePath: process.env.CARTOLOGY_GITHUB_PAGES === '1' ? '/game13' : '',
  trailingSlash: true,
};
export default nextConfig;
