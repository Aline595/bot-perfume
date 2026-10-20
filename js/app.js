function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

let homeTransitionTimer;

function entrarNoApp(categoria) {
    document.body.classList.remove('comparison-view');
    document.body.classList.remove('management-view');
    document.body.classList.remove('favorites-view');
    document.body.classList.remove('accessories-view');
    document.getElementById('comparison-screen')?.setAttribute('hidden', '');
    document.getElementById('management-screen')?.setAttribute('hidden', '');
    document.getElementById('favorites-screen')?.setAttribute('hidden', '');
    document.getElementById('accessories-screen')?.setAttribute('hidden', '');
    document.body.classList.add('legacy-app-view');
    clearTimeout(homeTransitionTimer);
    window.scrollTo(0, 0);
    const splash = document.getElementById('tela-inicial');
    const container = document.querySelector('.container');

    splash.classList.add('fade-out');
    container.classList.remove('app-hidden');

    const btn = document.getElementById(`tab-${categoria}`);
    alternarAba(categoria, btn);
}

let managementPage = 1;
const MANAGEMENT_PAGE_SIZE = 3;
let activeManagementEditorType = null;

function managementProducts() {
    const products = [];
    if (perfumesCarregados) {
        perfumes.forEach((item) => products.push({ type: 'perfume', item }));
    }
    if (cremesCarregados) {
        cremes.forEach((item) => products.push({ type: 'creme', item }));
    }
    decotes.forEach((item) => {
        if (item.possui_no_guarda_roupa !== false) products.push({ type: 'acessorio', item });
    });
    return products;
}

function managementTemperature(type, item) {
    if (type === 'perfume') return item.temperatura_ideal || 'Qualquer temperatura';
    if (type === 'creme') {
        return item.temperatura !== '' && item.temperatura !== null &&
            item.temperatura !== undefined && Number.isFinite(Number(item.temperatura))
            ? `${item.temperatura}°C`
            : 'Não informada';
    }
    return 'Qualquer temperatura';
}

function managementTemperatureLevel(type, item) {
    if (type === 'acessorio') return 'any';
    if (type === 'creme') {
        const temperature = Number(item.temperatura);
        if (item.temperatura === '' || item.temperatura === null || item.temperatura === undefined ||
            !Number.isFinite(temperature)) return 'unknown';
        return temperature > 25 ? 'hot' : temperature <= 20 ? 'cool' : 'moderate';
    }

    const ideal = String(item.temperatura_ideal || '').toLocaleLowerCase('pt-BR');
    if (!ideal || ideal.includes('qualquer')) return 'any';
    const values = [...ideal.matchAll(/\d+(?:[.,]\d+)?/g)]
        .map(([value]) => Number(value.replace(',', '.')));
    if (!values.length) return 'unknown';

    const low = Math.min(...values);
    const high = Math.max(...values);
    if (ideal.includes('acima')) return low >= 25 ? 'hot' : 'moderate';
    if (ideal.includes('abaixo')) return high <= 20 ? 'cool' : 'moderate';
    if (values.length > 1) {
        if (high <= 20) return 'cool';
        if (low >= 25) return 'hot';
        return 'moderate';
    }
    return low > 25 ? 'hot' : low <= 20 ? 'cool' : 'moderate';
}

function createManagementTemperatureIcon(level) {
    const wrapper = document.createElement('span');
    wrapper.className = `management-temperature-icon is-${level}`;
    wrapper.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const paths = {
        hot: [
            'M8 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z',
            'M11 7v8',
            'M18 5V3',
            'm16.5 6.5-1.4 1.4',
            'M20 6.5l1.4 1.4'
        ],
        moderate: [
            'M8 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z',
            'M11 7v8'
        ],
        cool: [
            'M8 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z',
            'M11 7v8',
            'M19 4v6',
            'm16.5 5.5 5 3',
            'm21.5 5.5-5 3'
        ],
        any: [
            'M6.5 8.5c-1.7 0-3 1.2-3 3s1.3 3 3 3c2.4 0 4.6-6 7-6 1.7 0 3 1.2 3 3s-1.3 3-3 3c-2.4 0-4.6-6-7-6Z'
        ],
        unknown: [
            'M8 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z',
            'M11 7v8'
        ]
    };
    paths[level].forEach((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.append(path);
    });
    wrapper.append(svg);
    return wrapper;
}

