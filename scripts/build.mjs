import { randomBytes } from 'node:crypto';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyPages } from './verify-pages.mjs';

// The vinext CLI calls process.exit() while Rolldown's native handles are
// closing on Windows. Use the same build and prerender APIs, allowing Node
// to drain its event loop naturally. Build and prerender failures still throw.
process.env.NODE_ENV = 'production';
const githubPages = process.argv.includes('--pages');
if (githubPages) process.env.CARTOLOGY_GITHUB_PAGES = '1';
else delete process.env.CARTOLOGY_GITHUB_PAGES;
const { createBuilder } = await import('vite');
const { loadNextConfig, resolveNextConfig, createRscCompatibilityId } =
  await import('vinext/internal/config/next-config');
const { runPrerender } = await import('vinext/internal/build/run-prerender');
const root = process.cwd().replaceAll('\\', '/');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== path.resolve(root)) {
  throw new Error('Build output must remain inside the project.');
}
await rm(output, { recursive: true, force: true });
const nextConfig = await resolveNextConfig(await loadNextConfig(root), root);
process.env.__VINEXT_SHARED_BUILD_ID = nextConfig.buildId;
process.env.__VINEXT_SHARED_RSC_COMPATIBILITY_ID =
  createRscCompatibilityId(nextConfig);
process.env.__VINEXT_SHARED_REVALIDATE_SECRET = randomBytes(32).toString('hex');
const builder = await createBuilder({ mode: 'production' });
await builder.buildApp();
const result = await runPrerender({ root, nextConfig });
if (!result) throw new Error('The game did not produce a static export.');
const client = path.join(output, 'client');
const routeDirectory = path.join(client, nextConfig.basePath.slice(1));
const entry = path.join(routeDirectory, 'index.html');
await access(entry);
const html = await readFile(entry, 'utf8');
if (!html.includes('Cartology') || !html.includes('<canvas')) {
  throw new Error('The exported route is missing the Cartology game.');
}
console.log(`Cartology static export verified: ${path.relative(root, entry)}`);

if (githubPages) {
  // GitHub mounts docs/ at /game13/, so remove the export's on-disk prefix.
  // Only replace the generated asset tree; keep the hand-written docs.
  const docs = path.resolve(root, 'docs');
  const assets = path.resolve(docs, '_next');
  if (
    path.dirname(docs) !== path.resolve(root) ||
    path.dirname(assets) !== docs
  ) {
    throw new Error('Pages output must remain inside the project docs folder.');
  }
  await mkdir(docs, { recursive: true });
  await rm(assets, { recursive: true, force: true });
  await cp(routeDirectory, docs, { recursive: true });
  await cp(path.join(client, '404.html'), path.join(docs, '404.html'));
  // Jekyll otherwise omits the _next directory containing the game's JS/CSS.
  await writeFile(path.join(docs, '.nojekyll'), '');
  await verifyPages(docs);
  console.log('GitHub Pages ready: main /docs → /game13/');
}
