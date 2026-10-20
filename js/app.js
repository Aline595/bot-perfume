function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function entrarNoApp(categoria) {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.add('fade-out');
    container.style.display = 'block';

    const btn = document.getElementById(`tab-${categoria}`);
    alternarAba(categoria, btn);
}

function alternarAba(tipo, botao) {
    document.getElementById('conteudo-perfumes').style.display = 'none';
    document.getElementById('conteudo-colares').style.display = 'none';
    document.getElementById('conteudo-cremes').style.display = 'none';

    document.getElementById(`conteudo-${tipo}`).style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    if (botao) {
        botao.classList.add('active');
        botao.setAttribute('aria-pressed', 'true');
    }
    comparisonProducts = [];
    updateComparisonControls();
    document.querySelector(`#conteudo-${tipo} h2`)?.focus();
    
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

document.querySelectorAll('[data-open-category]').forEach((button) => {
    button.addEventListener('click', () => entrarNoApp(button.dataset.openCategory));
});

document.querySelectorAll('[data-category-tab]').forEach((button) => {
    button.addEventListener('click', () => alternarAba(button.dataset.categoryTab, button));
});

document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
document.querySelectorAll('[data-back-home]').forEach((button) => {
    button.addEventListener('click', voltarParaHome);
});

document.getElementById('filtro-estacao').addEventListener('change', atualizarFiltros);
document.getElementById('filtro-temperatura').addEventListener('change', atualizarFiltros);
document.getElementById('estacao-manual').addEventListener('change', atualizarEstacao);
document.getElementById('buscar-perfume').addEventListener('click', buscar);
document.getElementById('surpreender-perfume').addEventListener('click', surpreender);

document.getElementById('buscar-colares').addEventListener('click', buscarColares);
document.getElementById('surpreender-colares').addEventListener('click', surpreenderColares);

document.getElementById('filtro-temperatura-creme').addEventListener('change', atualizarFiltrosCreme);
document.getElementById('filtro-estacao-creme').addEventListener('change', atualizarFiltrosCreme);
document.getElementById('buscar-cremes').addEventListener('click', recomendarCremePorClima);
document.getElementById('surpreender-creme').addEventListener('click', surpreenderCremePorGraus);
document.getElementById('range-baixa').addEventListener('click', () => selecionarRangeManualmente(20));
document.getElementById('range-intermediaria').addEventListener('click', () => selecionarRangeManualmente(23));
document.getElementById('range-alta').addEventListener('click', () => selecionarRangeManualmente(30));

carregarDados();
