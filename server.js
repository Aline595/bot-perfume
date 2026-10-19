const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');

const GIST_FILENAME = 'lista_itens.json';
const CREAMS_GIST_FILENAME = 'gistfile1.txt';
const DEFAULT_CREAMS_GIST_ID = '5d3a031e9c8b6f31e4ecaa89a2c81c92';
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

function validatePerfumeList(value, { validateRecords = false } = {}) {
    if (!Array.isArray(value)) {
        throw new HttpError(502, 'O arquivo do Gist não contém uma lista de perfumes.');
    }

    const ids = new Set();
    for (const perfume of value) {
        if (!perfume || !Number.isSafeInteger(perfume.id) || perfume.id < 1 || ids.has(perfume.id)) {
            throw new HttpError(502, 'O arquivo do Gist contém IDs inválidos ou duplicados.');
        }
        ids.add(perfume.id);
        if (validateRecords) {
            if (!perfume || typeof perfume !== 'object' || Array.isArray(perfume)) {
                throw new HttpError(502, `Perfume ID ${perfume?.id ?? 'inválido'} não contém um objeto válido.`);
            }
            const fields = [
                'nome', 'imagem', 'vibe', 'clima', 'periodo',
                'intensidade', 'marca', 'duracao', 'temperatura_ideal'
            ];
            const input = Object.fromEntries(fields
                .filter((field) => Object.hasOwn(perfume, field))
                .map((field) => [field, perfume[field]]));
            try {
                validatePerfumeInput(input);
            } catch (error) {
                throw new HttpError(502, `Perfume ID ${perfume.id} inválido: ${error.message}`);
            }
        }
    }
    return value;
}

function validateCreamInput(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new HttpError(400, 'Envie um objeto de creme válido.');
    }

    const allowedFields = new Set([
        'nome', 'imagem', 'marca', 'textura', 'fragrancia',
        'notas', 'funcao_principal', 'temperatura', 'clima', 'periodo'
    ]);
    if (Object.keys(value).some((key) => !allowedFields.has(key))) {
        throw new HttpError(400, 'O creme contém campos não reconhecidos.');
    }

    const requiredText = (field) => {
        if (typeof value[field] !== 'string' || !value[field].trim()) {
            throw new HttpError(400, `O campo "${field}" é obrigatório.`);
        }
        return value[field].trim();
    };
    const optionalText = (field) => {
        if (value[field] === undefined) return '';
        if (typeof value[field] !== 'string') {
            throw new HttpError(400, `O campo "${field}" precisa ser um texto.`);
        }
        return value[field].trim();
    };
    const textList = (field) => {
        const list = value[field] ?? [];
        if (!Array.isArray(list) || list.some((item) => typeof item !== 'string' || !item.trim())) {
            throw new HttpError(400, `O campo "${field}" precisa ser uma lista de textos válidos.`);
        }
        return list.map((item) => item.trim());
    };

    const image = optionalText('imagem');
    if (image && !/^[A-Za-z0-9_-]+$/.test(image)) {
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

    const cream = {
        nome: requiredText('nome'),
        imagem: image,
        marca: requiredText('marca'),
        textura: textList('textura'),
        fragrancia: textList('fragrancia'),
        notas: textList('notas'),
        funcao_principal: textList('funcao_principal'),
        clima: textList('clima'),
        periodo: textList('periodo')
    };

    if (value.temperatura !== undefined && value.temperatura !== '') {
        if ((typeof value.temperatura !== 'number' && typeof value.temperatura !== 'string') ||
            (typeof value.temperatura === 'string' && !value.temperatura.trim())) {
            throw new HttpError(400, 'A temperatura precisa ser um número válido.');
        }
        const temperature = Number(value.temperatura);
        if (!Number.isFinite(temperature)) {
            throw new HttpError(400, 'A temperatura precisa ser um número válido.');
        }
        cream.temperatura = temperature;
    } else {
        cream.temperatura = '';
    }
    return cream;
}

