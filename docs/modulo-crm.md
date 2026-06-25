# Módulo CRM

## Objetivo

Responsável pelo relacionamento com clientes, campanhas de cobrança, mensageria, remessas e controle de comissões.

---

# Estrutura do Módulo

Painel CRM
↓
Cadastros Base
↓
Clientes
↓
Remessas
↓
Disparador
↓
Comissões

---

# Coleções Utilizadas

## crm_modelos_msg

Modelos de mensagens.

Campos:

- nome
- tipo
- texto
- usuarioId

Tipos:

- cobranca
- relacionamento

---

## crm_lojas

Base de mapeamento de lojas.

Campos:

- codigo
- nome
- usuarioId

---

## crm_remessas

Controle de campanhas.

Campos:

- nome
- tipo
- modeloUsado
- filaEnvios
- status
- criadoEm

Status:

- ativa
- concluida

---

## crm_comissoes_historico

Histórico de apuração.

---

## crm_comissoes_plasticos_vendas

Controle de venda de plásticos.

---

## crm_comissoes_faturas_importadas

Base de faturamento importada.

---

# Fluxo de Remessas

Importação
↓
Processamento
↓
Fila de Envios
↓
WhatsApp
↓
Acompanhamento
↓
Conclusão

---

# Status de Clientes

pendente
↓
enviado
↓
acordo

ou

pendente
↓
falha

---

# Disparador

Responsável por:

- abrir WhatsApp
- registrar status
- registrar acordos
- registrar falhas

---

# Comissões

Comissão de manutenção.

Base:

Faturas importadas.

---

# Comissão de Plásticos

Base:

Vendas registradas.

---

# Multiempresa

Toda operação deve respeitar:

visaoEmpresaAtiva

armazenada em:

sessionStorage

---

# Regras do Agente

Ao alterar CRM:

- Não modificar estrutura das remessas.
- Preservar status oficiais.
- Preservar histórico de comissões.
- Preservar relacionamento Vendedor → Rede → Loja.