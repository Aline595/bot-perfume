# Meu Consultor Pessoal

<!-- Descrição geral do projeto -->
Um aplicativo web interativo para consultar recomendações de perfumes, cremes e colares. A consulta de perfumes pode considerar estação, temperatura, período, vibe e notas olfativas. Inclui identidade visual, modo escuro, responsividade e recursos de acessibilidade.

## Funcionalidades

<!-- Lista de funcionalidades principais -->
- **Consulta de Perfumes**: Considere estação e temperatura como filtros opcionais; escolha período e refine por vibe ou nota olfativa. Vibe e nota podem ficar em branco.
- **Explicação das recomendações**: Veja quantos perfumes foram encontrados e quais critérios informados combinaram com cada recomendação.
- **Busca sem resultados**: Receba sugestões para ampliar a busca e use "Ver todos os perfumes" para limpar os filtros e conferir o catálogo.
- **Feedback de conexão**: A tela informa quando o catálogo está carregando ou indisponível, oferece nova tentativa e orienta a verificar o backend ou a configuração de CORS.
- **Temperatura indisponível**: Se o serviço de clima falhar, a tela avisa e usa 22°C como referência para os filtros que dependem da temperatura.
- **Consulta de Colares/Decotes**: Filtre por tipo de blusa (select populado dinamicamente do JSON) para recomendações de colar, brinco e penteado ideais, com imagens específicas por id (.png).
- **Consulta de Cremes**: Filtre opcionalmente por faixa de temperatura, estação, período e fragrância/notas; os resultados explicam por que cada creme combina e oferecem uma opção para ampliar a busca.
- **Clima por cidade ou localização**: São Paulo é usado como padrão; também é possível buscar uma cidade ou solicitar a localização do dispositivo. A dica do dashboard varia com a temperatura, chuva e umidade consultadas. A localização é opcional e não fica salva pelo site.
- **Feedback dos catálogos**: A interface mostra a origem e o horário de carregamento, explica falhas de rede/CORS e permite tentar novamente.
- **Favoritos, comparação e compartilhamento**: Salve produtos no navegador, compare de dois a quatro perfumes, cremes e acessórios em uma tela dedicada e compartilhe um link direto para uma recomendação. A comparação contextual usa as faixas cadastradas e o clima atual; dados ausentes, como projeção e ocasiões, são indicados como não informados. Combinações perfume + creme são sugestões de compatibilidade por temperatura e período, não uma promessa de maior fixação.
- **Transparência**: Consulte como as recomendações funcionam, quais dados meteorológicos são consultados e onde os favoritos são armazenados.
- **Dashboard inicial**: Exibe temperatura e sugestões diárias de perfume e creme compatíveis com o período local (dia/noite) e, quando há temperatura ideal cadastrada, com a faixa atual; também sugere um acessório. O inventário prioriza favoritos, produtos criados ou editados nos últimos 30 dias e alternativas compatíveis com o clima, equilibra perfumes, cremes e acessórios, permite buscar também por notas/componentes e filtrar categoria, e mostra até quatro itens.
- **Recência do inventário**: O backend registra `created_at` e `updated_at` em novos produtos, edições e importações. Produtos antigos sem essas datas passam a ter recência rastreável quando forem editados ou importados novamente.
- **Recomendação Aleatória**: Botão "Me Surpreenda" para sugestões inesperadas.
- **CRUD de Perfumes e Cremes**: Cadastre, edite e exclua os dois catálogos nos respectivos Gists usando uma API protegida.
- **Manutenção dos catálogos**: pesquise, valide, exporte backups JSON e importe arquivos validados com confirmação antes de substituir o catálogo.
- **Modo Escuro**: Alternância entre temas claro e escuro.
- **Responsivo**: Otimizado para celular, tablet e PC.
- **Acessibilidade**: Suporte a navegação por teclado e leitores de tela, feedback anunciado para carregamento e resultados, e respeito à preferência por movimento reduzido.

## Como Usar

<!-- Instruções de uso passo a passo -->
1. Abra o aplicativo no navegador e escolha **Perfumes**, **Cremes** ou **Colares**.
2. Para perfumes, escolha o período. Se quiser, ative os filtros de estação ou temperatura e preencha uma vibe ou nota olfativa; esses campos de texto são opcionais.
3. O clima usa São Paulo como padrão. Se desejar, informe outra cidade ou permita acesso à localização; o navegador pedirá permissão. A consulta de clima é feita pelo serviço Open-Meteo.
4. Clique em **Encontrar Perfume** para ver recomendações e os critérios que combinaram. Se não houver resultados, altere os filtros ou clique em **Ver todos os perfumes**.
5. Use **Me surpreenda!** para receber uma sugestão aleatória. Os filtros de clima ativos também são considerados nessa opção.
6. Para colares, selecione o tipo de blusa e solicite uma recomendação.
7. Na área de cremes, escolha o momento de uso e, opcionalmente, filtre por faixa de temperatura, estação ou fragrância/notas. Se não houver resultados, ajuste os filtros ou clique em **Ver todos os cremes**.
8. Em cada produto do inventário ou do consultor, use **Favoritar**, **Comparar** ou **Compartilhar**. Favoritos são guardados somente neste navegador; comparações temporárias aceitam de dois a quatro produtos, inclusive de categorias diferentes. Campos ausentes no catálogo aparecem como não informados.
9. Clique em **⬅ Voltar** para retornar à tela inicial ou use **🌓 Alternar Tema** para mudar o tema.
10. Para administrar os catálogos, expanda **Gerenciar perfumes do Gist** ou **Gerenciar catálogo de cremes**. Cada área permite pesquisar, cadastrar, editar, excluir, validar, exportar e importar seu backup JSON. A importação valida os registros e pede confirmação antes de substituir o catálogo compartilhado.

