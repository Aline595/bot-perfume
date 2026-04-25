# Testes Automatizados

Esta pasta contém testes automatizados para validar o sistema do aplicativo Meu Consultor Pessoal.

## Como Rodar

1. Instale as dependências: `npm install`
2. Execute os testes: `npm test`

## Estrutura

- `package.json`: Configuração do Jest e dependências.
- `setupTests.js`: Configuração inicial para simular DOM e fetch.
- `script.test.js`: Testes para funções em script.js.
- `perfumes.test.js`: Testes para funções em perfumes.js.
- `colares.test.js`: Testes para funções em colares.js.

Os testes cobrem funcionalidades como filtragem, exibição de cards e seleção aleatória.
