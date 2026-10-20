function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

let homeTransitionTimer;

function entrarNoApp(categoria) {
    document.body.classList.remove('comparison-view');
    document.getElementById('comparison-screen')?.setAttribute('hidden', '');
    clearTimeout(homeTransitionTimer);
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.add('fade-out');
    container.classList.remove('app-hidden');

    const btn = document.getElementById(`tab-${categoria}`);
    alternarAba(categoria, btn);
}

function alternarAba(tipo, botao) {
    document.getElementById('conteudo-perfumes').classList.add('is-hidden');
    document.getElementById('conteudo-colares').classList.add('is-hidden');
    document.getElementById('conteudo-cremes').classList.add('is-hidden');

    document.getElementById(`conteudo-${tipo}`).classList.remove('is-hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    if (botao) {
        botao.classList.add('active');
        botao.setAttribute('aria-pressed', 'true');
    }
    document.querySelector(`#conteudo-${tipo} h2`)?.focus();
    
    document.getElementById('resultado').innerHTML = '';
}

function voltarParaHome() {
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    clearTimeout(homeTransitionTimer);
    splash.classList.remove('fade-out');
    if (container.classList.contains('app-hidden')) return;

    homeTransitionTimer = setTimeout(() => {
        container.classList.add('app-hidden');
        document.getElementById('resultado').innerHTML = '';
    }, 300);
}

const dashboardRecommendations = {};
let dashboardRecommendationContextKey = '';

function periodoAtualDoDia(date = new Date()) {
    return date.getHours() >= 6 && date.getHours() < 18 ? 'dia' : 'noite';
}

function dashboardContextKey(date = new Date()) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${periodoAtualDoDia(date)}`;
}

function itemMatchesPeriod(item, period) {
    const periods = listValues(item.periodo).map((value) => value.trim().toLocaleLowerCase('pt-BR'));
    return periods.includes(period) || periods.some((value) =>
        ['ambos', 'todos', 'dia e noite', 'todo o dia'].includes(value)
    );
}

function chooseDailyItem(items) {
    if (!items.length) return null;
    const now = new Date();
    const dayOfYear = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
    return items[dayOfYear % items.length];
}

function renderDailyRecommendation(item, category, label, icon, description, emptyMessage = 'Catálogo indisponível') {
    if (!item) {
        delete dashboardRecommendations[category];
        return `
            <article class="daily-card daily-card-unavailable">
                <div class="product-image-placeholder" aria-hidden="true">${icon}</div>
                <span class="daily-card-category">${label}</span>
                <h2>${escapeHtml(emptyMessage)}</h2>
                <p>${emptyMessage === 'Catálogo indisponível'
                    ? 'Tente novamente mais tarde.'
                    : 'Nenhum item do catálogo atende aos filtros neste momento.'}</p>
            </article>
        `;
    }

    const image = category === 'colares'
        ? `assets/decotes/${encodeURIComponent(item.id)}.png`
        : item.imagem && /^https?:\/\//i.test(item.imagem)
            ? item.imagem
            : item.imagem && /^[A-Za-z0-9_-]+$/.test(item.imagem)
                ? `https://lh3.googleusercontent.com/d/${item.imagem}`
                : '';
    const title = category === 'colares' ? item.formato : item.nome;
    const details = description(item);
    dashboardRecommendations[category] = item;

    return `
        <article class="daily-card">
            ${productImageHtml(image, title, icon)}
            <span class="daily-card-category">${label}</span>
            <h2>${escapeHtml(title || label)}</h2>
            <p>${escapeHtml(details || 'Uma escolha para conhecer.')}</p>
            <button type="button" class="daily-card-link" data-daily-category="${category}">Ver sugestão →</button>
        </article>
    `;
}

