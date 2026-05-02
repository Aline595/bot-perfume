async function recomendarCremePorClima(tempManual = null) {
    const divResultado = document.getElementById('resultado');
    // Verifica se o elemento existe antes de pegar o valor
    const elPeriodo = document.getElementById('periodo-creme');
    const periodoSelecionado = elPeriodo ? elPeriodo.value : "todos";
    
    mostrarSkeleton();

    let tempParaFiltrar;
    if (tempManual) {
        tempParaFiltrar = tempManual;
    } else {
        const tempTexto = document.getElementById('temperatura-creme').textContent;
        tempParaFiltrar = parseFloat(tempTexto.replace(/[^0-9.]/g, '')) || 22;
    }

    let categoriaAtual = (tempParaFiltrar <= 20) ? "baixa" : (tempParaFiltrar <= 25) ? "intermediaria" : "alta";

    const sugestoes = cremes.filter(c => {
        let categoriaCreme = (c.temperatura <= 20) ? "baixa" : (c.temperatura <= 25) ? "intermediaria" : "alta";
        const matchTemperatura = (categoriaCreme === categoriaAtual);
        const matchPeriodo = (periodoSelecionado === "todos") || (c.periodo.includes(periodoSelecionado));

        return matchTemperatura && matchPeriodo;
    });

    setTimeout(() => {
        if (sugestoes.length > 0) {
            const txtPeriodo = periodoSelecionado === "todos" ? "" : ` para usar de ${periodoSelecionado}`;
            divResultado.innerHTML = `<h3 style="margin: 15px 0; color: #d81b60;">Sugestões ${txtPeriodo}:</h3>`;
            
            // Dentro da sua função recomendarCremePorClima, na parte do divResultado.innerHTML += sugestoes.map...

            divResultado.innerHTML += sugestoes.map(c => `
                <div class="card-perfume">
                    <div style="font-size: 40px; margin-right: 15px;">🧴</div>
                    <div>
                        <span class="perfume-marca">${c.marca}</span>
                        <strong style="display:block;">${c.nome}</strong>
                        <p style="font-size: 0.85em; color: var(--text-secondary); margin-top:5px;">
                            ${Array.isArray(c.notas) ? c.notas.join(', ') : c.notas}
                        </p>
                        
                        <!-- Linha da Temperatura mantida aqui -->
                        <div class="perfume-duracao" style="margin-top: 8px;">
                            <span>🌡️ Ideal:</span>
                            <strong>${c.temperatura}°C</strong>
                        </div>

                        <div style="margin-top:5px;">
                            <span class="badge-intensity" style="background:#fce4ec; color:#d81b60; font-size:0.7em;">
                                ${Array.isArray(c.periodo) ? c.periodo.join(' / ') : c.periodo}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            divResultado.innerHTML = `<p>Nenhum creme encontrado para este período nesta temperatura.</p>`;
        }
    }, 500);
}

function surpreenderCremePorGraus() {
    const divResultado = document.getElementById('resultado');
    const elPeriodo = document.getElementById('periodo-creme');
    const periodoSelecionado = elPeriodo ? elPeriodo.value : "todos";
    
    if (!cremes || cremes.length === 0) return;
    mostrarSkeleton();

    const tempTexto = document.getElementById('temperatura-creme').textContent;
    const tempAtual = parseFloat(tempTexto.replace(/[^0-9.]/g, '')) || 22;

    let categoriaAtual = (tempAtual <= 20) ? "baixa" : (tempAtual <= 25) ? "intermediaria" : "alta";

    // Filtra respeitando clima E período (apenas uma declaração aqui)
    const opcoesViaveis = cremes.filter(c => {
        let catCreme = (c.temperatura <= 20) ? "baixa" : (c.temperatura <= 25) ? "intermediaria" : "alta";
        const matchPeriodo = (periodoSelecionado === "todos") || (c.periodo.includes(periodoSelecionado));
        return (catCreme === categoriaAtual) && matchPeriodo;
    });

    setTimeout(() => {
        if (opcoesViaveis.length > 0) {
            const sorteado = opcoesViaveis[Math.floor(Math.random() * opcoesViaveis.length)];

            divResultado.innerHTML = `
                <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="color: #d81b60;">✨ Sorteio para Range ${categoriaAtual.toUpperCase()} ✨</h3>
                    <p style="font-size: 0.8em; color: var(--text-secondary);">Baseado em ${tempAtual}°C e período ${periodoSelecionado}</p>
                </div>
                <div class="card-perfume" style="border: 2px solid #ec407a; transform: scale(1.02); box-shadow: 0 4px 20px rgba(236, 64, 122, 0.15);">
                    <div style="font-size: 40px; margin-right: 15px;">🧴</div>
                    <div>
                        <span class="perfume-marca">${sorteado.marca}</span>
                        <strong style="font-size: 1.2em; display: block;">${sorteado.nome}</strong>
                        <p style="font-size: 0.85em; color: var(--text-secondary); margin-top: 8px;">
                            <strong>Vibe:</strong> ${sorteado.fragrancia}<br>
                            <strong>Notas:</strong> ${Array.isArray(sorteado.notas) ? sorteado.notas.join(', ') : sorteado.notas}
                        </p>
                        <span class="badge-intensity" style="background: #fce4ec; color: #d81b60;">Sorteado da Sorte</span>
                    </div>
                </div>
            `;
        } else {
            divResultado.innerHTML = `<p>Nenhum creme encontrado para o período "${periodoSelecionado}" neste clima.</p>`;
        }
    }, 600);
}

// Controle de temperatura manual
let temperaturaManualAtiva = false;

function selecionarRangeManualmente(tempSimulada, idRange) {
    temperaturaManualAtiva = true;

    const elTempCreme = document.getElementById('temperatura-creme');
    if (elTempCreme) {
        elTempCreme.innerHTML = `🌡️ ${tempSimulada}°C <span style="font-size: 0.6em; display:block;">(Seleção Manual)</span>`;
    }

    destacarRange(tempSimulada);
    recomendarCremePorClima(tempSimulada);
}