function validateCreamList(value) {
    if (!Array.isArray(value)) {
        throw new HttpError(502, 'O arquivo do Gist não contém uma lista de cremes.');
    }
    const ids = new Set();
    for (const cream of value) {
        if (!cream || !Number.isSafeInteger(cream.id) || cream.id < 1 || ids.has(cream.id)) {
            throw new HttpError(502, 'O arquivo do Gist contém IDs de creme inválidos ou duplicados.');
        }
        ids.add(cream.id);
    }
    return value;
}

function validateCreamReplacement(value, current) {
    if (!Array.isArray(value)) {
        throw new HttpError(400, 'O backup precisa conter uma lista JSON de cremes.');
    }
    const ids = new Set();
    const currentById = new Map(current.map((cream) => [cream.id, cream]));
    for (const cream of value) {
        if (!cream || !Number.isSafeInteger(cream.id) || cream.id < 1 || ids.has(cream.id)) {
            throw new HttpError(400, 'O backup contém IDs de creme inválidos ou duplicados.');
        }
        ids.add(cream.id);
        const { id, ...input } = cream;
        try {
            validateCreamInput(input);
        } catch (error) {
            const existing = currentById.get(id);
            if (!existing || stableSerialize(existing) !== stableSerialize(cream)) {
                throw new HttpError(400, `Creme ID ${id} inválido: ${error.message}`);
            }
        }
    }
    return value;
}

function validatePerfumeReplacement(value) {
    try {
        return validatePerfumeList(value, { validateRecords: true });
    } catch (error) {
        throw new HttpError(400, `Backup de perfumes inválido: ${error.message}`);
    }
}

