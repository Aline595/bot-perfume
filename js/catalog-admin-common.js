(() => {
    function getApiBase() {
        const configured = window.PERFUMES_API_URL?.trim();
        if (configured) return configured.replace(/\/+$/, '');
        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            return window.location.origin;
        }
        return null;
    }

    function setMaintenanceStatus(element, message, isError = false) {
        element.textContent = message;
        element.className = `perfume-admin-maintenance-status ${isError ? 'error' : 'success'}`;
    }

    function bindPasswordToggle(password, toggle) {
        toggle.addEventListener('click', () => {
            const visible = password.type === 'text';
            password.type = visible ? 'password' : 'text';
            toggle.textContent = visible ? 'Mostrar' : 'Ocultar';
            toggle.setAttribute('aria-pressed', String(!visible));
        });
    }

    function renderList({
        list,
        count,
        items,
        query,
        controls,
        isLoaded,
        getSearchText,
        getDescription,
        formatCount,
        emptyMessage,
        noResultsMessage
    }) {
        list.replaceChildren();
        controls.forEach((button) => {
            button.disabled = !isLoaded;
        });

        const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
        const matches = items.filter((item) =>
            getSearchText(item).toLocaleLowerCase('pt-BR').includes(normalizedQuery)
        );
        count.textContent = formatCount(matches.length, items.length, Boolean(normalizedQuery));

        if (!matches.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'perfume-admin-empty';
            emptyItem.textContent = normalizedQuery ? noResultsMessage : emptyMessage;
            list.append(emptyItem);
            return;
        }

        matches.forEach((entry) => {
            const item = document.createElement('li');
            const description = document.createElement('span');
            description.textContent = getDescription(entry);
            const actions = document.createElement('div');
            actions.className = 'perfume-admin-item-actions';
            for (const [action, label] of [['edit', 'Editar'], ['delete', 'Excluir']]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.action = action;
                button.dataset.id = String(entry.id);
                button.textContent = label;
                actions.append(button);
            }
            item.append(description, actions);
            list.append(item);
        });
    }

    function downloadBackup(items, filenamePrefix) {
        const backup = new Blob([`${JSON.stringify(items, null, 2)}\n`], {
            type: 'application/json;charset=utf-8'
        });
        const downloadUrl = URL.createObjectURL(backup);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${filenamePrefix}-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    async function parseBackupFile(file, noun, validateCatalog) {
        if (file.size > 1024 * 1024) throw new Error('O arquivo excede o limite de 1 MB.');
        const backup = JSON.parse(await file.text());
        if (!Array.isArray(backup)) throw new Error(`O arquivo precisa conter uma lista JSON de ${noun}.`);
        const errors = validateCatalog(backup);
        if (errors.length) throw new Error(`Backup inválido: ${errors.join('; ')}.`);
        return backup;
    }

    async function sendMutation(url, method, body, password) {
        if (!password) throw new Error('Informe a senha de administração.');
        let response;
        try {
            response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': password
                },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch {
            throw new Error('Não foi possível conectar ao backend. Verifique se o serviço está ativo e se CORS permite a origem deste site.');
        }

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error(`O backend respondeu em formato inesperado (HTTP ${response.status}). Verifique os logs do serviço.`);
        }
        if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}.`);
        return result;
    }

    window.CatalogAdmin = Object.freeze({
        getApiBase,
        setMaintenanceStatus,
        bindPasswordToggle,
        renderList,
        downloadBackup,
        parseBackupFile,
        sendMutation
    });
})();
