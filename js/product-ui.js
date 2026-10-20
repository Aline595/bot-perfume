const FAVORITES_STORAGE_KEY = 'meu-consultor:favoritos';
let favoriteProducts = [];
let comparisonProducts = [];
let showingFavoritesType = null;
let sharedRecommendationShown = false;

try {
    const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
    if (Array.isArray(savedFavorites)) {
        favoriteProducts = savedFavorites.filter((item) =>
            item && ['perfume', 'creme', 'acessorio'].includes(item.type) &&
            Number.isSafeInteger(item.id) && item.id > 0
        );
    }
} catch (error) {
    console.warn('Não foi possível ler os favoritos deste navegador:', error);
}

function productIdentity(type, id) {
    return `${type}:${id}`;
}

function productIsFavorite(type, id) {
    return favoriteProducts.some((item) => item.type === type && item.id === id);
}

function productIsCompared(type, id) {
    return comparisonProducts.some((item) => item.type === type && item.id === id);
}

function productActionsHtml(type, id) {
    const favorite = productIsFavorite(type, id);
    const compared = productIsCompared(type, id);
    return `
        <div class="product-actions" aria-label="Ações do produto">
            <button type="button" class="secondary-action" data-product-action="favorite" data-type="${type}" data-id="${id}" aria-pressed="${favorite}">${favorite ? '♥ Salvo' : '♡ Favoritar'}</button>
            <button type="button" class="secondary-action" data-product-action="compare" data-type="${type}" data-id="${id}" aria-pressed="${compared}">${compared ? '✓ Comparando' : '⇄ Comparar'}</button>
            <button type="button" class="secondary-action" data-product-action="share" data-type="${type}" data-id="${id}">↗ Compartilhar</button>
        </div>
    `;
}

function comparisonActionHtml(type, id) {
    const compared = productIsCompared(type, id);
    return `<button type="button" class="secondary-action" data-product-action="compare" data-type="${type}" data-id="${id}" aria-pressed="${compared}">${compared ? '✓ Comparando' : '⇄ Comparar'}</button>`;
}

function toggleProductComparison(type, id) {
    if (productIsCompared(type, id)) {
        comparisonProducts = comparisonProducts.filter((item) => !(item.type === type && item.id === id));
    } else if (comparisonProducts.length >= 4) {
        announceUtility('A comparação aceita até quatro produtos. Remova um antes de adicionar outro.', true);
        return;
    } else {
        comparisonProducts.push({ type, id });
    }
    updateComparisonControls();
    document.dispatchEvent(new Event('comparison-updated'));
    announceUtility(comparisonProducts.length >= 2
        ? `Comparação atualizada com ${comparisonProducts.length} produtos.`
        : 'Seleção atualizada. Escolha pelo menos mais um produto para comparar.');
}

