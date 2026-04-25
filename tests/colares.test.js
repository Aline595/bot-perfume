describe('Funções de colares', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="resultado"></div>
      <select id="tipo-blusa"></select>
    `;
    decotes = [
      { id: 1, formato: 'T-shirt', colar_ideal: 'Colar', brinco_ideal: 'Brinco', penteado_ideal: 'Penteado', possui_no_guarda_roupa: true }
    ];
  });

  test('buscarColares filtra decotes', () => {
    document.getElementById('tipo-blusa').value = 'todos';
    buscarColares();
    jest.runAllTimers();
    expect(document.getElementById('resultado').innerHTML).toContain('T-shirt');
  });

  test('surpreenderColares seleciona decote aleatório', () => {
    document.getElementById('tipo-blusa').value = 'todos';
    surpreenderColares();
    expect(document.getElementById('resultado').innerHTML).toContain('T-shirt');
  });
});
