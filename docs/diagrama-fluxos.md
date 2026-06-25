# Diagramas de Fluxo - Plataforma F1A

## Objetivo

Este documento descreve os principais fluxos operacionais da plataforma F1A.

Serve como referência para:

- Desenvolvimento
- Integrações
- Dashboards
- Relatórios
- Agentes de IA

---

# Fluxo Comercial Principal

Representa o ciclo completo de venda.

```text
VISITA
   ↓
CRM
   ↓
CONTRATO
   ↓
PROPOSTA
   ↓
APROVAÇÃO
   ↓
PAGAMENTO
   ↓
COMISSÃO
```

---

# Fluxo de Visitas

```text
Agenda
   ↓
Check-in
   ↓
Produção
   ↓
Check-out
   ↓
Cartões Aprovados
```

---

# Fluxo CRM

```text
Cliente
   ↓
Remessa
   ↓
Disparo
   ↓
Retorno
   ↓
Acordo
```

---

# Fluxo Contratual

```text
CNPJ
   ↓
Consulta API
   ↓
Dados Empresa
   ↓
Contrato
   ↓
DOCX
```

---

# Fluxo de Pagamentos

```text
Proposta
   ↓
Análise
   ↓
Aprovação
   ↓
Agendamento
   ↓
Borderô
   ↓
Pagamento
```

---

# Fluxo Financeiro

```text
Receita
   ↓
Recebimento
   ↓
Inadimplência
   ↓
Repasse
   ↓
Relatórios
```

---

# Fluxo ADM Cartão

```text
Fornecedor
   ↓
Entrada
   ↓
Estoque
   ↓
Saída
   ↓
Rede
   ↓
Loja
```

---

# Fluxo de Receita Recorrente

```text
Loja
   ↓
Maquineta
   ↓
Aluguel
   ↓
MRR
```

---

# Fluxo de Comissões

```text
Visita
   ↓
CRM
   ↓
Proposta
   ↓
Pagamento
   ↓
Comissão
```

---

# Fluxo de Permissões

```text
Login
   ↓
Usuário
   ↓
Empresa
   ↓
Módulo
   ↓
Ferramenta
   ↓
Acesso
```

---

# Fluxo de Autenticação

```text
Firebase Auth
   ↓
Usuário
   ↓
Empresa
   ↓
Permissões
   ↓
posAuthCallback()
   ↓
Módulo
```

---

# Fluxo Master Vision

```text
MASTER
   ↓
Seleciona Empresa
   ↓
Seleciona Usuário
   ↓
Simulação
   ↓
Operação
```

---

# Fluxo Crochê

```text
Material
   ↓
Projeto
   ↓
Produção
   ↓
Cronômetro
   ↓
Precificação
   ↓
Portfólio
```

---

# Fluxo de Precificação

```text
Materiais
      +
Tempo Produção
      +
Margem
      ↓
Preço Sugerido
```

---

# Fluxo Global do Ecossistema

```text
EMPRESA
│
├── VISITAS
│      ↓
│     CRM
│      ↓
│  CONTRATOS
│      ↓
│ PAGAMENTOS
│      ↓
│ FINANCEIRO
│
├── ADM CARTÃO
│
└── CROCHÊ
```

---

# Regras

1. Todo novo fluxo deve ser documentado.
2. Todo novo módulo deve ser adicionado neste documento.
3. Fluxos existentes não devem ser alterados sem análise de impacto.
4. Integrações entre módulos devem ser representadas visualmente.