async function carregarPerfumes() {
    const status = document.getElementById('perfume-load-status');
    const retryButton = document.getElementById('perfume-load-retry');
    const apiConfigurada = window.PERFUMES_API_URL?.trim();
    const apiBase = apiConfigurada
        ? apiConfigurada.replace(/\/+$/, '')
        : ['localhost', '127.0.0.1'].includes(window.location.hostname)
            ? window.location.origin
            : '';
    const urlPerfumes = apiBase
        ? `${apiBase}/api/perfumes`
        : `${urlGist}?t=${new Date().getTime()}`;

    if (status) {
        status.textContent = 'Carregando catálogo de perfumes...';
        status.className = 'perfume-load-status';
    }
    if (retryButton) retryButton.hidden = true;
    atualizarBotoesBuscaPerfumes();

    try {
        const resposta = await fetch(urlPerfumes);
        if (!resposta.ok) {
            let detalhe = '';
            try {
                const erro = await resposta.json();
                detalhe = erro.error || '';
            } catch {
                // Algumas respostas de proxy não incluem um corpo JSON.
            }
            if (resposta.status === 403 && /origem não autorizada/i.test(detalhe)) {
                throw new Error(`A API bloqueou esta origem (${window.location.origin}). Inclua essa origem em ALLOWED_ORIGINS no backend.`);
            }
            if (apiBase && resposta.status === 502) {
                throw new Error(`O backend não conseguiu carregar os perfumes do Gist (HTTP 502). ${detalhe || 'Confira os logs do backend e se GITHUB_TOKEN tem permissão para acessar o Gist.'}`);
            }
            if (apiBase && resposta.status >= 500) {
                throw new Error(`O backend respondeu com erro HTTP ${resposta.status}. Ele pode estar temporariamente indisponível; confira os logs do serviço e tente novamente.`);
            }
            if (apiBase) {
                throw new Error(detalhe
                    ? `A API respondeu com erro (${resposta.status}): ${detalhe}`
                    : `A API respondeu com erro HTTP ${resposta.status}.`);
            }
            throw new Error(`Não foi possível carregar o Gist (HTTP ${resposta.status}).`);
        }

        const dadosPerfumes = await resposta.json();
        perfumes = apiBase ? dadosPerfumes.perfumes : dadosPerfumes;
        if (!Array.isArray(perfumes)) {
            throw new Error('A resposta não contém uma lista válida de perfumes.');
        }
        perfumesCarregados = true;
        perfumesCarregadosEm = new Date();
        perfumesFonteCatalogo = apiBase
            ? ['localhost', '127.0.0.1'].includes(new URL(apiBase).hostname)
                ? 'backend local'
                : 'backend online (GitHub Gist)'
            : 'GitHub Gist público';
        atualizarBotoesBuscaPerfumes();
        document.dispatchEvent(new Event('perfumes-carregados'));
        if (status) {
            status.textContent = textoStatusCatalogo('perfume', perfumes.length, perfumesFonteCatalogo, perfumesCarregadosEm);
            status.className = 'perfume-load-status success';
        }
        return true;
    } catch (erro) {
        console.error('Erro ao carregar catálogo de perfumes:', erro);
        if (status) {
            const isLocalApi = apiBase === window.location.origin &&
                ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const message = erro instanceof TypeError && apiBase
                ? isLocalApi
                    ? `Não foi possível conectar ao backend local em ${apiBase}. Se estiver desenvolvendo localmente, inicie-o com node server.js.`
                    : `Não foi possível conectar ao backend online (${apiBase}). Ele pode estar indisponível ou o navegador pode ter bloqueado a conexão por CORS. Verifique o status do serviço; se estiver ativo, confira se ALLOWED_ORIGINS inclui exatamente ${window.location.origin}.`
                : erro instanceof TypeError
                    ? 'Não foi possível conectar ao Gist. Verifique a conexão com a internet e tente novamente.'
                    : `Não foi possível carregar o catálogo: ${erro.message}`;
            status.textContent = message;
            status.className = 'perfume-load-status error';
        }
        atualizarBotoesBuscaPerfumes();
        if (retryButton) retryButton.hidden = false;
        return false;
    }
}

function atualizarBotoesBuscaPerfumes() {
    const buttons = [
        document.getElementById('buscar-perfume'),
        document.getElementById('surpreender-perfume')
    ];
    buttons.forEach((button) => {
        if (button) button.disabled = !perfumesCarregados;
    });
}