function productComparisonValue(type, item, field) {
    const values = (value) => (type === 'creme' ? valoresCreme(value) : listValues(value));
    if (field === 'Tipo') {
        return { perfume: 'Perfume', creme: 'Creme', acessorio: 'Acessório' }[type];
    }
    if (field === 'Marca') return type === 'acessorio' ? '—' : item.marca || 'Não informada';
    if (field === 'Temperatura ideal') {
        if (type === 'perfume') return item.temperatura_ideal || 'Não informada';
        if (type === 'creme') {
            return item.temperatura === '' || item.temperatura === null || item.temperatura === undefined
                ? 'Não informada'
                : `${item.temperatura}°C (referência)`;
        }
        return '—';
    }
    if (field === 'Adequação à temperatura') {
        if (!temperaturaCarregada) return 'Clima indisponível';
        if (document.getElementById('temperatura-atual')?.classList.contains('temperature-status-warning')) {
            return `Clima indisponível; usando ${temperaturaAmbienteAtual}°C como referência`;
        }
        if (type === 'perfume') {
            if (!item.temperatura_ideal) return 'Não avaliada: temperatura ideal não cadastrada';
            return perfumeMatchesTemperature(item, temperaturaAmbienteAtual)
                ? 'Adequado segundo a faixa cadastrada'
                : 'Fora da faixa de temperatura cadastrada';
        }
        if (type === 'creme') {
            if (item.temperatura === '' || item.temperatura === null || item.temperatura === undefined ||
                !Number.isFinite(Number(item.temperatura))) {
                return 'Não avaliada: temperatura ideal não cadastrada';
            }
            const matches = categoriaTemperaturaCreme(Number(item.temperatura)) ===
                categoriaTemperaturaCreme(temperaturaAmbienteAtual);
            return matches
                ? 'Adequado segundo a faixa de referência'
                : 'Fora da faixa de temperatura de referência';
        }
        return 'Não se aplica a acessórios';
    }
    if (field === 'Período') {
        if (type === 'acessorio') return '—';
        return values(item.periodo).join(', ') || 'Não informado';
    }
    if (field === 'Adequação ao período') {
        if (type === 'acessorio') return 'Não se aplica a acessórios';
        if (!values(item.periodo).length) return 'Não avaliada: período não cadastrado';
        return itemMatchesPeriod(item, periodoAtualDoDia())
            ? 'Adequado segundo o período cadastrado'
            : 'Fora do período cadastrado';
    }
    if (field === 'Ocasião') {
        return type === 'perfume' || type === 'creme'
            ? 'Ocasiões específicas não cadastradas'
            : '—';
    }
    if (field === 'Formato') {
        return type === 'acessorio' ? item.formato || 'Não informado' : '—';
    }
    if (field === 'Notas e perfil') {
        if (type === 'perfume') {
            return values(item.notas).length
                ? values(item.notas).join(', ')
                : values(item.vibe).length
                    ? `Perfil: ${values(item.vibe).join(', ')}`
                    : 'Não informado';
        }
        if (type === 'creme') {
            return [...values(item.notas), ...values(item.fragrancia)].join(', ') || 'Não informado';
        }
        return '—';
    }
    if (field === 'Duração') {
        if (type !== 'perfume') return '—';
        return item.duracao !== '' && item.duracao !== null && item.duracao !== undefined &&
            Number.isFinite(Number(item.duracao))
            ? `${item.duracao} horas (duração cadastrada)`
            : 'Não informada';
    }
    if (field === 'Fixação') return type === 'perfume' ? 'Não informada' : '—';
    if (field === 'Intensidade') {
        return type === 'perfume' ? item.intensidade || 'Não informada' : '—';
    }
    if (field === 'Projeção') return type === 'perfume' ? 'Não informada' : '—';
    if (field === 'Recomendação de colar') {
        return type === 'acessorio' ? item.colar_ideal || 'Não informada' : '—';
    }
    if (field === 'Recomendação de brincos') {
        return type === 'acessorio' ? item.brinco_ideal || 'Não informada' : '—';
    }
    if (field === 'Recomendação de penteado') {
        return type === 'acessorio' ? item.penteado_ideal || 'Não informado' : '—';
    }
    if (field === 'Textura') {
        return type === 'creme' ? values(item.textura).join(', ') || 'Não informada' : '—';
    }
    if (field === 'Benefícios') {
        return type === 'creme' ? values(item.funcao_principal).join(', ') || 'Não informados' : '—';
    }
    if (field === 'Estações') {
        return type === 'acessorio' ? '—' : values(item.clima).join(', ') || 'Não informadas';
    }
    return '—';
}

function findCombinationSuggestions(selectedItems) {
    const selectedPerfumes = selectedItems.filter(({ type }) => type === 'perfume');
    if (!selectedPerfumes.length || !cremesCarregados || !temperaturaCarregada ||
        document.getElementById('temperatura-atual')?.classList.contains('temperature-status-warning')) return [];
    const period = periodoAtualDoDia();
    const filters = {
        consideraTemperatura: true,
        consideraEstacao: false,
        temperatura: temperaturaAmbienteAtual,
        periodo: period,
        estacao: 'todos',
        busca: ''
    };
    return selectedPerfumes.flatMap(({ item: perfume }) => {
        if (!itemMatchesPeriod(perfume, period) ||
            !perfume.temperatura_ideal ||
            !perfumeMatchesTemperature(perfume, temperaturaAmbienteAtual)) return [];
        const selectedCreams = selectedItems
            .filter(({ type }) => type === 'creme')
            .map(({ item }) => item);
        const isCompatibleCream = (candidate) =>
            candidate.temperatura !== '' &&
            candidate.temperatura !== null &&
            candidate.temperatura !== undefined &&
            cremeCombina(candidate, filters);
        const cream = selectedCreams.find(isCompatibleCream) ||
            cremes.find((candidate) =>
                !selectedCreams.some((selected) => selected.id === candidate.id) &&
                isCompatibleCream(candidate)
            );
        return cream ? [{ perfume, cream }] : [];
    }).slice(0, 3);
}

