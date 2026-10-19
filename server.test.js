const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, validatePerfumeInput, validatePerfumeList } = require('./server');

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
});

test('protects Gist CRUD and preserves the current perfume data shape', async () => {
    const gist = makeFetch([
        { id: 1, ...perfumeInput, custom_note: 'Preservar este campo' },
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
        assert.equal((await added.json()).perfumes.at(-1).id, 3);

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
    });

    const gistRequests = gist.requests.filter(({ url }) => url.includes('api.github.com'));
    assert.ok(gistRequests.every(({ options }) =>
        options.headers.Authorization === 'Bearer test-token'));
    const patchRequest = gistRequests.find(({ options }) => options.method === 'PATCH');
    assert.ok(patchRequest);
    assert.deepEqual(Object.keys(JSON.parse(patchRequest.options.body).files), ['lista_itens.json']);
});
