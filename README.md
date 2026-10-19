# Meu Consultor Pessoal

<!-- Descrição geral do projeto -->
Um aplicativo web interativo para consultar recomendações de perfumes e colares personalizadas com base em estação, período, vibe e notas. Inclui modo escuro, responsividade para dispositivos móveis, tablet e PC, e uma interface amigável.

## Funcionalidades

<!-- Lista de funcionalidades principais -->
- **Consulta de Perfumes**: Filtre por estação (incluindo "Todos"), período (dia/noite), vibe e notas olfativas.
- **Consulta de Colares/Decotes**: Filtre por tipo de blusa (select populado dinamicamente do JSON) para recomendações de colar, brinco e penteado ideais, com imagens específicas por id (.png).
- **Recomendação Aleatória**: Botão "Me Surpreenda" para sugestões inesperadas.
- **CRUD de Perfumes**: Cadastre, edite e exclua perfumes no Gist usando uma API protegida.
- **Manutenção do catálogo**: valide os dados antes de salvar e exporte uma cópia JSON para backup.
- **Seção de Colares**: Visualize catálogo de colares (expansível para filtros futuros).
- **Modo Escuro**: Alternância entre temas claro e escuro.
- **Responsivo**: Otimizado para celular, tablet e PC.
- **Acessibilidade**: Suporte a navegação por teclado e leitores de tela.

## Como Usar

<!-- Instruções de uso passo a passo -->
1. Abra o aplicativo no navegador.
2. Na tela inicial, clique em "🌸 Perfumes" ou "📿 Colares".
3. Para perfumes: Selecione estação, período, digite vibe/nota e clique em "Encontrar Perfume".
4. Para colares: Selecione tipo de blusa e clique em "Encontrar Colar" para ver recomendações.
5. Use "Me Surpreenda" para uma sugestão aleatória.
6. Clique em "⬅ Voltar" para retornar à home.
7. Use o botão "🌓 Alternar Tema" para mudar o modo.

## Tecnologias

<!-- Tecnologias utilizadas -->
- HTML5, CSS3 (com variáveis CSS), JavaScript (ES6+)
- Fetch API para carregar dados de Gists GitHub
- Responsividade com Media Queries
- Acessibilidade com ARIA roles

## Link do Projeto

<!-- Link para o projeto hospedado -->
link: https://aline595.github.io/bot-perfume/

## Instalação Local

O servidor local do projeto também expõe a API usada para editar o Gist. Requer Node.js 18 ou superior e um token do GitHub com permissão de leitura e escrita em Gists.

No PowerShell, na pasta do projeto, configure as variáveis e inicie o servidor:

```powershell
$env:GITHUB_TOKEN = "seu-token-com-permissao-de-gist"
$env:ADMIN_PASSWORD = "escolha-uma-senha-forte"
node server.js
```

Abra `http://localhost:8000`. O `GIST_ID` já usa o Gist de perfumes atual por padrão; defina `$env:GIST_ID` apenas se quiser usar outro.

## Publicar a API para o GitHub Pages

O GitHub Pages hospeda apenas arquivos estáticos. Para gravar no Gist a partir do site publicado, hospede `server.js` em um serviço Node.js com HTTPS e configure estas variáveis secretas no serviço:

- `GITHUB_TOKEN`: token com permissão de leitura e escrita em Gists.
- `ADMIN_PASSWORD`: senha exigida para criar, editar e excluir perfumes.
- `GIST_ID`: opcional; por padrão usa o Gist atual do projeto.
- `ALLOWED_ORIGINS`: opcional; lista de origens separadas por vírgula. O padrão permite `https://aline595.github.io` e os endereços locais da porta 8000.

Configure `window.PERFUMES_API_URL` em `api-config.js` com a URL HTTPS do backend, sem uma barra final, por exemplo `https://seu-servico.onrender.com`. Nunca coloque o token do GitHub nesse arquivo nem no código do navegador. O backend deve usar HTTPS, e não compartilhe a senha administrativa.

## Contribuição

<!-- Como contribuir -->
Sinta-se à vontade para sugerir melhorias ou reportar bugs.

## Licença

<!-- Licença do projeto -->
Este projeto é para fins educacionais e pessoais.
