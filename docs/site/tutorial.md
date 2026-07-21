---
title: "Rode a plataforma na sua máquina em 10 minutos"
---

<!-- OUTPUTS re-capturados em 2026-07-21 do pacote publicado (npx @splitbr/mock@0.1.0 do registro real, seed 1): passos 3-4 e 6-9 identicos byte a byte; so a linha Date do passo 9 varia, como o texto avisa (D-8 cumprido) -->

# Rode a plataforma na sua máquina em 10 minutos

A partir de 2027, todo pagamento no Brasil vai passar por uma plataforma do governo que separa os impostos na hora. Essa plataforma é fechada: só bancos e instituições de pagamento homologados podem tocar nela. Para o que vem a seguir, você não precisa de nenhuma licença: o `@splitbr/mock` é um simulador local, aberto para qualquer dev. Neste tutorial você vai ligar uma cópia dele no seu computador e fazer o ciclo completo: informar um boleto, pagar, provocar uma correção de imposto e receber o aviso do fisco.

Você não precisa saber programar. Se nunca usou um terminal na vida, tudo bem: é para você que este guia foi escrito. Cada passo mostra o comando exato para copiar e colar e a resposta exata que vai aparecer na sua tela.

Você vai precisar de: um computador (macOS, Windows ou Linux), internet e 10 minutos.

> Só quer ver o mecanismo sem instalar nada? A [demo interativa](/demo) roda no navegador.

## Passo 1: Abra o terminal

O terminal é um programa onde você conversa com o computador digitando, em vez de clicando. Ele já vem instalado.

- **macOS**: aperte `Cmd + Espaço`, digite `Terminal` e aperte Enter.
- **Windows**: aperte a tecla Windows, digite `PowerShell` e aperte Enter.
- **Linux**: aperte `Ctrl + Alt + T` (ou procure "Terminal" no menu de aplicativos).

Vai abrir uma janela com um cursor piscando. É ali que você vai colar os comandos dos próximos passos. Cole o comando, aperte Enter e espere a resposta.

**Se deu errado:** não achou o programa? No macOS ele fica em Aplicativos > Utilitários > Terminal. No Windows, qualquer um serve: PowerShell, Prompt de Comando ou Windows Terminal.

## Passo 2: Confira se o Node está instalado

O Node é o motor que roda o mock. Cole isto no terminal e aperte Enter:

```bash
node --version
```

Resposta esperada (o número pode ser diferente no seu computador):

```txt
v26.3.0
```

**O que acabou de acontecer:** o computador confirmou que tem o Node instalado e mostrou a versão. Qualquer número a partir de `v22` serve.

