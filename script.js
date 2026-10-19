// Variáveis globais para armazenar dados carregados
let perfumes = [];
let perfumesCarregados = false;
let decotes = [];
let cremes = [];
let cremesCarregados = false;
let temperaturaAmbienteAtual = 22;
const urlGist = "https://gist.githubusercontent.com/Aline595/d766a0ddf15dd9fc30ddf3de8a67b16f/raw/";
const urlCremes = "https://gist.githubusercontent.com/Aline595/5d3a031e9c8b6f31e4ecaa89a2c81c92/raw/";
let estacaoSelecionada = "";

// Função para popular o select de tipo de blusa com dados do JSON
function popularSelectBlusas(decotes) {
    const select = document.getElementById('tipo-blusa');
    if (!select) return;

    // Limpar opções existentes
    select.innerHTML = '';

    // Adicionar opção "Todos"
    const optionTodos = document.createElement('option');
    optionTodos.value = 'todos';
    optionTodos.textContent = 'Todos';
    select.appendChild(optionTodos);

    // Obter formatos únicos e ordenar
    const formatosUnicos = [...new Set(decotes.map(d => d.formato))].sort();

    // Adicionar opções
    formatosUnicos.forEach(formato => {
        const option = document.createElement('option');
        option.value = formato;
        option.textContent = formato;
        select.appendChild(option);
    });
}

// Função para exibir temperatura atual
async function exibirTemperaturaAtual() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.68&longitude=-46.62&current_weather=true');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const temp = data.current_weather.temperature;
        if (typeof temp !== 'number' || !Number.isFinite(temp)) {
            throw new Error('A resposta não contém uma temperatura válida.');
        }
        temperaturaAmbienteAtual = temp;
        
        // 1. Atualiza os textos de temperatura
        const perfumeTemperature = document.getElementById('temperatura-atual');
        if (perfumeTemperature) perfumeTemperature.textContent = `🌡️ ${temp}°C agora`;
        const creamTemperature = document.getElementById('temperatura-creme');
        if (creamTemperature && !temperaturaManualAtiva) {
            creamTemperature.textContent = `🌡️ ${temp}°C agora`;
        }
        document.getElementById('temperatura-atual')?.classList.remove('temperature-status-warning');
        if (!temperaturaManualAtiva) {
            document.getElementById('temperatura-creme')?.classList.remove('temperature-status-warning');
        }

        // 2. Lógica para destacar o Range na tela de Cremes
        if (!temperaturaManualAtiva) destacarRange(temp);

    } catch (error) {
        console.error("Erro ao buscar temperatura:", error);
        temperaturaAmbienteAtual = 22;
        const status = document.getElementById('temperatura-atual');
        if (status) {
            status.textContent = '🌡️ Temperatura indisponível; o filtro pode usar 22°C como referência.';
            status.classList.add('temperature-status-warning');
        }
        const creamStatus = document.getElementById('temperatura-creme');
        if (creamStatus && !temperaturaManualAtiva) {
            creamStatus.textContent = '🌡️ Temperatura indisponível; usando 22°C como referência.';
            creamStatus.classList.add('temperature-status-warning');
            destacarRange(22);
        }
    }
}

function destacarRange(temp) {
    const IDs = ['range-baixa', 'range-intermediaria', 'range-alta'];
    const idAtivo = temp <= 20
        ? 'range-baixa'
        : temp <= 25
            ? 'range-intermediaria'
            : 'range-alta';

    IDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const ativo = id === idAtivo;
            el.classList.toggle('active', ativo);
            el.setAttribute('aria-pressed', String(ativo));
        }
    });
}

