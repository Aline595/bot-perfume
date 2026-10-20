const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createServer,
    validatePerfumeInput,
    validatePerfumeList,
    validateCreamInput,
    validateCreamList,
    DEFAULT_CREAMS_GIST_ID
} = require('./server');
const { categoriaTemperaturaCreme, cremeCombina } = require('./cremes');

const perfumeInput = {
    nome: 'Perfume de teste',
    imagem: 'drive_file_id-1',
    vibe: ['floral', 'fresco'],
    clima: ['Primavera'],
    periodo: ['dia', 'noite'],
    intensidade: 'Moderado',
    marca: 'Marca de teste',
    duracao: 4,
    temperatura_ideal: 'Acima de 20°C'
};

function makeFetch(initialPerfumes) {
    let perfumes = initialPerfumes;
    const requests = [];
    const fetchImpl = async (url, options = {}) => {
        requests.push({ url, options });
        if (options.method === 'PATCH') {
            const patch = JSON.parse(options.body);
            perfumes = JSON.parse(patch.files['lista_itens.json'].content);
            return new Response('{}', { status: 200 });
        }
        return new Response(JSON.stringify({
            files: { 'lista_itens.json': { content: JSON.stringify(perfumes) } }
        }), { status: 200 });
    };
    return { fetchImpl, requests, getPerfumes: () => perfumes };
}

function makeGistFetch(initialGists) {
    const gists = new Map(Object.entries(initialGists).map(([id, files]) => [id, structuredClone(files)]));
    const requests = [];
    const fetchImpl = async (url, options = {}) => {
        requests.push({ url, options });
        const gistId = new URL(url).pathname.split('/').at(-1);
        const files = gists.get(gistId);
        if (!files) return new Response('{}', { status: 404 });
        if (options.method === 'PATCH') {
            const patch = JSON.parse(options.body);
            Object.entries(patch.files).forEach(([filename, file]) => {
                files[filename] = { content: file.content };
            });
            return new Response('{}', { status: 200 });
        }
        return new Response(JSON.stringify({
            files: Object.fromEntries(Object.entries(files).map(([filename, file]) => [
                filename,
                { content: file.content }
            ]))
        }), { status: 200 });
    };
    return { fetchImpl, requests, gists };
}

