describe('Funções do script.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="resultado"></div>
      <select id="estacao-manual"></select>
    `;
  });

  test('definirEstacaoInicial define estação baseada no mês', () => {
    const mockDate = new Date(2023, 5, 15); // Junho
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    definirEstacaoInicial();
    expect(document.getElementById('estacao-manual').value).toBe('Primavera');

    global.Date.mockRestore();
  });

  test('atualizarEstacao atualiza a estação selecionada', () => {
    document.getElementById('estacao-manual').value = 'Inverno';
    atualizarEstacao();
    expect(estacaoSelecionada).toBe('Inverno');
  });

  test('exibirCards exibe cards de perfumes', () => {
    const lista = [
      { nome: 'Perfume Teste', marca: 'Marca', vibe: 'Doce', duracao: '8h', imagem: 'img1' }
    ];
    exibirCards(lista, document.getElementById('resultado'), 'perfume');
    expect(document.getElementById('resultado').innerHTML).toContain('Perfume Teste');
  });

  test('exibirCards exibe cards de decotes', () => {
    const lista = [
      { id: 1, formato: 'T-shirt', descricao: 'Descrição', colar_ideal: 'Colar', brinco_ideal: 'Brinco', penteado_ideal: 'Penteado' }
    ];
    exibirCards(lista, document.getElementById('resultado'), 'decote');
    expect(document.getElementById('resultado').innerHTML).toContain('T-shirt');
  });

  test('exibirCards mostra mensagem quando lista vazia', () => {
    exibirCards([], document.getElementById('resultado'), 'perfume');
    expect(document.getElementById('resultado').innerHTML).toContain('Nada encontrado');
  });
});