function updateDailyRecommendations() {
    const grid = document.getElementById('daily-combination-grid');
    if (!temperaturaCarregada) {
        grid.innerHTML = '<p class="dashboard-loading">Consultando a temperatura para preparar suas sugestões...</p>';
        return;
    }
    const period = periodoAtualDoDia();
    dashboardRecommendationContextKey = dashboardContextKey();
    const perfumeOptions = perfumesCarregados
        ? perfumes.filter((item) => itemMatchesPeriod(item, period) &&
            perfumeMatchesTemperature(item, temperaturaAmbienteAtual))
        : [];
    const creamFilters = {
        consideraTemperatura: true,
        consideraEstacao: false,
        temperatura: temperaturaAmbienteAtual,
        periodo: period,
        estacao: 'todos',
        busca: ''
    };
    const creamOptions = cremesCarregados
        ? cremes.filter((item) => item && cremeCombina(item, creamFilters))
        : [];
    const emptyLabel = (loaded, catalog, options) =>
        !loaded || catalog.length === 0 ? 'Catálogo indisponível' : options.length === 0 ? 'Sem sugestão compatível' : '';
    const perfumeEmptyLabel = emptyLabel(perfumesCarregados, perfumes, perfumeOptions);
    const creamEmptyLabel = emptyLabel(cremesCarregados, cremes, creamOptions);
    const recommendationContext = document.getElementById('dashboard-recommendation-context');
    if (recommendationContext) {
        recommendationContext.textContent =
            `Período ${period} · ${temperaturaAmbienteAtual.toLocaleString('pt-BR')}°C (temperatura ideal, quando cadastrada).`;
    }
    const recommendations = [
        renderDailyRecommendation(
            chooseDailyItem(perfumeOptions),
            'perfumes',
            'Perfume',
            '🌸',
            (item) => item.marca,
            perfumeEmptyLabel
        ),
        renderDailyRecommendation(
            chooseDailyItem(creamOptions),
            'cremes',
            'Creme',
            '🧴',
            (item) => item.marca,
            creamEmptyLabel
        ),
        renderDailyRecommendation(
            chooseDailyItem(decotes),
            'colares',
            'Acessório',
            '📿',
            (item) => item.colar_ideal
        )
    ];
    grid.innerHTML = recommendations.join('');
    updateDashboardSummary();
}

function updateDashboardSummary() {
    const comparisonCount = document.getElementById('dashboard-comparison-count');
    if (comparisonCount) {
        comparisonCount.textContent = `${comparisonProducts.length}/4 produtos`;
    }
    const suggestionCount = document.getElementById('dashboard-suggestion-count');
    if (suggestionCount) {
        const count = ['perfumes', 'cremes', 'colares'].filter((category) => dashboardRecommendations[category]).length;
        suggestionCount.textContent = `${count} ${count === 1 ? 'sugestão' : 'sugestões'}`;
    }
}

