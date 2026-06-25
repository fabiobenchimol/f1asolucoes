# Checklist de Desenvolvimento - Plataforma F1A

## Objetivo

Este checklist deve ser executado antes de:

- Criar funcionalidades
- Corrigir bugs
- Refatorar código
- Fazer deploy

---

# Arquitetura

## Core

- [ ] Utiliza Core.js corretamente
- [ ] Não recria autenticação
- [ ] Não recria sessão
- [ ] Não recria sidebar
- [ ] Não recria tema

---

# Firebase

- [ ] Não inicializa Firebase
- [ ] Reutiliza coleções existentes
- [ ] Utiliza serverTimestamp()
- [ ] Trata erros corretamente

---

# Autenticação

- [ ] Utiliza posAuthCallback()
- [ ] Respeita Router Guards
- [ ] Respeita Primeiro Acesso
- [ ] Respeita Recuperação de Senha

---

# IAM

- [ ] Valida perfil
- [ ] Valida módulos
- [ ] Valida ferramentas
- [ ] Respeita hierarquia

---

# Multiempresa

- [ ] Considera empresaId
- [ ] Considera redeId
- [ ] Considera lojaId
- [ ] Considera visaoEmpresaAtiva

---

# Master Vision

- [ ] Considera f1a_simulated_uid
- [ ] Funciona em contexto simulado
- [ ] Não quebra simulação

---

# Interface

- [ ] Segue Infinity Blue
- [ ] Reutiliza componentes oficiais
- [ ] Reutiliza tabelas oficiais
- [ ] Reutiliza cards oficiais
- [ ] Reutiliza dropdowns oficiais

---

# Toast

- [ ] Utiliza mostrarToast()
- [ ] Não utiliza alert() indevidamente

---

# Responsividade

- [ ] Desktop validado
- [ ] Tablet validado
- [ ] Mobile validado

---

# Dark Mode

- [ ] Utiliza variáveis CSS
- [ ] Compatível com tema global

---

# CRM

- [ ] Preserva remessas
- [ ] Preserva campanhas
- [ ] Preserva comissões

---

# ADM Cartão

- [ ] Preserva estoque
- [ ] Preserva entradas
- [ ] Preserva saídas
- [ ] Preserva MRR

---

# Contratos

- [ ] Preserva templates DOCX
- [ ] Preserva placeholders
- [ ] Preserva integrações de CNPJ

---

# Pagamentos

- [ ] Preserva propostas
- [ ] Preserva borderôs
- [ ] Preserva histórico

---

# Financeiro

- [ ] Preserva KPIs
- [ ] Preserva repasses
- [ ] Preserva relatórios

---

# Visitas

- [ ] Preserva GPS
- [ ] Preserva fotos
- [ ] Preserva metas
- [ ] Preserva bonificações

---

# Crochê

- [ ] Preserva cronômetro
- [ ] Preserva precificação
- [ ] Preserva portfólio

---

# Auditoria

- [ ] Registra alterações críticas
- [ ] Preserva histórico
- [ ] Não remove rastreabilidade

---

# Deploy

Antes de publicar:

- [ ] Sem erros no console
- [ ] Sem chamadas quebradas
- [ ] Sem coleções inexistentes
- [ ] Sem permissões quebradas
- [ ] Sem regressões conhecidas

---

# Aprovação Final

O código:

- [ ] Respeita arquitetura F1A
- [ ] Respeita Firebase
- [ ] Respeita IAM
- [ ] Respeita Multiempresa
- [ ] Respeita Master Vision
- [ ] Respeita Infinity Blue

Se qualquer item estiver pendente, a entrega não deve ser considerada concluída.