let perfumes = [];
let colares = []; // Corrigido: inicializar array para colares
const urlGist = "https://gist.githubusercontent.com/Aline595/d766a0ddf15dd9fc30ddf3de8a67b16f/raw/";
let estacaoSelecionada = "";

async function carregarDados() {
    try {
        const resposta = await fetch(urlGist + "?t=" + new Date().getTime());
        if (!resposta.ok) throw new Error("Falha ao carregar dados do Gist");
        perfumes = await resposta.json();
        // Assumindo que colares podem vir do mesmo Gist ou de outro; ajustar se necessário
        // colares = await carregarColares(); // Adicionar função se houver fonte separada
        definirEstacaoInicial();
    } catch (erro) {
        console.error("❌ Erro ao carregar dados:", erro);
        alert("Erro ao carregar dados. Tente recarregar a página.");
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
    const vibeInput = document.getElementById('vibe').value.toLowerCase().trim();
    const notaInput = document.getElementById('nota').value.toLowerCase().trim();

    mostrarSkeleton();

    setTimeout(() => {
        const periodo = document.getElementById('periodo').value;

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

        exibirCards(filtro, divResultado, 'perfume');
    }, 500); 
}

function exibirCards(lista, container, tipo) {
    if (lista.length > 0) {
        container.innerHTML = lista.map(item => {
            const imagemSrc = item.imagem.startsWith('http') 
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
            } else if (tipo === 'colar') {
                return `
                    <div class="card-perfume" role="article" aria-labelledby="nome-${item.nome.replace(/\s+/g, '-')}">
                        <img src="${imagemSrc}" class="img-perfume" alt="${item.nome}" onerror="this.src='https://via.placeholder.com/200?text=Colar'">
                        <div>
                            <span class="perfume-marca" style="color: #2e7d32;">${item.material}</span>
                            <strong id="nome-${item.nome.replace(/\s+/g, '-')}" style="color: var(--text-main);">${item.nome}</strong>
                            <p style="font-size: 0.8em; margin-top: 5px;">${item.descricao}</p>
                            <div class="perfume-duracao">✨ Estilo: ${item.estilo}</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    } else {
        container.innerHTML = "<p style='color: #999;' role='alert'>❌ Nada encontrado.</p>";
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
            <div class="card-perfume" style="border: 2px solid #ff9800; background: var(--bg-card);" role="article">
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
    } else {
        divResultado.innerHTML = "<p style='color: #999;' role='alert'>❌ Nenhum perfume disponível para esta estação.</p>";
    }
}

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

async function buscarColares() {
    const divResultado = document.getElementById('resultado');
    const material = document.getElementById('material-colar')?.value || 'todos';
    const pingente = document.getElementById('pingente-colar')?.value.toLowerCase().trim() || '';

    if (colares.length === 0) {
        alert("Dados de colares não carregados. Verifique a fonte.");
        return;
    }

    mostrarSkeleton();

    setTimeout(() => {
        const filtro = colares.filter(c => {
            const bateMaterial = (material === 'todos') ? true : c.material.toLowerCase() === material;
            const batePingente = pingente === "" ? true : c.pingente.toLowerCase().includes(pingente);
            return bateMaterial && batePingente;
        });

        exibirCards(filtro, divResultado, 'colar');
    }, 500);
}

function alternarAba(tipo, botao) {
    document.getElementById('conteudo-perfumes').style.display = (tipo === 'perfumes') ? 'block' : 'none';
    document.getElementById('conteudo-colares').style.display = (tipo === 'colares') ? 'block' : 'none';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    botao.classList.add('active');
    
    document.getElementById('resultado').innerHTML = '';
}

function voltarParaHome() {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.remove('fade-out');

    setTimeout(() => {
        container.style.display = 'none';
        document.getElementById('resultado').innerHTML = '';
    }, 300);
}

function mostrarSkeleton() {
    const divResultado = document.getElementById('resultado');
    const skeletons = Array(3).fill(`
        <div class="skeleton-card" role="presentation">
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