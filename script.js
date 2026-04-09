let perfumes = [];
const urlGist = "https://gist.githubusercontent.com/Aline595/d766a0ddf15dd9fc30ddf3de8a67b16f/raw/";
let estacaoSelecionada = "";

async function carregarDados() {
    try {
        const resposta = await fetch(urlGist + "?t=" + new Date().getTime());
        perfumes = await resposta.json();
        definirEstacaoInicial();
    } catch (erro) {
        console.error("❌ Erro ao carregar Gist:", erro);
    }
}

function definirEstacaoInicial() {
    const mes = new Date().getMonth() + 1;
    let inicial = "Verão";
    if (mes >= 3 && mes <= 5) inicial = "Outono";
    else if (mes >= 6 && mes <= 8) inicial = "Inverno";
    else if (mes >= 9 && mes <= 11) inicial = "Primavera";
    
    estacaoSelecionada = inicial;
    document.getElementById('estacao-manual').value = inicial;
}

function atualizarEstacao() {
    estacaoSelecionada = document.getElementById('estacao-manual').value;
}

async function buscar() {
    const divResultado = document.getElementById('resultado');

    mostrarSkeleton();

    setTimeout(() => {
        const periodo = document.getElementById('periodo').value;
        const vibeInput = document.getElementById('vibe').value.toLowerCase();
        const notaInput = document.getElementById('nota').value.toLowerCase();

        const filtro = perfumes.filter(p => {
            const climas = Array.isArray(p.clima) ? p.clima : [p.clima];
            const periodos = Array.isArray(p.periodo) ? p.periodo : [p.periodo];
            const vibes = Array.isArray(p.vibe) ? p.vibe : [p.vibe];
            const notas = Array.isArray(p.notas) ? p.notas : [p.notas];

            const bateClima = climas.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
            const batePeriodo = (periodo === 'ambos') ? true : periodos.some(per => per.toLowerCase() === periodo);
            const bateVibe = vibeInput === "" ? true : vibes.some(v => v.toLowerCase().includes(vibeInput));
            const bateNota = notaInput === "" ? true : notas.some(n => n.toLowerCase().includes(notaInput));

            return bateClima && batePeriodo && bateVibe && bateNota;
        });

        exibirCards(filtro, divResultado);
    }, 500); 
}

function exibirCards(lista, container) {
    if (lista.length > 0) {
        container.innerHTML = lista.map(p => {
            // Se p.imagem já for um link (http...), ele usa direto. 
            // Se for só o código, ele monta a URL.
            const imagemSrc = p.imagem.startsWith('http') 
                ? p.imagem 
                : `https://lh3.googleusercontent.com/d/${p.imagem}`;

            return `
                <div class="card-perfume">
                    <img src="${imagemSrc}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Sem+Imagem'">
                    <div>
                        <span class="perfume-marca">${p.marca || ''}</span>
                        <strong style="color: var(--text-main); font-size: 1.1em;">${p.nome}</strong>
                        
                        ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                        
                        <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                            ✨ Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}
                        </p>

                        <div class="perfume-duracao">
                            <span>⏱️ Duração:</span>
                            <strong>${p.duracao || 'N/A'}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = "<p style='color: #999;'>❌ Nada encontrado.</p>";
    }
}

function surpreender() {
    const divResultado = document.getElementById('resultado');
    const possiveis = perfumes.filter(p => {
        const clima = Array.isArray(p.clima) ? p.clima : [p.clima];
        return clima.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        const imagemSrc = p.imagem.startsWith('http') 
            ? p.imagem 
            : `https://lh3.googleusercontent.com/d/${p.imagem}`;

        divResultado.innerHTML = `
            <p><strong>🎲 Sua sorte do dia:</strong></p>
            <div class="card-perfume" style="border: 2px solid #ff9800; background: var(--bg-card);">
                <img src="${imagemSrc}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Erro+Imagem'">
                <div>
                    <span class="perfume-marca" style="color: #e65100;">${p.marca || ''}</span>
                    <strong style="color: #e65100; font-size: 1.2em;">${p.nome}</strong>
                    ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}</p>
                    <div class="perfume-duracao">
                        <span>⏱️ Fixação:</span>
                        <strong>${p.duracao || 'N/A'}</strong>
                    </div>
                </div>
            </div>
        `;
    }
}

// Função que vem da Home
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

// Função de Busca de Colares
async function buscarColares() {
    const divResultado = document.getElementById('resultado');
    mostrarSkeleton(); // Usa o mesmo skeleton dos perfumes

    setTimeout(() => {
        const material = document.getElementById('material-colar').value;
        const ocasiao = document.getElementById('ocasiao-colar').value;
        const pingente = document.getElementById('pingente-colar').value.toLowerCase();

        // Filtro (Assumindo que você terá um array 'colares' ou usará o mesmo 'perfumes' adaptado)
        // Aqui você filtraria seus dados de colares
        const filtro = colares.filter(c => {
            const bateMaterial = (material === 'todos') ? true : c.material.toLowerCase() === material;
            const batePingente = pingente === "" ? true : c.pingente.toLowerCase().includes(pingente);
            return bateMaterial && batePingente;
        });

        exibirCardsColares(filtro, divResultado);
    }, 500);
}

// Função para exibir os cards de colares (pode usar a mesma estrutura dos perfumes)
function exibirCardsColares(lista, container) {
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhum colar encontrado.</p>";
        return;
    }
    
    container.innerHTML = lista.map(c => `
        <div class="card-perfume">
            <img src="${c.imagem}" class="img-perfume" onerror="this.src='https://via.placeholder.com/200?text=Colar'">
            <div>
                <span class="perfume-marca" style="color: #2e7d32;">${c.material}</span>
                <strong style="color: var(--text-main);">${c.nome}</strong>
                <p style="font-size: 0.8em; margin-top: 5px;">${c.descricao}</p>
                <div class="perfume-duracao">✨ Estilo: ${c.estilo}</div>
            </div>
        </div>
    `).join('');
}

// Mantenha a sua função alternarAba que já usamos antes:
function alternarAba(tipo, botao) {
    document.getElementById('conteudo-perfumes').style.display = (tipo === 'perfumes') ? 'block' : 'none';
    document.getElementById('conteudo-colares').style.display = (tipo === 'colares') ? 'block' : 'none';

    // Remove classe ativa de todos e adiciona no clicado
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    botao.classList.add('active');
    
    // Limpa resultados ao trocar
    document.getElementById('resultado').innerHTML = '';
}

function voltarParaHome() {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    // 1. Remove a classe que esconde a tela inicial
    splash.classList.remove('fade-out');

    // 2. Esconde o container principal após uma pequena animação
    setTimeout(() => {
        container.style.display = 'none';
        // Opcional: Limpa os resultados ao voltar para a home
        document.getElementById('resultado').innerHTML = '';
    }, 300); // Tempo para sincronizar com o efeito visual
}

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

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

carregarDados();