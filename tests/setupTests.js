// Configuração para testes com jsdom
global.fetch = jest.fn();
global.alert = jest.fn();
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Carregar funções e variáveis globais
const scriptExports = require('../script.js');
global.exibirCards = scriptExports.exibirCards;
global.definirEstacaoInicial = scriptExports.definirEstacaoInicial;
global.atualizarEstacao = scriptExports.atualizarEstacao;
global.popularSelectBlusas = scriptExports.popularSelectBlusas;

const perfumesExports = require('../perfumes.js');
global.buscar = perfumesExports.buscar;
global.surpreender = perfumesExports.surpreender;

const colaresExports = require('../colares.js');
global.buscarColares = colaresExports.buscarColares;
global.surpreenderColares = colaresExports.surpreenderColares;

// Variáveis globais
global.perfumes = [];
global.decotes = [];
global.estacaoSelecionada = "";
