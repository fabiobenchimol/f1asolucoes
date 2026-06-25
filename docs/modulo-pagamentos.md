# Módulo Pagamentos

## Objetivo

Gerenciar propostas comerciais, comissões, borderôs e pagamentos.

---

# Coleções

## propostas

Status:

- pendente
- aprovada
- recusada
- agendada
- paga
- cancelada

---

## remessas

(Borderôs)

Status:

- aberta
- paga

---

# Fluxo Oficial

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

---

# Estrutura Hierárquica

Empresa
↓
Gerente
↓
Rede
↓
Loja
↓
Vendedor
↓
Proposta

---

# Auditoria

Todas as ações devem gerar histórico.

---

# Master Vision

Utiliza:

f1a_simulated_uid

sessionStorage

---

# Regras do Agente

Nunca alterar:

- status oficiais
- estrutura dos borderôs
- histórico
- hierarquia
- filtros por perfil