async function recomendarCremePorClima() {
    // 1. Pega a temperatura que já está no seu HTML
    const tempTexto = document.getElementById("temperatura-atual").innerText;
    const temperatura = parseFloat(tempTexto.replace(/[^0-9.]/g, ''));
    
    // 2. Carrega o JSON de cremes
    const resposta = await fetch('cremes.json');
    const todosCremes = await resposta.json();
    
    // 3. Define o filtro (ex: frio se < 22°C, calor se > 22°C)
    const climaDesejado = temperatura <= 22 ? "frio" : "calor";
    
    // 4. Filtra os cremes
    const sugestoes = todosCremes.filter(c => c.temperatura_uso === climaDesejado);
    
    // 5. Exibe o resultado
    exibirResultadoCreme(sugestoes, temperatura);
}

function exibirResultadoCreme(lista, temp) {
    const areaResultado = document.getElementById("resultado");
    let html = `<h3>Sugestões para os ${temp}°C de hoje:</h3>`;
    
    lista.forEach(creme => {
        html += `
            <div class="item-resultado">
                <strong>${creme.nome}</strong> (${creme.marca})
                <p>✨ ${creme.beneficio}</p>
                <span class="tag-vibe">${creme.vibe}</span>
            </div>
        `;
    });
    
    areaResultado.innerHTML = html;
}