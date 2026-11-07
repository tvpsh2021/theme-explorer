import { createReadStream } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const CONTENT_TYPES: Record<string, string> = {
  '.ani': 'application/octet-stream',
  '.bmp': 'image/bmp',
  '.cur': 'application/octet-stream',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.theme': 'text/plain; charset=windows-1252',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.wav': 'audio/wav',
};

function isLoopback(address?: string) {
  return address === '::1' || address === '127.0.0.1' || address === '::ffff:127.0.0.1';
}

async function listFiles(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const path = resolve(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(path, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function localThemesPlugin(): Plugin {
  const localRoot = resolve(process.cwd(), 'local-themes');

  return {
    name: 'local-themes',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        // Parse before any await: a rejection from this async middleware would be unhandled and crash the dev server.
        let url: URL;
        try {
          url = new URL(request.url ?? '/', 'http://localhost');
        } catch {
          return next();
        }
        if (!url.pathname.startsWith('/__local-themes/')) return next();
        response.setHeader('Cache-Control', 'no-store');
        if (!isLoopback(request.socket.remoteAddress)) {
          response.statusCode = 403;
          response.end('Local theme files are only available through localhost.');
          return;
        }

        if (url.pathname === '/__local-themes/manifest') {
          try {
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify({ files: await listFiles(localRoot) }));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              response.setHeader('Content-Type', 'application/json; charset=utf-8');
              response.end(JSON.stringify({ files: [] }));
              return;
            }
            next(error as Error);
          }
          return;
        }

        if (url.pathname !== '/__local-themes/file') return next();
        const requestedPath = url.searchParams.get('path')?.replaceAll('\\', '/');
        if (!requestedPath || requestedPath.split('/').some((segment) => segment === '..')) {
          response.statusCode = 400;
          response.end('Invalid path.');
          return;
        }

        try {
          const [realRoot, realFile] = await Promise.all([
            realpath(localRoot),
            realpath(resolve(localRoot, requestedPath)),
          ]);
          const pathFromRoot = relative(realRoot, realFile);
          if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
            response.statusCode = 403;
            response.end('Path is outside local-themes.');
            return;
          }
          const fileStats = await stat(realFile);
          if (!fileStats.isFile()) {
            response.statusCode = 404;
            response.end('File not found.');
            return;
          }
          response.setHeader('Content-Type', CONTENT_TYPES[extname(realFile).toLowerCase()] ?? 'application/octet-stream');
          response.setHeader('Content-Length', fileStats.size);
          pipeline(createReadStream(realFile), response, (error) => {
            // Client disconnects are expected; only report actual read failures.
            if (error && (error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
              server.config.logger.error(`[local-themes] Failed to stream ${requestedPath}: ${error.message}`);
            }
          });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            response.statusCode = 404;
            response.end('File not found.');
            return;
          }
          next(error as Error);
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), localThemesPlugin()] });
