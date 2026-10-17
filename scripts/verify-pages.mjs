import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// Verify the exported dependency graph against GitHub's project URL, rather
// than a root-hosted dev server that would hide broken /cartology-web/ asset paths.
export async function verifyPages(directory) {
  const origin = 'https://adam-vozzo.github.io';
  const base = '/cartology-web/';
  const root = path.resolve(directory);
  await access(path.join(root, '.nojekyll'));
  const files = await readdir(root, { recursive: true });
  let checked = 0;
  for (const file of files) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const text = await readFile(path.join(root, file), 'utf8');
    const current = new URL(base + file.replaceAll('\\', '/'), origin);
    const references = file.endsWith('.html')
      ? [...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
      : file.endsWith('.css')
        ? [...text.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)].map(
            (match) => match[1],
          )
        : [...text.matchAll(/(?:from\s*|import\s*\(?)["']([^"']+)["']/g)].map(
            (match) => match[1],
          );
    for (const reference of references) {
      if (!reference.startsWith('/') && !reference.startsWith('.')) continue;
      const url = new URL(reference.replaceAll('&amp;', '&'), current);
      if (url.origin !== origin) continue;
      if (!url.pathname.startsWith(base)) {
        throw new Error(
          `${file} references an asset outside ${base}: ${reference}`,
        );
      }
      const target = path.resolve(
        root,
        decodeURIComponent(url.pathname.slice(base.length)),
      );
      if (!target.startsWith(root + path.sep))
        throw new Error('Asset escapes Pages output.');
      await access(target);
      checked++;
    }
  }
  if (checked < 5)
    throw new Error('Pages export is missing its dependency graph.');
  console.log(`Verified ${checked} local asset references under ${base}.`);
}