**Se deu errado:** se apareceu algo como `command not found: node` (ou `'node' não é reconhecido` no Windows), o Node não está instalado. Baixe em [nodejs.org](https://nodejs.org/pt), instale a versão LTS (22 ou mais nova), feche o terminal, abra de novo e repita o comando.

## Passo 3: Ligue o mock

Agora o passo principal. Cole e aperte Enter:

```bash
npx @splitbr/mock --port 8377
```

Resposta esperada:

```txt
@splitbr/mock no ar em http://127.0.0.1:8377 (seed 1)
Rotas utilitarias: GET /healthz | POST/DELETE /_chaos | POST /_scenario/divergencia
```

**O que acabou de acontecer:** o seu computador baixou o mock e ligou um servidor local, ou seja, uma mini plataforma de split payment rodando só na sua máquina, na porta 8377.

Repare que o cursor não voltou: o terminal ficou "preso" mostrando o servidor no ar. É assim mesmo. Deixe essa janela aberta e não digite nada nela.

**Se deu errado:** na primeira vez, o `npx` pode perguntar algo como `Ok to proceed? (y)`. Digite `y` e aperte Enter, é ele pedindo permissão para baixar o pacote. Se apareceu `Falha ao subir o mock: listen EADDRINUSE: address already in use 127.0.0.1:8377`, já existe um mock rodando nessa porta (talvez de uma tentativa anterior); ache a outra janela de terminal e aperte `Ctrl + C` nela, ou troque o número: `npx @splitbr/mock --port 8378` (aí use 8378 no resto do tutorial).

## Passo 4: Veja no navegador que ele está vivo

Abra o seu navegador (Chrome, Safari, Firefox, qualquer um) e digite este endereço na barra:

```txt
http://127.0.0.1:8377/healthz
```

Vai aparecer isto na página:

```json
{"status":"ok","seed":1}
```

**O que acabou de acontecer:** o navegador perguntou ao mock "você está vivo?" e ele respondeu que sim (`status: ok`) e que está rodando com a semente número 1 (`seed: 1`), que é o que torna os resultados dele previsíveis.

**Se deu errado:** se a página não abriu ("não é possível conectar"), o mock não está rodando. Volte ao passo 3 e confira se a janela do terminal com o `@splitbr/mock no ar` continua aberta.

## Passo 5: Abra um segundo terminal

O primeiro terminal está ocupado segurando o servidor. Para conversar com ele, você precisa de outra janela.

- **macOS**: com o Terminal em foco, aperte `Cmd + N` (nova janela).
- **Windows**: abra o PowerShell de novo pelo menu Iniciar.
- **Linux**: aperte `Ctrl + Alt + T` de novo.

**O que acabou de acontecer:** nada ainda; você só preparou uma segunda janela, onde vão os comandos dos passos 6 a 9.

**Se deu errado:** se você digitou um comando na janela do servidor e "nada aconteceu", é porque aquela janela não aceita mais comandos enquanto o mock roda. Use sempre a janela nova daqui para frente.

> **Está no Windows?** Os comandos dos próximos passos usam `curl` com `\` no fim das linhas, que é o jeito do macOS e do Linux. No PowerShell, escreva `curl.exe` no lugar de `curl` e cole o comando inteiro em uma linha só, sem as barras `\`.

## Passo 6: Envie sua primeira transação de boleto

Na vida real, quando um boleto é registrado, o banco avisa a plataforma: "existe um boleto de R$ 1.000,00, com R$ 9,00 de CBS e R$ 1,00 de IBS". Vamos fazer exatamente esse aviso. Cole o bloco inteiro no segundo terminal e aperte Enter:

```bash
curl -X POST http://127.0.0.1:8377/api/v1/boleto \
  -H 'content-type: application/json' \
  -H 'messageId: 1a2b3c4d-0000-4000-8000-000000000001' \
  -H 'correlationId: TUTORIAL-0000000001' \
  -H 'tenantId: 12345678000199' \
  -H 'timestamp: 2026-07-20T10:00:00-03:00' \
  -d '{
    "infRequisicao": { "dtHrMsg": "2026-07-20T10:00:00-03:00" },
    "transacoes": [
      {
        "index": 1,
        "idDda": "DDA1",
        "numCtrlOrig": "CTRL000001",
        "numCodBarras": "83660001",
        "vlInf": 1000.00,
        "vlCbsInf": 9.00,
        "vlIbsInf": 1.00,
        "cnpjRaizPspRecDir": "12345678",
        "cnpjRec": "12345678000199",
        "cnpjCpfPagOrig": "98765432000188",
        "dtHrIni": "2026-07-20T10:00:00-03:00",
        "dtVenc": "2026-08-01",
        "dtHrLimPgto": "2026-08-01T23:59:59-03:00"
      }
    ]
  }'