async function withServer(options, callback) {
    const server = createServer(options);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    try {
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

test('validates the Gist perfume fields and image protocols', () => {
    assert.deepEqual(validatePerfumeInput(perfumeInput), perfumeInput);
    assert.throws(
        () => validatePerfumeInput({ ...perfumeInput, imagem: 'http://example.com/image.jpg' }),
        /HTTPS/
    );
    assert.throws(
        () => validatePerfumeInput({ ...perfumeInput, vibe: [] }),
        /vibe/
    );
    assert.throws(
        () => validatePerfumeList([{ id: 1 }, { id: 1 }]),
        /duplicados/
    );
    assert.throws(
        () => validatePerfumeList([{ id: 1, ...perfumeInput, vibe: [] }], { validateRecords: true }),
        /ID 1 inválido.*vibe/
    );
    assert.throws(
        () => validatePerfumeList([{ id: 1, ...perfumeInput }, { id: 2, ...perfumeInput, periodo: [] }], { validateRecords: true }),
        /ID 2 inválido.*periodo/
    );
    assert.throws(
        () => validatePerfumeInput({ ...perfumeInput, created_at: 'recentemente' }),
        /created_at.*data ISO válida/
    );
});

test('validates cream input while allowing empty optional list fields', () => {
    const cream = {
        nome: 'Creme de teste',
        marca: 'Marca de teste',
        textura: [],
        fragrancia: ['Floral'],
        notas: ['Baunilha'],
        funcao_principal: ['Hidratação'],
        temperatura: 22,
        clima: ['Primavera'],
        periodo: ['dia']
    };
    assert.deepEqual(validateCreamInput(cream), { imagem: '', ...cream });
    assert.throws(
        () => validateCreamInput({ ...cream, marca: '' }),
        /marca.*obrigatório/
    );
    assert.throws(
        () => validateCreamInput({ ...cream, temperatura: 'quente' }),
        /temperatura/
    );
    assert.throws(
        () => validateCreamInput({ ...cream, temperatura: [] }),
        /temperatura/
    );
    assert.throws(
        () => validateCreamInput({ ...cream, imagem: 'http://example.com/cream.jpg' }),
        /HTTPS/
    );
    assert.throws(
        () => validateCreamInput({ ...cream, updated_at: 'ontem' }),
        /updated_at.*data ISO válida/
    );
    assert.throws(
        () => validateCreamList([{ id: 1 }, { id: 1 }]),
        /IDs de creme.*duplicados/
    );
});

test('matches cream filters and does not treat missing temperature as zero degrees', () => {
    const filters = {
        consideraTemperatura: true,
        consideraEstacao: true,
        temperatura: 18,
        estacao: 'Inverno',
        periodo: 'noite',
        busca: 'baunilha'
    };
    const cream = {
        temperatura: '',
        clima: ['Inverno'],
        periodo: ['noite'],
        fragrancia: ['Gourmand'],
        notas: ['Baunilha']
    };
    assert.equal(categoriaTemperaturaCreme(18), 'baixa');
    assert.equal(categoriaTemperaturaCreme(24), 'intermediária');
    assert.equal(categoriaTemperaturaCreme(28), 'alta');
    assert.equal(cremeCombina(cream, filters), true);
    assert.equal(cremeCombina({ ...cream, periodo: ['dia'] }, filters), false);
});

test('protects cream CRUD and updates only the cream Gist file', async () => {
    const perfumeGistId = 'test-perfumes-gist';
    const creamGistId = DEFAULT_CREAMS_GIST_ID;
    const gist = makeGistFetch({
        [perfumeGistId]: {
            'lista_itens.json': { content: JSON.stringify([{ id: 1, ...perfumeInput }]) }
        },
        [creamGistId]: {
            'gistfile1.txt': { content: JSON.stringify([
                { id: 1, nome: 'Creme existente', marca: 'Marca A', temperatura: 22, notas: ['Rosa'] },
                { id: 2, nome: 'Registro antigo incompleto', marca: 'Marca B', temperatura: '', notas: [''] }
            ]) }
        }
    });
    const creamInput = {
        nome: 'Creme novo',
        marca: 'Marca C',
        imagem: '',
        textura: ['Leve'],
        fragrancia: ['Floral'],
        notas: ['Baunilha'],
        funcao_principal: ['Hidratação'],
        temperatura: 24,
        clima: ['Primavera'],
        periodo: ['dia', 'noite']
    };

    await withServer({
        token: 'test-token',
        adminPassword: 'test-password',
        gistId: perfumeGistId,
        creamsGistId: creamGistId,
        fetchImpl: gist.fetchImpl
    }, async (baseUrl) => {
        const read = await fetch(`${baseUrl}/api/cremes`);
        assert.equal(read.status, 200);
        assert.equal((await read.json()).cremes.length, 2);

        const unauthenticated = await fetch(`${baseUrl}/api/cremes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creamInput)
        });
        assert.equal(unauthenticated.status, 401);

        const authHeaders = {
            'Content-Type': 'application/json',
            'X-Admin-Password': 'test-password'
        };
        const invalid = await fetch(`${baseUrl}/api/cremes`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ ...creamInput, temperatura: 'quente' })
        });
        assert.equal(invalid.status, 400);
        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);

        const added = await fetch(`${baseUrl}/api/cremes`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(creamInput)
        });
        assert.equal(added.status, 201);
        const addedCream = (await added.json()).cremes.at(-1);
        assert.equal(addedCream.id, 3);
        assert.ok(Number.isFinite(Date.parse(addedCream.created_at)));
        assert.equal(addedCream.created_at, addedCream.updated_at);

        const updated = await fetch(`${baseUrl}/api/cremes/2`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ ...creamInput, nome: 'Registro antigo corrigido' })
        });
        assert.equal(updated.status, 200);
        const updatedCream = (await updated.json()).cremes[1];
        assert.equal(updatedCream.nome, 'Registro antigo corrigido');
        assert.equal(Object.hasOwn(updatedCream, 'created_at'), false);
        assert.ok(Number.isFinite(Date.parse(updatedCream.updated_at)));

        const deleted = await fetch(`${baseUrl}/api/cremes/1`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': 'test-password' }
        });
        assert.equal(deleted.status, 200);
        assert.deepEqual((await deleted.json()).cremes.map((cream) => cream.id), [2, 3]);

        const creamPatches = gist.requests.filter(({ url, options }) =>
            url.includes(creamGistId) && options.method === 'PATCH'
        );
        assert.equal(creamPatches.length, 3);
        assert.deepEqual(Object.keys(JSON.parse(creamPatches[0].options.body).files), ['gistfile1.txt']);
        assert.equal(
            JSON.parse(gist.gists.get(perfumeGistId)['lista_itens.json'].content).length,
            1
        );
    });
});

test('validates and replaces a cream catalog from a backup without altering legacy records', async () => {
    const creamGistId = DEFAULT_CREAMS_GIST_ID;
    const legacyCream = {
        id: 1,
        nome: 'Registro antigo',
        marca: 'Marca antiga',
        temperatura: '',
        notas: ['']
    };
    const validCream = {
        id: 2,
        nome: 'Creme de backup',
        marca: 'Marca de teste',
        imagem: '',
        textura: ['Leve'],
        fragrancia: ['Floral'],
        notas: ['Rosa'],
        funcao_principal: ['Hidratação'],
        temperatura: 22,
        clima: ['Primavera'],
        periodo: ['dia']
    };
    const gist = makeGistFetch({
        [creamGistId]: {
            'gistfile1.txt': { content: JSON.stringify([legacyCream]) }
        }
    });

    await withServer({
        token: 'test-token',
        adminPassword: 'test-password',
        gistId: 'unused-perfume-gist',
        creamsGistId: creamGistId,
        fetchImpl: gist.fetchImpl
    }, async (baseUrl) => {
        const headers = {
            'Content-Type': 'application/json',
            'X-Admin-Password': 'test-password'
        };
        const invalid = await fetch(`${baseUrl}/api/cremes`, {
            method: 'PUT',
            headers,
            body: JSON.stringify([{ ...legacyCream, marca: '' }, validCream])
        });
        assert.equal(invalid.status, 400);
        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);

        const imported = await fetch(`${baseUrl}/api/cremes`, {
            method: 'PUT',
            headers,
            body: JSON.stringify([legacyCream, validCream])
        });
        assert.equal(imported.status, 200);
        const importedCreams = (await imported.json()).cremes;
        assert.deepEqual(importedCreams.map(({ id }) => id), [legacyCream.id, validCream.id]);
        assert.ok(importedCreams.every((cream) =>
            Number.isFinite(Date.parse(cream.created_at)) &&
            Number.isFinite(Date.parse(cream.updated_at))
        ));
        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 1);
    });
});

test('requires authentication and validates a full perfume backup before replacing the Gist', async () => {
    const original = [{ id: 1, ...perfumeInput }];
    const replacement = [{ id: 4, ...perfumeInput, nome: 'Perfume restaurado' }];
    const gist = makeFetch(original);
    await withServer({
        token: 'test-token',
        adminPassword: 'test-password',
        gistId: 'test-perfume-gist',
        fetchImpl: gist.fetchImpl
    }, async (baseUrl) => {
        const unauthorized = await fetch(`${baseUrl}/api/perfumes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(replacement)
        });
        assert.equal(unauthorized.status, 401);

        const invalid = await fetch(`${baseUrl}/api/perfumes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': 'test-password'
            },
            body: JSON.stringify([{ id: 1, ...perfumeInput, vibe: [] }])
        });
        assert.equal(invalid.status, 400);
        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);

        const imported = await fetch(`${baseUrl}/api/perfumes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': 'test-password'
            },
            body: JSON.stringify(replacement)
        });
        assert.equal(imported.status, 200);
        assert.equal(gist.getPerfumes()[0].id, replacement[0].id);
        assert.ok(Number.isFinite(Date.parse(gist.getPerfumes()[0].created_at)));
        assert.ok(Number.isFinite(Date.parse(gist.getPerfumes()[0].updated_at)));
    });
});

