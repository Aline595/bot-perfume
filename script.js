// Variáveis globais para armazenar dados carregados
let perfumes = [];
let decotes = [];
let cremes = [];
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
        const data = await response.json();
        const temp = data.current_weather.temperature;
        
        // Atualiza na tela de Perfumes
        const elementoTempPerfume = document.getElementById('temperatura-atual');
        if (elementoTempPerfume) {
            elementoTempPerfume.textContent = `🌡️ ${temp}°C agora`;
        }

        // Atualiza na tela de Cremes
        const elementoTempCreme = document.getElementById('temperatura-creme');
        if (elementoTempCreme) {
            elementoTempCreme.textContent = `🌡️ ${temp}°C em Diadema agora`;
        }

    } catch (error) {
        console.error("Erro ao buscar temperatura:", error);
        const fallback = "🌡️ ~22°C (padrão)";
        if (document.getElementById('temperatura-atual')) document.getElementById('temperatura-atual').textContent = fallback;
        if (document.getElementById('temperatura-creme')) document.getElementById('temperatura-creme').textContent = fallback;
    }
}

// Função para carregar dados de perfumes e decotes
async function carregarDados() {
    // 1. Carregar Perfumes
    try {
        const resposta = await fetch(urlGist + "?t=" + new Date().getTime());
        if (!resposta.ok) throw new Error("Falha ao carregar perfumes");
        perfumes = await resposta.json();
    } catch (erro) {
        console.error("❌ Erro ao carregar perfumes:", erro);
    }

    // 2. Carregar Decotes
    try {
        const respostaDecotes = await fetch("https://gist.githubusercontent.com/Aline595/5ac2d0a8490669152acf0d2ea5899620/raw/");
        decotes = await respostaDecotes.json();
        popularSelectBlusas(decotes);
    } catch (erro) {
        console.warn("⚠️ Erro nos decotes:", erro);
    }

    // 3. NOVO: Carregar Cremes (Você pode criar um novo Gist para isso)
    try {
        // Substitua pela URL do seu novo Gist de cremes quando criar
        const respostaCremes = await fetch(urlCremes);
        cremes = await respostaCremes.json();
    } catch (erro) {
        console.warn("⚠️ Não foi possível carregar cremes:", erro);
        // Fallback local caso o Gist falhe
        cremes = [
            { "nome": "Baunilha Real", "marca": "Boticário", "temperatura": "frio", "vibe": "doce" },
            { "nome": "Sorbet de Manga", "marca": "Natura", "temperatura": "calor", "vibe": "fresco" }
        ];
    }

    definirEstacaoInicial();
    exibirTemperaturaAtual(); // Exibir temperatura ao carregar
}

// Define a estação inicial baseada no mês atual
function definirEstacaoInicial() {
    const mes = new Date().getMonth() + 1;
    let inicial = "Verão";
    if (mes >= 3 && mes <= 5) inicial = "Outono";
    else if (mes >= 6 && mes <= 8) inicial = "Inverno";
    else if (mes >= 9 && mes <= 11) inicial = "Primavera";
    
    estacaoSelecionada = inicial;
    document.getElementById('estacao-manual').value = inicial;
}

// Atualiza a estação selecionada
function atualizarEstacao() {
    estacaoSelecionada = document.getElementById('estacao-manual').value;
}

// Função para atualizar visibilidade dos filtros
function atualizarFiltros() {
    const filtroEstacao = document.getElementById('filtro-estacao').checked;
    const filtroTemperatura = document.getElementById('filtro-temperatura').checked;
    const secaoEstacao = document.getElementById('secao-estacao');
    
    // Se nenhum filtro está selecionado, ativar estação por padrão
    if (!filtroEstacao && !filtroTemperatura) {
        document.getElementById('filtro-estacao').checked = true;
        secaoEstacao.style.display = 'block';
        return;
    }
    
    // Mostrar/ocultar seção de estação
    secaoEstacao.style.display = filtroEstacao ? 'block' : 'none';
}

// Exibe cards de resultados (perfumes ou decotes)
function exibirCards(lista, container, tipo) {
    if (lista.length > 0) {
        container.innerHTML = lista.map(item => {
            const imagemSrc = item.imagem && item.imagem.startsWith('http') 
                ? item.imagem 
                : `https://lh3.googleusercontent.com/d/${item.imagem}`;

            if (tipo === 'perfume') {
                return `
                    <div class="card-perfume" role="article" aria-labelledby="nome-${item.nome.replace(/\s+/g, '-')}">
                        <img src="${imagemSrc}" class="img-perfume" alt="${item.nome}" onerror="this.src='https://via.placeholder.com/200?text=Sem+Imagem'">
                        <div>
                            <span class="perfume-marca">${item.marca || ''}</span>
                            <strong id="nome-${item.nome.replace(/\s+/g, '-')}" style="color: var(--text-main); font-size: 1.1em;">${item.nome}</strong>
                            ${item.intensidade ? `<br><span class="badge-intensity">${item.intensidade}</span>` : ''}
                            <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                                ✨ Vibe: ${item.vibe ? (Array.isArray(item.vibe) ? item.vibe.join(', ') : item.vibe) : 'N/A'}
                            </p>
                            <div class="perfume-duracao">
                                <span>⏱️ Duração:</span>
                                <strong>${item.duracao || 'N/A'}</strong>
                            </div>
                            ${item.temperatura_ideal ? `<div class="perfume-duracao"><span>🌡️ Temperatura:</span><strong>${item.temperatura_ideal}</strong></div>` : ''}
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
    } else {
        container.innerHTML = "<p style='color: #999;' role='alert'>❌ Nada encontrado.</p>";
    }
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
    
    divResultado.innerHTML = skeletons;
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
