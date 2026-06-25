# Projeto F1A

## Visão Geral

O F1A é uma plataforma empresarial modular baseada em:

```text
Core
+
Firebase
+
IAM
+
Design System
+
Módulos de Negócio
```

A plataforma foi projetada para suportar múltiplos segmentos utilizando uma única base tecnológica.

---

# Objetivos

O F1A busca fornecer:

- Gestão Empresarial
- Operação Comercial
- Controle Financeiro
- Controle Operacional
- Gestão Documental
- Gestão de Produção
- Multiempresa
- Escalabilidade SaaS

---

# Arquitetura Geral

```text
F1A Core
│
├── Authentication
├── Session
├── IAM
├── Master Vision
├── Theme
├── Sidebar
├── Router Guards
│
├── Firebase
│
└── Módulos
```

---

# Stack Tecnológica

## Frontend

```text
HTML5
CSS3
JavaScript ES6+
```

---

## Backend

```text
Firebase Authentication
Cloud Firestore
Firebase Hosting
```

---

## Documentos

```text
Docxtemplater
PizZip
FileSaver
```

---

# Núcleo da Plataforma

## Core.js

Responsável por:

- Autenticação
- Sessão
- Permissões
- Usuário Logado
- Empresa Ativa
- Sidebar
- Tema
- Router Guards

---

## UI.js

Responsável por:

- Componentes Visuais
- Dropdowns
- Toasts
- Interações Globais

---

# Modelo Organizacional

Toda a plataforma segue:

```text
Empresa
↓
Rede
↓
Loja
```

---

# Perfis

Perfis oficiais:

```text
master
admin
gerente
vendedor
```

---

# Hierarquia

```text
MASTER
↓
ADMIN
↓
GERENTE
↓
VENDEDOR
```

---

# Multiempresa

A plataforma foi construída para operar com:

- uma empresa
- múltiplas empresas

Toda modelagem deve considerar:

```javascript
empresaId
```

---

# Master Vision

Funcionalidade exclusiva MASTER.

Permite:

- simular usuário
- simular empresa
- simular permissões
- validar cenários

---

# Design System

Nome oficial:

```text
Infinity Blue
```

Características:

- Corporativo
- Moderno
- Responsivo
- Escalável

---

# Módulos da Plataforma

## Dashboard

Responsável por:

- Indicadores
- KPIs
- Visão Executiva

---

## CRM

Responsável por:

- Clientes
- Campanhas
- Remessas
- Cobranças
- Comissões

Fluxo:

```text
Cliente
↓
Remessa
↓
Disparo
↓
Acordo
↓
Comissão
```

---

## ADM Cartão

Responsável por:

- Fornecedores
- Produtos
- Entradas
- Estoque
- Saídas
- Redes
- Lojas
- MRR

Fluxo:

```text
Fornecedor
↓
Entrada
↓
Estoque
↓
Saída
↓
Loja
```

---

## Contratos

Responsável por:

- Contratos DOCX
- Recibos
- Consulta CNPJ

Integrações:

```text
BrasilAPI
publica.cnpj.ws
```

---

## Financeiro

Responsável por:

- Vendas
- Inadimplência
- Repasses
- Indicadores

KPIs:

```text
Vendas Totais
Inadimplência
A Receber
Juros e Multas
```

---

## Pagamentos

Responsável por:

- Propostas
- Aprovações
- Borderôs
- Liquidação

Fluxo:

```text
Proposta
↓
Aprovação
↓
Borderô
↓
Pagamento
```

---

## Visitas

Responsável por:

- Agenda
- Escalas
- GPS
- Metas
- Produção

Fluxo:

```text
Visita
↓
Produção
↓
CRM
↓
Pagamento
```

---

## Crochê (Ponto de Ouro)

Responsável por:

- Materiais
- Projetos
- Produção
- Precificação
- Portfólio

Fluxo:

```text
Material
↓
Projeto
↓
Produção
↓
Precificação
↓
Venda
```

---

# Fluxos Estratégicos

## Fluxo Comercial

```text
Visita
↓
CRM
↓
Contrato
↓
Proposta
↓
Pagamento
↓
Comissão
```

---

## Fluxo Operacional

```text
Fornecedor
↓
Entrada
↓
Estoque
↓
Saída
↓
Loja
```

---

## Fluxo Financeiro

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

# Firestore

Principais coleções:

```text
usuarios
empresas
planos
redes
lojas

crm_*

adm_*

propostas
remessas

visitas_*

croche_*
```

---

# Segurança

Baseada em:

```text
Firebase Auth
+
IAM
+
Permissões
+
Master Vision
```

---

# Regras Arquiteturais

Sempre:

✓ utilizar Core

✓ utilizar Firebase existente

✓ utilizar IAM

✓ utilizar Infinity Blue

✓ utilizar posAuthCallback()

✓ respeitar Multiempresa

✓ respeitar Master Vision

---

# Proibições

Nunca:

✗ inicializar Firebase em módulos

✗ recriar autenticação

✗ recriar sidebar

✗ recriar tema

✗ ignorar empresaId

✗ ignorar permissões

✗ ignorar Master Vision

✗ criar componentes incompatíveis

---

# Estrutura Recomendada do Repositório

```text
/
├── index.html

├── js/
│   ├── core.js
│   └── ui.js

├── modulo-crm/
├── modulo-adm-cartao/
├── modulo-contratos/
├── modulo-financeiro/
├── modulo-pagamentos/
├── modulo-visitas/
├── croche/

├── docs/

└── .cursor/
    └── rules/
```

---

# Objetivo do Agente F1A Developer

O agente deve ser capaz de:

- criar módulos
- corrigir bugs
- criar dashboards
- criar cadastros
- criar relatórios
- criar integrações

sem quebrar:

- arquitetura
- Firebase
- IAM
- UI
- Multiempresa
- Master Vision

---

# Resumo Executivo

O F1A é uma plataforma empresarial modular construída sobre:

```text
Core
+
Firebase
+
IAM
+
Infinity Blue
+
Módulos de Negócio
```

Toda evolução da plataforma deve preservar essas fundações.

Essas regras têm prioridade sobre qualquer nova funcionalidade.