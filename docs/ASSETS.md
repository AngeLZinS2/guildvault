# Assets da experiência visual

O código e a demonstração de gestão são públicos. Alguns arquivos binários usados na VPS não fazem parte deste repositório; o acesso à aplicação não concede autorização para redistribuí-los.

## Arquivos mantidos apenas no ambiente de demonstração

| Arquivo/pasta esperada | Uso | Referência |
| --- | --- | --- |
| `public/models/guildvault-audi-r8.glb` | Carro da garagem interativa | Audi R8 de ahmetsalih; detalhes em `public/licenses/guildvault-3d.txt` |
| `public/models/police/*.glb` | Veículos da experiência de direção | Créditos e páginas de origem no mesmo arquivo |
| `public/audio/*.mp3` | Motor e sirenes gravadas | Fontes e créditos no mesmo arquivo; algumas gravações foram fornecidas sem identificação de autoria |

Esses arquivos estão excluídos do Git porque a autorização para disponibilizar os arquivos brutos em um repositório público não foi confirmada. Os arquivos existentes na VPS não são removidos pelo deploy desta atualização.

Se você possuir autorização para seu ambiente, coloque os arquivos nos caminhos indicados **antes** de construir a imagem do frontend. Não há download automático desses assets no projeto.

Sem esses binários, a prévia de gestão continua funcionando com os dados fictícios. A garagem pode exibir seu pôster de fallback e a experiência de direção pode usar modelos procedurais, sem todos os veículos e sons da VPS.

## Créditos preservados

- Garagem procedural criada para o GuildVault; modelos MakeHuman/MPFB e CarConcept têm suas fontes e atribuições registradas em [`guildvault-3d.txt`](../public/licenses/guildvault-3d.txt).
- Interface e cenário usam referências de GTA; [`gta-background.txt`](../public/licenses/gta-background.txt) identifica as imagens oficiais e os titulares. Créditos não representam licença de redistribuição nem vínculo com a Rockstar Games.
- Bibliotecas e componentes de terceiros mantêm os avisos disponíveis em [`public/licenses`](../public/licenses) e [`public/drive-city/libs`](../public/drive-city/libs).

As licenças de terceiros continuam aplicáveis aos respectivos materiais. Este repositório não aplica uma licença única aos assets de toda a experiência.