function updateManagementPage(resetPage = false) {
    const tableBody = document.getElementById('management-product-list');
    if (!tableBody) return;
    if (resetPage) managementPage = 1;
    const query = document.getElementById('management-search').value.trim().toLocaleLowerCase('pt-BR');
    const category = document.getElementById('management-category').value;
    const matches = managementProducts().filter(({ type, item }) => {
        if (category !== 'todos' && type !== category) return false;
        const haystack = Object.entries(item)
            .flatMap(([key, value]) => key === 'imagem' ? [] : Array.isArray(value) ? value : [value])
            .filter((value) => typeof value === 'string' || typeof value === 'number')
            .join(' ')
            .toLocaleLowerCase('pt-BR');
        return !query || haystack.includes(query);
    });
    const pageCount = Math.max(1, Math.ceil(matches.length / MANAGEMENT_PAGE_SIZE));
    managementPage = Math.min(managementPage, pageCount);
    const first = (managementPage - 1) * MANAGEMENT_PAGE_SIZE;
    const visible = matches.slice(first, first + MANAGEMENT_PAGE_SIZE);
    tableBody.replaceChildren();
    if (!visible.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'management-empty';
        cell.textContent = query || category !== 'todos'
            ? 'Nenhum produto corresponde aos filtros.'
            : 'Os catálogos ainda estão carregando ou não possuem produtos.';
        row.append(cell);
        tableBody.append(row);
    }
    for (const { type, item } of visible) {
        const row = document.createElement('tr');
        row.dataset.type = type;
        row.dataset.id = String(item.id);

        const productCell = document.createElement('td');
        productCell.className = 'management-product-cell';
        const icon = document.createElement('span');
        icon.className = `management-product-icon is-${type}`;
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = type === 'perfume' ? '♧' : type === 'creme' ? '▣' : '◇';
        const identity = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = item.nome || item.formato || 'Produto sem nome';
        const description = document.createElement('small');
        description.textContent = type === 'acessorio'
            ? item.colar_ideal || 'Acessório do catálogo'
            : item.marca || (type === 'perfume' ? 'Perfume' : 'Creme');
        identity.append(name, description);
        productCell.append(icon, identity);

        const categoryCell = document.createElement('td');
        const categoryBadge = document.createElement('span');
        categoryBadge.className = `management-category-badge is-${type}`;
        categoryBadge.textContent = type === 'perfume' ? 'Perfume' : type === 'creme' ? 'Creme' : 'Acessório';
        categoryCell.append(categoryBadge);

        const temperatureCell = document.createElement('td');
        temperatureCell.className = 'management-temperature-cell';
        const temperatureLevel = managementTemperatureLevel(type, item);
        const thermometer = createManagementTemperatureIcon(temperatureLevel);
        const temperature = document.createElement('span');
        temperature.textContent = managementTemperature(type, item);
        temperatureCell.append(thermometer, temperature);

        const favoriteCell = document.createElement('td');
        const favoriteButton = document.createElement('button');
        const favorite = productIsFavorite(type, item.id);
        favoriteButton.type = 'button';
        favoriteButton.className = 'management-favorite';
        favoriteButton.dataset.managementAction = 'favorite';
        favoriteButton.setAttribute('aria-label', favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        favoriteButton.setAttribute('aria-pressed', String(favorite));
        favoriteButton.textContent = favorite ? '♥' : '♥';
        favoriteCell.append(favoriteButton);

        const actionsCell = document.createElement('td');
        actionsCell.className = 'management-actions';
        if (type === 'acessorio') {
            const note = document.createElement('span');
            note.className = 'management-readonly-note';
            note.textContent = 'Catálogo';
            actionsCell.append(note);
        } else {
            for (const [action, label, symbol] of [
                ['edit', `Editar ${item.nome || item.formato}`, '✎'],
                ['delete', `Excluir ${item.nome || item.formato}`, '▣']
            ]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `management-row-action is-${action}`;
                button.dataset.managementAction = action;
                button.setAttribute('aria-label', label);
                button.title = label;
                button.textContent = symbol;
                actionsCell.append(button);
            }
        }
        row.append(productCell, categoryCell, temperatureCell, favoriteCell, actionsCell);
        tableBody.append(row);
    }

    const start = matches.length ? first + 1 : 0;
    const end = Math.min(first + MANAGEMENT_PAGE_SIZE, matches.length);
    document.getElementById('management-pagination-status').textContent =
        `Mostrando ${start}–${end} de ${matches.length} produtos`;
    document.getElementById('management-page-number').textContent = String(managementPage);
    document.getElementById('management-previous').disabled = managementPage <= 1;
    document.getElementById('management-next').disabled = managementPage >= pageCount;
}

function mountManagementAdminForms() {
    const tools = document.getElementById('management-admin-tools');
    const perfumeAdmin = document.getElementById('perfume-admin-section');
    const creamAdmin = document.getElementById('creme-admin-section');
    if (!tools || !perfumeAdmin || !creamAdmin) return;
    tools.append(perfumeAdmin, creamAdmin);

    for (const [type, details] of [['perfume', perfumeAdmin], ['creme', creamAdmin]]) {
        const form = document.getElementById(`${type}-admin-form`);
        const passwordLabel = details.querySelector(`label[for="${type}-admin-password"]`);
        const passwordField = details.querySelector('.perfume-admin-password-field');
        const saveButton = document.getElementById(`${type}-admin-save`);
        const status = document.getElementById(`${type}-admin-status`);
        if (!form || !passwordLabel || !passwordField || !saveButton || !status) continue;

        details.open = true;
        details.classList.add('management-editor-admin');
        details.querySelector('summary')?.setAttribute('hidden', '');
        details.querySelector(':scope > p')?.setAttribute('hidden', '');

        const passwordGroup = document.createElement('div');
        passwordGroup.className = 'management-editor-auth';
        passwordGroup.append(passwordLabel, passwordField);
        details.insertBefore(passwordGroup, form);

        for (const label of [...form.querySelectorAll(':scope > label')]) {
            const input = label.nextElementSibling;
            if (!(input instanceof HTMLInputElement)) continue;
            const field = document.createElement('div');
            field.className = `management-editor-field management-editor-field--${input.name}`;
            if (input.name === 'temperatura' || input.name === 'temperatura_ideal') {
                field.classList.add('management-editor-field--temperature');
            }
            label.before(field);
            field.append(label);
            if (input.name === 'imagem') {
                const imageControl = document.createElement('div');
                const preview = document.createElement('img');
                const placeholder = document.createElement('span');
                imageControl.className = 'management-editor-image-control';
                preview.className = 'management-editor-image-preview';
                preview.alt = '';
                preview.hidden = true;
                placeholder.className = 'management-editor-image-placeholder';
                placeholder.setAttribute('aria-hidden', 'true');
                placeholder.textContent = type === 'perfume' ? '♧' : '▣';
                imageControl.append(preview, placeholder, input);
                field.append(imageControl);

                const updatePreview = () => {
                    const value = input.value.trim();
                    const source = /^https:\/\//i.test(value)
                        ? value
                        : /^[A-Za-z0-9_-]+$/.test(value)
                            ? `https://lh3.googleusercontent.com/d/${value}`
                            : '';
                    preview.hidden = !source;
                    placeholder.hidden = Boolean(source);
                    preview.src = source;
                };
                input.addEventListener('input', updatePreview);
                preview.addEventListener('error', () => {
                    preview.hidden = true;
                    placeholder.hidden = false;
                });
                updatePreview();
            } else {
                field.append(input);
            }
        }

        form.setAttribute('aria-label', `Dados do ${type === 'perfume' ? 'perfume' : 'creme'}`);
        saveButton.dataset.managementEditorType = type;
        saveButton.setAttribute('form', form.id);
        saveButton.hidden = true;
        document.getElementById('management-editor-footer').prepend(saveButton);
        const actions = form.querySelector('.perfume-admin-actions');
        if (actions) actions.hidden = true;
        document.getElementById('management-editor-feedback').append(status);

        details.querySelector('.perfume-admin-maintenance')?.setAttribute('hidden', '');
        details.querySelector('.perfume-admin-maintenance-status')?.setAttribute('hidden', '');
        details.querySelector(`label[for="${type}-admin-search"]`)?.setAttribute('hidden', '');
        details.querySelector(`#${type}-admin-search`)?.setAttribute('hidden', '');
        details.querySelector(`#${type}-admin-count`)?.setAttribute('hidden', '');
        details.querySelector(`#${type}-admin-list`)?.setAttribute('hidden', '');
    }
}

function openManagementEditorModal(type, isEditing) {
    const dialog = document.getElementById('management-editor-modal');
    const details = document.getElementById(`${type}-admin-section`);
    const title = document.getElementById('management-editor-title');
    const description = document.getElementById('management-editor-description');
    const category = document.getElementById('management-editor-category');
    const categoryValue = document.getElementById('management-editor-category-value');
    const feedback = document.getElementById('management-editor-feedback');
    const form = document.getElementById(`${type}-admin-form`);
    const auth = details?.querySelector('.management-editor-auth');
    if (!dialog || !details || !title || !description || !category || !categoryValue || !feedback || !form || !auth) return;

    activeManagementEditorType = type;
    document.querySelectorAll('.management-editor-admin').forEach((section) => {
        section.classList.toggle('is-active', section === details);
    });
    const fields = [...form.querySelectorAll(':scope > .management-editor-field')];
    const imageField = fields.find((field) => field.classList.contains('management-editor-field--imagem'));
    const nameField = fields.find((field) => field.classList.contains('management-editor-field--nome'));
    const temperatureField = fields.find((field) => field.classList.contains('management-editor-field--temperature'));
    const actions = form.querySelector('.perfume-admin-actions');
    form.append(
        imageField,
        nameField,
        category,
        temperatureField,
        ...fields.filter((field) => field !== imageField && field !== nameField && field !== temperatureField),
        actions
    );
    details.append(auth);
    title.textContent = isEditing ? 'Editar Produto' : 'Adicionar Produto';
    description.textContent = isEditing
        ? 'Atualize as especificações técnicas do seu item.'
        : 'Preencha as especificações do produto que deseja adicionar.';
    categoryValue.textContent = type === 'perfume' ? 'Perfume' : 'Creme';
    document.querySelectorAll('.management-editor-footer [data-management-editor-type]').forEach((button) => {
        button.hidden = button.dataset.managementEditorType !== type;
    });
    document.getElementById(`${type}-admin-save`).textContent = isEditing
        ? 'Atualizar Produto'
        : 'Adicionar Produto';
    feedback.querySelectorAll('[role="status"]').forEach((status) => {
        status.textContent = '';
        status.classList.remove('error');
    });
    if (!dialog.open) dialog.showModal();
}

function openManagementEditor(type, id = null) {
    if (type === 'acessorio') {
        announceUtility('Acessórios são recomendações de catálogo e não podem ser editados nesta tela.', true);
        return;
    }
    const isCream = type === 'creme';
    const details = document.getElementById(isCream ? 'creme-admin-section' : 'perfume-admin-section');
    const form = document.getElementById(isCream ? 'creme-admin-form' : 'perfume-admin-form');
    const search = document.getElementById(isCream ? 'creme-admin-search' : 'perfume-admin-search');
    const list = document.getElementById(isCream ? 'creme-admin-list' : 'perfume-admin-list');
    details.open = true;
    if (id === null) {
        form.reset();
        document.getElementById(isCream ? 'creme-admin-cancel' : 'perfume-admin-cancel').click();
        form.querySelector('input[name="imagem"]')?.dispatchEvent(new Event('input'));
        openManagementEditorModal(type, false);
        form.querySelector('input[name="nome"]')?.focus();
        return;
    }
    const item = getProduct(type, id);
    if (!item) return;
    search.value = item.nome || '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const editButton = list.querySelector(`button[data-action="edit"][data-id="${id}"]`);
    if (!editButton) {
        announceUtility('Não foi possível localizar o produto no formulário de edição.', true);
        return;
    }
    editButton.click();
    form.querySelector('input[name="imagem"]')?.dispatchEvent(new Event('input'));
    openManagementEditorModal(type, true);
}

function showManagementScreen() {
    setDashboardNavActive('manage');
    document.body.classList.remove('legacy-app-view');
    document.body.classList.remove('comparison-view');
    document.body.classList.remove('favorites-view');
    document.body.classList.remove('accessories-view');
    document.body.classList.add('management-view');
    document.getElementById('comparison-screen')?.setAttribute('hidden', '');
    document.getElementById('favorites-screen')?.setAttribute('hidden', '');
    document.getElementById('accessories-screen')?.setAttribute('hidden', '');
    document.getElementById('management-screen')?.removeAttribute('hidden');
    clearTimeout(homeTransitionTimer);
    document.getElementById('tela-inicial').classList.remove('fade-out');
    document.querySelector('.container')?.classList.add('app-hidden');
    updateManagementPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setDashboardNavActive('home');
    if (container.classList.contains('app-hidden')) return;

    homeTransitionTimer = setTimeout(() => {
        container.classList.add('app-hidden');
        document.body.classList.remove('legacy-app-view');
        document.getElementById('resultado').innerHTML = '';
        window.scrollTo(0, 0);
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

function updateAccessoriesScreen() {
    const grid = document.getElementById('accessories-grid');
    if (!grid) return;

    const items = decotes.filter((item) => item.possui_no_guarda_roupa !== false);
    grid.replaceChildren();
    if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'accessories-empty';
        empty.setAttribute('role', 'status');
        empty.textContent = 'Não há sugestões de decotes disponíveis no catálogo.';
        grid.append(empty);
        return;
    }

    for (const item of items) {
        const card = document.createElement('article');
        card.className = 'accessory-card';

        const icon = document.createElement('span');
        icon.className = 'accessory-card-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = /v\b/i.test(item.formato) ? 'V' : /quadrad/i.test(item.formato) ? '■' : '♟';

        const imageFrame = document.createElement('div');
        imageFrame.className = 'accessory-card-image';
        const image = document.createElement('img');
        image.src = `assets/decotes/${encodeURIComponent(item.id)}.png`;
        image.alt = `Sugestão de acessórios para ${item.formato}`;
        image.loading = 'lazy';
        image.setAttribute('data-image-fallback', '');
        const fallback = document.createElement('span');
        fallback.className = 'accessory-card-image-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = '📿';
        fallback.hidden = true;
        imageFrame.append(image, fallback);

        const title = document.createElement('h2');
        title.textContent = item.formato;
        const description = document.createElement('p');
        description.className = 'accessory-card-description';
        description.textContent = item.descricao || 'Sugestões para harmonizar com este decote.';
        const recommendations = document.createElement('ul');
        recommendations.className = 'accessory-card-recommendations';
        for (const text of [item.colar_ideal, item.brinco_ideal].filter(Boolean)) {
            const recommendation = document.createElement('li');
            recommendation.textContent = text;
            recommendations.append(recommendation);
        }

        const actions = document.createElement('div');
        actions.className = 'accessory-card-actions';
        const favoriteButton = document.createElement('button');
        const isFavorite = productIsFavorite('acessorio', item.id);
        favoriteButton.type = 'button';
        favoriteButton.className = 'accessory-card-favorite';
        favoriteButton.dataset.productAction = 'favorite';
        favoriteButton.dataset.type = 'acessorio';
        favoriteButton.dataset.id = String(item.id);
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));
        favoriteButton.textContent = isFavorite ? '♥ Favorito' : '♡ Salvar favorito';
        actions.append(favoriteButton);

        const compareButton = document.createElement('button');
        const isCompared = productIsCompared('acessorio', item.id);
        compareButton.type = 'button';
        compareButton.className = 'accessory-card-compare';
        compareButton.dataset.productAction = 'compare';
        compareButton.dataset.type = 'acessorio';
        compareButton.dataset.id = String(item.id);
        compareButton.setAttribute('aria-pressed', String(isCompared));
        compareButton.textContent = isCompared ? '✓ Na comparação' : '⇄ Comparar';
        actions.append(compareButton);

        card.append(icon, imageFrame, title, description, recommendations, actions);
        grid.append(card);
    }
}

let favoritesCategory = 'todos';

function updateFavoritesScreen() {
    const grid = document.getElementById('favorites-grid');
    const temperature = document.getElementById('favorites-temperature');
    const location = document.getElementById('favorites-location');
    const tip = document.getElementById('favorites-tip-text');
    if (!grid || !temperature || !location || !tip) return;

    temperature.textContent = temperaturaCarregada ? `${temperaturaAmbienteAtual}°C` : '--°C';
    location.textContent = document.getElementById('dashboard-location')?.textContent || 'Clima local';
    tip.textContent = document.getElementById('dashboard-weather-message')?.textContent ||
        'As sugestões de clima aparecerão aqui quando os dados estiverem disponíveis.';

    const items = favoriteProducts
        .filter(({ type }) => favoritesCategory === 'todos' || type === favoritesCategory)
        .map(({ type, id }) => ({ type, item: getProduct(type, id) }))
        .filter(({ item }) => Boolean(item));

    grid.replaceChildren();
    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'favorites-empty';
        const mark = document.createElement('span');
        mark.className = 'favorites-empty-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '+';
        const title = document.createElement('h2');
        title.textContent = favoriteProducts.length ? 'Nenhum favorito nesta categoria' : 'Adicione seu primeiro favorito';
        const description = document.createElement('p');
        description.textContent = favoriteProducts.length
            ? 'Escolha outra categoria para ver seus itens salvos.'
            : 'Navegue pelo catálogo e salve os produtos que combinam com você.';
        const catalogButton = document.createElement('button');
        catalogButton.type = 'button';
        catalogButton.className = 'favorites-empty-action';
        catalogButton.dataset.dashboardAction = 'catalog';
        catalogButton.textContent = 'Ir para o Catálogo';
        empty.append(mark, title, description, catalogButton);
        grid.append(empty);
        return;
    }

    const period = periodoAtualDoDia();
    const creamFilters = {
        consideraTemperatura: true,
        consideraEstacao: false,
        temperatura: temperaturaAmbienteAtual,
        periodo: period,
        estacao: 'todos',
        busca: ''
    };
    const climateIsReliable = temperaturaCarregada &&
        !document.getElementById('temperatura-atual')?.classList.contains('temperature-status-warning');
    for (const { type, item } of items) {
        const card = document.createElement('article');
        card.className = `favorites-card is-${type}`;
        card.dataset.type = type;
        card.dataset.id = String(item.id);

        const imageFrame = document.createElement('div');
        imageFrame.className = 'favorites-card-image';
        const image = document.createElement('img');
        const fallback = document.createElement('span');
        fallback.className = 'favorites-card-image-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = type === 'perfume' ? '🌸' : type === 'creme' ? '🧴' : '📿';
        const imageValue = item.imagem;
        const source = type === 'acessorio'
            ? `assets/decotes/${encodeURIComponent(item.id)}.png`
            : imageValue && /^https?:\/\//i.test(imageValue)
                ? imageValue
                : imageValue && /^[A-Za-z0-9_-]+$/.test(imageValue)
                    ? `https://lh3.googleusercontent.com/d/${imageValue}`
                    : '';
        image.alt = item.nome || item.formato || 'Produto favorito';
        image.loading = 'lazy';
        image.setAttribute('data-image-fallback', '');
        image.hidden = !source;
        if (source) image.src = source;
        imageFrame.append(image, fallback);

        const favoriteButton = document.createElement('button');
        favoriteButton.type = 'button';
        favoriteButton.className = 'favorites-card-heart';
        favoriteButton.dataset.productAction = 'favorite';
        favoriteButton.dataset.type = type;
        favoriteButton.dataset.id = String(item.id);
        favoriteButton.setAttribute('aria-label', `Remover ${item.nome || item.formato} dos favoritos`);
        favoriteButton.setAttribute('aria-pressed', 'true');
        favoriteButton.textContent = '♥';
        imageFrame.append(favoriteButton);

        const body = document.createElement('div');
        body.className = 'favorites-card-body';
        const title = document.createElement('h2');
        title.textContent = item.nome || item.formato || 'Produto favorito';
        const metadata = document.createElement('p');
        metadata.textContent = type === 'acessorio'
            ? 'Acessório'
            : `${type === 'perfume' ? 'Perfume' : 'Creme'} · ${item.marca || 'Marca não informada'}`;
        const ideal = document.createElement('span');
        ideal.className = 'favorites-card-ideal';
        const matchesToday = climateIsReliable && (type === 'perfume'
            ? Boolean(item.temperatura_ideal) &&
                perfumeMatchesTemperature(item, temperaturaAmbienteAtual) &&
                itemMatchesPeriod(item, period)
            : type === 'creme'
                ? item.temperatura !== '' && item.temperatura !== null && item.temperatura !== undefined &&
                    Number.isFinite(Number(item.temperatura)) && cremeCombina(item, creamFilters)
                : false);
        ideal.classList.toggle('is-today', matchesToday);
        ideal.textContent = matchesToday ? 'Ideal p/ Hoje' : 'Favorito';
        const climate = document.createElement('p');
        climate.className = 'favorites-card-climate';
        climate.textContent = managementTemperature(type, item);
        const actions = document.createElement('div');
        actions.className = 'favorites-card-actions';
        if (type !== 'acessorio') {
            for (const [action, label, symbol] of [
                ['compare', 'Comparar', '⇄'],
                ['share', 'Compartilhar', '↗']
            ]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'favorites-card-action';
                button.dataset.productAction = action;
                button.dataset.type = type;
                button.dataset.id = String(item.id);
                button.textContent = `${symbol} ${label}`;
                actions.append(button);
            }
        } else {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'favorites-card-action';
            button.dataset.productAction = 'compare';
            button.dataset.type = type;
            button.dataset.id = String(item.id);
            button.textContent = '⇄ Comparar';
            actions.append(button);
        }
        body.append(title, metadata, ideal, climate, actions);
        card.append(imageFrame, body);
        grid.append(card);
    }

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'favorites-add-card';
    addCard.dataset.dashboardAction = 'catalog';
    const addIcon = document.createElement('span');
    addIcon.className = 'favorites-add-mark';
    addIcon.setAttribute('aria-hidden', 'true');
    addIcon.textContent = '+';
    const addTitle = document.createElement('strong');
    addTitle.textContent = 'Adicionar novo favorito';
    const addDescription = document.createElement('span');
    addDescription.textContent = 'Explore o catálogo e salve outro item especial.';
    addCard.append(addIcon, addTitle, addDescription);
    grid.append(addCard);
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
        const favorite = productIsFavorite(type, item.id);
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
        if (type === 'acessorio' && !compatible && !favorite) return;
        if (type === 'perfume' && item.id === heroPerfumeId && !favorite && !recent) return;
        if (type === 'creme' && item.id === heroCreamId && !favorite && !recent) return;
        if (type === 'acessorio' && item.id === heroAccessoryId && !favorite &&
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
        document.body.classList.remove('management-view');
        document.body.classList.remove('favorites-view');
        document.body.classList.remove('accessories-view');
        document.getElementById('comparison-screen')?.setAttribute('hidden', '');
        document.getElementById('management-screen')?.setAttribute('hidden', '');
        document.getElementById('favorites-screen')?.setAttribute('hidden', '');
        document.getElementById('accessories-screen')?.setAttribute('hidden', '');
        setDashboardNavActive('home');
        voltarParaHome();
        return;
    }
    if (action === 'manage') {
        showManagementScreen();
        return;
    }
    if (action === 'compare') {
        setDashboardNavActive('compare');
        document.body.classList.remove('legacy-app-view');
        document.body.classList.remove('management-view');
        document.body.classList.remove('favorites-view');
        document.body.classList.remove('accessories-view');
        document.getElementById('management-screen')?.setAttribute('hidden', '');
        document.getElementById('favorites-screen')?.setAttribute('hidden', '');
        document.getElementById('accessories-screen')?.setAttribute('hidden', '');
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
        setDashboardNavActive('favorites');
        document.body.classList.remove('legacy-app-view', 'management-view', 'comparison-view');
        document.body.classList.remove('accessories-view');
        document.getElementById('management-screen')?.setAttribute('hidden', '');
        document.getElementById('comparison-screen')?.setAttribute('hidden', '');
        document.getElementById('accessories-screen')?.setAttribute('hidden', '');
        document.getElementById('favorites-screen')?.removeAttribute('hidden');
        document.body.classList.add('favorites-view');
        clearTimeout(homeTransitionTimer);
        document.getElementById('tela-inicial')?.classList.remove('fade-out');
        document.querySelector('.container')?.classList.add('app-hidden');
        updateFavoritesScreen();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    if (action === 'accessories') {
        setDashboardNavActive('accessories');
        document.body.classList.remove('legacy-app-view', 'management-view', 'comparison-view', 'favorites-view');
        document.getElementById('management-screen')?.setAttribute('hidden', '');
        document.getElementById('comparison-screen')?.setAttribute('hidden', '');
        document.getElementById('favorites-screen')?.setAttribute('hidden', '');
        document.getElementById('accessories-screen')?.removeAttribute('hidden');
        document.body.classList.add('accessories-view');
        clearTimeout(homeTransitionTimer);
        document.getElementById('tela-inicial')?.classList.remove('fade-out');
        document.querySelector('.container')?.classList.add('app-hidden');
        updateAccessoriesScreen();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    if (action === 'accessories-inventory') {
        showManagementScreen();
        document.getElementById('management-category').value = 'acessorio';
        updateManagementPage(true);
        return;
    }
    if (action === 'catalog') {
        setDashboardNavActive('catalog');
        entrarNoApp('perfumes');
        return;
    }
    if (action === 'add-product') {
        const selectedType = document.getElementById('dashboard-inventory-filter')?.value;
        showManagementScreen();
        const type = selectedType === 'creme' ? 'creme' : 'perfume';
        document.getElementById('management-category').value = type;
        updateManagementPage(true);
        openManagementEditor(type);
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

mountManagementAdminForms();

const managementEditorModal = document.getElementById('management-editor-modal');
document.getElementById('management-editor-close').addEventListener('click', () => {
    managementEditorModal.close();
});
document.getElementById('management-editor-cancel').addEventListener('click', () => {
    managementEditorModal.close();
});
managementEditorModal.addEventListener('click', (event) => {
    if (event.target === managementEditorModal) managementEditorModal.close();
});
managementEditorModal.addEventListener('cancel', (event) => {
    event.preventDefault();
    managementEditorModal.close();
});
managementEditorModal.addEventListener('close', () => {
    if (activeManagementEditorType) {
        document.getElementById(`${activeManagementEditorType}-admin-cancel`).click();
        document.getElementById(`${activeManagementEditorType}-admin-section`).classList.remove('is-active');
    }
    activeManagementEditorType = null;
});
document.addEventListener('management-editor-saved', () => {
    if (managementEditorModal.open) managementEditorModal.close();
});

document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-dashboard-action]');
    if (!button) return;
    event.preventDefault();
    handleDashboardAction(button.dataset.dashboardAction);
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
document.addEventListener('favorites-updated', updateManagementPage);
document.addEventListener('favorites-updated', updateFavoritesScreen);
document.addEventListener('favorites-updated', updateAccessoriesScreen);
document.addEventListener('comparison-updated', updateDashboardSummary);
document.addEventListener('dashboard-weather-updated', updateComparisonControls);
document.addEventListener('dashboard-weather-updated', updateFavoritesScreen);
document.addEventListener('perfumes-carregados', updateComparisonControls);
document.addEventListener('cremes-carregados', updateComparisonControls);
document.addEventListener('decotes-carregados', updateComparisonControls);
document.addEventListener('perfumes-carregados', updateFavoritesScreen);
document.addEventListener('cremes-carregados', updateFavoritesScreen);
document.addEventListener('decotes-carregados', updateFavoritesScreen);
document.addEventListener('decotes-carregados', updateAccessoriesScreen);
document.addEventListener('perfumes-carregados', updateManagementPage);
document.addEventListener('cremes-carregados', updateManagementPage);
document.addEventListener('decotes-carregados', updateManagementPage);
document.getElementById('dashboard-inventory-search').addEventListener('input', updateDashboardInventory);
document.getElementById('dashboard-inventory-filter').addEventListener('change', updateDashboardInventory);
document.querySelector('.favorites-filters')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorites-filter]');
    if (!button) return;
    favoritesCategory = button.dataset.favoritesFilter;
    document.querySelectorAll('[data-favorites-filter]').forEach((filter) => {
        const isActive = filter === button;
        filter.classList.toggle('active', isActive);
        filter.setAttribute('aria-pressed', String(isActive));
    });
    updateFavoritesScreen();
});
document.getElementById('favorites-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;
    const { type, productAction } = button.dataset;
    const id = Number(button.dataset.id);
    if (!getProduct(type, id)) return;
    if (productAction === 'favorite') {
        const previousFavorites = favoriteProducts;
        favoriteProducts = favoriteProducts.filter((favorite) => !(favorite.type === type && favorite.id === id));
        if (!saveFavorites()) {
            favoriteProducts = previousFavorites;
            announceUtility('Não foi possível salvar favoritos neste navegador.', true);
            return;
        }
        updateFavoriteControls();
        document.dispatchEvent(new Event('favorites-updated'));
        announceUtility('Produto removido dos favoritos.');
    } else if (productAction === 'compare') {
        toggleProductComparison(type, id);
    } else if (productAction === 'share') {
        shareProduct(type, id);
    }
});
document.getElementById('accessories-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;
    const { type, productAction } = button.dataset;
    const id = Number(button.dataset.id);
    if (!getProduct(type, id)) return;
    if (productAction === 'favorite') {
        const wasFavorite = productIsFavorite(type, id);
        const previousFavorites = favoriteProducts;
        favoriteProducts = wasFavorite
            ? favoriteProducts.filter((favorite) => !(favorite.type === type && favorite.id === id))
            : [...favoriteProducts, { type, id }];
        if (!saveFavorites()) {
            favoriteProducts = previousFavorites;
            announceUtility('Não foi possível salvar favoritos neste navegador.', true);
            return;
        }
        updateFavoriteControls();
        document.dispatchEvent(new Event('favorites-updated'));
        announceUtility(wasFavorite ? 'Acessório removido dos favoritos.' : 'Acessório salvo nos favoritos.');
    } else if (productAction === 'compare') {
        toggleProductComparison(type, id);
        updateAccessoriesScreen();
    }
});
document.getElementById('management-search').addEventListener('input', () => updateManagementPage(true));
document.getElementById('management-category').addEventListener('change', () => updateManagementPage(true));
document.getElementById('management-nav-add').addEventListener('click', () => {
    const type = document.getElementById('management-category').value;
    openManagementEditor(type === 'creme' ? 'creme' : 'perfume');
});
document.getElementById('management-previous').addEventListener('click', () => {
    managementPage = Math.max(1, managementPage - 1);
    updateManagementPage();
});
document.getElementById('management-next').addEventListener('click', () => {
    managementPage += 1;
    updateManagementPage();
});
document.getElementById('management-product-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-management-action]');
    const row = button?.closest('tr[data-type][data-id]');
    if (!button || !row) return;
    const { type } = row.dataset;
    const id = Number(row.dataset.id);
    if (button.dataset.managementAction === 'favorite') {
        if (productIsFavorite(type, id)) {
            favoriteProducts = favoriteProducts.filter((favorite) => !(favorite.type === type && favorite.id === id));
        } else {
            favoriteProducts.push({ type, id });
        }
        if (!saveFavorites()) {
            announceUtility('Não foi possível salvar os favoritos neste navegador.', true);
            return;
        }
        updateManagementPage();
        updateFavoriteControls();
        document.dispatchEvent(new Event('favorites-updated'));
        announceUtility(productIsFavorite(type, id) ? 'Produto adicionado aos favoritos.' : 'Produto removido dos favoritos.');
    } else {
        openManagementEditor(type, id);
    }
});
document.getElementById('management-admin-tools').addEventListener('submit', () => {
    window.setTimeout(updateManagementPage, 0);
});
document.getElementById('management-admin-tools').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="delete"]')) window.setTimeout(updateManagementPage, 0);
});
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
updateManagementPage();

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
