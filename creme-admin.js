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
    const maintenanceStatus = document.getElementById('creme-admin-maintenance-status');
    const saveButton = document.getElementById('creme-admin-save');
    const cancelButton = document.getElementById('creme-admin-cancel');
    let editingId = null;

    function apiBase() {
        const configured = window.PERFUMES_API_URL?.trim();
        if (configured) return configured.replace(/\/+$/, '');
        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            return window.location.origin;
        }
        return null;
    }

    function setStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    function updateList() {
        list.replaceChildren();
        const loaded = cremesCarregados;
        validateButton.disabled = !loaded;
        exportButton.disabled = !loaded;
        const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
        const matches = cremes.filter((cream) =>
            `${cream.nome || ''} ${cream.marca || ''}`.toLocaleLowerCase('pt-BR').includes(query)
        );
        count.textContent = query
            ? `${matches.length} de ${cremes.length} cremes encontrados.`
            : `${cremes.length} ${cremes.length === 1 ? 'creme cadastrado' : 'cremes cadastrados'}.`;

        if (!matches.length) {
            const empty = document.createElement('li');
            empty.className = 'perfume-admin-empty';
            empty.textContent = query
                ? 'Nenhum creme corresponde à busca. Tente outro nome ou marca.'
                : 'Nenhum creme cadastrado.';
            list.append(empty);
            return;
        }

        matches.forEach((cream) => {
            const item = document.createElement('li');
            const description = document.createElement('span');
            description.textContent = `#${cream.id} — ${cream.nome || 'Sem nome'} (${cream.marca || 'Sem marca'})`;
            const actions = document.createElement('div');
            actions.className = 'perfume-admin-item-actions';
            for (const [action, label] of [['edit', 'Editar'], ['delete', 'Excluir']]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.action = action;
                button.dataset.id = String(cream.id);
                button.textContent = label;
                actions.append(button);
            }
            item.append(description, actions);
            list.append(item);
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

    function validateCatalog() {
        const errors = [];
        const ids = new Set();
        cremes.forEach((cream, index) => {
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
            validateCream(cream).forEach((error) => {
                errors.push(`Item ${index + 1} (ID ${cream.id ?? 'inválido'}): ${error}`);
            });
        });
        return errors;
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
        if (!password.value) throw new Error('Informe a senha de administração.');
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': password.value
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}.`);
        cremes = result.cremes;
        document.dispatchEvent(new Event('cremes-carregados'));
        updateList();
    }

    passwordToggle.addEventListener('click', () => {
        const visible = password.type === 'text';
        password.type = visible ? 'password' : 'text';
        passwordToggle.textContent = visible ? 'Mostrar' : 'Ocultar';
        passwordToggle.setAttribute('aria-pressed', String(!visible));
    });
    searchInput.addEventListener('input', updateList);
    validateButton.addEventListener('click', () => {
        const errors = validateCatalog();
        maintenanceStatus.className = `perfume-admin-maintenance-status ${errors.length ? 'error' : 'success'}`;
        maintenanceStatus.textContent = errors.length
            ? `Catálogo inválido: ${errors.join('; ')}.`
            : `Catálogo válido: ${cremes.length} ${cremes.length === 1 ? 'creme conferido' : 'cremes conferidos'}.`;
    });
    exportButton.addEventListener('click', () => {
        const backup = new Blob([`${JSON.stringify(cremes, null, 2)}\n`], {
            type: 'application/json;charset=utf-8'
        });
        const downloadUrl = URL.createObjectURL(backup);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `cremes-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        maintenanceStatus.className = 'perfume-admin-maintenance-status success';
        maintenanceStatus.textContent = `Cópia JSON exportada com ${cremes.length} ${cremes.length === 1 ? 'creme' : 'cremes'}.`;
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
