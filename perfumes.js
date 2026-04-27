// Função auxiliar para buscar a temperatura atual no ABC/São Paulo
async function obterTemperaturaAtual() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.68&longitude=-46.62&current_weather=true');
        const data = await response.json();
        return data.current_weather.temperature;
    } catch (error) {
        console.error("Erro ao buscar clima, usando temperatura padrão 22°C", error);
        return 22; // Fallback caso a API falhe
    }
}

// Função para buscar perfumes com base nos filtros
async function buscar() {
    const divResultado = document.getElementById('resultado');
    const vibeInput = document.getElementById('vibe').value.toLowerCase().trim();
    const notaInput = document.getElementById('nota').value.toLowerCase().trim();
    const periodo = document.getElementById('periodo').value;
    
    // Verificar qual filtro está ativado
    const filtroEstacao = document.getElementById('filtro-estacao').checked;
    const filtroTemperatura = document.getElementById('filtro-temperatura').checked;

    mostrarSkeleton();

    // Buscamos a temperatura antes de entrar no filtro
    const tempAtual = await obterTemperaturaAtual();

    setTimeout(() => {
        const filtro = perfumes.filter(p => {
            const climas = Array.isArray(p.clima) ? p.clima : [p.clima];
            const periodos = Array.isArray(p.periodo) ? p.periodo : [p.periodo];
            const vibes = Array.isArray(p.vibe) ? p.vibe : [p.vibe];
            const notas = Array.isArray(p.notas) ? p.notas : [p.notas];

            // Filtro de estação (se ativado)
            let bateClima = true;
            if (filtroEstacao) {
                bateClima = estacaoSelecionada === 'todos' ? true : climas.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
            }

            const batePeriodo = (periodo === 'ambos') ? true : periodos.some(per => per.toLowerCase() === periodo);
            const bateVibe = vibeInput === "" ? true : vibes.some(v => v.toLowerCase().includes(vibeInput));
            const bateNota = notaInput === "" ? true : notas.some(n => n.toLowerCase().includes(notaInput));

            // Filtro de temperatura (se ativado)
            let bateTemp = true;
            if (filtroTemperatura && p.temperatura_ideal) {
                const numTemp = parseInt(p.temperatura_ideal.replace(/[^0-9]/g, ''));
                if (p.temperatura_ideal.includes('Abaixo')) {
                    bateTemp = tempAtual <= numTemp;
                } else if (p.temperatura_ideal.includes('Acima')) {
                    bateTemp = tempAtual >= numTemp;
                } else if (p.temperatura_ideal.includes('Entre')) {
                    const matches = p.temperatura_ideal.match(/\d+/g);
                    if (matches.length === 2) {
                        bateTemp = tempAtual >= parseInt(matches[0]) && tempAtual <= parseInt(matches[1]);
                    }
                }
            }

            return bateClima && batePeriodo && bateVibe && bateNota && bateTemp;
        });

        exibirCards(filtro, divResultado, 'perfume');
    }, 500);
}

// Função para surpreender com um perfume aleatório
async function surpreender() {
    const divResultado = document.getElementById('resultado');
    const filtroEstacao = document.getElementById('filtro-estacao').checked;
    const filtroTemperatura = document.getElementById('filtro-temperatura').checked;
    const tempAtual = await obterTemperaturaAtual();

    const possiveis = perfumes.filter(p => {
        const climas = Array.isArray(p.clima) ? p.clima : [p.clima];
        
        let bateClima = true;
        if (filtroEstacao) {
            bateClima = estacaoSelecionada === 'todos' ? true : climas.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
        }
        
        let bateTemp = true;
        if (filtroTemperatura && p.temperatura_ideal) {
            const numTemp = parseInt(p.temperatura_ideal.replace(/[^0-9]/g, ''));
            if (p.temperatura_ideal.includes('Abaixo')) bateTemp = tempAtual <= numTemp;
            else if (p.temperatura_ideal.includes('Acima')) bateTemp = tempAtual >= numTemp;
        }
        
        return bateClima && bateTemp;
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        
        const imagemSrc = p.imagem.startsWith('http') 
            ? p.imagem 
            : `https://lh3.googleusercontent.com/u/0/d/${p.imagem}`;

        divResultado.innerHTML = `
            <p><strong>🎲 Sua sorte do dia (${tempAtual}°C):</strong></p>
            <div class="card-perfume" style="border: 2px solid #ff9800; background: var(--bg-card);" role="article">
                <img src="${imagemSrc}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Erro+Imagem'">
                <div>
                    <span class="perfume-marca" style="color: #e65100;">${p.marca || ''}</span>
                    <strong style="color: #e65100; font-size: 1.2em;">${p.nome}</strong>
                    ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}</p>
                    <div class="perfume-duracao">
                        <span>⏱️ Fixação:</span>
                        <strong>${p.duracao || 'N/A'}h</strong>
                    </div>
                    ${p.temperatura_ideal ? `<small style="color: #666;">Ideal para: ${p.temperatura_ideal}</small>` : ''}
                </div>
            </div>
        `;
    } else {
        divResultado.innerHTML = `<p style='color: #999;' role='alert'>❌ Nenhum perfume ideal para os ${tempAtual}°C de hoje.</p>`;
    }
}

// Exports para testes (ajustado para suportar async)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buscar,
        surpreender,
        obterTemperaturaAtual
    };
}