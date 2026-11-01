# Planejamento do produto — Família Financeira

**Status:** planejamento para revisão; não publicar em produção nem alterar a versão funcional até aprovação.

## 1. Diretrizes aprovadas

- Público: pessoas individualmente e famílias com vários membros.
- Modelo comercial: Freemium.
- Integração bancária: prevista desde a arquitetura inicial.
- Bancos prioritários para validação: Banco do Brasil, Itaú e Santander.
- Sincronização: entre dispositivos e membros autorizados de uma família.
- Preservar os recursos já aprovados: cartões completos, alertas, previsão financeira, exportação, dívidas e patrimônio.
- A versão atual é um protótipo localStorage. Não usar dados financeiros reais até implementar autenticação, nuvem e controles de segurança.

## 2. Arquitetura-alvo

1. **Frontend:** manter a aplicação web estática no GitHub Pages enquanto a interface é validada.
2. **Identidade:** Firebase Authentication, com contas individuais.
3. **Dados compartilhados:** Cloud Firestore, com isolamento obrigatório por família.
4. **Backend confiável:** Firebase Cloud Functions ou Cloud Run para operações privilegiadas e integração bancária.
5. **Open Finance:** camada adaptadora de provedores (começar em sandbox); avaliar Pluggy e Belvo antes de contratar.
6. **Segredos:** guardar chaves de provedores exclusivamente em Secret Manager/ambiente seguro do backend. Nunca colocar segredos em JavaScript público, GitHub Pages ou repositório.
7. **Planos:** controle de funcionalidades no backend por plano e status de assinatura, sem confiar apenas em bloqueios visuais do frontend.

## 3. Open Finance e bancos prioritários

- Criar o fluxo “Conectar banco” com redirecionamento/consentimento oficial do provedor.
- O usuário deve autorizar no ambiente do banco; o Família Financeira não deve solicitar nem armazenar senha bancária.
- Tratar consentimento, escopos, validade, renovação e revogação.
- Normalizar contas, saldos, transações, cartões e faturas para um modelo interno independente do fornecedor.
- Implementar sincronização incremental, webhooks quando disponíveis, reconciliação e idempotência para evitar transações duplicadas.
- Validar especificamente cobertura e qualidade de dados de Banco do Brasil, Itaú e Santander em sandbox e em homologação.
- Não iniciar pagamentos ou transferências na primeira entrega: o escopo inicial é somente leitura de dados autorizados.

## 4. Modelo de dados multiusuário

Entidades principais sugeridas:

- `users`: identidade e preferências individuais.
- `families`: espaço financeiro compartilhado.
- `family_members`: usuário, família, papel e estado do convite.
- `accounts`: contas bancárias e contas manuais.
- `bank_connections`: provedor, instituição, estado da conexão e referência externa não secreta.
- `consents`: escopos, datas, expiração e revogação do consentimento.
- `transactions`: lançamentos manuais e importados, origem, identificador externo e estado de conciliação.
- `cards`, `invoices`, `installments`: cartões, faturas e parcelas.
- `budgets`, `goals`, `debts`, `assets`: orçamento, objetivos, dívidas e patrimônio.
- `subscriptions`: plano, estado, período e referência do pagamento.
- `audit_logs`: eventos importantes de acesso, convite, conexão e alteração.

Toda consulta e gravação deve ser vinculada a uma família autorizada. Papéis iniciais: administrador da família, membro e somente leitura. Regras do Firestore devem negar acesso por padrão e validar associação e papel no servidor.

## 5. Modelo Freemium — proposta inicial para validar

**Gratuito**
- Cadastro individual ou criação de uma família pequena.
- Lançamentos manuais de receitas e despesas.
- Categorias e visão mensal básica.
- Limites de uso a definir após estimar custos.

**Premium**
- Mais membros e recursos de colaboração.
- Conexões bancárias e sincronização automática.
- Importação e categorização de transações.
- Relatórios avançados, previsão e exportações ampliadas.
- Recursos avançados de cartões, dívidas e patrimônio.

Os limites, preços e quantidade de conexões ainda não estão aprovados. Não prometer conexão bancária ilimitada antes de conhecer a cobrança do agregador.

## 6. Etapas de implementação

### Etapa 0 — segurança e preservação
- Fazer backup/exportação JSON dos dados locais existentes.
- Manter a versão atual funcionando.
- Criar ambiente de desenvolvimento separado da publicação pública.

### Etapa 1 — base multiusuário
- Configurar Firebase Authentication e Firestore.
- Implementar famílias, convites, papéis e isolamento por família.
- Criar regras de segurança e testes negativos de acesso cruzado.
- Migrar dados locais somente com consentimento explícito e opção de revisar antes de importar.

### Etapa 2 — camada bancária desacoplada
- Definir interfaces internas para provedor, conexão, consentimento, contas, transações e sincronização.
- Criar integração sandbox e simulador de respostas.
- Implementar deduplicação, auditoria, tratamento de falhas e revogação.
- Não contratar produção até comparar proposta comercial, cobertura, suporte, SLA e custo por conexão/sincronização.

### Etapa 3 — piloto Open Finance
- Validar Banco do Brasil, Itaú e Santander.
- Testar contas, extratos, cartões e faturas disponíveis para cada instituição.
- Medir custo por família ativa e definir limites Freemium/Premium.
- Fazer piloto controlado com usuários convidados.

### Etapa 4 — assinatura e lançamento
- Implementar cobrança e gestão de assinatura.
- Finalizar política de privacidade, termos, consentimentos e processos LGPD.
- Realizar revisão de segurança, recuperação de conta, backup, exclusão e portabilidade de dados.
- Publicar comercialmente somente após aprovação explícita.

## 7. Critérios obrigatórios antes de produção

- Nenhum segredo ou token bancário no frontend ou repositório.
- Nenhum usuário acessa dados de outra família sem autorização.
- Consentimento bancário explícito, granular, rastreável e revogável.
- Sincronização idempotente e sem duplicidade.
- Logs sem dados bancários sensíveis desnecessários.
- Política de retenção, exclusão, exportação e resposta a incidentes.
- Testes de segurança e restauração de backup aprovados.
- Custos do provedor e infraestrutura compatíveis com a receita dos planos.

## 8. Decisões ainda pendentes

- Quantidade de membros e conexões bancárias incluídas em cada plano.
- Preço do Premium e política de teste gratuito.
- Provedor Open Finance após testes comparativos.
- Firebase Cloud Functions ou Cloud Run, conforme custos e requisitos.
- Prazo de retenção do histórico bancário e regras de sincronização.

**Regra de projeto:** desenvolver e revisar em branch separada. Não mesclar em `main`, não ativar integrações reais e não publicar comercialmente sem revisão e aprovação.
