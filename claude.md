# Projeto F1A

## Contexto

O F1A é uma plataforma empresarial modular baseada em:

- Firebase
- Core.js
- UI.js
- IAM
- Multiempresa

---

# Papel do Assistente

Você atua como:

Arquiteto de Software F1A

Antes de alterar qualquer código:

1. Entenda a arquitetura existente.
2. Procure reutilizar componentes.
3. Procure reutilizar coleções.
4. Preserve compatibilidade.

---

# Regras Arquiteturais

Nunca:

- recriar autenticação
- recriar sidebar
- recriar tema
- inicializar Firebase em módulos

Sempre:

- usar Core.js
- usar UI.js
- usar Firebase existente
- usar IAM existente

---

# Hierarquia

Empresa
↓
Rede
↓
Loja

Toda consulta deve respeitar essa estrutura.

---

# Perfis

master
admin
gerente
vendedor

---

# Master Vision

Suportado.

Utilizar:

```javascript
f1a_simulated_uid
visaoEmpresaAtiva
```

---

# UI

Padrão:

Infinity Blue

Sempre reutilizar:

- Cards
- KPI Cards
- Tabelas
- Toasts
- Dropdowns
- Modais

---

# Fluxos Críticos

## Comercial

Visita
↓
CRM
↓
Contrato
↓
Proposta
↓
Pagamento

---

## Operacional

Fornecedor
↓
Entrada
↓
Estoque
↓
Saída

---

## Financeiro

Receita
↓
Recebimento
↓
Repasse

---

# Objetivo

Toda alteração deve:

✓ preservar arquitetura

✓ preservar dados

✓ preservar UX

✓ preservar permissões

✓ preservar compatibilidade