const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');

const GIST_FILENAME = 'lista_itens.json';
const MAX_BODY_SIZE = 1024 * 1024;
const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://aline595.github.io'
];

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

function validatePerfumeInput(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new HttpError(400, 'Envie um objeto de perfume válido.');
    }

    const allowedFields = new Set([
        'nome', 'imagem', 'vibe', 'clima', 'periodo',
        'intensidade', 'marca', 'duracao', 'temperatura_ideal'
    ]);
    if (Object.keys(value).some((key) => !allowedFields.has(key))) {
        throw new HttpError(400, 'O perfume contém campos não reconhecidos.');
    }

    const textField = (field) => {
        if (typeof value[field] !== 'string' || !value[field].trim()) {
            throw new HttpError(400, `O campo "${field}" é obrigatório.`);
        }
        return value[field].trim();
    };
    const listField = (field) => {
        if (!Array.isArray(value[field]) || value[field].length === 0 ||
            value[field].some((item) => typeof item !== 'string' || !item.trim())) {
            throw new HttpError(400, `O campo "${field}" precisa ser uma lista de textos.`);
        }
        return value[field].map((item) => item.trim());
    };

    const image = textField('imagem');
    if (!/^[A-Za-z0-9_-]+$/.test(image)) {
        let imageUrl;
        try {
            imageUrl = new URL(image);
        } catch {
            throw new HttpError(400, 'A imagem precisa ser um ID do Google Drive ou uma URL HTTPS.');
        }
        if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) {
            throw new HttpError(400, 'A URL da imagem precisa usar HTTPS.');
        }
    }

    if ((typeof value.duracao !== 'number' && typeof value.duracao !== 'string') ||
        (typeof value.duracao === 'string' && !value.duracao.trim())) {
        throw new HttpError(400, 'A duração precisa ser um número igual ou maior que zero.');
    }
    const duration = Number(value.duracao);
    if (!Number.isFinite(duration) || duration < 0) {
        throw new HttpError(400, 'A duração precisa ser um número igual ou maior que zero.');
    }

    const perfume = {
        nome: textField('nome'),
        imagem: image,
        vibe: listField('vibe'),
        clima: listField('clima'),
        periodo: listField('periodo'),
        intensidade: textField('intensidade'),
        marca: textField('marca'),
        duracao: duration
    };

    if (value.temperatura_ideal !== undefined && value.temperatura_ideal !== '') {
        perfume.temperatura_ideal = textField('temperatura_ideal');
    }

    return perfume;
}

function validatePerfumeList(value) {
    if (!Array.isArray(value)) {
        throw new HttpError(502, 'O arquivo do Gist não contém uma lista de perfumes.');
    }

    const ids = new Set();
    for (const perfume of value) {
        if (!perfume || !Number.isSafeInteger(perfume.id) || perfume.id < 1 || ids.has(perfume.id)) {
            throw new HttpError(502, 'O arquivo do Gist contém IDs inválidos ou duplicados.');
        }
        ids.add(perfume.id);
    }
    return value;
}

