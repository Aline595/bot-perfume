# Meu Consultor Pessoal

<!-- Descrição geral do projeto -->
Um aplicativo web interativo para consultar recomendações de perfumes, cremes e colares. A consulta de perfumes pode considerar estação, temperatura, período, vibe e notas olfativas. Inclui modo escuro, responsividade para dispositivos móveis, tablet e PC, e uma interface acessível.

## Funcionalidades

<!-- Lista de funcionalidades principais -->
- **Consulta de Perfumes**: Considere estação e temperatura como filtros opcionais; escolha período e refine por vibe ou nota olfativa. Vibe e nota podem ficar em branco.
- **Explicação das recomendações**: Veja quantos perfumes foram encontrados e quais critérios informados combinaram com cada recomendação.
- **Busca sem resultados**: Receba sugestões para ampliar a busca e use "Ver todos os perfumes" para limpar os filtros e conferir o catálogo.
- **Feedback de conexão**: A tela informa quando o catálogo está carregando ou indisponível, oferece nova tentativa e orienta a verificar o backend ou a configuração de CORS.
- **Temperatura indisponível**: Se o serviço de clima falhar, a tela avisa e usa 22°C como referência para os filtros que dependem da temperatura.
- **Consulta de Colares/Decotes**: Filtre por tipo de blusa (select populado dinamicamente do JSON) para recomendações de colar, brinco e penteado ideais, com imagens específicas por id (.png).
- **Consulta de Cremes**: Encontre sugestões por temperatura e período de uso.
- **Recomendação Aleatória**: Botão "Me Surpreenda" para sugestões inesperadas.
- **CRUD de Perfumes**: Cadastre, edite e exclua perfumes no Gist usando uma API protegida.
- **Manutenção do catálogo**: valide os dados antes de salvar e exporte uma cópia JSON para backup.
- **Modo Escuro**: Alternância entre temas claro e escuro.
- **Responsivo**: Otimizado para celular, tablet e PC.
- **Acessibilidade**: Suporte a navegação por teclado e leitores de tela, feedback anunciado para carregamento e resultados, e respeito à preferência por movimento reduzido.

## Como Usar

<!-- Instruções de uso passo a passo -->
1. Abra o aplicativo no navegador e escolha **Perfumes**, **Cremes** ou **Colares**.
2. Para perfumes, escolha o período. Se quiser, ative os filtros de estação ou temperatura e preencha uma vibe ou nota olfativa; esses campos de texto são opcionais.
3. Clique em **Encontrar Perfume** para ver recomendações e os critérios que combinaram. Se não houver resultados, altere os filtros ou clique em **Ver todos os perfumes**.
4. Use **Me surpreenda!** para receber uma sugestão aleatória. Os filtros de clima ativos também são considerados nessa opção.
5. Para colares, selecione o tipo de blusa e solicite uma recomendação.
6. Na área de cremes, escolha o momento de uso e consulte as sugestões para a temperatura.
7. Clique em **⬅ Voltar** para retornar à tela inicial ou use **🌓 Alternar Tema** para mudar o tema.
8. Para administrar o catálogo, expanda **Gerenciar perfumes do Gist**. A área permite cadastrar, editar e excluir perfumes, validar os dados e exportar um backup JSON. As alterações são compartilhadas pelo Gist.

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

Abra `http://localhost:8000`. O `GIST_ID` já usa o Gist de perfumes atual por padrão; defina `$env:GIST_ID` apenas se quiser usar outro. O servidor local serve o aplicativo e a API, então a configuração local de `api-config.js` pode continuar apontando para o backend online se essa for a escolha do projeto.

Se o catálogo não carregar, use **Tentar carregar novamente**. Ao usar um backend online com o aplicativo local, configure `ALLOWED_ORIGINS` no serviço para incluir exatamente a origem do navegador, por exemplo `http://localhost:8000` ou `http://127.0.0.1:8000`. Essas duas origens são diferentes para o navegador e devem ser liberadas conforme o endereço usado. Para desenvolvimento totalmente local, verifique se `node server.js` está em execução.

## Publicar a API para o GitHub Pages

O GitHub Pages hospeda apenas arquivos estáticos. Para gravar no Gist a partir do site publicado, hospede `server.js` em um serviço Node.js com HTTPS e configure estas variáveis secretas no serviço:

- `GITHUB_TOKEN`: token com permissão de leitura e escrita em Gists.
- `ADMIN_PASSWORD`: senha exigida para criar, editar e excluir perfumes.
- `GIST_ID`: opcional; por padrão usa o Gist atual do projeto.
- `ALLOWED_ORIGINS`: opcional; lista de origens separadas por vírgula. O padrão permite `https://aline595.github.io` e os endereços locais da porta 8000.

Configure `window.PERFUMES_API_URL` em `api-config.js` com a URL HTTPS do backend, sem uma barra final, por exemplo `https://seu-servico.onrender.com`. Nunca coloque o token do GitHub nesse arquivo nem no código do navegador. O backend deve usar HTTPS, e não compartilhe a senha administrativa.

Se a interface indicar que o backend online não pôde ser acessado, verifique se o serviço está ativo. Se ele estiver ativo, confirme se `ALLOWED_ORIGINS` contém exatamente a origem do site, incluindo protocolo e domínio, por exemplo `https://aline595.github.io`. Uma falha de conexão ou CORS não significa necessariamente que o catálogo do Gist esteja indisponível.

## Contribuição

<!-- Como contribuir -->
Sinta-se à vontade para sugerir melhorias ou reportar bugs.

## Licença

<!-- Licença do projeto -->
Este projeto é para fins educacionais e pessoais.