function stableSerialize(value) {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) =>
            `${JSON.stringify(key)}:${stableSerialize(value[key])}`
        ).join(',')}}`;
    }
    return JSON.stringify(value);
}

function createServer({
    token,
    adminPassword,
    gistId,
    creamsGistId = DEFAULT_CREAMS_GIST_ID,
    allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
    fetchImpl = globalThis.fetch,
    staticRoot = __dirname
}) {
    if (!token || !adminPassword || !gistId) {
        throw new Error('Configure GITHUB_TOKEN, ADMIN_PASSWORD e GIST_ID antes de iniciar o servidor.');
    }

    const gistUrl = (id) => `https://api.github.com/gists/${encodeURIComponent(id)}`;
    let writeQueue = Promise.resolve();

    async function readCollection(collection) {
        const response = await fetchImpl(gistUrl(collection.gistId), {
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
        const content = gist.files?.[collection.filename]?.content;
        if (typeof content !== 'string') {
            throw new HttpError(502, `O Gist não contém o arquivo ${collection.filename}.`);
        }

        let records;
        try {
            records = JSON.parse(content);
        } catch {
            throw new HttpError(502, `O arquivo de ${collection.plural} do Gist não contém JSON válido.`);
        }
        return collection.validateList(records);
    }

    function writeCollection(collection, mutator, isReplacement = false) {
        const operation = writeQueue.then(async () => {
            const current = await readCollection(collection);
            const proposed = mutator(current);
            const updated = isReplacement && collection.validateReplacement
                ? collection.validateReplacement(proposed, current)
                : collection.validateList(proposed);
            const validate = isReplacement ? null : collection.validateResult;
            if (validate) validate(updated, current);
            const response = await fetchImpl(gistUrl(collection.gistId), {
                method: 'PATCH',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    files: {
                        [collection.filename]: { content: JSON.stringify(updated, null, 2) }
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
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Vary', 'Origin');
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
        const collectionName = ['perfumes', 'cremes'].find((name) =>
            url.pathname === `/api/${name}` || new RegExp(`^/api/${name}/\\d+$`).test(url.pathname)
        );

        if (collectionName) {
            const isCream = collectionName === 'cremes';
            const collection = isCream
                ? {
                    plural: 'cremes',
                    singular: 'creme',
                    gistId: creamsGistId,
                    filename: CREAMS_GIST_FILENAME,
                    validateInput: validateCreamInput,
                    validateList: validateCreamList,
                    validateResult: validateCreamReplacement,
                    validateReplacement: validateCreamReplacement
                }
                : {
                    plural: 'perfumes',
                    singular: 'perfume',
                    gistId,
                    filename: GIST_FILENAME,
                    validateInput: validatePerfumeInput,
                    validateList: (records) => validatePerfumeList(records),
                    validateResult: (records) => validatePerfumeList(records, { validateRecords: true }),
                    validateReplacement: validatePerfumeReplacement
                };
            const collectionRoute = url.pathname === `/api/${collectionName}`;
            const itemMatch = url.pathname.match(new RegExp(`^/api/${collectionName}/(\\d+)$`));
            try {
                const validMethod = collectionRoute
                    ? ['GET', 'POST', 'PUT'].includes(request.method)
                    : ['PUT', 'DELETE'].includes(request.method);
                if (!validMethod) {
                    sendJson(response, 405, { error: 'Método não permitido para esta rota.' });
                    return;
                }
                if (request.method === 'GET' && collectionRoute) {
                    sendJson(response, 200, { [collection.plural]: await readCollection(collection) });
                    return;
                }

                if (!passwordMatches(request.headers['x-admin-password'], adminPassword)) {
                    sendJson(response, 401, { error: 'Senha de administração inválida.' });
                    return;
                }

                if (request.method === 'POST' && collectionRoute) {
                    const record = collection.validateInput(await readJsonBody(request));
                    const updated = await writeCollection(collection, (current) => {
                        const id = current.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
                        return [...current, { id, ...record }];
                    });
                    sendJson(response, 201, { [collection.plural]: updated });
                    return;
                }

                if (request.method === 'PUT' && collectionRoute) {
                    const records = await readJsonBody(request);
                    const updated = await writeCollection(collection, () => records, true);
                    sendJson(response, 200, { [collection.plural]: updated });
                    return;
                }

                if (!itemMatch) {
                    sendJson(response, 404, { error: `${collection.singular} não encontrado.` });
                    return;
                }

                const id = Number(itemMatch[1]);
                let updated;
                if (request.method === 'DELETE') {
                    updated = await writeCollection(collection, (current) => {
                        if (!current.some((record) => record.id === id)) {
                            throw new HttpError(404, `${collection.singular} não encontrado.`);
                        }
                        return current.filter((record) => record.id !== id);
                    });
                } else {
                    const record = collection.validateInput(await readJsonBody(request));
                    updated = await writeCollection(collection, (current) => {
                        const existing = current.find((item) => item.id === id);
                        if (!existing) throw new HttpError(404, `${collection.singular} não encontrado.`);
                        return current.map((item) => {
                            if (item.id !== id) return item;
                            const updatedRecord = { ...item, ...record };
                            if (!isCream && !Object.hasOwn(record, 'temperatura_ideal')) {
                                delete updatedRecord.temperatura_ideal;
                            }
                            return updatedRecord;
                        });
                    });
                }
                sendJson(response, 200, { [collection.plural]: updated });
            } catch (error) {
                const statusCode = error instanceof HttpError ? error.statusCode : 502;
                if (!(error instanceof HttpError)) {
                    console.error(`Erro ao processar a API de ${collection.plural}:`, error);
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
    const creamsGistId = process.env.CREAMS_GIST_ID || DEFAULT_CREAMS_GIST_ID;
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : DEFAULT_ALLOWED_ORIGINS;

    try {
        const server = createServer({ token, adminPassword, gistId, creamsGistId, allowedOrigins });
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

module.exports = {
    createServer,
    validatePerfumeInput,
    validatePerfumeList,
    validateCreamInput,
    validateCreamList,
    DEFAULT_CREAMS_GIST_ID
};
