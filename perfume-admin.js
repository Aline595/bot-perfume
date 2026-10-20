(() => {
    const form = document.getElementById('perfume-admin-form');
    const list = document.getElementById('perfume-admin-list');
    const status = document.getElementById('perfume-admin-status');
    const password = document.getElementById('perfume-admin-password');
    const passwordToggle = document.getElementById('perfume-admin-password-toggle');
    const searchInput = document.getElementById('perfume-admin-search');
    const count = document.getElementById('perfume-admin-count');
    const validateButton = document.getElementById('perfume-admin-validate');
    const exportButton = document.getElementById('perfume-admin-export');
    const importButton = document.getElementById('perfume-admin-import');
    const importFile = document.getElementById('perfume-admin-import-file');
    const maintenanceStatus = document.getElementById('perfume-admin-maintenance-status');
    const saveButton = document.getElementById('perfume-admin-save');
    const cancelButton = document.getElementById('perfume-admin-cancel');
    let editingId = null;

    function getApiBase() {
        return CatalogAdmin.getApiBase();
    }

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    CatalogAdmin.bindPasswordToggle(password, passwordToggle);
    searchInput.addEventListener('input', updateList);

    function updateList() {
        CatalogAdmin.renderList({
            list,
            count,
            items: perfumes,
            query: searchInput.value,
            controls: [validateButton, exportButton, importButton],
            isLoaded: perfumesCarregados,
            getSearchText: (perfume) => `${perfume.nome} ${perfume.marca}`,
            getDescription: (perfume) => `#${perfume.id} — ${perfume.nome} (${perfume.marca})`,
            formatCount: (matches, total, hasQuery) => hasQuery
                ? `${matches} de ${total} perfumes encontrados.`
                : `${total} ${total === 1 ? 'perfume cadastrado' : 'perfumes cadastrados'}.`,
            emptyMessage: 'Nenhum perfume cadastrado.',
            noResultsMessage: 'Nenhum perfume corresponde à busca. Tente outro nome ou marca.'
        });
    }

    function validatePerfume(perfume) {
        const errors = [];
        const requiredTextFields = ['nome', 'marca', 'imagem', 'intensidade'];
        requiredTextFields.forEach((field) => {
            if (typeof perfume[field] !== 'string' || !perfume[field].trim()) {
                errors.push(`"${field}" é obrigatório`);
            }
        });

        if (typeof perfume.imagem === 'string' && perfume.imagem.trim() &&
            !/^[A-Za-z0-9_-]+$/.test(perfume.imagem.trim())) {
            try {
                const imageUrl = new URL(perfume.imagem.trim());
                if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) {
                    errors.push('"imagem" precisa ser um ID do Google Drive ou uma URL HTTPS válida');
                }
            } catch {
                errors.push('"imagem" precisa ser um ID do Google Drive ou uma URL HTTPS válida');
            }
        }

        ['vibe', 'clima', 'periodo'].forEach((field) => {
            if (!Array.isArray(perfume[field]) || perfume[field].length === 0 ||
                perfume[field].some((value) => typeof value !== 'string' || !value.trim())) {
                errors.push(`"${field}" precisa conter ao menos um texto`);
            }
        });

        if (typeof perfume.duracao !== 'number' || !Number.isFinite(perfume.duracao) || perfume.duracao < 0) {
            errors.push('"duracao" precisa ser um número igual ou maior que zero');
        }

        if (perfume.temperatura_ideal !== undefined &&
            (typeof perfume.temperatura_ideal !== 'string' || !perfume.temperatura_ideal.trim())) {
            errors.push('"temperatura_ideal" precisa ser um texto não vazio quando informado');
        }

        return errors;
    }

    function validateCatalog(catalog = perfumes) {
        const errors = [];
        const ids = new Set();
        catalog.forEach((perfume, index) => {
            const label = `Item ${index + 1}`;
            if (!perfume || typeof perfume !== 'object' || Array.isArray(perfume)) {
                errors.push(`${label}: registro inválido`);
                return;
            }
            if (!Number.isSafeInteger(perfume.id) || perfume.id < 1) {
                errors.push(`${label}: "id" precisa ser um inteiro positivo`);
            } else if (ids.has(perfume.id)) {
                errors.push(`${label}: ID duplicado (${perfume.id})`);
            } else {
                ids.add(perfume.id);
            }
            validatePerfume(perfume).forEach((error) => {
                errors.push(`${label} (ID ${perfume.id ?? 'inválido'}): ${error}`);
            });
        });
        return errors;
    }

    validateButton.addEventListener('click', () => {
        const errors = validateCatalog();
        if (errors.length) {
            CatalogAdmin.setMaintenanceStatus(
                maintenanceStatus,
                `Catálogo inválido: ${errors.join('; ')}. Corrija os problemas antes de salvar alterações.`,
                true
            );
            return;
        }
        CatalogAdmin.setMaintenanceStatus(
            maintenanceStatus,
            `Catálogo válido: ${perfumes.length} ${perfumes.length === 1 ? 'perfume conferido' : 'perfumes conferidos'}.`
        );
    });

    exportButton.addEventListener('click', () => {
        CatalogAdmin.downloadBackup(perfumes, 'perfumes');
        CatalogAdmin.setMaintenanceStatus(
            maintenanceStatus,
            `Cópia JSON exportada com ${perfumes.length} ${perfumes.length === 1 ? 'perfume' : 'perfumes'}.`
        );
    });

    importButton.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async () => {
        const file = importFile.files?.[0];
        importFile.value = '';
        if (!file) return;
        try {
            const backup = await CatalogAdmin.parseBackupFile(file, 'perfumes', validateCatalog);
            if (!window.confirm(`Importar ${backup.length} perfumes e substituir todo o catálogo atual? Esta alteração será compartilhada com todos os usuários.`)) return;

            const apiBase = getApiBase();
            if (!apiBase) throw new Error('Configure a URL do backend em api-config.js para importar o catálogo.');
            if (!password.value) throw new Error('Informe a senha de administração antes de importar.');

            importButton.disabled = true;
            await sendMutation(`${apiBase}/api/perfumes`, 'PUT', backup);
            maintenanceStatus.textContent = `Backup importado: ${perfumes.length} ${perfumes.length === 1 ? 'perfume restaurado' : 'perfumes restaurados'}.`;
            maintenanceStatus.className = 'perfume-admin-maintenance-status success';
            showStatus('Catálogo de perfumes restaurado do backup.');
        } catch (error) {
            CatalogAdmin.setMaintenanceStatus(
                maintenanceStatus,
                error.message || 'Não foi possível importar o backup.',
                true
            );
        } finally {
            importButton.disabled = !perfumesCarregados;
        }
    });

    function resetForm() {
        form.reset();
        editingId = null;
        saveButton.textContent = 'Adicionar perfume';
        cancelButton.hidden = true;
    }

    function fillForm(perfume) {
        editingId = perfume.id;
        form.elements.nome.value = perfume.nome;
        form.elements.marca.value = perfume.marca;
        form.elements.imagem.value = perfume.imagem;
        form.elements.vibe.value = perfume.vibe.join(', ');
        form.elements.clima.value = perfume.clima.join(', ');
        form.elements.periodo.value = perfume.periodo.join(', ');
        form.elements.intensidade.value = perfume.intensidade;
        form.elements.duracao.value = perfume.duracao;
        form.elements.temperatura_ideal.value = perfume.temperatura_ideal || '';
        saveButton.textContent = 'Salvar alterações';
        cancelButton.hidden = false;
        form.elements.nome.focus();
    }

    function formData() {
        const values = new FormData(form);
        const splitList = (field) => String(values.get(field))
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const perfume = {
            nome: String(values.get('nome')).trim(),
            marca: String(values.get('marca')).trim(),
            imagem: String(values.get('imagem')).trim(),
            vibe: splitList('vibe'),
            clima: splitList('clima'),
            periodo: splitList('periodo'),
            intensidade: String(values.get('intensidade')).trim(),
            duracao: Number(values.get('duracao'))
        };
        const temperature = String(values.get('temperatura_ideal')).trim();
        if (temperature) perfume.temperatura_ideal = temperature;
        return perfume;
    }

    async function sendMutation(url, method, body) {
        const result = await CatalogAdmin.sendMutation(url, method, body, password.value);
        perfumes = result.perfumes;
        document.dispatchEvent(new Event('perfumes-carregados'));
        updateList();
        return result;
    }

    if (!getApiBase()) {
        showStatus('Configure a URL do backend em api-config.js para habilitar alterações no Gist.', true);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const apiBase = getApiBase();
        if (!apiBase) {
            showStatus('Configure a URL do backend em api-config.js para habilitar alterações no Gist.', true);
            return;
        }

        saveButton.disabled = true;
        try {
            const perfume = formData();
            const errors = validatePerfume(perfume);
            if (errors.length) {
                showStatus(`Corrija os dados antes de salvar: ${errors.join('; ')}.`, true);
                return;
            }
            const method = editingId === null ? 'POST' : 'PUT';
            const url = editingId === null
                ? `${apiBase}/api/perfumes`
                : `${apiBase}/api/perfumes/${editingId}`;
            await sendMutation(url, method, perfume);
            showStatus(editingId === null ? 'Perfume adicionado ao Gist.' : 'Perfume atualizado no Gist.');
            resetForm();
        } catch (error) {
            showStatus(error.message, true);
        } finally {
            saveButton.disabled = false;
        }
    });

    cancelButton.addEventListener('click', resetForm);

    list.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const perfume = perfumes.find((item) => item.id === Number(button.dataset.id));
        if (!perfume) return;
        if (button.dataset.action === 'edit') {
            fillForm(perfume);
            return;
        }
        const confirmMessage = [
            'Confirme a exclusão deste perfume do catálogo do Gist:',
            '',
            `Nome: ${perfume.nome}`,
            `Marca: ${perfume.marca}`,
            `ID: ${perfume.id}`,
            '',
            'Esta alteração será permanente no Gist compartilhado e afetará todos os usuários.',
            '',
            'Deseja excluir este perfume?'
        ].join('\n');
        if (!window.confirm(confirmMessage)) return;

        button.disabled = true;
        try {
            const apiBase = getApiBase();
            if (!apiBase) throw new Error('Configure a URL do backend em api-config.js.');
            await sendMutation(`${apiBase}/api/perfumes/${perfume.id}`, 'DELETE');
            showStatus('Perfume excluído do Gist.');
            if (editingId === perfume.id) resetForm();
        } catch (error) {
            showStatus(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.addEventListener('perfumes-carregados', updateList);
})();
