# Central de organização RP

Rota: `/organization`. Todos os módulos funcionam para facção/gangue, empresa, corporação e grupo misto. O tipo é configurado em Organização; não cria outra base ou separação entre organizações.

## Módulos disponíveis

- Operações: agenda, líder, convidados, presença, localização, instruções, materiais, veículo e resultado. Iniciar retira os materiais indicados e vincula o veículo disponível; cancelar devolve os materiais. Concluir/cancelar libera o veículo. Receitas e despesas informadas geram lançamentos pendentes ao concluir.
- Cargos: departamento, membros e permissões por módulo. Só administradores gerenciam cargos e a configuração da organização. Permissões RP não promovem contas a administradores.
- Estoque: entradas, saídas e transferência entre itens de mesmo nome em propriedades diferentes, com motivo e histórico. Operações são atômicas e usam bloqueio de linhas no PostgreSQL.
- Contribuições: dinheiro ou itens, responsável, vencimento, período, quitação e isenção. Quitar dinheiro cria um depósito pendente; quitar itens aumenta o estoque selecionado. A quitação não pode ser repetida.
- Garagem: modelo, placa, proprietário, localização informada, retirada, devolução e manutenção. Veículos associados a operações são liberados pela operação.
- Recrutamento: candidato, State ID, contato, tutor, entrevista, experiência e decisão. Aprovação não cria credenciais; a liderança cadastra o acesso em Membros.
- Formação: participante, instrutor, data, conclusão com resultado ou cancelamento.
- Produção: receita de conversão de vários materiais em um produto, com quantidade por lote. Encomendas indicam receita, lotes, responsável e prazo. Produzir consome material e adiciona produto atomicamente; entregar registra a entrega.
- Avisos: categoria, mensagem, prazo opcional, confirmação de leitura e arquivamento.
- Pendências: avisos não lidos, convites sem confirmação, cobranças e treinamentos do próprio membro. O sino indica a quantidade e abre a lista. Atualização ao navegar, focar a janela ou a cada minuto.
- Histórico: últimos 500 eventos, autor e dados antes/depois nas edições. Inclui os cadastros antigos, sem hashes de senha.
- Prestação de contas: período selecionável, receitas e despesas verificadas, saldo e volume pendente, com totais por membro.

## Persistência e implantação

`backend/rp.py` registra as rotas `/api/rp/*` e adiciona somente `rp_records` e `rp_audit`. A inicialização existente cria as tabelas novas sem apagar as antigas. Campos próprios de cada módulo são validados no servidor antes de persistir em JSON. As ações possuem transições de estado e verificações de permissão no servidor.

Registros finalizados não podem ser editados pelo formulário. A trilha não tem endpoint de alteração ou exclusão. Histórico começa na implantação; não reconstrói movimentos antigos. Um administrador do banco continua tecnicamente capaz de alterar tabelas.

## Limites atuais

- Integração com servidor RP/Discord não está configurada: presença, localização e resultados são informados no painel. Não são enviados avisos externos automaticamente.
- Períodos de contribuição são referências; não geram cobranças recorrentes automaticamente.
- Entrega de encomenda registra estado; não desconta novamente o estoque produzido nem cria venda automática.
- Progresso das metas existentes continua manual e não reserva dinheiro.
- Relatório é uma consulta por período, não um fechamento contábil imutável. Dinheiro continua usando o modelo Float existente, com limite de um bilhão por registro.

## Validação

`python -m unittest backend.test_content`: regressões existentes e fluxos RP, permissões, quitação única, produção/transferência atômica, leitura idempotente, disputa de veículo e relatórios. Os testes usam SQLite temporário; o bloqueio concorrente real é fornecido pelo PostgreSQL em produção.

`npx tsc --noEmit -p tsconfig.app.json`, ESLint dos arquivos envolvidos e `npm run build`. Formulário de aviso e confirmação de leitura também foram exercitados no navegador contra banco local temporário.
