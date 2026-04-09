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