## Tecnologias

<!-- Tecnologias utilizadas -->
- HTML5, CSS3 (com variáveis CSS), JavaScript (ES6+)
- Fetch API para carregar dados de Gists GitHub
- Responsividade com Media Queries
- Acessibilidade com ARIA roles

## Organização do Projeto

- `index.html`, `style.css` e `script.js` ficam na raiz para manter compatibilidade com o GitHub Pages.
- `js/` reúne os scripts da interface por responsabilidade: clima, carregamento de catálogos, ações/renderização de produtos e navegação. A ordem das tags `<script>` no fim de `index.html` é intencional: os scripts atuais compartilham estado e funções no escopo global do navegador.
- `js/catalog-admin-common.js` concentra utilitários compartilhados pelos administradores de perfumes e cremes; regras e validações específicas de cada catálogo permanecem em seus respectivos arquivos.
- `styles/` separa os estilos base, layout, formulários, produtos, administração e utilitários. `style.css` importa esses arquivos na ordem necessária para preservar a cascata.
- `server.js` e `server.test.js` contêm o backend e seus testes.
- `assets/` guarda imagens e ícones.
- Os catálogos em produção são lidos dos Gists configurados no código/backend. Os JSONs em `data/` são cópias locais de referência, não são carregados automaticamente e não substituem os Gists; após alterações no catálogo compartilhado, atualize essas cópias apenas se quiser mantê-las como backups locais.
- O projeto não registra service worker; o arquivo antigo `sw.js` foi removido porque não era ativado pela aplicação.

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

Abra `http://localhost:8000`. O `GIST_ID` já usa o Gist de perfumes atual por padrão; `CREAMS_GIST_ID` já aponta para o Gist dos cremes informado pelo projeto. Defina `$env:GIST_ID` ou `$env:CREAMS_GIST_ID` apenas se quiser usar outros Gists. O servidor local serve o aplicativo e a API, então a configuração local de `api-config.js` pode continuar apontando para o backend online se essa for a escolha do projeto.

Se o catálogo não carregar, use **Tentar carregar novamente**. Ao usar um backend online com o aplicativo local, configure `ALLOWED_ORIGINS` no serviço para incluir exatamente a origem do navegador, por exemplo `http://localhost:8000` ou `http://127.0.0.1:8000`. Essas duas origens são diferentes para o navegador e devem ser liberadas conforme o endereço usado. Para desenvolvimento totalmente local, verifique se `node server.js` está em execução.

## Publicar a API para o GitHub Pages

O GitHub Pages hospeda apenas arquivos estáticos. Para gravar no Gist a partir do site publicado, hospede `server.js` em um serviço Node.js com HTTPS e configure estas variáveis secretas no serviço:

- `GITHUB_TOKEN`: token com permissão de leitura e escrita em Gists.
- `ADMIN_PASSWORD`: senha exigida para criar, editar e excluir perfumes e cremes.
- `GIST_ID`: opcional; por padrão usa o Gist atual do projeto.
- `CREAMS_GIST_ID`: opcional; por padrão usa o Gist dos cremes `5d3a031e9c8b6f31e4ecaa89a2c81c92`.
- `ALLOWED_ORIGINS`: opcional; lista de origens separadas por vírgula. O padrão permite `https://aline595.github.io` e os endereços locais da porta 8000.

Configure `window.PERFUMES_API_URL` em `api-config.js` com a URL HTTPS do backend, sem uma barra final, por exemplo `https://seu-servico.onrender.com`. Nunca coloque o token do GitHub nesse arquivo nem no código do navegador. O backend deve usar HTTPS, e não compartilhe a senha administrativa.

O Gist de cremes usa o arquivo `gistfile1.txt`, que contém JSON. O backend atualiza esse arquivo sem alterar o Gist de perfumes. O catálogo fornecido contém dois registros legados com campos vazios; eles são preservados até serem corrigidos ou excluídos pela administração.

Depois de alterar o backend, publique/reimplante `server.js` no serviço Node antes de usar o gerenciamento de cremes ou importar backups no site. A URL do backend continua sendo a mesma; os endpoints incluem `/api/cremes`, `/api/cremes/:id`, `/api/perfumes` e `/api/perfumes/:id`. `PUT /api/cremes` e `PUT /api/perfumes` substituem o catálogo após autenticação e validação do backup.

Se a interface indicar que o backend online não pôde ser acessado, verifique se o serviço está ativo. Se ele estiver ativo, confirme se `ALLOWED_ORIGINS` contém exatamente a origem do site, incluindo protocolo e domínio, por exemplo `https://aline595.github.io`. Uma falha de conexão ou CORS não significa necessariamente que o catálogo do Gist esteja indisponível.

## Contribuição

<!-- Como contribuir -->
Sinta-se à vontade para sugerir melhorias ou reportar bugs.

## Licença

<!-- Licença do projeto -->
Este projeto é para fins educacionais e pessoais.
