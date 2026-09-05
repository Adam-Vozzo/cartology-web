import { randomBytes } from 'node:crypto';
import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

// The vinext CLI calls process.exit() while Rolldown's native handles are
// closing on Windows. Use the same build and prerender APIs, allowing Node
// to drain its event loop naturally. Build and prerender failures still throw.
process.env.NODE_ENV = 'production';
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
const entry = path.join(root, 'dist/client/index.html');
await access(entry);
const html = await readFile(entry, 'utf8');
if (!html.includes('Cartology') || !html.includes('<canvas')) {
  throw new Error('The exported route is missing the Cartology game.');
}
console.log('Cartology static export verified: dist/client/index.html');