function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteProducts));
        return true;
    } catch (error) {
        console.error('Não foi possível salvar os favoritos neste navegador:', error);
        return false;
    }
}

function updateFavoriteControls() {
    document.querySelectorAll('[data-product-action="favorite"]').forEach((button) => {
        const favorite = productIsFavorite(button.dataset.type, Number(button.dataset.id));
        button.setAttribute('aria-pressed', String(favorite));
        button.textContent = favorite ? '♥ Salvo' : '♡ Favoritar';
    });
    for (const type of ['perfume', 'creme']) {
        const button = document.querySelector(`[data-show-favorites="${type}"]`);
        const total = favoriteProducts.filter((item) => item.type === type).length;
        if (button) button.textContent = `♡ Ver favoritos${total ? ` (${total})` : ''}`;
    }
}

function updateComparisonControls() {
    document.querySelectorAll('[data-product-action="compare"]').forEach((button) => {
        const compared = productIsCompared(button.dataset.type, Number(button.dataset.id));
        button.setAttribute('aria-pressed', String(compared));
        button.textContent = compared ? '✓ Comparando' : '⇄ Comparar';
    });
    const panel = document.getElementById('comparador');
    if (!panel) return;
    const select = document.getElementById('comparison-product-select');
    const addButton = document.getElementById('comparison-product-add');
    if (select) {
        const selectedValue = select.value;
        select.replaceChildren(new Option('Selecione um produto do catálogo', ''));
        const productTypes = [
            ['perfume', 'Perfumes', perfumes],
            ['creme', 'Cremes', cremes],
            ['acessorio', 'Acessórios', decotes]
        ];
        for (const [type, label, catalog] of productTypes) {
            const available = catalog.filter((item) => !productIsCompared(type, item.id));
            if (!available.length) continue;
            const group = document.createElement('optgroup');
            group.label = label;
            for (const item of available) {
                const option = document.createElement('option');
                option.value = `${type}:${item.id}`;
                option.textContent = item.nome || item.formato || 'Produto';
                group.append(option);
            }
            select.append(group);
        }
        if ([...select.options].some((option) => option.value === selectedValue)) {
            select.value = selectedValue;
        }
    }
    if (addButton) addButton.disabled = comparisonProducts.length >= 4;
    const hint = document.getElementById('comparison-selection-hint');
    if (hint) {
        hint.textContent = comparisonProducts.length
            ? `${comparisonProducts.length} de 4 produtos selecionados. Você pode misturar categorias.`
            : 'Selecione pelo menos dois produtos para ver a comparação.';
    }
    panel.replaceChildren();
    const selectedItems = comparisonProducts
        .map((selected) => ({ ...selected, item: getProduct(selected.type, selected.id) }))
        .filter(({ item }) => item);
    if (!selectedItems.length) {
        const empty = document.createElement('div');
        empty.className = 'comparison-empty';
        const title = document.createElement('h2');
        title.textContent = 'Escolha os produtos que deseja comparar';
        const text = document.createElement('p');
        text.textContent = 'Selecione dois ou mais itens do catálogo acima. Você pode combinar perfumes, cremes e acessórios.';
        empty.append(title, text);
        panel.append(empty);
        renderComparisonInsights([]);
        return;
    }
    if (selectedItems.length === 1) {
        const hint = document.createElement('p');
        hint.className = 'comparison-one-selected';
        hint.textContent = 'Adicione mais um produto para ver a comparação lado a lado.';
        panel.append(hint);
    }
    const table = document.createElement('table');
    table.className = 'comparison-table';
    const fields = [
        ['Temperatura ideal', 'Temperatura ideal'],
        ['Fixação / duração', 'Fixação'],
        ['Projeção', 'Projeção'],
        ['Ocasião', 'Ocasião'],
        ['Notas principais', 'Notas e perfil']
    ];
    const headerRow = document.createElement('tr');
    const specsHeading = document.createElement('th');
    specsHeading.scope = 'col';
    specsHeading.textContent = 'Especificações';
    headerRow.append(specsHeading);
    for (const { type, item } of selectedItems) {
        const cell = document.createElement('th');
        cell.scope = 'col';
        const imageSource = type === 'acessorio'
            ? `assets/decotes/${encodeURIComponent(item.id)}.png`
            : item.imagem && /^https?:\/\//i.test(item.imagem)
                ? item.imagem
                : item.imagem && /^[A-Za-z0-9_-]+$/.test(item.imagem)
                    ? `https://lh3.googleusercontent.com/d/${item.imagem}`
                    : '';
        const image = document.createElement('div');
        image.className = 'comparison-product-image';
        image.innerHTML = productImageHtml(imageSource, item.nome || item.formato, type === 'perfume' ? '🌸' : type === 'creme' ? '🧴' : '📿');
        cell.append(image);
        const name = document.createElement('strong');
        name.textContent = item.nome || item.formato || 'Produto';
        const category = document.createElement('span');
        category.className = 'comparison-product-category';
        category.textContent = type === 'perfume' ? 'Perfume' : type === 'creme' ? 'Creme' : 'Acessório';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'comparison-remove';
        remove.textContent = 'Remover';
        remove.setAttribute('aria-label', `Remover ${item.nome || item.formato || 'produto'} da comparação`);
        remove.addEventListener('click', () => toggleProductComparison(type, item.id));
        cell.append(name, category, remove);
        headerRow.append(cell);
    }
    const thead = document.createElement('thead');
    thead.append(headerRow);
    const tbody = document.createElement('tbody');
    for (const [label, field] of fields) {
        const row = document.createElement('tr');
        const heading = document.createElement('th');
        heading.scope = 'row';
        heading.textContent = label;
        row.append(heading);
        for (const { type, item } of selectedItems) {
            const cell = document.createElement('td');
            const value = field === 'Fixação'
                ? type !== 'perfume'
                    ? '—'
                    : item.duracao !== '' && item.duracao !== null && item.duracao !== undefined &&
                        Number.isFinite(Number(item.duracao))
                        ? `${item.duracao} horas (duração cadastrada)`
                        : 'Não informada'
                : productComparisonValue(type, item, field);
            cell.textContent = String(value || 'Não informado');
            row.append(cell);
        }
        tbody.append(row);
    }
    const actionRow = document.createElement('tr');
    const actionHeading = document.createElement('th');
    actionHeading.scope = 'row';
    actionHeading.textContent = 'Ação';
    actionRow.append(actionHeading);
    for (const { type, item } of selectedItems) {
        const cell = document.createElement('td');
        const useButton = document.createElement('button');
        useButton.type = 'button';
        useButton.className = 'comparison-use-button';
        useButton.textContent = 'Usar hoje';
        useButton.addEventListener('click', () => useComparedProduct(type, item.id));
        cell.append(useButton);
        const suitability = document.createElement('span');
        const status = comparisonSuitability(type, item);
        suitability.className = `comparison-suitability ${status.compatible === true ? 'is-compatible' : status.compatible === false ? 'is-incompatible' : 'is-unknown'}`;
        suitability.textContent = status.label;
        cell.append(suitability);
        actionRow.append(cell);
    }
    tbody.append(actionRow);
    table.append(thead, tbody);
    panel.append(table);
    renderComparisonInsights(selectedItems);
}