```

Resposta esperada:

```json
{"title":"Sucesso","status":201,"detail":"Solicitacao processada com sucesso","numValidos":1,"numErros":0,"errors":[],"resourceId":"RES0000000001001"}
```

**O que acabou de acontecer:** a plataforma aceitou a transação (`status: 201`, 1 item válido, 0 erros) e devolveu um protocolo, o `resourceId`. As quatro linhas `-H` são os headers obrigatórios do contrato oficial: `messageId` (identificador único desta mensagem), `correlationId` (código que amarra a jornada toda), `tenantId` (o CNPJ de quem chama) e `timestamp` (a hora do envio).

**Se deu errado:** se veio um erro `400` como `Header 'messageId' ausente ou invalido`, algum pedaço do comando se perdeu ao colar. Cole o bloco inteiro de uma vez, do `curl` até a última aspa, e tente de novo.

## Passo 7: Pague a transação

O boleto existe; agora alguém paga. O banco então manda o informe preliminar de pagamento: "esse boleto foi pago, R$ 1.000,00, com R$ 9,00 segregados de CBS e R$ 1,00 de IBS". Cole:

```bash
curl -X POST http://127.0.0.1:8377/api/v1/boleto/informe-preliminar-pagamento \
  -H 'content-type: application/json' \
  -H 'messageId: 1a2b3c4d-0000-4000-8000-000000000002' \
  -H 'correlationId: TUTORIAL-0000000001' \
  -H 'tenantId: 12345678000199' \
  -H 'timestamp: 2026-07-20T10:05:00-03:00' \
  -d '{
    "infRequisicao": { "dtHrMsg": "2026-07-20T10:05:00-03:00" },
    "transacoes": [
      {
        "index": 1,
        "idDda": "DDA1",
        "numCtrlOrig": "CTRL000001",
        "numPgto": 1,
        "numIdentcBaixa": 1,
        "vlPago": 1000.00,
        "vlCbsSegr": 9.00,
        "vlIbsSegr": 1.00,
        "indPgtoIntegral": "1",
        "cnpjRaizPspRecDir": "12345678",
        "cnpjRaizPspPag": "87654321",
        "cnpjRec": "12345678000199",
        "dtHrPgto": "2026-07-20T10:05:00-03:00"
      }
    ]
  }'
```

Resposta esperada:

```json
{"title":"Sucesso","status":201,"detail":"Solicitacao processada com sucesso","numValidos":1,"numErros":0,"errors":[],"resourceId":"RES0000000001002"}
```

**O que acabou de acontecer:** a plataforma encontrou o boleto `CTRL000001` do passo 6 (é o mesmo `numCtrlOrig`), marcou como pago e devolveu um novo protocolo.

**Se deu errado:** se veio um `404` dizendo que a transação não foi encontrada, o passo 6 não foi executado (ou o mock foi reiniciado no meio, e ele esquece tudo ao reiniciar); refaça o passo 6 e depois este. Se veio um `422` falando em janela encerrada, a transação foi baixada antes do pagamento nesta sessão.

## Passo 8: Provoque uma divergência de imposto

Na vida real, o fisco confere as contas e às vezes discorda do valor de imposto informado. A plataforma de verdade nunca deixa você provocar isso para testar; o mock deixa. Cole:

```bash
curl -X POST http://127.0.0.1:8377/_scenario/divergencia \
  -H 'content-type: application/json' \
  -d '{
    "arranjo": "boleto",
    "idPsp": "PSP00001",
    "chave": "CTRL000001",
    "tipo": "cbs-correcao",
    "procedimento": "padrao"
  }'
```

Resposta esperada:

```json
{"publicado":{"codMsg":"RSUP101","vlCbsCorr":9,"idDda":"DDA1","numCtrlOrig":"CTRL000001","vlInf":1000,"cnpjRaizPspRecDir":"12345678","nsuId":1}}
```

**O que acabou de acontecer:** o mock fez o papel do fisco: recalculou a CBS do boleto `CTRL000001`, montou um evento de correção (código `RSUP101`, com o valor correto em `vlCbsCorr`) e colocou na fila de avisos do PSP `PSP00001`, para ser lido no próximo passo.

**Se deu errado:** se veio `422` com `Transacao 'CTRL000001' nao registrada para 'boleto'`, os passos 6 e 7 não rodaram nesta sessão do mock. Refaça a sequência desde o passo 6.

## Passo 9: Receba o retorno do fisco no stream

O aviso do passo 8 está na fila. Na vida real, o PSP puxa esses avisos de tempos em tempos, num canal chamado Retorno Super Inteligente. Vamos puxar (o `-i` faz o curl mostrar também os cabeçalhos da resposta):

```bash
curl -i http://127.0.0.1:8377/api/v1/out/boleto/PSP00001/tributos/stream/start \
  -H 'messageId: 1a2b3c4d-0000-4000-8000-000000000003' \
  -H 'correlationId: TUTORIAL-0000000001' \
  -H 'tenantId: 12345678000199' \
  -H 'timestamp: 2026-07-20T10:10:00-03:00'