function updateDashboardInventory() {
    const grid = document.getElementById('dashboard-inventory-grid');
    const count = document.getElementById('dashboard-inventory-count');
    const search = document.getElementById('dashboard-inventory-search');
    const categoryFilter = document.getElementById('dashboard-inventory-filter');
    if (!grid || !count || !search || !categoryFilter) return;

    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const selectedCategory = categoryFilter.value;
    const now = Date.now();
    const recentWindow = 30 * 24 * 60 * 60 * 1000;
    const isRecent = (item) => {
        const timestamp = Math.max(
            Date.parse(item.created_at || '') || 0,
            Date.parse(item.updated_at || '') || 0
        );
        const age = now - timestamp;
        return timestamp > 0 && age >= 0 && age <= recentWindow;
    };
    const heroPerfumeId = dashboardRecommendations.perfumes?.id;
    const heroCreamId = dashboardRecommendations.cremes?.id;
    const heroAccessoryId = dashboardRecommendations.colares?.id;
    const period = periodoAtualDoDia();
    const creamFilters = {
        consideraTemperatura: true,
        consideraEstacao: false,
        temperatura: temperaturaAmbienteAtual,
        periodo: period,
        estacao: 'todos',
        busca: ''
    };
    const candidates = [];
    const addCandidate = (type, item) => {
        if (!item || (selectedCategory !== 'todos' && selectedCategory !== type)) return;
        const favorite = type !== 'acessorio' && productIsFavorite(type, item.id);
        const recent = type !== 'acessorio' && isRecent(item);
        const compatible = type === 'perfume'
            ? Boolean(item.temperatura_ideal) &&
                perfumeMatchesTemperature(item, temperaturaAmbienteAtual) &&
                itemMatchesPeriod(item, period)
            : type === 'creme'
                ? item.temperatura !== '' && item.temperatura !== null && item.temperatura !== undefined &&
                    cremeCombina(item, creamFilters)
                : item.possui_no_guarda_roupa === true;
        if (!favorite && !recent && !compatible && type !== 'acessorio') return;
        if (type === 'acessorio' && !compatible) return;
        if (type === 'perfume' && item.id === heroPerfumeId && !favorite && !recent) return;
        if (type === 'creme' && item.id === heroCreamId && !favorite && !recent) return;
        if (type === 'acessorio' && item.id === heroAccessoryId &&
            decotes.filter((accessory) => accessory.possui_no_guarda_roupa === true).length > 1) return;
        const searchableText = Object.entries(item)
            .filter(([key]) => !['imagem', 'created_at', 'updated_at'].includes(key))
            .flatMap(([, value]) => Array.isArray(value) ? value : [value])
            .filter((value) => typeof value === 'string' || typeof value === 'number')
            .join(' ')
            .toLocaleLowerCase('pt-BR');
        if (query && !searchableText.includes(query)) return;
        candidates.push({
            type,
            item,
            favorite,
            recent,
            compatible,
            favoriteOrder: favoriteProducts.findIndex((saved) => saved.type === type && saved.id === item.id),
            updatedAt: Math.max(Date.parse(item.updated_at || '') || 0, Date.parse(item.created_at || '') || 0),
            reason: favorite
                ? 'Favorito'
                : recent
                    ? item.created_at && now - Date.parse(item.created_at) <= recentWindow
                        ? 'Adicionado recentemente'
                        : 'Editado recentemente'
                    : type === 'acessorio'
                        ? 'No guarda-roupa'
                        : 'Compatível com o clima',
            rank: favorite ? 0 : recent ? 1 : type === 'acessorio' ? 3 : 2
        });
    };

    if (perfumesCarregados) perfumes.forEach((item) => addCandidate('perfume', item));
    if (cremesCarregados) cremes.forEach((item) => addCandidate('creme', item));
    decotes.forEach((item) => addCandidate('acessorio', item));
    candidates.sort((first, second) =>
        first.rank - second.rank ||
        (first.favorite ? second.favoriteOrder - first.favoriteOrder : second.updatedAt - first.updatedAt) ||
        String(first.item.nome || first.item.formato).localeCompare(String(second.item.nome || second.item.formato), 'pt-BR')
    );

    let items;
    if (selectedCategory === 'todos' && !query) {
        const balanced = ['perfume', 'creme', 'acessorio']
            .map((type) => candidates.find((candidate) => candidate.type === type))
            .filter(Boolean);
        items = [...balanced];
        for (const candidate of candidates) {
            if (items.length >= 4) break;
            if (!items.some((item) => item.type === candidate.type && item.item.id === candidate.item.id)) {
                items.push(candidate);
            }
        }
        items.sort((first, second) => candidates.indexOf(first) - candidates.indexOf(second));
    } else {
        items = candidates.slice(0, 4);
    }

    const totalCount = candidates.length;
    count.textContent = `${items.length} de ${totalCount} ${totalCount === 1 ? 'item útil' : 'itens úteis'} · favoritos, novidades e compatibilidade com o clima`;
    if (!items.length) {
        grid.innerHTML = `
            <div class="dashboard-inventory-empty">
                <span aria-hidden="true">♡</span>
                <strong>${query || selectedCategory !== 'todos' ? 'Nenhum item encontrado' : 'Seu inventário está sendo preparado'}</strong>
                <p>${query ? 'Tente outro nome, nota, fragrância ou componente.' : 'Novos produtos, favoritos e sugestões compatíveis com o clima aparecem aqui.'}</p>
                ${query ? '' : '<button type="button" class="dashboard-card-action" data-dashboard-action="add-product">Explorar produtos</button>'}
            </div>
        `;
        return;
    }
    grid.innerHTML = items.map(({ type, item, reason }) => {
        if (type === 'acessorio') {
            return `
                <article class="dashboard-inventory-card">
                    <div class="dashboard-inventory-card-top">
                        <span class="dashboard-inventory-icon" aria-hidden="true">📿</span>
                        <span class="dashboard-inventory-type">Acessório</span>
                    </div>
                    <span class="dashboard-inventory-reason">${escapeHtml(reason)}</span>
                    <h3>${escapeHtml(item.formato || 'Acessório')}</h3>
                    <p>${escapeHtml(item.colar_ideal || item.descricao || 'Uma opção do seu guarda-roupa')}</p>
                    ${comparisonActionHtml('acessorio', item.id)}
                </article>
            `;
        }
        const image = item.imagem && /^https?:\/\//i.test(item.imagem)
            ? item.imagem
            : item.imagem && /^[A-Za-z0-9_-]+$/.test(item.imagem)
                ? `https://lh3.googleusercontent.com/d/${item.imagem}`
                : '';
        const typeLabel = type === 'perfume' ? 'Perfume' : 'Creme';
        const detail = type === 'perfume'
            ? item.temperatura_ideal || 'Temperatura não informada'
            : Number.isFinite(Number(item.temperatura)) && item.temperatura !== ''
                ? `Ideal · ${item.temperatura}°C`
                : 'Temperatura não informada';
        return `
            <article class="dashboard-inventory-card">
                <div class="dashboard-inventory-card-top">
                    ${productImageHtml(image, item.nome, type === 'perfume' ? '🌸' : '🧴')}
                    <span class="dashboard-inventory-type">${typeLabel}</span>
                </div>
                <span class="dashboard-inventory-reason">${escapeHtml(reason)}</span>
                <h3>${escapeHtml(item.nome)}</h3>
                <p>${escapeHtml(`${item.marca || ''} · ${detail}`)}</p>
                ${productActionsHtml(type, item.id)}
            </article>
        `;
    }).join('');
}

