# Modelo de Dados - Plataforma F1A

## Objetivo

Este documento descreve os relacionamentos entre as principais entidades da plataforma F1A.

Ele serve como referência para:

- Desenvolvimento
- Integrações
- Relatórios
- Dashboards
- Evolução do banco

---

# Visão Geral

A plataforma segue a estrutura:

```text
Empresa
↓
Rede
↓
Loja
↓
Operações
```

Todas as entidades corporativas devem respeitar essa hierarquia.

---

# Usuários

## usuarios

```text
usuarios
│
├── uid
├── nome
├── email
├── perfil
├── status
│
├── empresaId[]
├── redeId[]
└── lojaId[]
```

---

# Relacionamentos

```text
usuarios
│
├── empresas
├── redes
└── lojas
```

---

# Empresas

## empresas

```text
empresas
│
├── razaoSocial
├── nomeFantasia
├── cnpj
├── planoId
└── status
```

---

# Relacionamento

```text
empresa
│
├── redes
├── lojas
├── usuários
├── contratos
├── propostas
└── financeiro
```

---

# Redes

## redes

```text
redes
│
├── empresaId
├── gerenteId
├── nome
└── codigo
```

---

# Relacionamento

```text
empresa
│
└── redes
     │
     └── lojas
```

---

# Lojas

## lojas

```text
lojas
│
├── empresaId
├── redeId
├── nome
├── codigo
└── cnpj
```

---

# Relacionamento

```text
rede
│
└── lojas
```

---

# CRM

## crm_lojas

```text
crm_lojas
│
├── codigo
├── nome
└── usuarioId
```

---

## crm_remessas

```text
crm_remessas
│
├── modeloUsado
├── filaEnvios
└── status
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
Acordo
↓
Comissão
```

---

# ADM Cartão

## adm_fornecedores

```text
adm_fornecedores
│
├── razaoSocial
├── nomeFantasia
└── cnpj
```

---

## adm_produtos

```text
adm_produtos
│
├── marca
└── modelo
```

---

## adm_entradas

```text
adm_entradas
│
├── fornecedorId
├── numeroNF
└── produtos[]
```

---

## adm_estoque

```text
adm_estoque
│
├── serial
├── produtoId
└── status
```

---

## adm_saidas

```text
adm_saidas
│
├── maquinetaId
├── lojaId
└── dataSaida
```

---

# Relacionamento Operacional

```text
Fornecedor
↓
Entrada
↓
Produto
↓
Estoque
↓
Saída
↓
Loja
```

---

# Contratos

## Entidade Conceitual

```text
Contrato
│
├── Cliente
├── Loja
├── Taxa Manutenção
├── Valor Cartão
└── Quantidade Cartões
```

---

# Pagamentos

## propostas

```text
propostas
│
├── empresaId
├── gerenteId
├── vendedorId
├── status
└── historico[]
```

---

## remessas

(Borderôs)

```text
remessas
│
├── codigo
├── empresaId
├── gerenteId
├── status
└── historico[]
```

---

# Relacionamento Financeiro

```text
Proposta
↓
Borderô
↓
Pagamento
```

---

# Visitas

## visitas_agenda

```text
visitas_agenda
│
├── promotoraId
├── lojaId
├── data
├── turno
├── status
└── cartoesAprovados[]
```

---

## visitas_config_metas

```text
visitas_config_metas
│
├── horasSemana
├── horasMes
├── cartoesBase
├── gatilhosBonus[]
└── ajudaDeCusto[]
```

---

# Relacionamento Comercial

```text
Agenda
↓
Visita
↓
Produção
↓
CRM
↓
Proposta
↓
Pagamento
```

---

# Crochê

## croche_materiais

```text
croche_materiais
│
├── nome
├── categoria
├── preco
└── usuarioId
```

---

## croche_projetos

```text
croche_projetos
│
├── usuarioId
├── nomeProjeto
├── categoria
├── status
├── materiaisUsados[]
├── precoSugerido
└── imagemUrl
```

---

# Relacionamento Produção

```text
Material
↓
Projeto
↓
Produção
↓
Precificação
↓
Portfólio
```

---

# Hierarquia de Permissões

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

Toda entidade corporativa deve possuir:

```javascript
empresaId
```

quando aplicável.

---

# Master Vision

Contexto suportado:

```javascript
f1a_simulated_uid

visaoEmpresaAtiva
```

---

# Relacionamento Geral do Ecossistema

```text
EMPRESA
│
├── REDES
│   │
│   └── LOJAS
│        │
│        ├── VISITAS
│        ├── CRM
│        ├── CONTRATOS
│        ├── PAGAMENTOS
│        └── FINANCEIRO
│
├── ADM CARTÃO
│
└── USUÁRIOS
```

---

# Regras de Modelagem

1. Respeitar Empresa → Rede → Loja.
2. Não criar relacionamentos paralelos.
3. Priorizar reutilização de entidades.
4. Preservar compatibilidade legada.
5. Toda nova entidade deve ser documentada neste arquivo.
6. Toda nova entidade corporativa deve suportar Multiempresa.
7. Toda nova entidade deve respeitar IAM.