test('protects Gist CRUD and preserves the current perfume data shape', async () => {
    const originalCreationDate = '2024-01-02T03:04:05.000Z';
    const gist = makeFetch([
        {
            id: 1,
            ...perfumeInput,
            created_at: originalCreationDate,
            updated_at: originalCreationDate,
            custom_note: 'Preservar este campo'
        },
        { id: 2, ...perfumeInput, nome: 'Segundo perfume' }
    ]);

    await withServer({
        token: 'test-token',
        adminPassword: 'test-password',
        gistId: 'test-gist',
        allowedOrigins: ['https://aline595.github.io'],
        fetchImpl: gist.fetchImpl
    }, async (baseUrl) => {
        const page = await fetch(`${baseUrl}/`);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /perfume-admin\.js/);

        const read = await fetch(`${baseUrl}/api/perfumes`, {
            headers: { Origin: 'https://aline595.github.io' }
        });

        test('does not update the Gist when an existing record makes the resulting catalog invalid', async () => {
            const gist = makeFetch([{ id: 1, ...perfumeInput, vibe: [] }]);

            await withServer({
                token: 'test-token',
                adminPassword: 'test-password',
                gistId: 'test-gist',
                fetchImpl: gist.fetchImpl
            }, async (baseUrl) => {
                const response = await fetch(`${baseUrl}/api/perfumes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': 'test-password'
                    },
                    body: JSON.stringify(perfumeInput)
                });

                test('does not update the Gist when a new perfume is invalid', async () => {
                    const gist = makeFetch([{ id: 1, ...perfumeInput }]);

                    await withServer({
                        token: 'test-token',
                        adminPassword: 'test-password',
                        gistId: 'test-gist',
                        fetchImpl: gist.fetchImpl
                    }, async (baseUrl) => {
                        const response = await fetch(`${baseUrl}/api/perfumes`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Admin-Password': 'test-password'
                            },
                            body: JSON.stringify({ ...perfumeInput, duracao: -1 })
                        });
                        assert.equal(response.status, 400);
                        assert.match((await response.json()).error, /duração/i);
                        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);
                    });
                });
                assert.equal(response.status, 502);
                assert.match((await response.json()).error, /ID 1 inválido.*vibe/);
                assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);
            });
        });
        assert.equal(read.status, 200);
        assert.equal(read.headers.get('access-control-allow-origin'), 'https://aline595.github.io');
        assert.equal((await read.json()).perfumes.length, 2);

        const unauthorized = await fetch(`${baseUrl}/api/perfumes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(perfumeInput)
        });
        assert.equal(unauthorized.status, 401);
        assert.equal(gist.requests.filter(({ options }) => options.method === 'PATCH').length, 0);

        const authHeaders = {
            'Content-Type': 'application/json',
            'X-Admin-Password': 'test-password'
        };
        const added = await fetch(`${baseUrl}/api/perfumes`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(perfumeInput)
        });
        assert.equal(added.status, 201);
        const addedPerfume = (await added.json()).perfumes.at(-1);
        assert.equal(addedPerfume.id, 3);
        assert.ok(Number.isFinite(Date.parse(addedPerfume.created_at)));
        assert.equal(addedPerfume.created_at, addedPerfume.updated_at);

        const concurrentAdds = await Promise.all([1, 2].map(() => fetch(`${baseUrl}/api/perfumes`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(perfumeInput)
        })));
        assert.ok(concurrentAdds.every((response) => response.status === 201));
        assert.deepEqual(
            (await Promise.all(concurrentAdds.map((response) => response.json())))
                .map((result) => result.perfumes.at(-1).id)
                .sort((first, second) => first - second),
            [4, 5]
        );

        const { temperatura_ideal: _removedTemperature, ...updatedInput } = perfumeInput;
        updatedInput.nome = 'Nome atualizado';
        const updated = await fetch(`${baseUrl}/api/perfumes/1`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(updatedInput)
        });
        assert.equal(updated.status, 200);
        assert.equal(gist.getPerfumes()[0].nome, 'Nome atualizado');
        assert.equal(gist.getPerfumes()[0].created_at, originalCreationDate);
        assert.ok(Number.isFinite(Date.parse(gist.getPerfumes()[0].updated_at)));
        assert.ok(Date.parse(gist.getPerfumes()[0].updated_at) > Date.parse(originalCreationDate));
        assert.equal(gist.getPerfumes()[0].custom_note, 'Preservar este campo');
        assert.equal(Object.hasOwn(gist.getPerfumes()[0], 'temperatura_ideal'), false);

        const deleted = await fetch(`${baseUrl}/api/perfumes/2`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': 'test-password' }
        });
        assert.equal(deleted.status, 200);
        assert.deepEqual(gist.getPerfumes().map((perfume) => perfume.id), [1, 3, 4, 5]);

        const blockedOrigin = await fetch(`${baseUrl}/api/perfumes`, {
            headers: { Origin: 'https://example.com' }
        });
        assert.equal(blockedOrigin.status, 403);
        assert.equal(blockedOrigin.headers.get('access-control-allow-origin'), 'https://example.com');
        assert.equal((await blockedOrigin.json()).error, 'Origem não autorizada.');
    });

    const gistRequests = gist.requests.filter(({ url }) => url.includes('api.github.com'));
    assert.ok(gistRequests.every(({ options }) =>
        options.headers.Authorization === 'Bearer test-token'));
    const patchRequest = gistRequests.find(({ options }) => options.method === 'PATCH');
    assert.ok(patchRequest);
    assert.deepEqual(Object.keys(JSON.parse(patchRequest.options.body).files), ['lista_itens.json']);
});