function showDailyRecommendation(category) {
    const item = dashboardRecommendations[category];
    if (!item) return;
    const appCategory = category === 'perfumes' ? 'perfumes' : category;
    entrarNoApp(appCategory);
    const result = document.getElementById('resultado');
    if (category === 'perfumes') {
        exibirCards([item], result, 'perfume', { heading: 'Sua combinação do dia' });
    } else if (category === 'cremes') {
        exibirCremeResultados([item], filtrosCreme(), 'Sua combinação do dia');
    } else {
        exibirCards([item], result, 'decote', { heading: 'Sua combinação do dia' });
    }
    result.focus();
}

function setDashboardNavActive(action) {
    document.querySelectorAll('.dashboard-nav-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.dashboardAction === action);
    });
}

async function shareDashboard() {
    const shareData = {
        title: 'Meu Consultor Pessoal',
        text: 'Veja sugestões de perfumes, cremes e acessórios.',
        url: 'https://aline595.github.io/bot-perfume/'
    };
    const status = document.getElementById('dashboard-action-status');
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            status.textContent = 'Link compartilhado.';
        } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareData.url);
            status.textContent = 'Link copiado para a área de transferência.';
        } else {
            throw new Error('Este navegador não permite compartilhar ou copiar o link automaticamente.');
        }
        status.classList.remove('error');
    } catch (error) {
        if (error.name === 'AbortError') return;
        status.textContent = error.message || 'Não foi possível compartilhar o link.';
        status.classList.add('error');
    }
}

