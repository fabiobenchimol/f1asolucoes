📘 Documentação Oficial de Arquitetura, UI/UX e Padrões de Desenvolvimento — F1A Platform
Tema Oficial: Infinity Blue
1. Objetivo da Plataforma

A F1A Platform foi concebida como um ecossistema modular premium voltado para operações corporativas, CRM, automações internas, dashboards estratégicos e aplicações SaaS integradas.

Toda a arquitetura visual e estrutural do sistema deve seguir o Design System oficial Infinity Blue, garantindo:

consistência visual;
identidade premium;
alta escalabilidade;
performance visual;
responsividade absoluta;
experiência moderna;
redução de retrabalho;
reaproveitamento de componentes;
compatibilidade entre módulos;
padronização de desenvolvimento.
2. Filosofia do Tema Infinity Blue

O tema Infinity Blue representa:

Conceito	Aplicação
Profissionalismo	Estrutura limpa e organizada
Tecnologia	Tons profundos de azul
Premium	Glassmorphism + profundidade
Velocidade	Transições suaves
Escalabilidade	Componentes reutilizáveis
Foco operacional	Layout orientado à produtividade
Clareza visual	Hierarquia forte
Sofisticação	Contraste refinado
3. Estrutura Visual Oficial da Plataforma

A plataforma possui 3 arquiteturas visuais oficiais.

4. Tela de Login (Authentication Layer)
Estrutura Oficial

A tela de login possui:

Área	Função
Painel institucional	Branding
Painel de autenticação	Login
Fundo atmosférico	Profundidade visual
Responsividade mobile	Conversão
Layout Desktop

Estrutura obrigatória:

+--------------------------------------+
| Painel Branding | Formulário Login |
+--------------------------------------+
Painel Institucional
Características
Fundo gradiente azul profundo;
Ondulações abstratas;
Glow azul translúcido;
Logo centralizada;
Mensagens institucionais;
Ícones minimalistas;
Glass overlay.
Painel de Login
Características
Fundo claro translúcido;
Bordas suaves;
Inputs amplos;
Ícones internos;
Botão gradiente Infinity Blue;
Sombras leves;
Microinterações.
Responsividade Mobile
Regra obrigatória

No mobile:

o painel institucional sobe;
o formulário fica abaixo;
tudo deve empilhar verticalmente.
Estrutura Mobile
[ Branding ]
[ Formulário ]
Regras Técnicas
NÃO utilizar:
width: 500px;
height: 700px;
UTILIZAR:
max-width
min-height
clamp()
flex
grid
5. Tela Lobby (Hub Central)
Conceito

O Lobby é o:

HUB CENTRAL OPERACIONAL

Ele deve transmitir:

velocidade;
clareza;
organização;
modularidade;
sofisticação.
6. Estrutura Oficial do Lobby
O Lobby NÃO possui sidebar.

Ele contém apenas:

Elemento	Função
Cabeçalho premium	Controle global
Saudação contextual	Humanização
Grid de módulos	Navegação
Cards modulares	Entrada rápida
7. Cabeçalho do Lobby
Elementos obrigatórios
Esquerda
Logo F1A
Centro
Controle de visão
Searchbar opcional
Direita
Alternador de tema
Notificações
Perfil do usuário
8. Grid Oficial do Lobby
Estrutura
display: grid;
grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
gap: 24px;
Comportamento Responsivo
Resolução	Colunas
UltraWide	5–6
Desktop	4
Notebook	3
Tablet	2
Mobile	1
9. Cards Modulares (Infinity Cards)
Estrutura visual

Os cards devem possuir:

