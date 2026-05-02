async function recomendarCremePorClima() {
    const divResultado = document.getElementById('resultado');
    mostrarSkeleton();

    // 1. Pega a temperatura da API na tela
    const tempTexto = document.getElementById('temperatura-atual').textContent;
    const tempAtual = parseFloat(tempTexto.replace(/[^0-9.]/g, '')) || 22;

    // 2. Define em qual "faixa" a temperatura atual se encaixa
    let categoriaAtual = "";
    if (tempAtual <= 20) {
        categoriaAtual = "baixa"; // Range de Frio/Aconchego
    } else if (tempAtual > 20 && tempAtual <= 25) {
        categoriaAtual = "intermediaria"; // Range de Clima Ameno
    } else {
        categoriaAtual = "alta"; // Range de Calor/Refrescância
    }

    // 3. Filtra os cremes baseando-se no range de cada um
    const sugestoes = cremes.filter(c => {
        // Mapeia a temperatura do JSON para as categorias
        let categoriaCreme = "";
        if (c.temperatura <= 20) categoriaCreme = "baixa";
        else if (c.temperatura > 20 && c.temperatura <= 25) categoriaCreme = "intermediaria";
        else categoriaCreme = "alta";

        return categoriaCreme === categoriaAtual;
    });

    // 4. Renderiza os resultados
    setTimeout(() => {
        if (sugestoes.length > 0) {
            const rotulos = {
                "baixa": "❄️ Clima Fresquinho (Hidratação Intensa)",
                "intermediaria": "☁️ Clima Ameno (Equilíbrio)",
                "alta": "☀️ Tá Calor! (Refrescância e Leveza)"
            };

            divResultado.innerHTML = `<h3 style="margin: 15px 0; color: #d81b60;">${rotulos[categoriaAtual]}</h3>`;
            
            divResultado.innerHTML += sugestoes.map(c => `
                <div class="card-perfume">
                    <div style="font-size: 40px; margin-right: 15px;">🧴</div>
                    <div>
                        <span class="perfume-marca">${c.marca}</span>
                        <strong style="color: var(--text-main); font-size: 1.1em; display: block;">${c.nome}</strong>
                        <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                            <strong>Vibe:</strong> ${c.fragrancia}
                            <br>✨ <strong>Notas:</strong> ${c.notas.join(', ')}
                        </p>
                        <div class="perfume-duracao">
                            <span>🌡️ Ideal para:</span> <strong>${c.temperatura}°C</strong>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            divResultado.innerHTML = `<p>Nenhum creme mapeado para a faixa de ${tempAtual}°C.</p>`;
        }
    }, 500);
}

function surpreenderCremePorGraus() {
    const divResultado = document.getElementById('resultado');
    
    // 1. Verifica se os dados foram carregados do Gist
    if (!cremes || cremes.length === 0) {
        alert("Os cremes ainda estão sendo carregados. Tente novamente em 2 segundos!");
        return;
    }

    mostrarSkeleton();

    // 2. Pega a temperatura atual da tela
    const tempTexto = document.getElementById('temperatura-atual').textContent;
    const tempAtual = parseFloat(tempTexto.replace(/[^0-9.]/g, '')) || 22;

    // 3. Define a categoria atual (Baseado nos seus ranges)
    let categoriaAtual = "";
    if (tempAtual <= 20) categoriaAtual = "baixa";
    else if (tempAtual > 20 && tempAtual <= 25) categoriaAtual = "intermediaria";
    else categoriaAtual = "alta";

    // 4. Filtra os cremes que pertencem a esse range
    const opcoesViaveis = cremes.filter(c => {
        let categoriaCreme = "";
        if (c.temperatura <= 20) categoriaCreme = "baixa";
        else if (c.temperatura > 20 && c.temperatura <= 25) categoriaCreme = "intermediaria";
        else categoriaCreme = "alta";
        
        return categoriaCreme === categoriaAtual;
    });

    // 5. Sorteia UM creme dentro desse filtro
    setTimeout(() => {
        if (opcoesViaveis.length > 0) {
            const sorteado = opcoesViaveis[Math.floor(Math.random() * opcoesViaveis.length)];

            divResultado.innerHTML = `
                <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="color: #d81b60;">✨ Sorteio Térmico (Para ${tempAtual}°C) ✨</h3>
                </div>
                <div class="card-perfume" style="border: 2px solid #ec407a; transform: scale(1.02);">
                    <div style="font-size: 40px; margin-right: 15px;">🧴</div>
                    <div>
                        <span class="perfume-marca">${sorteado.marca}</span>
                        <strong style="font-size: 1.2em; display: block;">${sorteado.nome}</strong>
                        <p style="font-size: 0.85em; color: var(--text-secondary); margin-top: 8px;">
                            <strong>Vibe:</strong> ${sorteado.fragrancia} <br>
                            <strong>Por que hoje?</strong> Porque sua textura é ideal para os ${sorteado.temperatura}°C que faz agora.
                        </p>
                        <span class="badge-intensity" style="background: #fce4ec; color: #d81b60;">Sorteado da Vez</span>
                    </div>
                </div>
            `;
        } else {
            divResultado.innerHTML = `<p>Não há cremes no banco de dados para a faixa de ${tempAtual}°C para sortear.</p>`;
        }
    }, 600);
}