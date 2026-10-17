const nextConfig = {
  output: 'export',
  basePath: process.env.CARTOLOGY_GITHUB_PAGES === '1' ? '/cartology-web' : '',
  trailingSlash: true,
};
export default nextConfig;
