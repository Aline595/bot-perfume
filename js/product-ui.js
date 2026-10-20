const FAVORITES_STORAGE_KEY = 'meu-consultor:favoritos';
let favoriteProducts = [];
let comparisonProducts = [];
let showingFavoritesType = null;
let sharedRecommendationShown = false;

try {
    const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
    if (Array.isArray(savedFavorites)) {
        favoriteProducts = savedFavorites.filter((item) =>
            item && ['perfume', 'creme'].includes(item.type) && Number.isSafeInteger(item.id) && item.id > 0
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
    panel.hidden = comparisonProducts.length === 0;
    panel.replaceChildren();
    if (!comparisonProducts.length) return;

    const title = document.createElement('h3');
    title.textContent = `Comparação (${comparisonProducts.length}/2)`;
    panel.append(title);
    if (comparisonProducts.length === 1) {
        const hint = document.createElement('p');
        hint.textContent = 'Escolha mais um produto da mesma categoria para comparar.';
        panel.append(hint);
    } else {
        const table = document.createElement('table');
        const fields = comparisonProducts[0].type === 'perfume'
            ? [
                ['Marca', (item) => item.marca],
                ['Vibes', (item) => listValues(item.vibe).join(', ')],
                ['Estações', (item) => listValues(item.clima).join(', ')],
                ['Período', (item) => listValues(item.periodo).join(', ')],
                ['Duração', (item) => item.duracao ? `${item.duracao} horas` : 'Não informado'],
                ['Temperatura ideal', (item) => item.temperatura_ideal || 'Não informada']
            ]
            : [
                ['Marca', (item) => item.marca],
                ['Estações', (item) => valoresCreme(item.clima).join(', ')],
                ['Período', (item) => valoresCreme(item.periodo).join(', ')],
                ['Fragrância', (item) => valoresCreme(item.fragrancia).join(', ')],
                ['Notas', (item) => valoresCreme(item.notas).join(', ')],
                ['Textura', (item) => valoresCreme(item.textura).join(', ')],
                ['Benefícios', (item) => valoresCreme(item.funcao_principal).join(', ')],
                ['Temperatura ideal', (item) =>
                    item.temperatura === '' || item.temperatura === undefined || item.temperatura === null
                        ? 'Não informada'
                        : `${item.temperatura}°C`
                ]
            ];
        const header = document.createElement('tr');
        header.append(document.createElement('th'));
        for (const selected of comparisonProducts) {
            const item = getProduct(selected.type, selected.id);
            const cell = document.createElement('th');
            cell.textContent = item?.nome || 'Produto';
            header.append(cell);
        }
        const thead = document.createElement('thead');
        thead.append(header);
        const tbody = document.createElement('tbody');
        for (const [label, getValue] of fields) {
            const row = document.createElement('tr');
            const heading = document.createElement('th');
            heading.scope = 'row';
            heading.textContent = label;
            row.append(heading);
            for (const selected of comparisonProducts) {
                const cell = document.createElement('td');
                const item = getProduct(selected.type, selected.id);
                cell.textContent = item ? String(getValue(item) || 'Não informado') : 'Indisponível';
                row.append(cell);
            }
            tbody.append(row);
        }
        table.append(thead, tbody);
        panel.append(table);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'secondary-action';
    close.textContent = 'Limpar comparação';
    close.addEventListener('click', () => {
        comparisonProducts = [];
        updateComparisonControls();
    });
    panel.append(close);
}

function getProduct(type, id) {
    return (type === 'perfume' ? perfumes : cremes).find((item) => item.id === id);
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
    } else {
        exibirCremeResultados(items, filtrosCreme(), 'Seus cremes favoritos');
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
            announceUtility(productIsFavorite(type, id) ? 'Produto salvo nos favoritos deste navegador.' : 'Produto removido dos favoritos.');
            if (showingFavoritesType === type && !productIsFavorite(type, id)) showFavorites(type);
        } else {
            announceUtility('Não foi possível salvar favoritos neste navegador.', true);
        }
    } else if (action === 'compare') {
        if (productIsCompared(type, id)) {
            comparisonProducts = comparisonProducts.filter((item) => !(item.type === type && item.id === id));
        } else if (comparisonProducts.length >= 2) {
            announceUtility('A comparação aceita até dois produtos. Remova um para escolher outro.', true);
        } else if (comparisonProducts.length && comparisonProducts[0].type !== type) {
            announceUtility('Compare produtos da mesma categoria.', true);
        } else {
            comparisonProducts.push({ type, id });
        }
        updateComparisonControls();
        announceUtility(comparisonProducts.length === 2
            ? 'Comparação atualizada.'
            : 'Seleção da comparação atualizada.');
    } else if (action === 'share') {
        shareProduct(type, id);
    }
});

document.getElementById('resultado')?.addEventListener('error', (event) => {
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
