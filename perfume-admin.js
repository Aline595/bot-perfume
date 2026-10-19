(() => {
    const form = document.getElementById('perfume-admin-form');
    const list = document.getElementById('perfume-admin-list');
    const status = document.getElementById('perfume-admin-status');
    const password = document.getElementById('perfume-admin-password');
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

    function updateList() {
        list.replaceChildren();
        perfumes.forEach((perfume) => {
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
            const method = editingId === null ? 'POST' : 'PUT';
            const url = editingId === null
                ? `${apiBase}/api/perfumes`
                : `${apiBase}/api/perfumes/${editingId}`;
            await sendMutation(url, method, formData());
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
        if (!window.confirm(`Excluir "${perfume.nome}" do Gist?`)) return;

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
