// Variáveis globais para armazenar dados carregados
let perfumes = [];
let decotes = [];
const urlGist = "https://gist.githubusercontent.com/Aline595/d766a0ddf15dd9fc30ddf3de8a67b16f/raw/";
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

// Função para carregar dados de perfumes e decotes
async function carregarDados() {
    try {
        const resposta = await fetch(urlGist + "?t=" + new Date().getTime());
        if (!resposta.ok) throw new Error("Falha ao carregar dados do Gist");
        perfumes = await resposta.json();
    } catch (erro) {
        console.error("❌ Erro ao carregar dados de perfumes:", erro);
        document.getElementById('resultado').innerHTML = "<p style='color: #999;'>❌ Erro ao carregar dados de perfumes. Recarregue a página.</p>";
        alert("Erro ao carregar dados de perfumes. Tente recarregar a página.");
        return;
    }

    try {
        const respostaDecotes = await fetch("https://gist.githubusercontent.com/Aline595/5ac2d0a8490669152acf0d2ea5899620/raw/");
        if (!respostaDecotes.ok) throw new Error("Falha ao carregar decotes do Gist");
        decotes = await respostaDecotes.json();
        console.log('Decotes carregados:', decotes.length);
        // Popular select após carregar decotes
        popularSelectBlusas(decotes);
    } catch (erro) {
        decotes = [];
        console.warn("⚠️ Não foi possível carregar decotes:", erro);
    }

    definirEstacaoInicial();
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
function entrarNoApp(categoria) {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.add('fade-out');
    container.style.display = 'block';

    if (categoria === 'perfumes') {
        const btn = document.getElementById('tab-perfumes');
        alternarAba('perfumes', btn);
    } else {
        const btn = document.getElementById('tab-colares');
        alternarAba('colares', btn);
    }
}

// Alterna entre abas de perfumes e colares
function alternarAba(tipo, botao) {
    document.getElementById('conteudo-perfumes').style.display = (tipo === 'perfumes') ? 'block' : 'none';
    document.getElementById('conteudo-colares').style.display = (tipo === 'colares') ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    botao.classList.add('active');
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
