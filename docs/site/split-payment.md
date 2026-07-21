---
title: Split payment em português claro
description: O que é o split payment da Reforma Tributária (CBS e IBS), quem é alcançado, um exemplo com números reais e o que fazer na sua empresa. Sem juridiquês.
---

# Split payment em português claro

Esta página é para quem tem empresa e quer entender o que o split payment muda no dinheiro que entra na conta. Sem juridiquês e sem código. Cada termo técnico é explicado na hora em que aparece.

> Quer ver acontecer em vez de só ler? A [demo interativa](/) simula uma venda e mostra o imposto sendo separado, com os valores que você escolher.

## O que muda, em uma frase

Hoje, o imposto que está embutido no preço entra na sua conta junto com o resto da venda, e você recolhe depois, na apuração do mês. Com o split payment, a parte do imposto (a CBS e o IBS, os dois tributos novos da Reforma Tributária) é separada no momento do pagamento e vai direto para o governo. Você recebe o valor já sem essa parte.

"Split payment" quer dizer pagamento dividido. É só isso: o pagamento do seu cliente é dividido em duas fatias. Uma segue para você. A outra segue para o fisco.

Importante: não é imposto novo nem imposto a mais. É o mesmo imposto que você já deveria recolher, só que separado na hora, pelo sistema de pagamento, em vez de depois, por você.

## Um exemplo com números

Sua empresa emite um boleto de R$ 1.000 para outra empresa. Em 2026 vale a alíquota de teste da reforma: 1% no total, sendo 0,9% de CBS e 0,1% de IBS. Sobre R$ 1.000, isso dá R$ 10 de imposto (R$ 9 de CBS e R$ 1 de IBS).

Quando o cliente paga o boleto:

- <FluxoDinheiro />

Três pontos que evitam sustos:

- **Para o seu cliente, nada muda no valor.** Ele paga os mesmos R$ 1.000. A divisão acontece do lado de quem recebe.
- **Você não paga duas vezes.** O valor separado na hora quita (total ou parcialmente) o imposto daquela nota. O que já foi para o fisco pelo split não aparece de novo na sua apuração.
- **Pagamento parcial reduz o imposto na mesma proporção.** Se o cliente pagar só metade do boleto, separa-se só metade do imposto. Multa e juros não aumentam a fatia do fisco.

## Quem é alcançado

O split olha para quem **recebe** o pagamento. A fatia separada é o imposto de quem vendeu, ou seja, da empresa que emitiu a cobrança. Na primeira etapa, isso vale para empresas identificadas por CNPJ que estão no chamado regime regular do IBS e da CBS (o regime "normal", em que a empresa apura débitos e créditos desses tributos).

Alguns detalhes práticos:

- **Quem paga pode ser pessoa física.** Em cobranças emitidas pela empresa (boleto, Pix com QR Code de cobrança, Pix Automático), o pagamento pode ser feito por uma pessoa com CPF normalmente. Para ela, nada muda: nenhum campo novo, nenhuma tela nova.
- **Em transferências iniciadas por quem paga** (Pix comum, TED e transferência entre contas do mesmo banco), os dois lados precisam ser empresas com CNPJ para o split acontecer.
- **Simples Nacional e MEI têm tratamento próprio.** A lei da reforma (LC 214/2025) prevê regras e cronograma separados para esses regimes, e os manuais da primeira etapa do split não tratam deles. Se a sua empresa é do Simples ou MEI, confirme a situação com o seu contador antes de assumir qualquer data.
- **A Etapa 1 é facultativa e só B2B.** Usar o split é uma escolha de quem origina a transação, manifestada ao preencher os campos de CBS e IBS na cobrança ou no pagamento. Os bancos e instituições de pagamento, por outro lado, são obrigados a oferecer a função aos clientes PJ.
- **Meios de pagamento da Etapa 1:** boleto, Pix (nas variações dinâmica, automática e estática), TED e TEF (transferência entre contas do mesmo banco). Cartões de crédito, débito e pré-pago ficam para etapas seguintes, assim como pagamentos iniciados via Open Finance.

## Quem pode usar a plataforma

Ninguém na sua empresa chama a Plataforma Pública do Split Payment diretamente. O acesso é estrutural: só bancos e instituições de pagamento homologados pelo Comitê Gestor do IBS, os PSPs, podem se conectar a ela. A sua empresa participa através do banco ou da instituição de pagamento que já usa hoje, mesmo que tenha um time de desenvolvimento próprio. Não existe uma chave de API para empresas comuns pedirem.