function comparisonSuitability(type, item) {
    if (!temperaturaCarregada ||
        document.getElementById('temperatura-atual')?.classList.contains('temperature-status-warning')) {
        return { compatible: false, label: 'Clima indisponível' };
    }
    if (type === 'acessorio') return { compatible: true, label: 'Não se aplica ao acessório' };
    if (type === 'perfume' && !item.temperatura_ideal) {
        return { compatible: null, label: 'Temperatura ideal não informada' };
    }
    if (type === 'creme' && (item.temperatura === '' || item.temperatura === null ||
        item.temperatura === undefined || !Number.isFinite(Number(item.temperatura)))) {
        return { compatible: null, label: 'Temperatura ideal não informada' };
    }
    const temperatureMatches = type === 'perfume'
        ? perfumeMatchesTemperature(item, temperaturaAmbienteAtual)
        : item.temperatura !== '' && item.temperatura !== null && item.temperatura !== undefined &&
            Number.isFinite(Number(item.temperatura)) &&
            categoriaTemperaturaCreme(Number(item.temperatura)) === categoriaTemperaturaCreme(temperaturaAmbienteAtual);
    if (!temperatureMatches) {
        return { compatible: false, label: 'Inadequado para agora' };
    }
    if (!listValues(item.periodo).length) {
        return { compatible: null, label: 'Período de uso não informado' };
    }
    if (!itemMatchesPeriod(item, periodoAtualDoDia())) {
        return { compatible: false, label: 'Fora do período cadastrado' };
    }
    return { compatible: true, label: `Adequado para ${temperaturaAmbienteAtual}°C` };
}

