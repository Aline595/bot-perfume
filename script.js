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

function surpreender() {
    const divResultado = document.getElementById('resultado');
    const possiveis = perfumes.filter(p => {
        const clima = Array.isArray(p.clima) ? p.clima : [p.clima];
        return clima.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        
        // AQUI ESTÁ O SEGREDO: Use ${p.imagem} com o $ na frente.
        const urlFinal = p.imagem ? `https://lh3.googleusercontent.com/d/${p.imagem}` : '';

        divResultado.innerHTML = `
            <p><strong>🎲 Sua sorte do dia:</strong></p>
            <div class="card-perfume" style="border: 2px solid #ff9800; background: #fffde7;">
                ${urlFinal ? `<img src="${urlFinal}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Erro+na+Imagem'">` : ''}
                <div>
                    <strong style="color: #e65100; font-size: 1.2em;">${p.nome}</strong>
                    ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                    <p style="font-size: 0.9em; color: #666; margin-top: 5px;">Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}</p>
                    <small>Marca: ${p.marca}</small>
                </div>
            </div>
        `;
    }
}

function exibirCards(lista, container) {
    if (lista.length > 0) {
        container.innerHTML = lista.map(p => {
            // Ajustei a URL para o padrão atual do Google Drive/User Content
            const urlFinal = p.imagem ? `https://lh3.googleusercontent.com/d/${p.imagem}` : '';
            return `
                <div class="card-perfume">
                    ${urlFinal ? `<img src="${urlFinal}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Erro+na+Imagem'">` : ''}
                    <div>
                        <strong style="color: #6a1b9a; font-size: 1.1em;">${p.nome}</strong>
                        ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}</p>
                        <p style="font-size: 0.8em; color: #999;">${p.marca || ''}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = "<p style='color: #999;'>❌ Nada encontrado.</p>";
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

carregarDados();