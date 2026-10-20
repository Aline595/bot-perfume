// Variáveis globais para armazenar dados carregados
let perfumes = [];
let perfumesCarregados = false;
let decotes = [];
let cremes = [];
let cremesCarregados = false;
let perfumesCarregadosEm = null;
let cremesCarregadosEm = null;
let perfumesFonteCatalogo = 'GitHub Gist público';
let temperaturaAmbienteAtual = 22;
let climaLocalizacao = { latitude: -23.68, longitude: -46.62, label: 'São Paulo, Brasil' };
const urlGist = "https://gist.githubusercontent.com/Aline595/d766a0ddf15dd9fc30ddf3de8a67b16f/raw/";
const urlCremes = "https://gist.githubusercontent.com/Aline595/5d3a031e9c8b6f31e4ecaa89a2c81c92/raw/";
let estacaoSelecionada = "";

function textoStatusCatalogo(tipo, quantidade, fonte, carregadoEm) {
    const substantivo = tipo === 'perfume' ? 'perfume' : 'creme';
    const total = `${quantidade} ${substantivo}${quantidade === 1 ? '' : 's'}`;
    const hora = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(carregadoEm);
    return quantidade
        ? `Catálogo carregado: ${total}. Fonte: ${fonte}. Carregado às ${hora}.`
        : `O catálogo foi carregado, mas não há ${substantivo}s cadastrados. Fonte: ${fonte}. Carregado às ${hora}.`;
}

// Função para popular o select de tipo de blusa com dados do JSON
function popularSelectBlusas(decotes) {
    const select = document.getElementById('tipo-blusa');
    if (!select) return;

    // Limpar opções existentes
    select.innerHTML = '';

    // Adicionar opção "Todos"
    const optionTodos = document.createElement('option');
    optionTodos.value = 'todos';
    optionTodos.textContent = 'Todos';
    select.appendChild(optionTodos);

    // Obter formatos únicos e ordenar
    const formatosUnicos = [...new Set(decotes.map(d => d.formato))].sort();

    // Adicionar opções
    formatosUnicos.forEach(formato => {
        const option = document.createElement('option');
        option.value = formato;
        option.textContent = formato;
        select.appendChild(option);
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}