function createServer({
    token,
    adminPassword,
    gistId,
    allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
    fetchImpl = globalThis.fetch,
    staticRoot = __dirname
}) {
    if (!token || !adminPassword || !gistId) {
        throw new Error('Configure GITHUB_TOKEN, ADMIN_PASSWORD e GIST_ID antes de iniciar o servidor.');
    }

    const gistUrl = `https://api.github.com/gists/${encodeURIComponent(gistId)}`;
    let writeQueue = Promise.resolve();

    async function readPerfumes() {
        const response = await fetchImpl(gistUrl, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        if (!response.ok) {
            throw new HttpError(502, `Não foi possível ler o Gist (GitHub HTTP ${response.status}).`);
        }

        const gist = await response.json();
        const content = gist.files?.[GIST_FILENAME]?.content;
        if (typeof content !== 'string') {
            throw new HttpError(502, `O Gist não contém o arquivo ${GIST_FILENAME}.`);
        }

        let perfumes;
        try {
            perfumes = JSON.parse(content);
        } catch {
            throw new HttpError(502, 'O arquivo de perfumes do Gist não contém JSON válido.');
        }
        return validatePerfumeList(perfumes);
    }

    function writePerfumes(mutator) {
        const operation = writeQueue.then(async () => {
            const current = await readPerfumes();
            const updated = mutator(current);
            const response = await fetchImpl(gistUrl, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    files: {
                        [GIST_FILENAME]: { content: JSON.stringify(updated, null, 2) }
                    }
                })
            });
            if (!response.ok) {
                throw new HttpError(502, `Não foi possível atualizar o Gist (GitHub HTTP ${response.status}).`);
            }
            return updated;
        });
        writeQueue = operation.catch(() => {});
        return operation;
    }

    const server = http.createServer(async (request, response) => {
        const origin = request.headers.origin;
        if (origin && !allowedOrigins.includes(origin)) {
            sendJson(response, 403, { error: 'Origem não autorizada.' });
            return;
        }
        if (origin) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Vary', 'Origin');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
        }

        if (request.method === 'OPTIONS') {
            response.writeHead(204).end();
            return;
        }

        const url = new URL(request.url, 'http://localhost');
        const collectionRoute = url.pathname === '/api/perfumes';
        const itemMatch = url.pathname.match(/^\/api\/perfumes\/(\d+)$/);

        if (collectionRoute || itemMatch) {
            try {
                const validMethod = collectionRoute
                    ? ['GET', 'POST'].includes(request.method)
                    : ['PUT', 'DELETE'].includes(request.method);
                if (!validMethod) {
                    sendJson(response, 405, { error: 'Método não permitido para esta rota.' });
                    return;
                }
                if (request.method === 'GET' && collectionRoute) {
                    sendJson(response, 200, { perfumes: await readPerfumes() });
                    return;
                }

                if (!passwordMatches(request.headers['x-admin-password'], adminPassword)) {
                    sendJson(response, 401, { error: 'Senha de administração inválida.' });
                    return;
                }

                if (request.method === 'POST' && collectionRoute) {
                    const perfume = validatePerfumeInput(await readJsonBody(request));
                    const updated = await writePerfumes((current) => {
                        const id = current.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
                        return [...current, { id, ...perfume }];
                    });
                    sendJson(response, 201, { perfumes: updated });
                    return;
                }

                if (!itemMatch) {
                    sendJson(response, 404, { error: 'Perfume não encontrado.' });
                    return;
                }

                const id = Number(itemMatch[1]);
                let updated;
                if (request.method === 'DELETE') {
                    updated = await writePerfumes((current) => {
                        if (!current.some((perfume) => perfume.id === id)) {
                            throw new HttpError(404, 'Perfume não encontrado.');
                        }
                        return current.filter((perfume) => perfume.id !== id);
                    });
                } else {
                    const perfume = validatePerfumeInput(await readJsonBody(request));
                    updated = await writePerfumes((current) => {
                        const existing = current.find((item) => item.id === id);
                        if (!existing) throw new HttpError(404, 'Perfume não encontrado.');
                        return current.map((item) => {
                            if (item.id !== id) return item;
                            const updatedPerfume = { ...item, ...perfume };
                            if (!Object.hasOwn(perfume, 'temperatura_ideal')) {
                                delete updatedPerfume.temperatura_ideal;
                            }
                            return updatedPerfume;
                        });
                    });
                }
                sendJson(response, 200, { perfumes: updated });
            } catch (error) {
                const statusCode = error instanceof HttpError ? error.statusCode : 502;
                if (!(error instanceof HttpError)) {
                    console.error('Erro ao processar a API de perfumes:', error);
                }
                sendJson(response, statusCode, { error: error.message || 'Erro interno do servidor.' });
            }
            return;
        }

        serveStatic(request, response, staticRoot);
    });

    return server;
}

function passwordMatches(candidate, expected) {
    if (typeof candidate !== 'string') return false;
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);
    return candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer);
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        let tooLarge = false;
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
            if (tooLarge) return;
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
                tooLarge = true;
                body = '';
            }
        });
        request.on('end', () => {
            if (tooLarge) {
                reject(new HttpError(413, 'O corpo da requisição excede o limite permitido.'));
                return;
            }
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new HttpError(400, 'O corpo da requisição precisa ser JSON válido.'));
            }
        });
        request.on('error', reject);
    });
}

function sendJson(response, statusCode, value) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify(value));
}

function serveStatic(request, response, staticRoot) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { error: 'Método não permitido.' });
        return;
    }

    let filePath;
    try {
        filePath = path.resolve(staticRoot, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    } catch {
        sendJson(response, 400, { error: 'Caminho inválido.' });
        return;
    }

    if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${path.sep}`)) {
        sendJson(response, 403, { error: 'Caminho não autorizado.' });
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (!statError && stats.isDirectory()) filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (readError, content) => {
            if (readError) {
                sendJson(response, readError.code === 'ENOENT' ? 404 : 500, {
                    error: readError.code === 'ENOENT' ? 'Arquivo não encontrado.' : 'Não foi possível ler o arquivo.'
                });
                return;
            }

            const contentTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.ico': 'image/x-icon'
            };
            response.writeHead(200, {
                'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-cache'
            });
            response.end(request.method === 'HEAD' ? undefined : content);
        });
    });
}

if (require.main === module) {
    const token = process.env.GITHUB_TOKEN;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const gistId = process.env.GIST_ID || 'd766a0ddf15dd9fc30ddf3de8a67b16f';
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : DEFAULT_ALLOWED_ORIGINS;

    try {
        const server = createServer({ token, adminPassword, gistId, allowedOrigins });
        const port = Number(process.env.PORT || 8000);
        const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
        server.listen(port, host, () => {
            console.log(`App e API disponíveis em http://${host}:${port}`);
        });
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { createServer, validatePerfumeInput, validatePerfumeList };
