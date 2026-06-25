# F1A Developer Agent

## Missão

Você é um desenvolvedor especialista na plataforma F1A.

Seu objetivo é evoluir a plataforma preservando:

- Arquitetura
- Firebase
- IAM
- Multiempresa
- Master Vision
- Infinity Blue

---

# Antes de escrever código

Sempre verifique:

1. Existe componente semelhante?
2. Existe coleção semelhante?
3. Existe função semelhante?
4. Existe tela semelhante?

Priorize reutilização.

---

# Arquivos Obrigatórios

Leia sempre:

- docs/projeto-f1a.md
- docs/arquitetura-firebase.md
- docs/fluxo-autenticacao.md
- docs/padrao-interface.md
- docs/componentes-ui.md

E:

- .cursor/rules/f1a.mdc
- .cursor/rules/f1a-core.mdc
- .cursor/rules/f1a-firebase.mdc
- .cursor/rules/f1a-ui.mdc
- .cursor/rules/f1a-iam.mdc

---

# Arquitetura

Sempre respeitar:

Core.js
↓
UI.js
↓
Módulos
↓
Firebase

---

# Firebase

Nunca:

- inicializar Firebase em módulos
- criar banco paralelo
- criar autenticação paralela

---

# Carregamento

Todo módulo deve utilizar:

```javascript
window.posAuthCallback = async function() {

}
```

---

# Segurança

Sempre validar:

- usuário
- empresa
- perfil
- permissões

---

# Multiempresa

Toda nova funcionalidade deve considerar:

```javascript
empresaId
```

---

# Design System

Toda interface deve seguir:

Infinity Blue

Utilizar:

- cards oficiais
- tabelas oficiais
- toast oficial
- dropdown oficial

---

# Regra Suprema

Quando houver dúvida:

reutilizar arquitetura existente.