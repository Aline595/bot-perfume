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
