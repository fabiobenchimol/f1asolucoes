# Padrão de Código - Plataforma F1A

## Objetivo

Este documento define os padrões obrigatórios de desenvolvimento da plataforma F1A.

Todos os módulos, páginas, scripts e integrações devem seguir estas convenções.

---

# Princípios

O código deve ser:

✓ Legível

✓ Reutilizável

✓ Escalável

✓ Compatível

✓ Auditável

✓ Seguro

---

# Linguagem

Padrão oficial:

```text
JavaScript ES6+
```

---

# Convenções de Nomes

## Variáveis

Utilizar:

```javascript
camelCase
```

Exemplos:

```javascript
usuarioLogado

empresaAtiva

listaLojas

dadosFinanceiros
```

---

## Constantes

Utilizar:

```javascript
UPPER_SNAKE_CASE
```

Exemplos:

```javascript
MAX_ITEMS

STATUS_ATIVO

MODULO_CRM
```

---

## Funções

Utilizar:

```javascript
camelCase
```

Exemplos:

```javascript
carregarLojas()

buscarUsuarios()

salvarContrato()
```

---

## Classes

Utilizar:

```javascript
PascalCase
```

Exemplos:

```javascript
RelatorioFinanceiro

GeradorContrato
```

---

# Estrutura de Arquivos

## Páginas

```text
dashboard.html

cadastros.html

visitas.html
```

---

## Scripts

```text
dashboard.js

cadastros.js

visitas.js
```

---

## Estilos

```text
dashboard.css

visitas.css
```

---

# Declaração de Variáveis

Sempre priorizar:

```javascript
const
```

Exemplo:

```javascript
const usuario = {};
```

---

Utilizar:

```javascript
let
```

apenas quando houver alteração.

Exemplo:

```javascript
let paginaAtual = 1;
```

---

Evitar:

```javascript
var
```

---

# Async/Await

Obrigatório para operações assíncronas.

---

## Correto

```javascript
async function carregarDados() {
    try {

    } catch (error) {

    }
}
```

---

## Evitar

```javascript
function carregarDados() {

}
```

---

# Try/Catch

Toda operação crítica deve possuir:

```javascript
try {

} catch(error) {

}
```

---

# Exemplo

```javascript
try {

    const snapshot = await db.collection("usuarios").get();

} catch(error) {

    mostrarToast(
        "Erro ao carregar usuários",
        "erro"
    );

}
```

---

# Firebase

## Timestamp Oficial

Sempre utilizar:

```javascript
firebase.firestore.FieldValue.serverTimestamp()
```

---

## Não utilizar

```javascript
new Date()

Date.now()
```

como fonte principal de auditoria.

---

# Inicialização Firebase

Proibido:

```javascript
firebase.initializeApp()
```

em módulos.

---

# Callback Oficial

Todo módulo deve utilizar:

```javascript
window.posAuthCallback = async function() {

}
```

---

## Fluxo Correto

```text
Login
↓
Core
↓
Permissões
↓
posAuthCallback()
↓
Módulo
```

---

# Toast Oficial

Utilizar:

```javascript
mostrarToast(
    mensagem,
    tipo
)
```

---

## Tipos

```javascript
mostrarToast(
    "Registro salvo",
    "sucesso"
);
```

```javascript
mostrarToast(
    "Erro ao salvar",
    "erro"
);
```

---

# Alert

Evitar:

```javascript
alert()
```

---

Utilizar apenas para:

- bloqueios
- segurança
- falhas críticas

---

# Consultas Firestore

Sempre validar:

```javascript
empresaId
```

quando aplicável.

---

# Multiempresa

Toda consulta corporativa deve considerar:

```javascript
visaoEmpresaAtiva
```

---

# Compatibilidade Legada

Campos:

```javascript
empresaId
redeId
lojaId
```

podem existir como:

```javascript
string
```

ou

```javascript
array
```

---

Sempre normalizar:

```javascript
const empresas = Array.isArray(usuario.empresaId)
    ? usuario.empresaId
    : [usuario.empresaId];
```

---

# Estrutura de Funções

Ordem recomendada:

```javascript
// Constantes

// Variáveis Globais

// Utilidades

// Carregamento Inicial

// Eventos

// CRUD

// Relatórios

// Helpers
```

---

# Eventos

Nomear claramente.

Exemplos:

```javascript
aoSalvar()

aoExcluir()

aoFiltrar()

aoGerarRelatorio()
```

---

# Comentários

Utilizar apenas quando agregarem valor.

---

## Bom

```javascript
// Atualiza histórico da proposta
```

---

## Ruim

```javascript
// Soma valores
total = a + b;
```

---

# Auditoria

Sempre registrar quando possível:

```javascript
usuario
data
acao
```

---

# Logs

Utilizar:

```javascript
console.error()
```

para erros.

---

Evitar:

```javascript
console.log()
```

em produção.

---

# HTML

Sempre utilizar:

```html
id
name
label
```

em formulários.

---

# CSS

Utilizar:

```css
var(...)
```

para cores.

---

Evitar:

```css
#000
#fff
```

hardcoded.

---

# Responsividade

Validar sempre:

- Desktop
- Tablet
- Mobile

---

# Segurança

Nunca confiar em:

```javascript
dados do frontend
```

sem validação.

---

# Permissões

Sempre validar:

```javascript
modulosAcesso

ferramentasAcesso
```

---

# Master Vision

Sempre considerar:

```javascript
f1a_simulated_uid
```

quando existir.

---

# Checklist de Código

Antes de concluir:

```text
[ ] Usa async/await

[ ] Usa try/catch

[ ] Usa Toast oficial

[ ] Usa posAuthCallback

[ ] Respeita Firebase

[ ] Respeita IAM

[ ] Respeita Multiempresa

[ ] Respeita Master Vision

[ ] Responsivo

[ ] Compatível com Infinity Blue
```

---

# Regra Final

O código produzido deve parecer ter sido escrito pela equipe original do F1A.

Priorize:

Consistência
+
Legibilidade
+
Compatibilidade

acima de soluções criativas ou complexas.