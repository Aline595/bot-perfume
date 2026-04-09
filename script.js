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

function buscar() {
    const periodo = document.getElementById('periodo').value;
    const vibeInput = document.getElementById('vibe').value.toLowerCase();
    const divResultado = document.getElementById('resultado');

    const filtro = perfumes.filter(p => {
        const clima = Array.isArray(p.clima) ? p.clima : [p.clima];
        const periodoList = Array.isArray(p.periodo) ? p.periodo : [p.periodo];
        const vibeList = Array.isArray(p.vibe) ? p.vibe : [p.vibe];

        const bateClima = clima.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
        const batePeriodo = (periodo === 'ambos') ? true : periodoList.some(per => per.toLowerCase() === periodo);
        const bateVibe = vibeInput === "" ? true : vibeList.some(v => v.toLowerCase().includes(vibeInput));

        return bateClima && batePeriodo && bateVibe;
    });

    exibirCards(filtro, divResultado);
}

function surpreender() {
    const divResultado = document.getElementById('resultado');
    const possiveis = perfumes.filter(p => {
        const clima = Array.isArray(p.clima) ? p.clima : [p.clima];
        return clima.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        const urlFinal = p.imagem ? `https://lh3.googleusercontent.com/u/0/d/${p.imagem}` : '';

        divResultado.innerHTML = `
            <p><strong>🎲 Sua sorte do dia:</strong></p>
            <div class="card-perfume" style="border: 2px solid #ff9800; background: #fffde7;">
                ${urlFinal ? `<img src="${urlFinal}" class="img-perfume" alt="${p.nome}">` : ''}
                <div>
                    <strong style="color: #e65100; font-size: 1.2em;">${p.nome}</strong>
                    <p style="font-size: 0.9em; color: #666;">Vibe: ${p.vibe ? p.vibe.join(', ') : 'N/A'}</p>
                    <small>Marca: ${p.marca}</small>
                </div>
            </div>
        `;
    }
}

function exibirCards(lista, container) {
    if (lista.length > 0) {
        container.innerHTML = lista.map(p => {
            const urlFinal = p.imagem ? `https://lh3.googleusercontent.com/u/0/d/${p.imagem}` : '';
            return `
                <div class="card-perfume">
                    ${urlFinal ? `<img src="${urlFinal}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Ajustar+Permissão'">` : ''}
                    <div>
                        <strong style="color: #6a1b9a; font-size: 1.1em;">${p.nome}</strong>
                        <p style="font-size: 0.9em; color: #666;">Vibe: ${p.vibe ? p.vibe.join(', ') : 'N/A'}</p>
                        <p style="font-size: 0.8em; color: #999;">${p.marca || ''}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = "<p style='color: #999;'>❌ Nada encontrado.</p>";
    }
}

// Inicia o processo
carregarDados();