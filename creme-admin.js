(() => {
    const form = document.getElementById('creme-admin-form');
    const list = document.getElementById('creme-admin-list');
    const status = document.getElementById('creme-admin-status');
    const password = document.getElementById('creme-admin-password');
    const passwordToggle = document.getElementById('creme-admin-password-toggle');
    const searchInput = document.getElementById('creme-admin-search');
    const count = document.getElementById('creme-admin-count');
    const validateButton = document.getElementById('creme-admin-validate');
    const exportButton = document.getElementById('creme-admin-export');
    const importButton = document.getElementById('creme-admin-import');
    const importFile = document.getElementById('creme-admin-import-file');
    const maintenanceStatus = document.getElementById('creme-admin-maintenance-status');
    const saveButton = document.getElementById('creme-admin-save');
    const cancelButton = document.getElementById('creme-admin-cancel');
    let editingId = null;

    function apiBase() {
        return CatalogAdmin.getApiBase();
    }

    function setStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    function updateList() {
        CatalogAdmin.renderList({
            list,
            count,
            items: cremes,
            query: searchInput.value,
            controls: [validateButton, exportButton, importButton],
            isLoaded: cremesCarregados,
            getSearchText: (cream) => `${cream.nome || ''} ${cream.marca || ''}`,
            getDescription: (cream) => `#${cream.id} — ${cream.nome || 'Sem nome'} (${cream.marca || 'Sem marca'})`,
            formatCount: (matches, total, hasQuery) => hasQuery
                ? `${matches} de ${total} cremes encontrados.`
                : `${total} ${total === 1 ? 'creme cadastrado' : 'cremes cadastrados'}.`,
            emptyMessage: 'Nenhum creme cadastrado.',
            noResultsMessage: 'Nenhum creme corresponde à busca. Tente outro nome ou marca.'
        });
    }

    function validateCream(cream) {
        const errors = [];
        for (const field of ['nome', 'marca']) {
            if (typeof cream[field] !== 'string' || !cream[field].trim()) {
                errors.push(`"${field}" é obrigatório`);
            }
        }
        for (const field of ['textura', 'fragrancia', 'notas', 'funcao_principal', 'clima', 'periodo']) {
            if (!Array.isArray(cream[field]) ||
                cream[field].some((value) => typeof value !== 'string' || !value.trim())) {
                errors.push(`"${field}" precisa conter textos válidos`);
            }
        }
        if (cream.temperatura !== '' &&
            (typeof cream.temperatura !== 'number' || !Number.isFinite(cream.temperatura))) {
            errors.push('"temperatura" precisa ser um número válido ou ficar em branco');
        }
        if (cream.imagem && !/^[A-Za-z0-9_-]+$/.test(cream.imagem)) {
            try {
                const imageUrl = new URL(cream.imagem);
                if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) {
                    errors.push('"imagem" precisa ser um ID do Google Drive ou URL HTTPS');
                }
            } catch {
                errors.push('"imagem" precisa ser um ID do Google Drive ou URL HTTPS');
            }
        }
        return errors;
    }

    function validateCatalog(catalog = cremes, allowUnchangedLegacy = false) {
        const errors = [];
        const ids = new Set();
        catalog.forEach((cream, index) => {
            if (!cream || typeof cream !== 'object' || Array.isArray(cream)) {
                errors.push(`Item ${index + 1}: registro inválido`);
                return;
            }
            if (!Number.isSafeInteger(cream.id) || cream.id < 1) {
                errors.push(`Item ${index + 1}: "id" precisa ser um inteiro positivo`);
            } else if (ids.has(cream.id)) {
                errors.push(`Item ${index + 1}: ID duplicado (${cream.id})`);
            } else {
                ids.add(cream.id);
            }
            const existing = allowUnchangedLegacy
                ? cremes.find((item) => item.id === cream.id)
                : null;
            const isUnchangedLegacy = existing &&
                stableSerialize(existing) === stableSerialize(cream);
            if (isUnchangedLegacy) return;
            validateCream(cream).forEach((error) => {
                errors.push(`Item ${index + 1} (ID ${cream.id ?? 'inválido'}): ${error}`);
            });
        });
        return errors;
    }

    function stableSerialize(value) {
        if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map((key) =>
                `${JSON.stringify(key)}:${stableSerialize(value[key])}`
            ).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    function splitList(value) {
        return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
    }

    function formData() {
        const values = new FormData(form);
        const temperatureText = String(values.get('temperatura')).trim();
        return {
            nome: String(values.get('nome')).trim(),
            marca: String(values.get('marca')).trim(),
            imagem: String(values.get('imagem')).trim(),
            textura: splitList(values.get('textura')),
            fragrancia: splitList(values.get('fragrancia')),
            notas: splitList(values.get('notas')),
            funcao_principal: splitList(values.get('funcao_principal')),
            temperatura: temperatureText ? Number(temperatureText) : '',
            clima: splitList(values.get('clima')),
            periodo: splitList(values.get('periodo'))
        };
    }

    function resetForm() {
        form.reset();
        editingId = null;
        saveButton.textContent = 'Adicionar creme';
        cancelButton.hidden = true;
    }

    function fillForm(cream) {
        editingId = cream.id;
        for (const field of ['nome', 'marca', 'imagem']) {
            form.elements[field].value = cream[field] || '';
        }
        for (const field of ['textura', 'fragrancia', 'notas', 'funcao_principal', 'clima', 'periodo']) {
            const value = cream[field];
            form.elements[field].value = Array.isArray(value) ? value.filter(Boolean).join(', ') : value || '';
        }
        form.elements.temperatura.value = Number.isFinite(Number(cream.temperatura))
            && cream.temperatura !== ''
            ? cream.temperatura
            : '';
        saveButton.textContent = 'Salvar alterações';
        cancelButton.hidden = false;
        form.elements.nome.focus();
    }

    async function mutate(url, method, body) {
        const result = await CatalogAdmin.sendMutation(url, method, body, password.value);
        cremes = result.cremes;
        document.dispatchEvent(new Event('cremes-carregados'));
        updateList();
    }

    CatalogAdmin.bindPasswordToggle(password, passwordToggle);
    searchInput.addEventListener('input', updateList);
    validateButton.addEventListener('click', () => {
        const errors = validateCatalog();
        CatalogAdmin.setMaintenanceStatus(
            maintenanceStatus,
            errors.length
                ? `Catálogo inválido: ${errors.join('; ')}.`
                : `Catálogo válido: ${cremes.length} ${cremes.length === 1 ? 'creme conferido' : 'cremes conferidos'}.`,
            errors.length > 0
        );
    });
    exportButton.addEventListener('click', () => {
        CatalogAdmin.downloadBackup(cremes, 'cremes');
        CatalogAdmin.setMaintenanceStatus(
            maintenanceStatus,
            `Cópia JSON exportada com ${cremes.length} ${cremes.length === 1 ? 'creme' : 'cremes'}.`
        );
    });

    importButton.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async () => {
        const file = importFile.files?.[0];
        importFile.value = '';
        if (!file) return;
        try {
            const backup = await CatalogAdmin.parseBackupFile(
                file,
                'cremes',
                (catalog) => validateCatalog(catalog, true)
            );
            if (!window.confirm(`Importar ${backup.length} cremes e substituir todo o catálogo atual? Esta alteração será compartilhada com todos os usuários.`)) return;

            const base = apiBase();
            if (!base) throw new Error('Configure a URL do backend em api-config.js para importar o catálogo.');
            if (!password.value) throw new Error('Informe a senha de administração antes de importar.');

            importButton.disabled = true;
            await mutate(`${base}/api/cremes`, 'PUT', backup);
            maintenanceStatus.className = 'perfume-admin-maintenance-status success';
            maintenanceStatus.textContent = `Backup importado: ${cremes.length} ${cremes.length === 1 ? 'creme restaurado' : 'cremes restaurados'}.`;
            setStatus('Catálogo de cremes restaurado do backup.');
        } catch (error) {
            CatalogAdmin.setMaintenanceStatus(
                maintenanceStatus,
                error.message || 'Não foi possível importar o backup.',
                true
            );
        } finally {
            importButton.disabled = !cremesCarregados;
        }
    });
    cancelButton.addEventListener('click', resetForm);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const base = apiBase();
        if (!base) {
            setStatus('Configure a URL do backend em api-config.js para habilitar alterações no Gist.', true);
            return;
        }
        const cream = formData();
        const errors = validateCream(cream);
        if (errors.length) {
            setStatus(`Corrija os dados antes de salvar: ${errors.join('; ')}.`, true);
            return;
        }

        saveButton.disabled = true;
        try {
            const url = editingId === null
                ? `${base}/api/cremes`
                : `${base}/api/cremes/${editingId}`;
            await mutate(url, editingId === null ? 'POST' : 'PUT', cream);
            setStatus(editingId === null ? 'Creme adicionado ao Gist.' : 'Creme atualizado no Gist.');
            resetForm();
        } catch (error) {
            setStatus(error.message, true);
        } finally {
            saveButton.disabled = false;
        }
    });

    list.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const cream = cremes.find((item) => item.id === Number(button.dataset.id));
        if (!cream) return;
        if (button.dataset.action === 'edit') {
            fillForm(cream);
            return;
        }
        const confirmed = window.confirm([
            'Confirme a exclusão deste creme do catálogo compartilhado:',
            '',
            `Nome: ${cream.nome || 'Sem nome'}`,
            `Marca: ${cream.marca || 'Sem marca'}`,
            `ID: ${cream.id}`,
            '',
            'Esta alteração será permanente para todos os usuários.',
            '',
            'Deseja excluir este creme?'
        ].join('\n'));
        if (!confirmed) return;

        button.disabled = true;
        try {
            const base = apiBase();
            if (!base) throw new Error('Configure a URL do backend em api-config.js.');
            await mutate(`${base}/api/cremes/${cream.id}`, 'DELETE');
            setStatus('Creme excluído do Gist.');
            if (editingId === cream.id) resetForm();
        } catch (error) {
            setStatus(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.addEventListener('cremes-carregados', updateList);
    document.addEventListener('cremes-carregamento-falhou', updateList);
    updateList();
})();
