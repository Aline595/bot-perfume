function valoresCreme(value) {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim());
    return typeof value === 'string' && value.trim() ? [value] : [];
}

function temperaturaReferenciaCreme(tempManual = null) {
    if (Number.isFinite(tempManual)) return tempManual;
    const temperaturaTexto = document.getElementById('temperatura-creme').textContent;
    return Number.parseFloat(temperaturaTexto.replace(/[^0-9.]/g, '')) || 22;
}

function categoriaTemperaturaCreme(temperatura) {
    if (temperatura <= 20) return 'baixa';
    if (temperatura <= 25) return 'intermediária';
    return 'alta';
}

function filtrosCreme(tempManual = null) {
    const consideraTemperatura = document.getElementById('filtro-temperatura-creme').checked;
    const consideraEstacao = document.getElementById('filtro-estacao-creme').checked;
    const temperatura = temperaturaReferenciaCreme(tempManual);
    const periodo = document.getElementById('periodo-creme').value;
    const estacao = document.getElementById('estacao-creme').value;
    const busca = document.getElementById('busca-creme').value.trim().toLocaleLowerCase('pt-BR');

    return { consideraTemperatura, consideraEstacao, temperatura, periodo, estacao, busca };
}

function cremeCombina(creme, filtros) {
    const hasTemperature = creme.temperatura !== '' && creme.temperatura !== null &&
        creme.temperatura !== undefined && Number.isFinite(Number(creme.temperatura));
    const temperaturaCreme = hasTemperature ? Number(creme.temperatura) : null;
    const combinaTemperatura = !filtros.consideraTemperatura ||
        !hasTemperature ||
        categoriaTemperaturaCreme(temperaturaCreme) === categoriaTemperaturaCreme(filtros.temperatura);
    const climas = valoresCreme(creme.clima);
    const combinaEstacao = !filtros.consideraEstacao ||
        climas.some((clima) =>
            clima.toLocaleLowerCase('pt-BR') === filtros.estacao.toLocaleLowerCase('pt-BR') ||
            clima.toLocaleLowerCase('pt-BR') === 'todo o ano'
        );
    const periodos = valoresCreme(creme.periodo).map((periodo) => periodo.toLocaleLowerCase('pt-BR'));
    const combinaPeriodo = filtros.periodo === 'todos' ||
        periodos.includes(filtros.periodo.toLocaleLowerCase('pt-BR'));
    const descricaoFragrancia = [...valoresCreme(creme.fragrancia), ...valoresCreme(creme.notas)]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
    const combinaBusca = !filtros.busca || descricaoFragrancia.includes(filtros.busca);

    return combinaTemperatura && combinaEstacao && combinaPeriodo && combinaBusca;
}

function motivosRecomendacaoCreme(creme, filtros) {
    const motivos = [];
    if (filtros.consideraTemperatura) {
        const hasTemperature = creme.temperatura !== '' && creme.temperatura !== null &&
            creme.temperatura !== undefined && Number.isFinite(Number(creme.temperatura));
        motivos.push(hasTemperature
            ? `faixa ${categoriaTemperaturaCreme(filtros.temperatura)} (${filtros.temperatura}°C)`
            : 'temperatura ideal não informada');
    }
    if (filtros.consideraEstacao) motivos.push(`estação ${filtros.estacao}`);
    if (filtros.periodo !== 'todos') motivos.push(`uso de ${filtros.periodo}`);
    if (filtros.busca) motivos.push(`fragrância ou nota “${filtros.busca}”`);
    if (!motivos.length) motivos.push('todos os filtros de preferência estão desativados');
    return motivos;
}

function renderizarCreme(creme, filtros) {
    const notas = valoresCreme(creme.notas);
    const fragrancias = valoresCreme(creme.fragrancia);
    const texturas = valoresCreme(creme.textura);
    const funcoes = valoresCreme(creme.funcao_principal);
    const temperatura = Number(creme.temperatura);
    const motivos = motivosRecomendacaoCreme(creme, filtros);

    return `
        <article class="card-perfume creme-card">
            <div class="creme-card-icon" aria-hidden="true">🧴</div>
            <div>
                <span class="perfume-marca">${escapeHtml(creme.marca || '')}</span>
                <strong>${escapeHtml(creme.nome)}</strong>
                ${fragrancias.length ? `<p><b>Fragrância:</b> ${escapeHtml(fragrancias.join(', '))}</p>` : ''}
                ${notas.length ? `<p><b>Notas:</b> ${escapeHtml(notas.join(', '))}</p>` : ''}
                ${texturas.length ? `<p><b>Textura:</b> ${escapeHtml(texturas.join(', '))}</p>` : ''}
                ${funcoes.length ? `<p><b>Benefícios:</b> ${escapeHtml(funcoes.join(', '))}</p>` : ''}
                ${Number.isFinite(temperatura) ? `<div class="perfume-duracao"><span>🌡️ Ideal:</span><strong>${temperatura}°C</strong></div>` : ''}
                ${valoresCreme(creme.periodo).length ? `<div class="perfume-duracao"><span>⏰ Uso:</span><strong>${escapeHtml(valoresCreme(creme.periodo).join(' / '))}</strong></div>` : ''}
                <p class="recommendation-reason"><strong>Por que combina:</strong> ${motivos.map(escapeHtml).join(' · ')}</p>
            </div>
        </article>
    `;
}