// Função para carregar dados de perfumes e decotes
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
        atualizarBotoesBuscaPerfumes();
        document.dispatchEvent(new Event('perfumes-carregados'));
        if (status) {
            status.textContent = perfumes.length
                ? `Catálogo carregado: ${perfumes.length} ${perfumes.length === 1 ? 'perfume' : 'perfumes'}.`
                : 'O catálogo foi carregado, mas não há perfumes cadastrados.';
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
    atualizarBotoesBuscaPerfumes();
    const status = document.getElementById('perfume-load-status');
    if (!status || !Array.isArray(perfumes)) return;
    status.textContent = perfumes.length
        ? `Catálogo carregado: ${perfumes.length} ${perfumes.length === 1 ? 'perfume' : 'perfumes'}.`
        : 'O catálogo foi carregado, mas não há perfumes cadastrados.';
    status.className = 'perfume-load-status success';
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

    cremesCarregados = false;
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
        cremesCarregados = true;
        document.dispatchEvent(new Event('cremes-carregados'));
        searchButtons.forEach((button) => {
            if (button) button.disabled = cremes.length === 0;
        });
        if (status) {
            status.textContent = cremes.length
                ? `Catálogo carregado: ${cremes.length} ${cremes.length === 1 ? 'creme' : 'cremes'}.`
                : 'O catálogo foi carregado, mas não há cremes cadastrados.';
            status.className = cremes.length
                ? 'perfume-load-status success'
                : 'perfume-load-status';
        }
    } catch (erro) {
        console.error('Erro ao carregar catálogo de cremes:', erro);
        document.dispatchEvent(new Event('cremes-carregamento-falhou'));
        if (status) {
            status.textContent = erro instanceof TypeError
                ? `Não foi possível conectar ao catálogo de cremes. Verifique sua conexão com a internet e tente novamente.`
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

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

// Exibe cards de resultados (perfumes ou decotes)
function exibirCards(lista, container, tipo, options = {}) {
    if (lista.length > 0) {
        const heading = options.heading
            ? `<h3 class="results-heading">${escapeHtml(options.heading)}</h3>`
            : '';
        const cards = lista.map(item => {
            const imagemSrc = item.imagem && /^https?:\/\//i.test(item.imagem)
                ? item.imagem 
                : `https://lh3.googleusercontent.com/d/${item.imagem}`;

            if (tipo === 'perfume') {
                const reasons = options.reasonsById?.get(item.id) || [];
                return `
                    <div class="card-perfume" role="article" aria-labelledby="nome-${item.id}">
                        <img src="${escapeHtml(imagemSrc)}" class="img-perfume" alt="${escapeHtml(item.nome)}" onerror="this.src='https://via.placeholder.com/200?text=Sem+Imagem'">
                        <div>
                            <span class="perfume-marca">${escapeHtml(item.marca || '')}</span>
                            <strong id="nome-${item.id}" style="color: var(--text-main); font-size: 1.1em;">${escapeHtml(item.nome)}</strong>
                            ${item.intensidade ? `<br><span class="badge-intensity">${escapeHtml(item.intensidade)}</span>` : ''}
                            <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                                ✨ Vibe: ${escapeHtml(item.vibe ? (Array.isArray(item.vibe) ? item.vibe.join(', ') : item.vibe) : 'N/A')}
                            </p>
                            <div class="perfume-duracao">
                                <span>⏱️ Duração:</span>
                                <strong>${escapeHtml(item.duracao || 'N/A')}</strong>
                            </div>
                            ${item.temperatura_ideal ? `<div class="perfume-duracao"><span>🌡️ Temperatura:</span><strong>${escapeHtml(item.temperatura_ideal)}</strong></div>` : ''}
                            ${reasons.length ? `<p class="recommendation-reason"><strong>Por que combina:</strong> ${reasons.map(escapeHtml).join(' · ')}</p>` : ''}
                        </div>
                    </div>
                `;
            } else if (tipo === 'decote') {
                return `
                    <div class="card-perfume" role="article" aria-labelledby="formato-${item.id}">
                        <img src="assets/decotes/${item.id}.png" class="img-perfume" alt="Imagem de colar para ${item.formato}" onerror="this.src='https://via.placeholder.com/200?text=Imagem+Nao+Encontrada'">
                        <div>
                            <strong id="formato-${item.id}" style="color: var(--text-main); font-size: 1.1em;">${item.formato}</strong>
                            <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">${item.descricao}</p>
                            <div class="perfume-duracao">
                                <span>📿 Colar Ideal:</span>
                                <strong>${item.colar_ideal}</strong>
                            </div>
                            <div class="perfume-duracao">
                                <span>💍 Brinco Ideal:</span>
                                <strong>${item.brinco_ideal}</strong>
                            </div>
                            <div class="perfume-duracao">
                                <span>💇‍♀️ Penteado Ideal:</span>
                                <strong>${item.penteado_ideal}</strong>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return '';
            }
        }).join('');
        container.innerHTML = `${heading}${cards}`;
    } else {
        const message = options.emptyMessage || '❌ Nada encontrado.';
        container.innerHTML = `<p class="results-empty" role="status">${escapeHtml(message)}</p>`;
    }
    container.setAttribute('aria-busy', 'false');
}

// Mostra skeleton de carregamento
function mostrarSkeleton() {
    const divResultado = document.getElementById('resultado');
    const skeletons = Array(3).fill(`
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
    
    divResultado.setAttribute('aria-busy', 'true');
    divResultado.innerHTML = `<p class="visually-hidden">Buscando recomendações...</p>${skeletons}`;
}

// Alterna modo escuro
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// Entra na aplicação, escondendo splash
// Entra na aplicação, escondendo splash
function entrarNoApp(categoria) {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.add('fade-out');
    container.style.display = 'block';

    // Pega o botão da aba correspondente (tab-perfumes, tab-colares ou tab-cremes)
    const btn = document.getElementById(`tab-${categoria}`);
    
    // Chama a função de alternar aba passando a categoria e o botão encontrado
    alternarAba(categoria, btn);
}

// Alterna entre abas de perfumes e colares
function alternarAba(tipo, botao) {
    // Esconde todas
    document.getElementById('conteudo-perfumes').style.display = 'none';
    document.getElementById('conteudo-colares').style.display = 'none';
    document.getElementById('conteudo-cremes').style.display = 'none';

    // Mostra a selecionada
    document.getElementById(`conteudo-${tipo}`).style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (botao) botao.classList.add('active');
    
    document.getElementById('resultado').innerHTML = '';
}

// Volta para a tela inicial
function voltarParaHome() {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.remove('fade-out');

    setTimeout(() => {
        container.style.display = 'none';
        document.getElementById('resultado').innerHTML = '';
    }, 300);
}

carregarDados();

// Exports para testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exibirCards,
        definirEstacaoInicial,
        atualizarEstacao,
        popularSelectBlusas
    };
}
