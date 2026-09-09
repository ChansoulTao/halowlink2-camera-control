import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const previewRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(previewRoot, '..', '..');
const luciWwwRoot = join(repositoryRoot, 'work', 'camera-network', 'root', 'www');
const luciIndex = join(luciWwwRoot, 'luci-static', 'resources', 'view', 'camera-network', 'index.js');

function option(name, fallback) {
  const equals = process.argv.find(argument => argument.startsWith(`${name}=`));
  if (equals)
    return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const host = option('--host', '127.0.0.1');
const port = Number(option('--port', '4173'));

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error(`Invalid --port value: ${port}`);
if (!existsSync(luciIndex))
  throw new Error(`Production LuCI view not found: ${luciIndex}`);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function safeFile(root, requestPath) {
  const relative = normalize(requestPath).replace(/^([/\\])+/, '');
  const candidate = resolve(root, relative);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate === root || candidate.startsWith(prefix) ? candidate : null;
}

function resolveRequest(pathname) {
  if (pathname === '/' || pathname === '/index.html')
    return join(previewRoot, 'index.html');
  if (pathname === '/preview.js' || pathname === '/preview.css')
    return join(previewRoot, pathname.slice(1));
  if (pathname === '/luci-index.js')
    return luciIndex;
  if (pathname.startsWith('/luci-static/'))
    return safeFile(luciWwwRoot, pathname);
  return null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  const file = resolveRequest(decodeURIComponent(url.pathname));
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff'
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`HaLowLink LuCI preview: http://${host}:${port}/`);
  console.log(`Production view: ${luciIndex}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