## CBS e IBS, os dois impostos da história

**CBS** é a Contribuição sobre Bens e Serviços. É federal: substitui o PIS e a Cofins e é administrada pela Receita Federal. No split, a fatia de CBS separada no pagamento é repassada diretamente à Receita.

**IBS** é o Imposto sobre Bens e Serviços. É o lado dos estados e municípios: substitui o ICMS (estadual) e o ISS (municipal) e é administrado por um órgão criado pela reforma, o Comitê Gestor do IBS (CGIBS). No split, a fatia de IBS separada no pagamento é repassada diretamente ao CGIBS, que depois distribui entre estados e municípios.

## Quando isso começa

::: warning As datas ainda são fluidas
O cronograma do split payment muda conforme a fonte e ainda está sendo fechado. O manual de operações publicado é uma minuta de junho de 2026. O piloto está previsto para o segundo semestre de 2026, e as datas de 2027 seguem em discussão. Não confie em datas vistas em posts, vídeos ou apresentações de terceiros (incluindo este site). Antes de qualquer decisão, confira a fonte primária: o [CGIBS](https://www.cgibs.gov.br/) e as [notícias da Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/noticias).
:::

## E se o valor for corrigido depois?

Nas cobranças emitidas pela empresa (boleto, Pix com QR Code, Pix Automático), existe um intervalo entre emitir a cobrança e o cliente pagar. Nesse intervalo, o fisco pode conferir o valor de imposto que você informou contra a nota fiscal vinculada e avisar o banco de duas coisas:

- **Correção:** se o valor informado diverge da nota, o fisco manda o valor certo, e é esse valor corrigido que será separado no pagamento. Correções para mais só podem chegar até as primeiras horas do dia seguinte à emissão. Depois disso, qualquer ajuste só pode reduzir o valor, nunca aumentar.
- **Valor em aberto:** se parte do imposto daquela nota já foi quitada por outro caminho, o fisco informa quanto ainda está "em aberto". Esse passa a ser o teto do que pode ser separado. Se não deve mais nada, nada é separado, e o valor fica com você.

Esse mecanismo tem nome oficial (modelo "Super Inteligente"), mas a ideia é simples: o valor separado no pagamento nunca precisa ser maior que o imposto realmente devido naquele momento.

## O que eu faço com isso na minha empresa

- **Converse com o seu contador** citando os artigos 31 a 36 da LC 214/2025, que são a base legal do split payment. Pergunte como o regime da sua empresa se encaixa e o que muda no fluxo de caixa.
- **Pergunte ao seu banco ou instituição de pagamento** qual é o cronograma deles para oferecer o split nas cobranças que você emite. A implementação é obrigatória para eles.
- **Acompanhe as [novidades](/novidades)** desta página. A regulação muda rápido e registramos aqui o que sai de oficial.

## Perguntas rápidas

**Recebo líquido e paro de emitir nota?** Não. A nota fiscal continua obrigatória, e passa a importar ainda mais: é ela que baseia a conferência do fisco no split. Receber o valor líquido não substitui nenhuma obrigação acessória.

**Exportador de serviço entra no split?** Não. A exportação de serviços é desonerada de IBS e CBS pela LC 214/2025, e os trilhos de pagamento internacionais ficam fora do escopo da Etapa 1. Confirme o enquadramento específico da sua operação com o seu contador.

**Todo mundo vai poder chamar a API um dia?** Não. O acesso à Plataforma Pública é estrutural, reservado a PSPs homologados. A sua empresa participa sempre através do banco, nunca chamando a API diretamente.

## Para continuar

- [Base legal](/base-legal): as leis, decretos e resoluções por trás de tudo, com links para as fontes primárias.
- [Rode em 10 minutos](/tutorial): para quem é dev (ou tem um dev por perto) e quer ver o fluxo do split funcionando na prática, num simulador local.

---

*Esta página não é aconselhamento jurídico nem tributário. O splitbr é um projeto independente, sem afiliação com a Receita Federal, o Comitê Gestor do IBS, o Serpro ou a Núclea. O conteúdo deriva de documentos oficiais públicos que podem mudar; confira sempre a fonte primária.*