fundo translúcido;
bordas suaves;
hover premium;
glow discreto;
ícones centralizados;
profundidade;
microanimações.
Hover oficial
transform: translateY(-6px);
box-shadow: 0 20px 40px rgba(0,0,0,.12);
10. Tela Padrão dos Módulos
Estrutura oficial
+ Sidebar +
+ Topbar  +
+ Content +
11. Sidebar Oficial (Infinity Sidebar)
Características
Visual
Azul profundo;
Gradiente vertical;
Glass blur;
Separadores suaves;
Glow interno;
Itens em pílula.
Item ativo
Padrão obrigatório
background: linear-gradient(90deg, #145BFF, #2563EB);
border-radius: 14px;
Estado Hover
background: rgba(255,255,255,.06);
transform: translateX(4px);
12. Sidebar Responsiva
Desktop
fixa;
expansível;
recolhível.
Mobile
off-canvas;
sobreposição;
backdrop blur.
13. Topbar Oficial
Elementos
Elemento	Objetivo
Searchbar	Navegação
Tema	Alternância
Perfil	Conta
Notificações	Alertas
Breadcrumb	Contexto
14. Searchbar Premium
Características
Fundo translúcido;
Borda sutil;
Ícone interno;
Glow no focus.
Focus oficial
border-color: var(--f1a-blue);
box-shadow: 0 0 0 4px rgba(20,91,255,.15);
15. Design Tokens Oficiais
Variáveis Globais
:root {

    /* PRIMARY */

    --f1a-blue: #145BFF;
    --f1a-blue-dark: #071739;
    --f1a-blue-deep: #031126;
    --f1a-blue-soft: #3B82F6;

    /* PREMIUM */

    --premium-gold: #F59E0B;
    --premium-orange: #FF8A00;

    /* LIGHT MODE */

    --bg-body: #F4F7FB;
    --bg-painel: rgba(255,255,255,.88);

    /* DARK MODE */

    --bg-body-dark: #081120;
    --bg-painel-dark: rgba(11,18,32,.84);

    /* TEXT */

    --cor-titulo: #0F172A;
    --cor-texto: #64748B;

    --cor-titulo-dark: #FFFFFF;
    --cor-texto-dark: #94A3B8;

    /* BORDAS */

    --border-soft: rgba(255,255,255,.08);
    --border-light: rgba(15,23,42,.08);

    /* SHADOWS */

    --shadow-soft:
        0 10px 30px rgba(15,23,42,.08);

    --shadow-hover:
        0 20px 45px rgba(15,23,42,.15);

    /* GLASS */

    --glass-bg: rgba(255,255,255,.65);
    --glass-dark: rgba(15,23,42,.45);

    /* TRANSITIONS */

    --transition-default: .25s ease;
}
16. Glassmorphism Oficial
Regras
Cards
backdrop-filter: blur(14px);
-webkit-backdrop-filter: blur(14px);
NÃO exagerar:

❌ blur excessivo
❌ transparência extrema
❌ contraste baixo

17. Sistema de Sombras
Objetivo

Criar:

profundidade;
hierarquia;
separação visual.
Regra

Sombras devem ser:

suaves;
longas;
difusas;
modernas.
18. Tipografia Oficial
Fonte oficial
font-family:
'Inter',
'Segoe UI',
sans-serif;
19. Escala Tipográfica
Elemento	Tamanho
H1	42px
H2	32px
H3	24px
Título Card	18px
Texto padrão	14–16px
Texto auxiliar	12px
20. Inputs Oficiais
Estrutura
Altura ampla;
Radius suave;
Ícones internos;
Glow no focus.
Padrão
height: 52px;
border-radius: 14px;
padding-inline: 16px;
21. Botões Oficiais
Botão Primário
background:
linear-gradient(
135deg,
#145BFF,
#2563EB
);
Hover
transform: translateY(-2px);
filter: brightness(1.05);
Secondary Button
background: rgba(255,255,255,.08);
border: 1px solid rgba(255,255,255,.06);
22. Badges Oficiais
Estrutura

Formato:

PILL SHAPE
border-radius: 999px;
padding: 6px 12px;
23. Status Colors
Status	Cor
sucesso	azul/verde
andamento	azul
pendente	dourado
erro	vermelho suave
24. KPIs Premium
Estrutura

Os indicadores devem possuir:

faixa lateral;
ícone;
valor destacado;
subtítulo discreto.
Exemplo
| azul | DISPAROS |
|      | 124      |
25. Tabelas Premium
Estrutura
Linhas altas;
Espaçamento confortável;
Hover suave;
Dropdown elegante;
Header fixo opcional.
26. Dropdown Oficial
Estrutura
.dropdown-content-f1a {
    border-radius: 16px;
    backdrop-filter: blur(14px);
}
27. Dark Mode Oficial
Conceito

O dark mode NÃO é preto absoluto.

Deve utilizar:
azul petróleo;
azul profundo;
cinza grafite;
overlays translúcidos.
28. Regras do Dark Mode
NÃO utilizar

❌ #000000 puro
❌ contraste extremo
❌ bordas muito claras

29. Performance Visual
Evitar

❌ excesso de blur
❌ excesso de box-shadow
❌ animações pesadas
❌ gradientes gigantes

30. Responsividade Obrigatória
Mobile First

Toda nova tela deve:

funcionar primeiro no mobile;
depois expandir para desktop.
31. Breakpoints Oficiais
@media (max-width: 1280px)
@media (max-width: 1024px)
@media (max-width: 768px)
@media (max-width: 480px)
32. Regras de Containers
Utilizar
width: 100%;
max-width: 1400px;
margin: 0 auto;
padding-inline: 24px;
33. Firebase & Core.js
Regra Absoluta

Somente o:

core.js

pode:

iniciar Firebase;
validar autenticação;
controlar tema;
controlar sessão;
injetar globals.
34. Ordem dos Scripts
Obrigatório
<script src="firebase-app-compat.js"></script>
<script src="firebase-auth-compat.js"></script>
<script src="firebase-firestore-compat.js"></script>

<script src="core.js"></script>
35. Estrutura Modular
Cada módulo deve possuir
/modulo
    modulo.css
    modulo.js
    index.html
36. Convenções de Código
IDs
camelCase

Exemplo:

btnSalvarContrato
Classes CSS
kebab-case

Exemplo:

card-financeiro
Funções JS
verbo + ação

Exemplo:

carregarTabela()
salvarContrato()
abrirModal()
37. Toasts Oficiais
Utilizar
mostrarToast(
    'Salvo com sucesso!',
    'sucesso'
);
38. NÃO utilizar alert()

Exceto:

erros fatais;
bloqueios críticos;
falhas do core.js.
39. Estrutura de Assets
Raiz
assets/logo.png
Submódulos
../assets/logo.png
40. Firestore
Índices Compostos

Toda consulta com:

where + orderBy

necessita:

Composite Index
41. Centralização Matemática do Lobby
Regra Oficial
.modules-grid {
    width: 100%;
    justify-content: center;
}
42. Regras de Animação
Duração
transition: .25s ease;
Hover

Deve ser:

rápido;
elegante;
leve;
responsivo.
43. Microinterações
Objetivo

Transmitir:

refinamento;
responsividade;
modernidade.
44. UX Oficial da Plataforma

A experiência deve transmitir:

Sensação	Aplicação
Segurança	Login
Controle	Dashboards
Velocidade	Navegação
Premium	Glassmorphism
Clareza	Hierarquia
Fluidez	Animações
Escalabilidade	Componentização
45. Regra Final do Infinity Blue

Toda nova tela desenvolvida deve parecer:

parte do mesmo ecossistema;
premium;
limpa;
tecnológica;
corporativa;
consistente;
rápida;
moderna;
elegante.
46. Proibição de Quebra Visual

Nenhum módulo pode:

❌ criar cores próprias
❌ usar sombras diferentes
❌ criar bordas fora do padrão
❌ inventar tipografias
❌ usar componentes desalinhados
❌ quebrar o grid oficial
❌ usar inline styles excessivos
❌ alterar comportamento do core.js
❌ duplicar Firebase
❌ quebrar responsividade
❌ usar menus independentes do sistema

47. Resultado Esperado

O resultado final da plataforma deve transmitir:

“Sistema corporativo premium de nova geração.”

Com aparência:

SaaS moderno;
Enterprise-grade;
altamente escalável;
visualmente sofisticado;
consistente em qualquer resolução;
pronto para crescimento contínuo.

F1A PLATFORM - Blueprint de Atualização (Gestão de Remessas V3.5)
1. Multi-Empresas e Autenticação (Tenant Isolation)
Visão de Empresa: Implementado o Seletor de Empresa dinâmico no cabeçalho (Header). O sistema agora respeita a variável empresaId (ou visaoEmpresaAtiva via sessionStorage).

Isolamento de Dados: Consultas no Firebase agora usam o filtro .where("empresaId", "==", empresaId) para usuários normais.

Histórico Master (Fallback): O perfil Master consegue visualizar as remessas legadas (que não possuíam empresaId ou que estavam com ID 'MASTER'), garantindo que o histórico antigo não se perca durante a transição.

Indexação: A ordenação da Grid Principal agora é feita nativamente "na memória" via JavaScript (Array.sort()), o que eliminou a obrigatoriedade de criação manual de Índices Compostos no console do Firebase.

2. Refatoração Visual (CSS & UI)
Faxina Geral: O arquivo style.css foi 100% otimizado, semântico e categorizado (Variáveis, Componentes, Tabelas, Layout), removendo redundâncias.

Filtros CSS Isolation: Adicionada blindagem via !important para o dropdown customizado, garantindo renderização correta das caixas de marcação (checkbox) sem que o CSS global do body interfira.

Correção de Contraste (Modo Claro/Escuro): * O <input type="date"> do calendário agora usa um filtro de brilho dinâmico (filter: invert(0.5) brightness(1.2)), permanecendo sempre visível, independentemente do tema do S.O. ou do navegador.

Grid Compacta: As margens (padding) das tabelas foram ajustadas para facilitar a leitura de volumes altos de dados na tela, e os botões de ação foram alinhados horizontalmente (.acoes-horizontais).

3. Lógica de Auditoria e Filtros Inteligentes (CRM Padrão)
Cruzamento Oficial (Database Join): A tabela de Auditoria não confia mais cegamente no nome que vem dentro do .txt. Agora ela faz um lookup na coleção crm_lojas (baseLojas.find) e substitui pelo nome real, limpo e oficial da Rede e da Loja cadastrados no sistema.

Componente "Multi-Filtro" Dinâmico (<details>):

Criação de um seletor nativo, com aparência de <select> corporativo, mas que abre um popup com caixas de marcação (Checkboxes).

Lógica de "Selecionar Todos": A caixa (Selecionar Todos) agora tem sincronia de dois caminhos. Desmarcar o "Todos" zera a tabela; Desmarcar um único item remove ele da visualização, mantendo os outros selecionados.

Filtro Condicional (Cascata):

Se o usuário seleciona as Redes "A" e "B", o Dropdown de Lojas é re-renderizado instantaneamente para exibir apenas as lojas que pertencem a "A" e "B", melhorando radicalmente a UX.

Ordenação Dinâmica: Títulos das colunas (<th>) se tornaram clicáveis (sortTable). Clicar na coluna "Nº Cartão" ou "Nome Impresso" organiza o relatório em ordem Alfabética/Crescente e Decrescente instantaneamente.

4. Marcar Todos (Mass Update Seguro)
O botão de Marcar Todos como Recebido agora lê o estado atual do Filtro (Ex: Se só a "Loja X" estiver visível na tela, apenas os cartões da "Loja X" terão o status alterado no Firebase).

Foi adicionada a gravação em lotes nativa do Firebase (db.batch()) que processa as edições de 400 em 400 cartões para não travar a conexão em remessas gigantes.

## CABEÇALHO E MENU ########################################################################################################
Blueprint 1: Cabeçalho e Menu (Padrão de Navegação)
Este padrão garante que todas as páginas tenham a mesma identidade visual, comportamento de sidebar e controle de usuário.

Como aplicar:
Estrutura HTML: Copie a estrutura <aside> (Sidebar) e <header> (Header) da clientes.html.

Dependências JS: Certifique-se de que o core.js (ou o arquivo onde essas funções residem) contenha toggleSidebarF1A() e toggleDropdownPerfil(event).

Estilização: O style.css já contém as regras para body { display: flex; } e a classe .sidebar.

Código Modelo (Copie e Cole):
HTML
<aside class="sidebar" id="sidebarF1A">
    <div class="sidebar-logo" onclick="window.location.href='../lobby.html'" style="cursor: pointer;">
        <img src="../assets/logo_f1a.png" id="logoSidebar" alt="F1A CRM">
    </div>
    <nav class="nav-links">
        <a href="url.html" class="nav-item"><span class="material-symbols-rounded">icon_name</span><span class="nav-texto">Nome</span></a>
    </nav>
</aside>

<header class="header">
    <div class="header-left">
        <button class="btn-icon" onclick="toggleSidebarF1A()"><span class="material-symbols-rounded">menu</span></button>
        <h2 class="header-title">Título da Página</h2>
    </div>
    <div class="header-right">
        <button class="btn-icon" onclick="alternarTemaGlobal()"><span class="material-symbols-rounded">dark_mode</span></button>
        <div class="user-profile" onclick="toggleDropdownPerfil(event)">
            <div class="user-avatar" id="iniciaisUsuario">--</div>
            <div class="user-info">
                <span class="user-name" id="nomeUsuario">Carregando...</span>
            </div>
            <span class="material-symbols-rounded">expand_more</span>
            <div class="menu-perfil-flutuante escondido" id="dropdownPerfilLocal">
                <a href="#" onclick="sair()" class="dropdown-item">Sair</a>
            </div>
        </div>
    </div>
</header>

## GRIDS E FILTROS ########################################################################################################
Blueprint 2: Grids e Filtros (Padronização de Dados)
Este padrão utiliza a classe .tabela-wrapper (para scroll mobile) e as classes de ordenação (.sortable-header) que você já utiliza.

Como aplicar:
Filtros: Sempre coloque os inputs dentro de uma div com a classe .filtros-container.

Tabela: O HTML deve estar dentro de uma div .tabela-container > .tabela-wrapper > table.tabela-dados.

JS de Suporte: Certifique-se de que a função de ordenação que você criar manipule o estado da coluna (asc/desc) e chame a função filtrarTabelaClientes().

Código Modelo (Copie e Cole):
HTML
<div class="filtros-container">
    <input type="text" id="filtroTexto" class="input-filtro" placeholder="Pesquisar..." onkeyup="filtrarTabela()">
    </div>

<div class="tabela-container">
    <div class="tabela-wrapper">
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th class="sortable-header" onclick="ordenar('nome')">
                        Coluna Nome <span class="material-symbols-rounded sort-icon">sort</span>
                    </th>
                    <th style="text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody id="tabelaCorpo">
                </tbody>
        </table>
    </div>
</div>

Boas Práticas de JS para este Blueprint:
renderizarTabela(lista): Use .map().join('') para injetar o HTML das linhas (<tr>). Isso é mais performático do que manipular o DOM várias vezes.

Badges: Sempre use a classe .status-badge para status (ex: <span class="status-badge badge-aprovada">Ativo</span>).

Formatadores: Utilize sempre formataMoeda(valor) (ou similar) para garantir que valores financeiros sejam exibidos no padrão brasileiro R$ 0,00.

State Management: Mantenha os arrays de dados (baseLojas, dadosClientes) no topo do arquivo .js e sempre limpe/filtre o array antes de renderizar a tabela.

Resumo de Aplicação:
CSS: Se precisar de algo novo (como um novo tipo de badge), adicione ao style.css na sessão 5. TABELAS E LISTAS para manter a consistência.

HTML: Apenas copie os blocos de blueprint.

JS: A lógica de posAuthCallback deve sempre ser a primeira a carregar os dados. O sessionStorage deve ser usado para guardar estados de visões (como fizemos com visaoEmpresaAtiva), garantindo que o usuário tenha a mesma experiência ao trocar de página.