```

Resposta esperada (a linha `Date` vai mostrar a hora do seu computador):

```txt
HTTP/1.1 200 OK
correlationid: TUTORIAL-0000000001
streamid: STREAM-11
proximotoken: S2u
content-type: application/json; charset=utf-8
content-length: 145
Date: Tue, 21 Jul 2026 01:53:58 GMT
Connection: keep-alive
Keep-Alive: timeout=72

{"tributos":[{"codMsg":"RSUP101","vlCbsCorr":9,"idDda":"DDA1","numCtrlOrig":"CTRL000001","vlInf":1000,"cnpjRaizPspRecDir":"12345678","nsuId":1}]}
```

**O que acabou de acontecer:** você abriu o stream do PSP e recebeu o evento `RSUP101` do passo 8, exatamente como um PSP homologado receberia da plataforma real.

Dois campos merecem atenção. O `nsuId` é o número de série do evento na fila do seu PSP: começa em 1 e só cresce, então você sempre sabe a ordem e percebe se perdeu algum. O `proximotoken` é a chave para a próxima leitura: em vez de repetir o `/start`, o PSP chama `.../stream/S2u` para continuar de onde parou, e cada resposta traz um token novo para a chamada seguinte. É assim que o canal garante que nenhum aviso do fisco se perde.

**Se deu errado:** se o comando ficou uns 25 segundos parado e terminou sem corpo (um `204`), a fila estava vazia: o passo 8 não rodou (ou você usou outro `idPsp`). Refaça o passo 8 e chame de novo. Se veio `422` com `Token de stream desconhecido`, você tentou reaproveitar um token antigo; chame o `/start` de novo.

## Passo 10: Desligue tudo

Volte para a primeira janela do terminal (a que está com o servidor preso) e aperte:

```txt
Ctrl + C
```

O cursor volta a piscar, esperando comandos. Pode fechar as janelas.

**O que acabou de acontecer:** o mock desligou e apagou tudo o que você criou; ele guarda o estado só na memória, de propósito, para cada sessão de teste começar do zero. Se você ligar de novo com o mesmo `--seed` (o padrão é 1) e repetir os mesmos comandos, vai ver as mesmas respostas, com os mesmos protocolos e tokens.

**Se deu errado:** se fechou a janela sem apertar `Ctrl + C`, não tem problema: fechar a janela também derruba o servidor. Se mais tarde a porta 8377 aparecer ocupada, veja a dica do passo 3.

## O que você acabou de fazer

Sem perceber, você percorreu o ciclo de vida real do split payment na pele de um PSP (a instituição que processa pagamentos): informou à plataforma que uma transação de boleto existia (passo 6), avisou que ela foi paga com os impostos já separados (passo 7), viu o fisco conferir as contas e publicar uma correção (passo 8) e consumiu esse retorno pelo canal oficial de avisos, na ordem certa e sem perder nada (passo 9). É exatamente esse vai e vem que todo banco e fintech do Brasil vai precisar dominar até 2027; a diferença é que você rodou tudo na sua máquina, de graça, em 10 minutos.

Para continuar:

- [Referência do @splitbr/mock](/referencia/mock): todos os fluxos, flags e cenários de caos que o mock cobre.
- [Entenda o split payment](/split-payment): o que é essa mudança, de onde ela vem e por que ela afeta todo pagamento do país.
