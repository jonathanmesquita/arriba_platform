/* =====================================================================
   Regras por coluna (o "schema" do validador)

   Inspirado no CSV Schema do csv-validator (National Archives): em vez
   de sair validando por adivinhacao, o usuario declara o que cada coluna
   deve ser, e o motor confere linha a linha. A diferenca e que aqui o
   schema e um objeto simples, montado na tela - sem linguagem propria
   para aprender.

   Um schema e:
     { nome, colunas: [ { coluna, obrigatorio, tipo, unico, tamanhoMax,
                          valores, regex, ajuda } ] }

   Cada achado sai como:
     { linha, coluna, indiceColuna, valor, regra, mensagem, gravidade }

   Nada aqui conhece DataCob - os layouts prontos ficam em schemas.js.
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   Tipos

   `validar` devolve "" quando esta certo, ou a mensagem do problema.
   Campo vazio NUNCA e tratado aqui: quem cuida de vazio e a regra
   `obrigatorio`. Assim uma coluna opcional com tipo data nao reclama de
   toda linha em branco.
   --------------------------------------------------------------------- */
export const TIPOS = {
  texto: {
    nome: "Texto livre",
    validar: () => ""
  },
  inteiro: {
    nome: "Número inteiro",
    validar: (v) => (/^-?\d+$/.test(v) ? "" : "não é um número inteiro")
  },
  decimal: {
    nome: "Número decimal (1234,56 ou 1234.56)",
    validar: (v) => (/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$|^-?\d+(\.\d+)?$/.test(v)
      ? ""
      : "não é um número decimal válido")
  },
  data: {
    nome: "Data (DD/MM/AAAA ou AAAA-MM-DD)",
    validar: (v) => validarData(v)
  },
  cpf: {
    nome: "CPF",
    validar: (v) => (validarCpf(v) ? "" : "CPF inválido (dígito verificador não confere)")
  },
  cnpj: {
    nome: "CNPJ",
    validar: (v) => (validarCnpj(v) ? "" : "CNPJ inválido (dígito verificador não confere)")
  },
  cpfCnpj: {
    nome: "CPF ou CNPJ",
    validar: (v) => {
      const d = so(v);
      if (d.length === 11) return validarCpf(d) ? "" : "CPF inválido (dígito verificador não confere)";
      if (d.length === 14) return validarCnpj(d) ? "" : "CNPJ inválido (dígito verificador não confere)";
      return `tem ${d.length} dígito(s); CPF tem 11 e CNPJ tem 14`;
    }
  },
  email: {
    nome: "E-mail",
    validar: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "não parece um e-mail")
  },
  uf: {
    nome: "UF (sigla do estado)",
    validar: (v) => (UFS.includes(v.trim().toUpperCase()) ? "" : "não é uma UF válida")
  },
  cep: {
    nome: "CEP",
    validar: (v) => (so(v).length === 8 ? "" : "CEP deve ter 8 dígitos")
  },
  telefone: {
    nome: "Telefone (8 a 11 dígitos)",
    validar: (v) => {
      const d = so(v);
      return d.length >= 8 && d.length <= 11 ? "" : `tem ${d.length} dígito(s); esperado de 8 a 11`;
    }
  }
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const so = (valor) => String(valor || "").replace(/\D/g, "");

/* CPF e CNPJ: digito verificador por modulo 11. A sequencia repetida
   (111.111.111-11) passa na conta mas e recusada em qualquer cadastro,
   entao tambem cai aqui. Mesmo criterio do gerador de massa do site. */
export function validarCpf(valor) {
  const cpf = so(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let casa = 9; casa < 11; casa += 1) {
    let soma = 0;
    for (let i = 0; i < casa; i += 1) soma += Number(cpf[i]) * (casa + 1 - i);
    let digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(cpf[casa])) return false;
  }
  return true;
}

export function validarCnpj(valor) {
  const cnpj = so(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calcular = (tamanho) => {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(cnpj[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13]);
}

/* Data: aceita DD/MM/AAAA e AAAA-MM-DD, e confere se o dia existe de
   verdade (31/02 tem formato certo e data errada). */
export function validarData(valor) {
  const texto = String(valor || "").trim();
  let dia, mes, ano;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    [dia, mes, ano] = texto.split("/").map(Number);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    [ano, mes, dia] = texto.split("-").map(Number);
  } else {
    return "formato inválido (use DD/MM/AAAA ou AAAA-MM-DD)";
  }

  if (mes < 1 || mes > 12) return `mês ${mes} não existe`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > ultimoDia) return `dia ${dia} não existe em ${String(mes).padStart(2, "0")}/${ano}`;
  return "";
}

