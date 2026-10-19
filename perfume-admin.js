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
    const maintenanceStatus = document.getElementById('perfume-admin-maintenance-status');
    const saveButton = document.getElementById('perfume-admin-save');
    const cancelButton = document.getElementById('perfume-admin-cancel');
    let editingId = null;

    function getApiBase() {
        const configured = window.PERFUMES_API_URL?.trim();
        if (configured) return configured.replace(/\/+$/, '');
        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            return window.location.origin;
        }
        return null;
    }

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    passwordToggle.addEventListener('click', () => {
        const isVisible = password.type === 'text';
        password.type = isVisible ? 'password' : 'text';
        passwordToggle.textContent = isVisible ? 'Mostrar' : 'Ocultar';
        passwordToggle.setAttribute('aria-pressed', String(!isVisible));
    });
    searchInput.addEventListener('input', updateList);

    function updateList() {
        list.replaceChildren();
        const catalogLoaded = Array.isArray(perfumes);
        validateButton.disabled = !catalogLoaded;
        exportButton.disabled = !catalogLoaded;
        const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
        const filteredPerfumes = perfumes.filter((perfume) =>
            `${perfume.nome} ${perfume.marca}`.toLocaleLowerCase('pt-BR').includes(query)
        );
        count.textContent = query
            ? `${filteredPerfumes.length} de ${perfumes.length} perfumes encontrados.`
            : `${perfumes.length} ${perfumes.length === 1 ? 'perfume cadastrado' : 'perfumes cadastrados'}.`;

        if (filteredPerfumes.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'perfume-admin-empty';
            emptyItem.textContent = query
                ? 'Nenhum perfume corresponde à busca. Tente outro nome ou marca.'
                : 'Nenhum perfume cadastrado.';
            list.append(emptyItem);
            return;
        }

        filteredPerfumes.forEach((perfume) => {
            const item = document.createElement('li');
            const description = document.createElement('span');
            description.textContent = `#${perfume.id} — ${perfume.nome} (${perfume.marca})`;

            const actions = document.createElement('div');
            actions.className = 'perfume-admin-item-actions';
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.dataset.action = 'edit';
            editButton.dataset.id = String(perfume.id);
            editButton.textContent = 'Editar';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.dataset.action = 'delete';
            deleteButton.dataset.id = String(perfume.id);
            deleteButton.textContent = 'Excluir';
            actions.append(editButton, deleteButton);
            item.append(description, actions);
            list.append(item);
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

    function validateCatalog() {
        const errors = [];
        const ids = new Set();
        perfumes.forEach((perfume, index) => {
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
            maintenanceStatus.textContent = `Catálogo inválido: ${errors.join('; ')}. Corrija os problemas antes de salvar alterações.`;
            maintenanceStatus.className = 'perfume-admin-maintenance-status error';
            return;
        }
        maintenanceStatus.textContent = `Catálogo válido: ${perfumes.length} ${perfumes.length === 1 ? 'perfume conferido' : 'perfumes conferidos'}.`;
        maintenanceStatus.className = 'perfume-admin-maintenance-status success';
    });

    exportButton.addEventListener('click', () => {
        const backup = new Blob([`${JSON.stringify(perfumes, null, 2)}\n`], {
            type: 'application/json;charset=utf-8'
        });
        const downloadUrl = URL.createObjectURL(backup);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `perfumes-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        maintenanceStatus.textContent = `Cópia JSON exportada com ${perfumes.length} ${perfumes.length === 1 ? 'perfume' : 'perfumes'}.`;
        maintenanceStatus.className = 'perfume-admin-maintenance-status success';
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
        const adminPassword = password.value;
        if (!adminPassword) throw new Error('Informe a senha de administração.');

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}.`);
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