function useComparedProduct(type, id) {
    const item = getProduct(type, id);
    if (!item) return;
    const category = type === 'perfume' ? 'perfumes' : type === 'creme' ? 'cremes' : 'colares';
    entrarNoApp(category);
    const result = document.getElementById('resultado');
    if (type === 'perfume') exibirCards([item], result, 'perfume', { heading: 'Sua escolha para hoje' });
    else if (type === 'creme') exibirCremeResultados([item], filtrosCreme(), 'Sua escolha para hoje');
    else exibirCards([item], result, 'decote', { heading: 'Sua escolha para hoje' });
    result.focus();
}

function renderComparisonInsights(selectedItems) {
    const container = document.getElementById('comparison-insight-cards');
    if (!container) return;
    container.replaceChildren();
    const makeCard = (icon, title, text, action) => {
        const card = document.createElement('article');
        card.className = 'comparison-insight-card';
        const iconElement = document.createElement('span');
        iconElement.className = 'comparison-insight-icon';
        iconElement.textContent = icon;
        const copy = document.createElement('div');
        const heading = document.createElement('strong');
        heading.textContent = title;
        const description = document.createElement('p');
        description.textContent = text;
        copy.append(heading, description);
        card.append(iconElement, copy);
        if (action) card.append(action);
        container.append(card);
    };
    const compatible = selectedItems.filter(({ type, item }) => comparisonSuitability(type, item).compatible &&
        type !== 'acessorio');
    makeCard('✦', 'Dica de comparação', compatible.length
        ? `${compatible.map(({ item }) => item.nome).join(' e ')} ${compatible.length === 1 ? 'está' : 'estão'} dentro das faixas cadastradas para o clima e período atuais.`
        : 'Confira as faixas de temperatura e período cadastradas; faltam dados para indicar um produto compatível agora.');

    const combo = findCombinationSuggestions(selectedItems)[0];
    if (combo) {
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'comparison-insight-action';
        addButton.textContent = productIsCompared('creme', combo.cream.id) ? 'Na comparação' : 'Adicionar';
        addButton.disabled = productIsCompared('creme', combo.cream.id);
        addButton.addEventListener('click', () => toggleProductComparison('creme', combo.cream.id));
        makeCard('◆', 'Sugestão de creme', `${combo.perfume.nome} + ${combo.cream.nome}: compatíveis com a temperatura e o período. Isso não indica aumento de fixação.`, addButton);
    } else {
        makeCard('◆', 'Sugestão de creme', 'Adicione um perfume para buscar cremes compatíveis com a temperatura e o período atuais.');
    }
    const climateText = !temperaturaCarregada
        ? 'Aguardando a consulta meteorológica para mostrar o contexto atual.'
        : document.getElementById('temperatura-atual')?.classList.contains('temperature-status-warning')
            ? `A consulta falhou. ${temperaturaAmbienteAtual}°C é apenas uma referência de fallback.`
            : `${temperaturaAmbienteAtual}°C agora. O índice UV não é consultado por esta aplicação.`;
    makeCard('☼', 'Contexto climático', climateText);
}

function getProduct(type, id) {
    const catalog = { perfume: perfumes, creme: cremes, acessorio: decotes }[type];
    return catalog?.find((item) => item.id === id);
}

function showFavorites(type) {
    const result = document.getElementById('resultado');
    const items = favoriteProducts
        .filter((favorite) => favorite.type === type)
        .map((favorite) => getProduct(type, favorite.id))
        .filter(Boolean);
    if (!items.length) {
        showingFavoritesType = type;
        result.innerHTML = `<div class="results-empty"><h3>Você ainda não tem favoritos nesta categoria</h3><p>Toque em “Favoritar” em um produto para guardá-lo neste navegador.</p></div>`;
        result.setAttribute('aria-busy', 'false');
        result.focus();
        return;
    }
    if (type === 'perfume') {
        exibirCards(items, result, 'perfume', { heading: 'Seus perfumes favoritos' });
    } else if (type === 'creme') {
        exibirCremeResultados(items, filtrosCreme(), 'Seus cremes favoritos');
    } else {
        exibirCards(items, result, 'decote', { heading: 'Seus acessórios favoritos' });
    }
    showingFavoritesType = type;
    result.focus();
}

