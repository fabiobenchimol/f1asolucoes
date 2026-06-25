# docs/modulo-visitas.md

# Módulo Visitas

## Objetivo

Gerenciar:

- Escalas
- Planejamento
- Check-in
- Check-out
- Metas
- Auditoria
- Produção

---

# Coleções

## visitas_agenda

Campos:

- promotoraId
- data
- turno
- lojaId
- horaInicio
- horaFim
- status
- cartoesAprovados

Status:

- pendente
- andamento
- concluido

---

## visitas_config_metas

Campos:

- horasSemana
- horasMes
- cartoesBase
- tipoTransporte
- gatilhosBonus
- ajudaDeCusto

---

# Transporte

- Moto
- Carro
- Ônibus
- App

---

# Auditoria

Check-in:
- Foto
- GPS

Check-out:
- Foto
- GPS

---

# Hierarquia

Empresa
↓
Gerente
↓
Vendedor
↓
Agenda
↓
Visita

---

# Integrações

Visitas
↓
CRM
↓
Propostas
↓
Pagamentos

---

# Regras do Agente

Nunca alterar:

- estrutura da agenda
- status das visitas
- auditoria GPS
- auditoria fotográfica
- metas automáticas
- ajuda de custo