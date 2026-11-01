# Família Financeira

Aplicação web responsiva para organização das finanças da família. Esta é a primeira versão de interface para testes.

## Publicação

Em **Settings → Pages**, selecione **GitHub Actions** como fonte. O workflow `.github/workflows/pages.yml` publica automaticamente a branch `main`.

Endereço esperado: https://ywerio.github.io/familia-financeira/

## Recursos da versão inicial

- Painel mensal com renda, despesas, saldo projetado e contas pendentes.
- Cadastro de integrantes, rendas e despesas.
- Agenda de vencimentos e marcação de contas pagas.
- Cartões, compras parceladas em controle inicial, dívidas e financiamentos.
- Objetivos, economias e investimentos.
- Gráficos, relatórios, exportação CSV e backup/restauração JSON.

## Limitações importantes

**Ainda não há login por e-mail nem sincronização na nuvem.** Os registros ficam no armazenamento local do navegador e não são compartilhados entre dispositivos ou integrantes. Compras parceladas ainda não geram todas as parcelas automaticamente; alertas automáticos e histórico patrimonial completo também não estão conectados.

Para habilitar acesso compartilhado será necessário configurar Firebase Authentication e Cloud Firestore, implementar a sincronização e testar regras de segurança que restrinjam o acesso aos membros autorizados da família. `firebase-config.example.js` é apenas um modelo.

Não coloque senhas, service-account keys ou credenciais privadas neste repositório. **Não use dados financeiros reais nesta versão de demonstração.** Faça backup dos registros locais antes de limpar o navegador.
