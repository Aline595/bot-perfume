async function recomendarCremePorClima() {
    const divResultado = document.getElementById('resultado');
    mostrarSkeleton();

    // Captura a temperatura do texto que já está na tela
    const tempTexto = document.getElementById('temperatura-atual').textContent;
    const tempAtual = parseFloat(tempTexto.replace(/[^0-9.]/g, '')) || 22;

    // Define o critério (ex: frio abaixo de 23 graus)
    const climaDesejado = tempAtual <= 23 ? "frio" : "calor";

    // Filtra os cremes do banco de dados
    const sugestoes = cremes.filter(c => c.temperatura === climaDesejado);

    // Pequeno delay para efeito visual
    setTimeout(() => {
        if (sugestoes.length > 0) {
            divResultado.innerHTML = `<h3 style="margin: 15px 0; color: var(--primary-color);">🧴 Sugestões para ${tempAtual}°C:</h3>`;
            divResultado.innerHTML += sugestoes.map(c => `
                <div class="card-perfume">
                    <div style="font-size: 40px; margin-right: 15px;">🧴</div>
                    <div>
                        <span class="perfume-marca">${c.marca}</span>
                        <strong style="color: var(--text-main); font-size: 1.1em; display: block;">${c.nome}</strong>
                        <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                            Ideal para dias de ${c.temperatura}. 
                            <br>✨ Vibe: ${c.vibe}
                        </p>
                    </div>
                </div>
            `).join('');
        } else {
            divResultado.innerHTML = "<p>Nenhum creme encontrado para esta temperatura.</p>";
        }
    }, 500);
}