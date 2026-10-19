// Função auxiliar para buscar a temperatura atual no ABC/São Paulo
async function obterTemperaturaAtual() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.68&longitude=-46.62&current_weather=true');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (typeof data.current_weather?.temperature !== 'number') {
            throw new Error('A resposta não contém uma temperatura válida.');
        }
        return data.current_weather.temperature;
    } catch (error) {
        console.error("Erro ao buscar clima, usando temperatura padrão 22°C", error);
        const temperatureStatus = document.getElementById('temperatura-atual');
        if (temperatureStatus) {
            temperatureStatus.textContent = '🌡️ Temperatura indisponível; usando 22°C como referência.';
            temperatureStatus.classList.add('temperature-status-warning');
        }
        return 22; // Fallback caso a API falhe
    }
}

function listValues(value) {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
    return typeof value === 'string' ? [value] : [];
}

function perfumeMatchesTemperature(perfume, temperature) {
    const idealTemperature = perfume.temperatura_ideal;
    if (typeof idealTemperature !== 'string' || !idealTemperature.trim()) return true;

    const firstNumber = Number.parseInt(idealTemperature.replace(/[^0-9]/g, ''), 10);
    if (idealTemperature.includes('Abaixo')) return temperature <= firstNumber;
    if (idealTemperature.includes('Acima')) return temperature >= firstNumber;
    if (idealTemperature.includes('Entre')) {
        const matches = idealTemperature.match(/\d+/g) || [];
        if (matches.length === 2) {
            return temperature >= Number.parseInt(matches[0], 10) &&
                temperature <= Number.parseInt(matches[1], 10);
        }
    }
    return true;
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

    const tempAtual = filtroTemperatura ? await obterTemperaturaAtual() : null;
    const resultados = perfumes.filter((perfume) => {
        const climates = listValues(perfume.clima);
        const periods = listValues(perfume.periodo);
        const vibes = listValues(perfume.vibe);
        const notes = listValues(perfume.notas);
        const matchesClimate = !filtroEstacao || estacaoSelecionada === 'todos' ||
            climates.some((climate) => climate.toLowerCase() === estacaoSelecionada.toLowerCase());
        const matchesPeriod = periodo === 'ambos' ||
            periods.some((value) => value.toLowerCase() === periodo);
        const matchesVibe = !vibeInput ||
            vibes.some((value) => value.toLowerCase().includes(vibeInput));
        const matchesNote = !notaInput ||
            notes.some((value) => value.toLowerCase().includes(notaInput));
        const matchesTemperature = !filtroTemperatura ||
            perfumeMatchesTemperature(perfume, tempAtual);

        return matchesClimate && matchesPeriod && matchesVibe && matchesNote && matchesTemperature;
    });

    if (resultados.length === 0) {
        divResultado.innerHTML = `
            <div class="results-empty">
                <h3>Nenhum perfume encontrado com essa combinação</h3>
                <p>Tente outra vibe ou nota, escolha outro período ou amplie os filtros de clima.</p>
                <button id="expand-perfume-search" type="button">Ver todos os perfumes</button>
            </div>
        `;
        divResultado.setAttribute('aria-busy', 'false');
        document.getElementById('expand-perfume-search').addEventListener('click', limparBuscaPerfume);
        return;
    }

    const reasonsById = new Map(resultados.map((perfume) => {
        const reasons = [];
        if (filtroEstacao && estacaoSelecionada !== 'todos') {
            reasons.push(`estação ${estacaoSelecionada}`);
        }
        if (filtroTemperatura && perfume.temperatura_ideal) {
            reasons.push(`temperatura atual (${tempAtual}°C)`);
        }
        if (periodo !== 'ambos') reasons.push(`período ${periodo}`);
        if (vibeInput) reasons.push(`vibe “${vibeInput}”`);
        if (notaInput) reasons.push(`nota “${notaInput}”`);
        return [perfume.id, reasons];
    }));
    exibirCards(resultados, divResultado, 'perfume', {
        heading: `${resultados.length} ${resultados.length === 1 ? 'perfume encontrado' : 'perfumes encontrados'}`,
        reasonsById
    });
}

function limparBuscaPerfume() {
    document.getElementById('filtro-estacao').checked = false;
    document.getElementById('filtro-temperatura').checked = false;
    document.getElementById('periodo').value = 'ambos';
    document.getElementById('vibe').value = '';
    document.getElementById('nota').value = '';
    atualizarFiltros();
    buscar();
}

// Função para surpreender com um perfume aleatório
async function surpreender() {
    const divResultado = document.getElementById('resultado');
    const filtroEstacao = document.getElementById('filtro-estacao').checked;
    const filtroTemperatura = document.getElementById('filtro-temperatura').checked;
    mostrarSkeleton();
    const tempAtual = await obterTemperaturaAtual();

    const possiveis = perfumes.filter((perfume) => {
        const matchesClimate = !filtroEstacao || estacaoSelecionada === 'todos' ||
            listValues(perfume.clima).some((climate) => climate.toLowerCase() === estacaoSelecionada.toLowerCase());
        const matchesTemperature = !filtroTemperatura ||
            perfumeMatchesTemperature(perfume, tempAtual);
        return matchesClimate && matchesTemperature;
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        const reasons = [];
        if (filtroEstacao && estacaoSelecionada !== 'todos') {
            reasons.push(`estação ${estacaoSelecionada}`);
        }
        if (filtroTemperatura && p.temperatura_ideal) {
            reasons.push(`temperatura atual (${tempAtual}°C)`);
        }
        if (!reasons.length) reasons.push('sorteio entre todos os perfumes cadastrados');
        exibirCards([p], divResultado, 'perfume', {
            heading: '🎲 Sua surpresa de hoje',
            reasonsById: new Map([[p.id, reasons]])
        });
    } else {
        divResultado.innerHTML = `
            <div class="results-empty" role="status">
                <h3>Nenhum perfume combina com os filtros de clima atuais</h3>
                <p>Desative o filtro de estação ou temperatura para ampliar as opções.</p>
            </div>
        `;
        divResultado.setAttribute('aria-busy', 'false');
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