document.addEventListener('perfumes-carregados', () => {
    perfumesCarregados = true;
    perfumesCarregadosEm = new Date();
    atualizarBotoesBuscaPerfumes();
    const status = document.getElementById('perfume-load-status');
    if (!status || !Array.isArray(perfumes)) return;
    status.textContent = textoStatusCatalogo('perfume', perfumes.length, perfumesFonteCatalogo, perfumesCarregadosEm);
    status.className = 'perfume-load-status success';
});

document.addEventListener('cremes-carregados', () => {
    cremesCarregadosEm = new Date();
    const status = document.getElementById('creme-load-status');
    if (!status || !Array.isArray(cremes)) return;
    status.textContent = textoStatusCatalogo('creme', cremes.length, 'GitHub Gist público', cremesCarregadosEm);
    status.className = cremes.length ? 'perfume-load-status success' : 'perfume-load-status';
});

async function carregarDados() {
    // 1. Carregar Perfumes
    await carregarPerfumes();

    // 2. Carregar Decotes
    try {
        const respostaDecotes = await fetch("https://gist.githubusercontent.com/Aline595/5ac2d0a8490669152acf0d2ea5899620/raw/");
        decotes = await respostaDecotes.json();
        popularSelectBlusas(decotes);
    } catch (erro) {
        console.warn("⚠️ Erro nos decotes:", erro);
    }

    // 3. Carregar catálogo de cremes
    await carregarCremes();

    definirEstacaoInicial();
    exibirTemperaturaAtual(); // Exibir temperatura ao carregar
}

async function carregarCremes() {
    const status = document.getElementById('creme-load-status');
    const retryButton = document.getElementById('creme-load-retry');
    const searchButtons = [
        document.getElementById('buscar-cremes'),
        document.getElementById('surpreender-creme')
    ];

    searchButtons.forEach((button) => {
        if (button) button.disabled = true;
    });
    if (status) {
        status.textContent = 'Carregando catálogo de cremes...';
        status.className = 'perfume-load-status';
    }
    if (retryButton) retryButton.hidden = true;
    atualizarFiltrosCreme();

    try {
        const respostaCremes = await fetch(urlCremes);
        if (!respostaCremes.ok) {
            throw new Error(`O catálogo respondeu com HTTP ${respostaCremes.status}.`);
        }
        const dadosCremes = await respostaCremes.json();
        if (!Array.isArray(dadosCremes)) {
            throw new Error('A resposta não contém uma lista válida de cremes.');
        }
        cremes = dadosCremes;
        cremesCarregadosEm = new Date();
        document.dispatchEvent(new Event('cremes-carregados'));
        searchButtons.forEach((button) => {
            if (button) button.disabled = cremes.length === 0;
        });
        if (status) {
            status.textContent = textoStatusCatalogo('creme', cremes.length, 'GitHub Gist público', cremesCarregadosEm);
            status.className = cremes.length
                ? 'perfume-load-status success'
                : 'perfume-load-status';
        }
    } catch (erro) {
        console.error('Erro ao carregar catálogo de cremes:', erro);
        document.dispatchEvent(new Event('cremes-carregamento-falhou'));
        if (status) {
            status.textContent = erro instanceof TypeError
                ? `Não foi possível conectar ao GitHub Gist para carregar os cremes. Verifique a internet e se o navegador não bloqueou a conexão por CORS; depois tente novamente.`
                : `Não foi possível carregar o catálogo de cremes: ${erro.message}`;
            status.className = 'perfume-load-status error';
        }
        if (retryButton) retryButton.hidden = false;
    }
}

document.getElementById('perfume-load-retry')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    await carregarPerfumes();
    button.disabled = false;
});

document.getElementById('creme-load-retry')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    await carregarCremes();
    button.disabled = false;
});

// Define a estação inicial baseada no mês atual
function definirEstacaoInicial() {
    const mes = new Date().getMonth() + 1;
    let inicial = "Verão";
    if (mes >= 3 && mes <= 5) inicial = "Outono";
    else if (mes >= 6 && mes <= 8) inicial = "Inverno";
    else if (mes >= 9 && mes <= 11) inicial = "Primavera";
    
    estacaoSelecionada = inicial;
    document.getElementById('estacao-manual').value = inicial;
    const creamSeason = document.getElementById('estacao-creme');
    if (creamSeason) creamSeason.value = inicial;
}

// Atualiza a estação selecionada
function atualizarEstacao() {
    estacaoSelecionada = document.getElementById('estacao-manual').value;
}

// Função para atualizar visibilidade dos filtros
function atualizarFiltros() {
    const filtroEstacao = document.getElementById('filtro-estacao').checked;
    const secaoEstacao = document.getElementById('secao-estacao');
    secaoEstacao.hidden = !filtroEstacao;
}
