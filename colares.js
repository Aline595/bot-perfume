function buscarColares() {
    const divResultado = document.getElementById('resultado');
    const tipoBlusa = document.getElementById('tipo-blusa')?.value || 'todos';

    if (decotes.length === 0) {
        divResultado.innerHTML = "<p style='color: #999;' role='alert'>❌ Dados de decotes não carregados.</p>";
        return;
    }

    mostrarSkeleton();

    setTimeout(() => {
        const filtro = decotes.filter(d => {
            return tipoBlusa === 'todos' ? true : d.formato === tipoBlusa;
        });

        exibirCards(filtro, divResultado, 'decote');
    }, 500);
}

function surpreenderColares() {
    const divResultado = document.getElementById('resultado');
    const tipoBlusa = document.getElementById('tipo-blusa')?.value || 'todos';

    if (decotes.length === 0) {
        divResultado.innerHTML = "<p style='color: #999;' role='alert'>❌ Dados de decotes não carregados.</p>";
        return;
    }

    const candidatos = decotes.filter(d => {
        const atendeTipo = tipoBlusa === 'todos' ? true : d.formato === tipoBlusa;
        const possuiNoGuardaRoupa = d.possui_no_guarda_roupa !== false;
        return atendeTipo && possuiNoGuardaRoupa;
    });

    if (candidatos.length === 0) {
        divResultado.innerHTML = "<p style='color: #999;' role='alert'>❌ Nenhum colar disponível que esteja no guarda-roupa.</p>";
        return;
    }

    const item = candidatos[Math.floor(Math.random() * candidatos.length)];
    exibirCards([item], divResultado, 'decote');
}