async function shareProduct(type, id) {
    const item = getProduct(type, id);
    if (!item) return;
    const url = new URL('https://aline595.github.io/bot-perfume/');
    url.searchParams.set('recomendacao', productIdentity(type, id));
    const shareData = {
        title: item.nome,
        text: `Sugestão de ${type === 'perfume' ? 'perfume' : 'creme'}: ${item.nome}${item.marca ? ` — ${item.marca}` : ''}`,
        url: url.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            announceUtility('Recomendação compartilhada.');
        } else {
            try {
                if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                announceUtility('Link da recomendação copiado.');
            } catch {
                window.prompt('Copie o link da recomendação:', `${shareData.text}\n${shareData.url}`);
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Não foi possível compartilhar a recomendação:', error);
            announceUtility('Não foi possível compartilhar. Tente novamente.', true);
        }
    }
}

function announceUtility(message, isError = false) {
    const status = document.getElementById('recommendation-utility-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
}

document.getElementById('resultado')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;
    const type = button.dataset.type;
    const id = Number(button.dataset.id);
    const action = button.dataset.productAction;
    if (!getProduct(type, id)) return;
    if (action === 'favorite') {
        if (productIsFavorite(type, id)) {
            favoriteProducts = favoriteProducts.filter((item) => !(item.type === type && item.id === id));
        } else {
            favoriteProducts.push({ type, id });
        }
        if (saveFavorites()) {
            updateFavoriteControls();
            document.dispatchEvent(new Event('favorites-updated'));
            announceUtility(productIsFavorite(type, id) ? 'Produto salvo nos favoritos deste navegador.' : 'Produto removido dos favoritos.');
            if (showingFavoritesType === type && !productIsFavorite(type, id)) showFavorites(type);
        } else {
            announceUtility('Não foi possível salvar favoritos neste navegador.', true);
        }
    } else if (action === 'compare') {
        toggleProductComparison(type, id);
    } else if (action === 'share') {
        shareProduct(type, id);
    }
});

document.getElementById('dashboard-inventory-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;
    const { type, productAction } = button.dataset;
    const id = Number(button.dataset.id);
    if (!getProduct(type, id)) return;
    if (productAction === 'favorite') {
        favoriteProducts = favoriteProducts.filter((item) => !(item.type === type && item.id === id));
        if (saveFavorites()) {
            updateFavoriteControls();
            document.dispatchEvent(new Event('favorites-updated'));
            announceUtility('Produto removido dos favoritos.');
        } else {
            announceUtility('Não foi possível atualizar os favoritos neste navegador.', true);
        }
    } else if (productAction === 'compare') {
        toggleProductComparison(type, id);
    } else if (productAction === 'share') {
        shareProduct(type, id);
    }
});

document.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.hasAttribute('data-image-fallback')) return;
    image.hidden = true;
    image.nextElementSibling.hidden = false;
}, true);

document.querySelectorAll('[data-show-favorites]').forEach((button) => {
    button.addEventListener('click', () => showFavorites(button.dataset.showFavorites));
});

function showSharedRecommendation() {
    if (sharedRecommendationShown) return;
    const shared = new URLSearchParams(window.location.search).get('recomendacao');
    const match = shared?.match(/^(perfume|creme):([1-9]\d*)$/);
    if (!match) return;
    const [, type, rawId] = match;
    const item = getProduct(type, Number(rawId));
    if (!item) return;
    sharedRecommendationShown = true;
    entrarNoApp(type === 'perfume' ? 'perfumes' : 'cremes');
    const result = document.getElementById('resultado');
    if (type === 'perfume') {
        exibirCards([item], result, 'perfume', { heading: 'Recomendação compartilhada' });
    } else {
        exibirCremeResultados([item], filtrosCreme(), 'Recomendação compartilhada');
    }
    result.focus();
}

document.addEventListener('perfumes-carregados', showSharedRecommendation);
document.addEventListener('cremes-carregados', showSharedRecommendation);
document.getElementById('ano-atual').textContent = String(new Date().getFullYear());
updateFavoriteControls();

