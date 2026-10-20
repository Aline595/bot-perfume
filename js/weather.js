async function exibirTemperaturaAtual() {
    try {
        const weather = await buscarTemperatura(climaLocalizacao.latitude, climaLocalizacao.longitude);
        atualizarTemperaturaNaInterface(weather);
        atualizarLocalidadeNaInterface(`Clima consultado para ${climaLocalizacao.label}.`);
    } catch (error) {
        console.error("Erro ao buscar temperatura:", error);
        atualizarTemperaturaNaInterface({ temperature: 22 }, true);
        atualizarLocalidadeNaInterface(`Não foi possível consultar o clima de ${climaLocalizacao.label}. Usando 22°C como referência.`);
    }
}

async function buscarTemperatura(latitude, longitude) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,weather_code,relative_humidity_2m,precipitation'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const current = data.current;
    const temperature = current?.temperature_2m ?? data.current_weather?.temperature;
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
        throw new Error('A resposta não contém uma temperatura válida.');
    }
    return {
        temperature,
        weatherCode: Number.isInteger(current?.weather_code) ? current.weather_code : null,
        humidity: Number.isFinite(current?.relative_humidity_2m) ? current.relative_humidity_2m : null,
        precipitation: Number.isFinite(current?.precipitation) ? current.precipitation : null
    };
}

function atualizarTemperaturaNaInterface(weather, isFallback = false) {
    const { temperature } = weather;
    if (typeof temperaturaManualAtiva !== 'undefined') temperaturaManualAtiva = false;
    temperaturaAmbienteAtual = temperature;
    temperaturaCarregada = true;
    condicoesClimaticasAtuais = {
        weatherCode: weather.weatherCode ?? null,
        humidity: weather.humidity ?? null,
        precipitation: weather.precipitation ?? null
    };
    const dashboardTemperature = document.getElementById('dashboard-temperature');
    if (dashboardTemperature) dashboardTemperature.textContent = `${temperature}°C`;
    const dashboardLocation = document.getElementById('dashboard-location');
    if (dashboardLocation) dashboardLocation.textContent = climaLocalizacao.label;
    for (const id of ['temperatura-atual', 'temperatura-creme']) {
        const status = document.getElementById(id);
        if (!status) continue;
        status.textContent = isFallback
            ? `🌡️ Temperatura indisponível; usando ${temperature}°C como referência.`
            : `🌡️ ${temperature}°C agora`;
        status.classList.toggle('temperature-status-warning', isFallback);
    }
    destacarRange(temperature);
    atualizarMensagemClimatica(temperature, condicoesClimaticasAtuais, isFallback);
    document.dispatchEvent(new Event('dashboard-weather-updated'));
}

function atualizarMensagemClimatica(temperature, conditions, isFallback) {
    const rainCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
    const rainy = conditions.precipitation > 0 ||
        (conditions.weatherCode !== null && rainCodes.has(conditions.weatherCode));
    const humid = conditions.humidity >= 80 ||
        (conditions.weatherCode !== null && [45, 48].includes(conditions.weatherCode));
    const messages = rainy || humid
        ? [
            'Dia úmido: notas de lavanda e um creme que equilibre a pele podem trazer mais conforto.',
            'A umidade está em alta. Aposte em fragrâncias frescas e escolha o cuidado com a pele que funciona melhor para você.',
            'Tempo fechado lá fora? Um acessório que você adora pode dar um toque de luz ao visual.',
            'Clima úmido pede leveza: prefira texturas confortáveis e fragrâncias que acompanhem bem o seu dia.'
        ]
        : temperature > 30
            ? [
                'O calor está intenso. Fragrâncias frescas e hidratação com toque leve combinam com o dia.',
                'Sol e altas temperaturas: aposte em notas cítricas e acessórios leves. E lembre-se de se proteger do sol.',
                'Para se sentir confortável no calor, escolha uma fragrância fresca e uma textura leve para a pele.',
                'Dia quente pede leveza: notas aquáticas e uma hidratação que não pese podem ser boas companhias.'
            ]
            : temperature >= 22
                ? [
                    'Um dia agradável combina com notas florais leves e aquele colar minimalista.',
                    'Clima gostoso para usar sua fragrância favorita de passeio. Aproveite a brisa!',
                    'Dia ameno é um bom convite para manter a hidratação e curtir um brilho suave na pele.',
                    'Com essa temperatura, notas frutadas podem dar um toque alegre ao seu dia.'
                ]
                : temperature >= 15
                    ? [
                        'A temperatura está mais amena. Notas amadeiradas leves trazem um toque de aconchego.',
                        'Clima de transição: uma hidratação confortável ajuda a cuidar da pele ao longo do dia.',
                        'Uma luz suave combina com acessórios dourados e fragrâncias delicadas.',
                        'Para um toque acolhedor, experimente notas de baunilha ou âmbar.'
                    ]
                    : [
                        'O dia está frio. Notas intensas e especiadas podem trazer uma sensação acolhedora.',
                        'No frio, vale caprichar na hidratação e escolher um creme que deixe a pele confortável.',
                        'Acessórios marcantes e fragrâncias envolventes combinam com temperaturas mais baixas.',
                        'O clima esfriou: talvez seja o momento de usar aquele perfume amadeirado que você adora.'
                    ];
    const message = isFallback
        ? 'Não consegui consultar as condições do tempo; esta dica considera apenas a temperatura de referência.'
        : messages[Math.floor(Math.random() * messages.length)];
    const element = document.getElementById('dashboard-weather-message');
    if (element) element.textContent = message;
}

function atualizarLocalidadeNaInterface(message, isError = false) {
    for (const id of ['localidade-clima-perfume', 'localidade-clima-creme', 'dashboard-weather-status']) {
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
        const weather = await buscarTemperatura(place.latitude, place.longitude);
        climaLocalizacao = {
            latitude: place.latitude,
            longitude: place.longitude,
            label: [place.name, place.admin1, place.country].filter(Boolean).join(', ')
        };
        atualizarTemperaturaNaInterface(weather);
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
            const weather = await buscarTemperatura(coords.latitude, coords.longitude);
            climaLocalizacao = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                label: 'sua localização atual'
            };
            atualizarTemperaturaNaInterface(weather);
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