function exibirCremeResultados(lista, filtros, heading) {
    const resultado = document.getElementById('resultado');
    resultado.setAttribute('aria-busy', 'false');

    if (!lista.length) {
        resultado.innerHTML = `
            <div class="results-empty" role="status">
                <h3>Nenhum creme encontrado com essa combinação</h3>
                <p>Tente outro período ou fragrância, desative um filtro de clima ou veja o catálogo completo.</p>
                <button id="expand-creme-search" type="button">Ver todos os cremes</button>
            </div>
        `;
        document.getElementById('expand-creme-search').addEventListener('click', limparBuscaCreme);
        return;
    }

    resultado.innerHTML = `
        <h3 class="results-heading">${escapeHtml(heading)} — ${lista.length} ${lista.length === 1 ? 'creme encontrado' : 'cremes encontrados'}</h3>
        ${lista.map((creme) => renderizarCreme(creme, filtros)).join('')}
    `;
}

function limparBuscaCreme() {
    temperaturaManualAtiva = false;
    document.getElementById('filtro-temperatura-creme').checked = false;
    document.getElementById('filtro-estacao-creme').checked = false;
    document.getElementById('periodo-creme').value = 'todos';
    document.getElementById('busca-creme').value = '';
    const temperatura = document.getElementById('temperatura-creme');
    temperatura.textContent = document.getElementById('temperatura-atual').classList.contains('temperature-status-warning')
        ? '🌡️ Temperatura indisponível; usando 22°C como referência.'
        : `🌡️ ${temperaturaAmbienteAtual}°C agora`;
    atualizarFiltrosCreme();
    recomendarCremePorClima();
}

function atualizarFiltrosCreme() {
    const filtrarTemperatura = document.getElementById('filtro-temperatura-creme').checked;
    const filtrarEstacao = document.getElementById('filtro-estacao-creme').checked;
    document.querySelectorAll('.ranges-legenda button').forEach((button) => {
        button.disabled = !filtrarTemperatura;
    });
    if (filtrarTemperatura) {
        destacarRange(temperaturaReferenciaCreme());
    } else {
        document.querySelectorAll('.ranges-legenda button').forEach((button) => {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        });
    }
    document.getElementById('secao-estacao-creme').hidden = !filtrarEstacao;
}

function recomendarCremePorClima(tempManual = null) {
    const filtros = filtrosCreme(tempManual);
    const resultados = cremes.filter((creme) =>
        creme && typeof creme.nome === 'string' && creme.nome.trim() && cremeCombina(creme, filtros)
    );

    exibirCremeResultados(resultados, filtros, 'Sugestões para suas preferências');
}

function surpreenderCremePorGraus() {
    const filtros = filtrosCreme();
    const opcoes = cremes.filter((creme) =>
        creme && typeof creme.nome === 'string' && creme.nome.trim() && cremeCombina(creme, filtros)
    );

    if (!opcoes.length) {
        exibirCremeResultados([], filtros, 'Surpresa');
        return;
    }
    const sorteado = opcoes[Math.floor(Math.random() * opcoes.length)];
    exibirCremeResultados([sorteado], filtros, '✨ Sua surpresa');
}

// Controle de temperatura manual
let temperaturaManualAtiva = false;

function selecionarRangeManualmente(tempSimulada, idRange) {
    temperaturaManualAtiva = true;
    document.getElementById('filtro-temperatura-creme').checked = true;

    const temperatura = document.getElementById('temperatura-creme');
    temperatura.textContent = `🌡️ ${tempSimulada}°C (seleção manual)`;
    temperatura.classList.remove('temperature-status-warning');
    destacarRange(tempSimulada);
    atualizarFiltrosCreme();
    recomendarCremePorClima(tempSimulada);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        categoriaTemperaturaCreme,
        cremeCombina,
        motivosRecomendacaoCreme
    };
}
