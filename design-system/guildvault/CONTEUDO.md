# GuildVault — Conteúdo

Perfil de trabalho voltado a conteúdo útil e fluxos operacionais. Game, assets 3D e mudanças estéticas ficam fora desta rodada.

## Funcionalidades revisadas

- Dashboard: alertas derivados dos registros reais, atualização manual, todas as metas, seleção da meta destacada, edição de progresso e exclusão com confirmação.
- Inventário: busca por nome de item, localização ou propriedade; totais de itens/unidades; filtro de estoque vazio; entradas e saídas com limite de saldo; seleção sincronizada após salvar.
- Finanças: filtro de verificação, paginação de dez registros, totais do resultado filtrado, aprovação pelo administrador autenticado, URL real do comprovante e proteção contra envio duplicado.
- Agenda: edição/exclusão atualizam a lista; filtros de prazo; lembrete editável para compartilhar manualmente; responsáveis apresentados por nome quando identificáveis.
- Membros: perfil com dados básicos e contribuições reais, acesso ao extrato individual e cadastro sem solicitar e-mail que não era armazenado.
- Servidor: hashes não saem na API; depósitos iniciam pendentes; autoria de depósitos de membros e identidade de quem aprova são determinadas no servidor; quantidades, valores e datas são validados.
- Contas: login de conta inativa é rejeitado com mensagem clara; o administrador não pode desativar/excluir a própria conta nem remover suas próprias permissões.

## Limites explícitos

- O progresso das metas é informado manualmente. Não movimenta nem reserva dinheiro do caixa.
- Agenda não controla quitação e não envia notificações automaticamente. O lembrete precisa ser compartilhado pelo usuário.
- Em HTTP por IP, copiar para a área de transferência pode ser bloqueado. O texto do lembrete permanece selecionável para cópia manual.
- Movimentos agora usam a central RP, com histórico persistente e transferência entre propriedades. Consulte [Organização](ORGANIZACAO.md).
- Cadastro de propriedade e itens ainda usa requisições separadas. Uma falha parcial é informada; confira os itens antes de tentar novamente.
- Dados de teste ficam em SQLite temporário, nunca no banco da VPS. Produção continua em PostgreSQL.

## Validação

```powershell
npm run build
npx tsc --noEmit -p tsconfig.app.json
node src/utils/financeContent.test.mjs
python -m pip install -r backend/requirements-dev.txt
python -m unittest backend.test_content -v
```

O teste da API cria e remove seu próprio banco temporário. Rode em processo dedicado: ele define variáveis de conexão de teste antes de importar a aplicação.

Checklist de navegador: salvar progresso de meta; navegar de pendência a filtro; página seguinte e retorno após busca; aprovar e consultar responsável; editar agenda; gerar lembrete; impedir saída acima do estoque; zerar item e recarregar; consultar perfil e extrato; conferir ações administrativas ausentes para membro comum; testar largura de celular.
