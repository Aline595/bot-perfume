// Função para buscar perfumes com base nos filtros
async function buscar() {
    const divResultado = document.getElementById('resultado');
    const vibeInput = document.getElementById('vibe').value.toLowerCase().trim();
    const notaInput = document.getElementById('nota').value.toLowerCase().trim();

    mostrarSkeleton();

    setTimeout(() => {
        const periodo = document.getElementById('periodo').value;

        const filtro = perfumes.filter(p => {
            const climas = Array.isArray(p.clima) ? p.clima : [p.clima];
            const periodos = Array.isArray(p.periodo) ? p.periodo : [p.periodo];
            const vibes = Array.isArray(p.vibe) ? p.vibe : [p.vibe];
            const notas = Array.isArray(p.notas) ? p.notas : [p.notas];

            const bateClima = climas.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
            const batePeriodo = (periodo === 'ambos') ? true : periodos.some(per => per.toLowerCase() === periodo);
            const bateVibe = vibeInput === "" ? true : vibes.some(v => v.toLowerCase().includes(vibeInput));
            const bateNota = notaInput === "" ? true : notas.some(n => n.toLowerCase().includes(notaInput));

            return bateClima && batePeriodo && bateVibe && bateNota;
        });

        exibirCards(filtro, divResultado, 'perfume');
    }, 500);
}

// Função para surpreender com um perfume aleatório
function surpreender() {
    const divResultado = document.getElementById('resultado');
    const possiveis = perfumes.filter(p => {
        const clima = Array.isArray(p.clima) ? p.clima : [p.clima];
        return clima.some(c => c.toLowerCase() === estacaoSelecionada.toLowerCase());
    });

    if (possiveis.length > 0) {
        const p = possiveis[Math.floor(Math.random() * possiveis.length)];
        const imagemSrc = p.imagem.startsWith('http') 
            ? p.imagem 
            : `https://lh3.googleusercontent.com/d/${p.imagem}`;

        divResultado.innerHTML = `
            <p><strong>🎲 Sua sorte do dia:</strong></p>
            <div class="card-perfume" style="border: 2px solid #ff9800; background: var(--bg-card);" role="article">
                <img src="${imagemSrc}" class="img-perfume" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/200?text=Erro+Imagem'">
                <div>
                    <span class="perfume-marca" style="color: #e65100;">${p.marca || ''}</span>
                    <strong style="color: #e65100; font-size: 1.2em;">${p.nome}</strong>
                    ${p.intensidade ? `<br><span class="badge-intensity">${p.intensidade}</span>` : ''}
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">Vibe: ${p.vibe ? (Array.isArray(p.vibe) ? p.vibe.join(', ') : p.vibe) : 'N/A'}</p>
                    <div class="perfume-duracao">
                        <span>⏱️ Fixação:</span>
                        <strong>${p.duracao || 'N/A'}</strong>
                    </div>
                </div>
            </div>
        `;
    } else {
        divResultado.innerHTML = "<p style='color: #999;' role='alert'>❌ Nenhum perfume disponível para esta estação.</p>";
    }
}