// Exibe cards de resultados (perfumes ou decotes)
function exibirCards(lista, container, tipo, options = {}) {
    if (container.id === 'resultado') showingFavoritesType = null;
    if (lista.length > 0) {
        const heading = options.heading
            ? `<h3 class="results-heading">${escapeHtml(options.heading)}</h3>`
            : '';
        const cards = lista.map(item => {
            const imagemSrc = item.imagem && /^https?:\/\//i.test(item.imagem)
                ? item.imagem
                : item.imagem
                    ? `https://lh3.googleusercontent.com/d/${item.imagem}`
                    : '';

            if (tipo === 'perfume') {
                const reasons = options.reasonsById?.get(item.id) || [];
                return `
                    <article class="card-perfume" data-product-type="perfume" data-product-id="${item.id}" aria-labelledby="nome-${item.id}">
                        ${productImageHtml(imagemSrc, item.nome, '🌸')}
                        <div>
                            <span class="perfume-marca">${escapeHtml(item.marca || '')}</span>
                            <strong id="nome-${item.id}">${escapeHtml(item.nome)}</strong>
                            ${item.intensidade ? `<br><span class="badge-intensity">${escapeHtml(item.intensidade)}</span>` : ''}
                            <p>
                                ✨ Vibe: ${escapeHtml(item.vibe ? (Array.isArray(item.vibe) ? item.vibe.join(', ') : item.vibe) : 'N/A')}
                            </p>
                            <div class="perfume-duracao">
                                <span>⏱️ Duração:</span>
                                <strong>${escapeHtml(item.duracao || 'N/A')}</strong>
                            </div>
                            ${item.temperatura_ideal ? `<div class="perfume-duracao"><span>🌡️ Temperatura:</span><strong>${escapeHtml(item.temperatura_ideal)}</strong></div>` : ''}
                            ${reasons.length ? `<p class="recommendation-reason"><strong>Por que combina:</strong> ${reasons.map(escapeHtml).join(' · ')}</p>` : ''}
                            ${productActionsHtml('perfume', item.id)}
                        </div>
                    </article>
                `;
            } else if (tipo === 'decote') {
                return `
                    <div class="card-perfume" role="article" aria-labelledby="formato-${item.id}">
                        ${productImageHtml(`assets/decotes/${encodeURIComponent(item.id)}.png`, `Sugestão de acessórios para ${item.formato}`, '📿')}
                        <div>
                            <strong id="formato-${escapeHtml(item.id)}">${escapeHtml(item.formato)}</strong>
                            <p>${escapeHtml(item.descricao)}</p>
                            <div class="perfume-duracao">
                                <span>📿 Colar Ideal:</span>
                                <strong>${escapeHtml(item.colar_ideal)}</strong>
                            </div>
                            <div class="perfume-duracao">
                                <span>💍 Brinco Ideal:</span>
                                <strong>${escapeHtml(item.brinco_ideal)}</strong>
                            </div>
                            <div class="perfume-duracao">
                                <span>💇‍♀️ Penteado Ideal:</span>
                                <strong>${escapeHtml(item.penteado_ideal)}</strong>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return '';
            }
        }).join('');
        container.innerHTML = `${heading}${cards}`;
    } else {
        const message = options.emptyMessage || '❌ Nada encontrado.';
        container.innerHTML = `<p class="results-empty" role="status">${escapeHtml(message)}</p>`;
    }
    container.setAttribute('aria-busy', 'false');
}

function productImageHtml(source, alt, fallbackIcon) {
    if (!source) return `<div class="product-image-placeholder" aria-label="Imagem não disponível">${fallbackIcon}</div>`;
    return `
        <div class="product-image-frame">
            <img src="${escapeHtml(source)}" class="img-perfume" alt="${escapeHtml(alt)}" loading="lazy" data-image-fallback>
            <div class="product-image-placeholder" aria-label="Imagem não disponível" hidden>${fallbackIcon}</div>
        </div>
    `;
}

// Mostra skeleton de carregamento
function mostrarSkeleton() {
    showingFavoritesType = null;
    const divResultado = document.getElementById('resultado');
    const skeletons = Array(3).fill(`
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
    
    divResultado.setAttribute('aria-busy', 'true');
    divResultado.innerHTML = `<p class="visually-hidden">Buscando recomendações...</p>${skeletons}`;
}
