describe('Funções de perfumes', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="resultado"></div>
      <select id="periodo"></select>
      <input id="vibe" />
      <input id="nota" />
    `;
    perfumes = [
      { nome: 'Perfume1', clima: ['Verão'], periodo: ['dia'], vibe: ['Doce'], notas: ['Baunilha'] }
    ];
    estacaoSelecionada = 'Verão';
  });

  test('buscar filtra perfumes corretamente', () => {
    document.getElementById('periodo').value = 'dia';
    document.getElementById('vibe').value = 'doce';
    document.getElementById('nota').value = 'baunilha';

    buscar();
    // Simular setTimeout
    jest.runAllTimers();
    expect(document.getElementById('resultado').innerHTML).toContain('Perfume1');
  });

  test('buscar filtra perfumes corretamente com estação "todos"', () => {
    estacaoSelecionada = 'todos';
    document.getElementById('periodo').value = 'dia';
    document.getElementById('vibe').value = 'doce';
    document.getElementById('nota').value = 'baunilha';

    buscar();
    jest.runAllTimers();
    expect(document.getElementById('resultado').innerHTML).toContain('Perfume1');
  });

  test('surpreender seleciona perfume aleatório', () => {
    surpreender();
    expect(document.getElementById('resultado').innerHTML).toContain('Sua sorte do dia');
  });
});
