import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';


/**
 * Eventide static file server.
 *
 * This workshop solution is intentionally frontend-only. There is no Fastify
 * application, no database, and no third-party dependency here. Node's built-in
 * http/fs/path modules are enough to serve the public/ directory while a separate
 * Community Events API process handles the real work on another origin.
 */


const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? '127.0.0.1';

const currentDirectory = dirname(
    fileURLToPath(import.meta.url)
);

const publicDirectory = resolve(
    currentDirectory,
    'public'
);


/**
 * Explicit content types keep the browser happy for ES modules (.js must never be
 * served as text/plain) and for the small inline SVG assets used by the interface.
 */
const contentTypes = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.webp', 'image/webp'],
    ['.ico', 'image/x-icon'],
    ['.txt', 'text/plain; charset=utf-8'],
    ['.map', 'application/json; charset=utf-8']
]);


function contentTypeFor(filePath) {

    const extension = extname(filePath).toLowerCase();

    return contentTypes.get(extension) ?? 'application/octet-stream';

}


function sendText(response, statusCode, message) {

    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });

    response.end(message);

}


/**
 * Resolve a URL path to a file inside public/.
 * Anything that escapes the public directory is rejected with null.
 */
function resolvePublicFile(pathname) {

    let decodedPath;

    try {

        decodedPath = decodeURIComponent(pathname);

    } catch {

        return null;

    }

    const relativePath = decodedPath === '/'
        ? 'index.html'
        : decodedPath.replace(/^\/+/, '');

    const absolutePath = resolve(
        publicDirectory,
        relativePath
    );

    const isInsidePublic =
        absolutePath === publicDirectory ||
        absolutePath.startsWith(publicDirectory + sep);

    if (!isInsidePublic) {
        return null;
    }

    return absolutePath;

}


const server = createServer(async (request, response) => {

    if (request.method !== 'GET' && request.method !== 'HEAD') {

        response.setHeader('Allow', 'GET, HEAD');
        sendText(response, 405, 'Method not allowed.');

        return;

    }

    const requestUrl = new URL(
        request.url ?? '/',
        `http://${HOST}:${PORT}`
    );

    const filePath = resolvePublicFile(requestUrl.pathname);

    if (!filePath) {

        sendText(response, 403, 'Forbidden.');

        return;

    }

    try {

        const fileStats = await stat(filePath);

        if (!fileStats.isFile()) {

            sendText(response, 404, 'Not found.');

            return;

        }

        response.writeHead(200, {
            'Content-Type': contentTypeFor(filePath),
            'Content-Length': fileStats.size,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });

        if (request.method === 'HEAD') {

            response.end();

            return;

        }

        const stream = createReadStream(filePath);

        stream.on('error', (error) => {

            console.error('Unable to stream file:', error);

            response.destroy();

        });

        stream.pipe(response);

    } catch (error) {

        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {

            sendText(response, 404, 'Not found.');

            return;

        }

        console.error('Unable to serve request:', error);

        sendText(response, 500, 'Internal server error.');

    }

});


server.listen(PORT, HOST, () => {

    console.log(`Eventide UI is running at http://${HOST}:${PORT}`);
    console.log(`Serving static files from ${publicDirectory}`);
    console.log(`Default API origin: http://127.0.0.1:3000`);

});