/* ---------------------------------------------------------------------
   Motor

   dados = { cabecalho, linhas } (saida do parser)
   schema = { colunas: [...] }
   --------------------------------------------------------------------- */
export function validarComSchema(dados, schema) {
  const achados = [];
  if (!schema || !schema.colunas?.length) return achados;

  const indicePorNome = new Map(dados.cabecalho.map((nome, i) => [normalizar(nome), i]));
  const vistosPorColuna = new Map(); // coluna -> Map(valor -> primeira linha)

  // Coluna do schema que nao existe no arquivo: erro de estrutura, e
  // aparece uma vez so (nao uma vez por linha).
  schema.colunas.forEach((regra) => {
    if (!indicePorNome.has(normalizar(regra.coluna))) {
      achados.push({
        linha: 1,
        coluna: regra.coluna,
        indiceColuna: -1,
        valor: "",
        regra: "coluna-ausente",
        gravidade: "erro",
        mensagem: `O schema espera a coluna "${regra.coluna}", que não existe no arquivo.`
      });
    }
  });

  dados.linhas.forEach((registro) => {
    schema.colunas.forEach((regra) => {
      const indice = indicePorNome.get(normalizar(regra.coluna));
      if (indice === undefined) return;

      const valorBruto = registro.campos[indice] ?? "";
      const valor = String(valorBruto).trim();
      const base = { linha: registro.linha, coluna: regra.coluna, indiceColuna: indice, valor };

      if (!valor) {
        if (regra.obrigatorio) {
          achados.push({ ...base, regra: "obrigatorio", gravidade: "erro", mensagem: `"${regra.coluna}" é obrigatório e está vazio.` });
        }
        return; // vazio nao passa pelos outros testes, de proposito
      }

      if (regra.tipo && TIPOS[regra.tipo]) {
        const problema = TIPOS[regra.tipo].validar(valor);
        if (problema) {
          achados.push({ ...base, regra: "tipo", gravidade: "erro", mensagem: `"${regra.coluna}": ${problema}.` });
        }
      }

      if (regra.tamanhoMax && valor.length > Number(regra.tamanhoMax)) {
        achados.push({ ...base, regra: "tamanho", gravidade: "erro", mensagem: `"${regra.coluna}" tem ${valor.length} caracteres; o máximo é ${regra.tamanhoMax}.` });
      }

      if (regra.valores?.length) {
        const aceitos = regra.valores.map((v) => normalizar(v));
        if (!aceitos.includes(normalizar(valor))) {
          achados.push({ ...base, regra: "valores", gravidade: "erro", mensagem: `"${regra.coluna}" = "${valor}" não está na lista aceita (${regra.valores.join(", ")}).` });
        }
      }

      if (regra.regex) {
        let re = null;
        try { re = new RegExp(regra.regex); } catch { re = null; }
        if (re && !re.test(valor)) {
          achados.push({ ...base, regra: "regex", gravidade: "erro", mensagem: `"${regra.coluna}" = "${valor}" não casa com o padrão ${regra.regex}.` });
        }
      }

      if (regra.unico) {
        if (!vistosPorColuna.has(regra.coluna)) vistosPorColuna.set(regra.coluna, new Map());
        const vistos = vistosPorColuna.get(regra.coluna);
        const chave = normalizar(valor);
        if (vistos.has(chave)) {
          achados.push({ ...base, regra: "unico", gravidade: "erro", mensagem: `"${regra.coluna}" = "${valor}" repetido (já apareceu na linha ${vistos.get(chave)}).` });
        } else {
          vistos.set(chave, registro.linha);
        }
      }
    });
  });

  return achados;
}

/* Comparacao de nome de coluna sem acento, sem caixa e sem espaco -
   "Cpf_Cnpj", "cpf_cnpj" e "CPF_CNPJ " sao a mesma coluna. */
export function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase();
}

/* Linhas duplicadas inteiras: nao e regra de coluna, e conferencia do
   arquivo - por isso fica separada e e opcional na tela. */
export function acharLinhasDuplicadas(dados) {
  const vistos = new Map();
  const achados = [];
  dados.linhas.forEach((registro) => {
    const chave = registro.campos.map((c) => String(c).trim()).join("\u0001");
    if (vistos.has(chave)) {
      achados.push({
        linha: registro.linha,
        coluna: "(linha inteira)",
        indiceColuna: -1,
        valor: "",
        regra: "linha-duplicada",
        gravidade: "aviso",
        mensagem: `Linha idêntica à linha ${vistos.get(chave)}.`
      });
    } else {
      vistos.set(chave, registro.linha);
    }
  });
  return achados;
}
