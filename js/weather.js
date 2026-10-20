async function exibirTemperaturaAtual() {
    try {
        const temp = await buscarTemperatura(climaLocalizacao.latitude, climaLocalizacao.longitude);
        atualizarTemperaturaNaInterface(temp);
        atualizarLocalidadeNaInterface(`Clima consultado para ${climaLocalizacao.label}.`);
    } catch (error) {
        console.error("Erro ao buscar temperatura:", error);
        temperaturaAmbienteAtual = 22;
        atualizarTemperaturaNaInterface(22, true);
        atualizarLocalidadeNaInterface(`Não foi possível consultar o clima de ${climaLocalizacao.label}. Usando 22°C como referência.`);
    }
}

async function buscarTemperatura(latitude, longitude) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const temperature = data.current?.temperature_2m ?? data.current_weather?.temperature;
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
        throw new Error('A resposta não contém uma temperatura válida.');
    }
    return temperature;
}

function atualizarTemperaturaNaInterface(temperature, isFallback = false) {
    if (typeof temperaturaManualAtiva !== 'undefined') temperaturaManualAtiva = false;
    temperaturaAmbienteAtual = temperature;
    for (const id of ['temperatura-atual', 'temperatura-creme']) {
        const status = document.getElementById(id);
        if (!status) continue;
        status.textContent = isFallback
            ? `🌡️ Temperatura indisponível; usando ${temperature}°C como referência.`
            : `🌡️ ${temperature}°C agora`;
        status.classList.toggle('temperature-status-warning', isFallback);
    }
    destacarRange(temperature);
}

function atualizarLocalidadeNaInterface(message, isError = false) {
    for (const id of ['localidade-clima-perfume', 'localidade-clima-creme']) {
        const status = document.getElementById(id);
        if (!status) continue;
        status.textContent = message;
        status.classList.toggle('error', isError);
    }
}

async function selecionarCidadeClima(tipo) {
    const input = document.getElementById(`cidade-clima-${tipo}`);
    const city = input.value.trim();
    if (!city) {
        atualizarLocalidadeNaInterface('Digite uma cidade para consultar o clima.', true);
        input.focus();
        return;
    }
    atualizarLocalidadeNaInterface(`Buscando ${city}…`);
    try {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.search = new URLSearchParams({ name: city, count: '1', language: 'pt', format: 'json' });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const place = data.results?.[0];
        if (!place) throw new Error('Não encontrei essa cidade. Confira o nome e tente novamente.');
        const temperature = await buscarTemperatura(place.latitude, place.longitude);
        climaLocalizacao = {
            latitude: place.latitude,
            longitude: place.longitude,
            label: [place.name, place.admin1, place.country].filter(Boolean).join(', ')
        };
        atualizarTemperaturaNaInterface(temperature);
        atualizarLocalidadeNaInterface(`Clima consultado para ${climaLocalizacao.label}.`);
        document.querySelectorAll('[id^="cidade-clima-"]').forEach((field) => {
            field.value = place.name;
        });
    } catch (error) {
        atualizarLocalidadeNaInterface(error instanceof TypeError
            ? 'Não foi possível conectar ao serviço de clima. Verifique a internet e tente novamente.'
            : error.message, true);
    }
}

function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
        atualizarLocalidadeNaInterface('Este navegador não oferece suporte à localização. Você ainda pode buscar uma cidade.', true);
        return;
    }
    atualizarLocalidadeNaInterface('Aguardando permissão para consultar sua localização…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
        try {
            const temperature = await buscarTemperatura(coords.latitude, coords.longitude);
            climaLocalizacao = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                label: 'sua localização atual'
            };
            atualizarTemperaturaNaInterface(temperature);
            atualizarLocalidadeNaInterface('Clima consultado para sua localização atual. As coordenadas não foram salvas.');
            document.querySelectorAll('[id^="cidade-clima-"]').forEach((field) => {
                field.value = '';
            });
        } catch (error) {
            atualizarLocalidadeNaInterface(`Não foi possível obter o clima: ${error.message}`, true);
        }
    }, (error) => {
        const reason = error.code === error.PERMISSION_DENIED
            ? 'Permissão de localização negada. Você pode buscar uma cidade manualmente.'
            : 'Não foi possível obter sua localização. Tente buscar uma cidade manualmente.';
        atualizarLocalidadeNaInterface(reason, true);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
}

document.querySelectorAll('[data-weather-city]').forEach((button) => {
    button.addEventListener('click', () => selecionarCidadeClima(button.dataset.weatherCity));
});
document.querySelectorAll('[data-weather-geolocation]').forEach((button) => {
    button.addEventListener('click', usarMinhaLocalizacao);
});
document.querySelectorAll('[id^="cidade-clima-"]').forEach((input) => {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            selecionarCidadeClima(input.id.endsWith('perfume') ? 'perfume' : 'creme');
        }
    });
});
function destacarRange(temp) {
    const IDs = ['range-baixa', 'range-intermediaria', 'range-alta'];
    const idAtivo = temp <= 20
        ? 'range-baixa'
        : temp <= 25
            ? 'range-intermediaria'
            : 'range-alta';

    IDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const ativo = id === idAtivo;
            el.classList.toggle('active', ativo);
            el.setAttribute('aria-pressed', String(ativo));
        }
    });
}