function handleDashboardAction(action) {
    if (action === 'home') {
        document.body.classList.remove('comparison-view');
        document.getElementById('comparison-screen')?.setAttribute('hidden', '');
        setDashboardNavActive('home');
        voltarParaHome();
        return;
    }
    if (action === 'manage') {
        setDashboardNavActive('manage');
        entrarNoApp('perfumes');
        const admin = document.getElementById('perfume-admin-section');
        admin.open = true;
        admin.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    if (action === 'compare') {
        setDashboardNavActive('compare');
        if (!comparisonProducts.length) {
            comparisonProducts = favoriteProducts
                .filter((favorite) => getProduct(favorite.type, favorite.id))
                .slice(0, 4)
                .map((favorite) => ({ ...favorite }));
        }
        document.getElementById('comparison-screen')?.removeAttribute('hidden');
        document.body.classList.add('comparison-view');
        clearTimeout(homeTransitionTimer);
        document.getElementById('tela-inicial').classList.remove('fade-out');
        document.querySelector('.container')?.classList.add('app-hidden');
        updateComparisonControls();
        document.dispatchEvent(new Event('comparison-updated'));
        announceUtility(comparisonProducts.length
            ? 'Seus favoritos estão prontos para comparar. Você também pode adicionar outros produtos.'
            : 'Escolha produtos no seletor para começar a comparação.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    if (action === 'favorites') {
        const firstFavorite = favoriteProducts[0];
        const category = firstFavorite?.type === 'creme' ? 'cremes' : 'perfumes';
        setDashboardNavActive('favorites');
        entrarNoApp(category);
        showFavorites(firstFavorite?.type || 'perfume');
        return;
    }
    if (action === 'add-product') {
        const category = document.getElementById('dashboard-inventory-filter')?.value === 'creme'
            ? 'cremes'
            : 'perfumes';
        entrarNoApp(category);
        const admin = document.getElementById(category === 'cremes' ? 'creme-admin-section' : 'perfume-admin-section');
        admin.open = true;
        admin.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById(category === 'cremes' ? 'creme-admin-name' : 'perfume-admin-name').focus();
        return;
    }
    if (action === 'share') shareDashboard();
}

document.querySelectorAll('[data-open-category]').forEach((button) => {
    button.addEventListener('click', () => entrarNoApp(button.dataset.openCategory));
});

document.querySelectorAll('[data-category-tab]').forEach((button) => {
    button.addEventListener('click', () => alternarAba(button.dataset.categoryTab, button));
});

document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
document.getElementById('dashboard-dark-mode-toggle').addEventListener('click', toggleDarkMode);
document.querySelectorAll('[data-back-home]').forEach((button) => {
    button.addEventListener('click', voltarParaHome);
});

document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
        event.preventDefault();
        handleDashboardAction(button.dataset.dashboardAction);
    });
});

document.getElementById('daily-combination-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-daily-category]');
    if (button) showDailyRecommendation(button.dataset.dailyCategory);
});

document.addEventListener('perfumes-carregados', updateDailyRecommendations);
document.addEventListener('perfumes-carregados', updateDashboardInventory);
document.addEventListener('cremes-carregados', updateDailyRecommendations);
document.addEventListener('cremes-carregados', updateDashboardInventory);
document.addEventListener('decotes-carregados', updateDailyRecommendations);
document.addEventListener('decotes-carregados', updateDashboardInventory);
document.addEventListener('dashboard-catalogos-prontos', updateDailyRecommendations);
document.addEventListener('dashboard-weather-updated', updateDailyRecommendations);
document.addEventListener('dashboard-weather-updated', updateDashboardInventory);
document.addEventListener('favorites-updated', updateDashboardInventory);
document.addEventListener('comparison-updated', updateDashboardSummary);
document.addEventListener('dashboard-weather-updated', updateComparisonControls);
document.addEventListener('perfumes-carregados', updateComparisonControls);
document.addEventListener('cremes-carregados', updateComparisonControls);
document.addEventListener('decotes-carregados', updateComparisonControls);
document.getElementById('dashboard-inventory-search').addEventListener('input', updateDashboardInventory);
document.getElementById('dashboard-inventory-filter').addEventListener('change', updateDashboardInventory);
document.getElementById('comparison-product-add').addEventListener('click', () => {
    const selection = document.getElementById('comparison-product-select').value;
    const match = selection.match(/^(perfume|creme|acessorio):([1-9]\d*)$/);
    if (!match) {
        announceUtility('Escolha um produto do catálogo para adicionar à comparação.', true);
        return;
    }
    toggleProductComparison(match[1], Number(match[2]));
});
document.getElementById('comparison-clear').addEventListener('click', () => {
    comparisonProducts = [];
    updateComparisonControls();
    document.dispatchEvent(new Event('comparison-updated'));
});
setInterval(() => {
    if (temperaturaCarregada && dashboardContextKey() !== dashboardRecommendationContextKey) {
        updateDailyRecommendations();
        updateComparisonControls();
    }
}, 60_000);
document.getElementById('dashboard-date').textContent = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
}).format(new Date());
document.getElementById('dashboard-year').textContent = String(new Date().getFullYear());
updateDashboardInventory();

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
