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
  promessa: "Do boleto ao imposto separado, sem voce fazer nada.",
  entrada: cicloFeliz,
  passos: [
    {
      titulo: "Voce emite a nota",
      narrativa:
        "Voce vendeu R$ 1.000,00 e emitiu a nota. Ate aqui, nada de imposto: so o registro de que a venda aconteceu.",
      mostraResultado: false,
      tecnico: {
        endpoint: "POST /api/v1/boleto",
        descricao: "O PSP avisa a plataforma que existe um boleto, com CBS e IBS informados.",
      },
    },
    {
      titulo: "O boleto entra na plataforma",
      narrativa:
        "O banco registrou o boleto na Plataforma Publica do Split Payment, o sistema por onde os pagamentos passam.",
      coachTip:
        "A plataforma e fechada: so bancos e instituicoes de pagamento homologados falam com ela. Voce nunca chama a API; quem chama e o seu banco.",
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
      titulo: "A segregacao acontece",
      narrativa:
        "No pagamento, o imposto e separado: CBS e IBS vao direto ao fisco antes de o dinheiro chegar em voce. O que sobra e seu.",
      coachTip: "Isto e a segregacao: o imposto sai no pagamento, nao meses depois.",
      mostraResultado: true,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "O PSP puxa os retornos do fisco (evento RSUP com o valor segregado).",
      },
    },
    {
      titulo: "Pronto",
      narrativa:
        "O imposto foi separado automaticamente. Voce recebeu o liquido e o fisco recebeu o dele, sem boleto extra.",
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
        "Voce vendeu R$ 1.000,00, mas a CBS foi informada como R$ 6,00 (o correto seria R$ 9,00). Acontece.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto", descricao: "CBS informada abaixo do devido." },
    },
    {
      titulo: "O cliente paga",
      narrativa: "O boleto e pago. A plataforma recebe o informe com o valor a menor.",
      mostraResultado: false,
      tecnico: { endpoint: "POST /api/v1/boleto/informe-preliminar-pagamento", descricao: "Informe preliminar." },
    },
    {
      titulo: "O fisco confere e discorda",
      narrativa:
        "O fisco recalcula e ve que a CBS certa era R$ 9,00, nao R$ 6,00. Um aviso de correcao e emitido.",
      coachTip:
        "O Retorno Super Inteligente e o canal por onde o fisco devolve correcoes (codigo RSUP). Nada se perde.",
      mostraResultado: false,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "Evento RSUP101 com o valor corrigido (vlCbsCorr).",
      },
    },
    {
      titulo: "A correcao entra",
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
      narrativa: "Voce emitiu a nota de R$ 1.000,00, com CBS R$ 9,00 e IBS R$ 1,00 informados.",
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
      titulo: "A segregacao proporcional",
      narrativa:
        "O imposto separado e proporcional ao que foi pago: sobre os R$ 500,00 pagos, o fisco leva a parte correspondente. O resto fica em aberto para o proximo pagamento.",
      coachTip: "A formula segrega min((pago/nota) x tributo; tributo), truncado em centavos.",
      mostraResultado: true,
      tecnico: {
        endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
        descricao: "Retorno com o valor segregado proporcional.",
      },
    },
  ],
};

export const casos: readonly CasoDemo[] = [casoCicloFeliz, casoCorrecao, casoParcial];
