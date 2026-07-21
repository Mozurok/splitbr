/**
 * Conteudo narrativo dos casos guiados (voz da empresa, PT-BR, D-4/D-7). Cada
 * caso referencia uma entrada de dados.ts (os numeros reais); o componente
 * computa o split via engine.ts. Aqui so vive a narrativa e o roteiro.
 */
import { cicloFeliz, correcaoFisco, parcial, type EntradaCaso } from "./dados.js";

export interface PassoDemo {
  titulo: string;
  /** Narrativa na voz da empresa. */
  narrativa: string;
  /** Coach tip (padrao Front): introduz a mecanica na primeira vez. */
  coachTip?: string;
  /** Quando true, o painel de resultado mostra o dinheiro ja segregado. */
  mostraResultado: boolean;
  /** Conteudo do modo tecnico para este passo (usado no painel de codigo, Slice 5). */
  tecnico?: { endpoint: string; descricao: string };
}

export interface CasoDemo {
  id: EntradaCaso["id"];
  titulo: string;
  promessa: string;
  entrada: EntradaCaso;
  passos: readonly PassoDemo[];
}

export const casoCicloFeliz: CasoDemo = {
  id: "ciclo-feliz",
  titulo: "Uma venda comum",
  promessa: "Do boleto ao imposto separado, sem você fazer nada.",
  entrada: cicloFeliz,
  passos: [
    {
      titulo: "Você emite a nota",
      narrativa:
        "Você vendeu R$ 1.000,00 e emitiu a nota. Até aqui, nada de imposto: só o registro de que a venda aconteceu.",
      mostraResultado: false,
      tecnico: {
        endpoint: "POST /api/v1/boleto",
        descricao: "O PSP avisa a plataforma que existe um boleto, com CBS e IBS informados.",
      },
    },
    {
      titulo: "O boleto entra na plataforma",
      narrativa:
        "O banco registrou o boleto na Plataforma Pública do Split Payment, o sistema por onde os pagamentos passam.",
      coachTip:
        "A plataforma é fechada: só bancos e instituições de pagamento homologados falam com ela. Você nunca chama a API; quem chama é o seu banco.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto", descricao: "Resposta 201 com um resourceId." },
    },
    {
      titulo: "Seu cliente paga",
      narrativa: "O cliente pagou o boleto de R$ 1.000,00. O banco avisa a plataforma.",
      mostraResultado: false,
      tecnico: {
        endpoint: "POST /api/v1/boleto/informe-preliminar-pagamento",
        descricao: "Quanto foi pago e quanto de CBS/IBS segregar.",
      },
    },
    {
      titulo: "A segregação acontece",
      narrativa:
        "No pagamento, o imposto é separado: CBS e IBS vão direto ao fisco antes de o dinheiro chegar em você. O que sobra é seu.",
      coachTip: "Isto é a segregação: o imposto sai no pagamento, não meses depois.",
      mostraResultado: true,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "O PSP puxa os retornos do fisco (evento RSUP com o valor segregado).",
      },
    },
    {
      titulo: "Pronto",
      narrativa:
        "O imposto foi separado automaticamente. Você recebeu o líquido e o fisco recebeu o dele, sem boleto extra.",
      mostraResultado: true,
    },
  ],
};

export const casoCorrecao: CasoDemo = {
  id: "correcao-fisco",
  titulo: "Quando o fisco corrige",
  promessa: "A conta informada estava errada; a plataforma corrige sozinha.",
  entrada: correcaoFisco,
  passos: [
    {
      titulo: "Uma venda com CBS informada a menor",
      narrativa:
        "Você vendeu R$ 1.000,00, mas a CBS foi informada como R$ 6,00 (o correto seria R$ 9,00). Acontece.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto", descricao: "CBS informada abaixo do devido." },
    },
    {
      titulo: "O cliente paga",
      narrativa: "O boleto é pago. A plataforma recebe o informe com o valor a menor.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto/informe-preliminar-pagamento", descricao: "Informe preliminar." },
    },
    {
      titulo: "O fisco confere e discorda",
      narrativa:
        "O fisco recalcula e vê que a CBS certa era R$ 9,00, não R$ 6,00. Um aviso de correção é emitido.",
      coachTip:
        "O Retorno Super Inteligente é o canal por onde o fisco devolve correções (código RSUP). Nada se perde.",
      mostraResultado: false,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "Evento RSUP101 com o valor corrigido (vlCbsCorr).",
      },
    },
    {
      titulo: "A correção entra",
      narrativa:
        "A plataforma aplica o valor corrigido automaticamente. O imposto separado passa a refletir os R$ 9,00 corretos.",
      mostraResultado: true,
    },
  ],
};

export const casoParcial: CasoDemo = {
  id: "parcial",
  titulo: "Pagamento parcial",
  promessa: "Pagou metade? O imposto acompanha o que foi pago.",
  entrada: parcial,
  passos: [
    {
      titulo: "Uma nota de R$ 1.000,00",
      narrativa: "Você emitiu a nota de R$ 1.000,00, com CBS R$ 9,00 e IBS R$ 1,00 informados.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto", descricao: "Nota de R$ 1.000,00." },
    },
    {
      titulo: "O cliente paga metade",
      narrativa: "O cliente pagou R$ 500,00, metade da nota. E agora?",
      mostraResultado: false,
      tecnico: {
        endpoint: "POST /api/v1/boleto/informe-preliminar-pagamento",
        descricao: "vlPago = 50000 centavos (metade).",
      },
    },
    {
      titulo: "A segregação proporcional",
      narrativa:
        "O imposto separado é proporcional ao que foi pago: sobre os R$ 500,00 pagos, o fisco leva a parte correspondente. O resto fica em aberto para o próximo pagamento.",
      coachTip: "A fórmula segrega min((pago/nota) x tributo; tributo), truncado em centavos.",
      mostraResultado: true,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "Retorno com o valor segregado proporcional.",
      },
    },
  ],
};

export const casos: readonly CasoDemo[] = [casoCicloFeliz, casoCorrecao, casoParcial];
