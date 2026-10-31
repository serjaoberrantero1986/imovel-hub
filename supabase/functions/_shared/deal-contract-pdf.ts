// @ts-nocheck
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const PAGE = {
  width: 595.28,
  height: 841.89,
  left: 62,
  right: 62,
  top: 72,
  bottom: 62,
};
const ink = rgb(0.12, 0.14, 0.18),
  muted = rgb(0.38, 0.42, 0.48),
  accent = rgb(0.72, 0.03, 0.17);
const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
const pick = (vars: any, ...keys: string[]) =>
  clean(keys.map((key) => vars?.[key]).find(Boolean));
const roles: Record<string, string> = {
  owner: "CEDENTE/VENDEDOR",
  co_owner: "COPROPRIETÁRIO/CEDENTE",
  buyer: "CESSIONÁRIO/COMPRADOR",
  tenant: "LOCATÁRIO",
  landlord: "LOCADOR",
  spouse: "CÔNJUGE ANUENTE",
  guarantor: "FIADOR",
  representative: "REPRESENTANTE",
  other: "INTERVENIENTE",
};

function numeric(raw: unknown) {
  return Number(
    String(raw ?? "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", "."),
  );
}
function money(raw: unknown) {
  const number = numeric(raw);
  return Number.isFinite(number)
    ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : clean(raw);
}
function numberWords(raw: unknown) {
  const amount = Math.round(numeric(raw));
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999) return "";
  const unit = [
      "",
      "um",
      "dois",
      "três",
      "quatro",
      "cinco",
      "seis",
      "sete",
      "oito",
      "nove",
    ],
    teens = [
      "dez",
      "onze",
      "doze",
      "treze",
      "quatorze",
      "quinze",
      "dezesseis",
      "dezessete",
      "dezoito",
      "dezenove",
    ],
    tens = [
      "",
      "",
      "vinte",
      "trinta",
      "quarenta",
      "cinquenta",
      "sessenta",
      "setenta",
      "oitenta",
      "noventa",
    ],
    hundreds = [
      "",
      "cento",
      "duzentos",
      "trezentos",
      "quatrocentos",
      "quinhentos",
      "seiscentos",
      "setecentos",
      "oitocentos",
      "novecentos",
    ];
  const group = (n: number) => {
    if (n === 100) return "cem";
    const out: string[] = [],
      h = Math.floor(n / 100),
      r = n % 100;
    if (h) out.push(hundreds[h]);
    if (r >= 10 && r < 20) out.push(teens[r - 10]);
    else {
      const t = Math.floor(r / 10),
        u = r % 10;
      if (t) out.push(tens[t]);
      if (u) out.push(unit[u]);
    }
    return out.join(" e ");
  };
  if (amount === 0) return "zero reais";
  const parts: string[] = [],
    millions = Math.floor(amount / 1000000),
    thousands = Math.floor((amount % 1000000) / 1000),
    rest = amount % 1000;
  if (millions)
    parts.push(millions === 1 ? "um milhão" : `${group(millions)} milhões`);
  if (thousands)
    parts.push(thousands === 1 ? "mil" : `${group(thousands)} mil`);
  if (rest) parts.push(group(rest));
  return `${parts.join(" e ")} ${amount === 1 ? "real" : "reais"}`;
}
function participantText(person: any, possessory: boolean) {
  const standardLabel = roles[person?.role] || "INTERVENIENTE",
    label =
      possessory && ["owner", "co_owner"].includes(person?.role)
        ? "CEDENTE"
        : possessory && person?.role === "buyer"
          ? "CESSIONÁRIO"
          : standardLabel,
    details = [person?.nationality, person?.marital_status, person?.profession]
      .map(clean)
      .filter(Boolean)
      .join(", "),
    document = clean(
      person?.cpf_cnpj || person?.document_number || person?.tax_id,
    ),
    address = clean(person?.address || person?.full_address);
  return `${clean(person?.name) || "PARTE A QUALIFICAR"}, doravante denominado(a) ${label}${details ? `, ${details}` : ""}${document ? `, inscrito(a) no CPF/CNPJ sob nº ${document}` : ""}${address ? `, residente e domiciliado(a) em ${address}` : ""}.`;
}
function compose(content: any) {
  const snapshot = content?.snapshot?.content || {},
    dossier = snapshot?.dossier || {},
    inherited = dossier?.inherited_snapshot || {},
    property = inherited?.property || {},
    location = inherited?.location || {},
    vars = content?.variables || {},
    clauses = new Set((content?.clauses || []).map((item: any) => item.key)),
    participants = (snapshot?.participants || []).filter(
      (person: any) => person?.status !== "inactive",
    );
  const possessory =
      content?.template?.key === "possessory_rights_assignment" ||
      clauses.has("possessory_object") ||
      dossier?.property_legal_regime === "possessory_rights",
    rent =
      content?.template?.key === "rent_standard" ||
      dossier?.business_type === "rent";
  const title = possessory
    ? "INSTRUMENTO PARTICULAR DE CESSÃO DE DIREITOS POSSESSÓRIOS"
    : rent
      ? "CONTRATO PARTICULAR DE LOCAÇÃO DE IMÓVEL"
      : "INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL";
  const propertyName =
      pick(vars, "property_title") ||
      clean(property?.title) ||
      "imóvel descrito no dossiê documental",
    propertyCode = pick(vars, "property_code") || clean(property?.code),
    address = clean(
      property?.address ||
        property?.full_address ||
        inherited?.address ||
        location?.address,
    ),
    description = [
      propertyName,
      propertyCode && `código ${propertyCode}`,
      address,
    ]
      .filter(Boolean)
      .join(", ");
  const price = pick(vars, "negotiated_value", "rent_value"),
    payment = pick(vars, "payment_terms"),
    deadline = pick(vars, "deadline"),
    possession = pick(vars, "possession_event"),
    forum = pick(vars, "forum_city") || clean(location?.city),
    special = pick(vars, "special_conditions"),
    sections: { title: string; paragraphs: string[] }[] = [];
  sections.push({
    title: "DAS PARTES",
    paragraphs: participants.length
      ? participants.map((person: any) => participantText(person, possessory))
      : [
          "As partes serão qualificadas conforme os documentos aprovados e preservados no dossiê desta negociação.",
        ],
  });
  sections.push({
    title: "DO OBJETO",
    paragraphs: [
      possessory
        ? `Por este instrumento, o CEDENTE cede e transfere ao CESSIONÁRIO os direitos possessórios que exerce sobre ${description}, juntamente com suas acessões, benfeitorias e demais elementos descritos no dossiê documental. As partes reconhecem que o objeto deste negócio é a posse e os direitos dela decorrentes, sem declaração de propriedade registral inexistente.`
        : rent
          ? `O LOCADOR entrega ao LOCATÁRIO, para uso nos limites deste instrumento, o imóvel identificado como ${description}, no estado descrito na vistoria e nos documentos integrantes do dossiê.`
          : `O VENDEDOR declara vender ao COMPRADOR o imóvel identificado como ${description}, com suas acessões, benfeitorias, direitos e obrigações, conforme a documentação aprovada no dossiê.`,
    ],
  });
  if (clauses.has("possession_chain_warranty"))
    sections.push({
      title: "DA ORIGEM E DA CADEIA POSSESSÓRIA",
      paragraphs: [
        "O CEDENTE declara que a origem e a continuidade de sua posse correspondem aos documentos e informações apresentados no dossiê, responsabilizando-se pela autenticidade das declarações prestadas e pela informação de conflitos, oposições ou limitações de que tenha conhecimento.",
      ],
    });
  if (clauses.has("area_boundaries_access"))
    sections.push({
      title: "DA ÁREA, DOS LIMITES E DAS BENFEITORIAS",
      paragraphs: [
        "A identificação física, a área, as confrontações, os acessos, as passagens e as benfeitorias são aqueles conferidos pelas partes nos documentos e registros que integram o dossiê, prevalecendo a realidade documental expressamente aceita nesta versão.",
      ],
    });
  const formatted = price ? money(price) : "a ser definido pelas partes",
    written = price ? numberWords(price) : "";
  sections.push({
    title: rent
      ? "DO ALUGUEL E DA FORMA DE PAGAMENTO"
      : "DO PREÇO E DA FORMA DE PAGAMENTO",
    paragraphs: [
      rent
        ? `O aluguel ajustado é de ${formatted}${written ? ` (${written})` : ""}, a ser pago ${payment || "na forma e nos vencimentos acordados entre as partes"}.`
        : `Pelo objeto deste instrumento, o ${possessory ? "CESSIONÁRIO pagará ao CEDENTE" : "COMPRADOR pagará ao VENDEDOR"} o valor total de ${formatted}${written ? ` (${written})` : ""}${payment ? `, ${payment}` : ""}.`,
      ...(clauses.has("earnest_money")
        ? [
            "Eventual valor pago como sinal integra o preço e observará as condições de confirmação, desistência e restituição previstas neste instrumento e na legislação aplicável.",
          ]
        : []),
      ...(clauses.has("financing")
        ? [
            "A parcela sujeita a financiamento dependerá da aprovação da instituição financeira e do cumprimento tempestivo das exigências documentais pelas partes.",
          ]
        : []),
      ...(clauses.has("cash_only")
        ? [
            "O pagamento será realizado com recursos próprios, sem condição de obtenção de financiamento bancário.",
          ]
        : []),
    ],
  });
  if (clauses.has("possession"))
    sections.push({
      title: rent
        ? "DA ENTREGA E DO USO DO IMÓVEL"
        : "DA POSSE E DA ENTREGA DAS CHAVES",
      paragraphs: [
        `A entrega da posse e das chaves ocorrerá ${possession || deadline || "após o cumprimento das obrigações econômicas e documentais assumidas"}, ocasião em que passarão ao adquirente as responsabilidades pelo uso e conservação do imóvel, ressalvadas as obrigações anteriores expressamente atribuídas à outra parte.`,
      ],
    });
  if (clauses.has("regularization_cooperation"))
    sections.push({
      title: "DA COOPERAÇÃO PARA REGULARIZAÇÃO",
      paragraphs: [
        "As partes comprometem-se a fornecer documentos e declarações razoavelmente necessários a eventual procedimento de regularização, sem que este compromisso represente garantia automática de registro, usucapião ou outro resultado perante órgãos públicos ou terceiros.",
      ],
    });
  if (clauses.has("taxes_fees"))
    sections.push({
      title: "DOS TRIBUTOS, TAXAS E DESPESAS",
      paragraphs: [
        "Os tributos, taxas e encargos incidentes até a entrega da posse serão suportados por quem a lei ou este instrumento indicar como responsável. As despesas posteriores à entrega caberão à parte que receber o imóvel, sem prejuízo de ajuste expresso em sentido diverso.",
      ],
    });
  if (clauses.has("brokerage"))
    sections.push({
      title: "DA INTERMEDIAÇÃO IMOBILIÁRIA",
      paragraphs: [
        "A intermediação e a remuneração dos profissionais envolvidos obedecerão aos instrumentos de corretagem e parceria vinculados à negociação, que permanecem independentes das obrigações principais ora assumidas.",
      ],
    });
  if (special)
    sections.push({
      title: "DAS CONDIÇÕES ESPECÍFICAS",
      paragraphs: [special.endsWith(".") ? special : `${special}.`],
    });
  if (clauses.has("default_penalty"))
    sections.push({
      title: "DO INADIMPLEMENTO",
      paragraphs: [
        "O descumprimento de obrigação assumida constituirá a parte responsável em mora, sujeitando-a às consequências previstas neste instrumento e na legislação aplicável, preservados o contraditório, a boa-fé e a possibilidade de reparação por perdas e danos comprovados.",
      ],
    });
  if (clauses.has("electronic_signature"))
    sections.push({
      title: "DA ASSINATURA ELETRÔNICA",
      paragraphs: [
        "As partes reconhecem como válida a assinatura eletrônica deste instrumento e a respectiva trilha de evidências de autoria, integridade e tempo, atribuindo ao documento eletrônico a mesma eficácia do documento físico assinado.",
      ],
    });
  if (clauses.has("forum"))
    sections.push({
      title: "DO FORO",
      paragraphs: [
        `Fica eleito o foro da comarca de ${forum || "localização do imóvel"} para dirimir questões decorrentes deste instrumento, ressalvadas as hipóteses legais de competência obrigatória.`,
      ],
    });
  return {
    title,
    sections,
    closing: `E, por estarem de acordo, as partes firmam o presente instrumento eletrônico, declarando que leram, compreenderam e aceitaram integralmente o seu conteúdo${deadline ? `, com observância do prazo principal ajustado para ${deadline}` : ""}.`,
    participants,
    snapshotHash: clean(content?.snapshot?.hash),
  };
}

export async function buildDealContractPdf(content: any) {
  const document = compose(content),
    pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold),
    italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  pdf.setTitle(document.title);
  pdf.setAuthor("Web Imóveis");
  pdf.setSubject("Instrumento contratual imobiliário");
  pdf.setCreator("Web Imóveis");
  let page: any,
    y = 0;
  const width = PAGE.width - PAGE.left - PAGE.right;
  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.top;
    page.drawText(document.title.replace("INSTRUMENTO PARTICULAR DE ", ""), {
      x: PAGE.left,
      y: PAGE.height - 34,
      size: 7,
      font: bold,
      color: muted,
    });
    page.drawLine({
      start: { x: PAGE.left, y: PAGE.height - 42 },
      end: { x: PAGE.width - PAGE.right, y: PAGE.height - 42 },
      thickness: 0.5,
      color: rgb(0.8, 0.82, 0.85),
    });
  };
  const ensure = (height: number) => {
    if (!page || y - height < PAGE.bottom + 22) newPage();
  };
  const wrap = (text: string, font: any, size: number, max: number) => {
    const words = clean(text).split(" ").filter(Boolean),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= max || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const paragraph = (text: string, options: any = {}) => {
    const font = options.font || regular,
      size = options.size || 10.5,
      leading = options.leading || 15,
      indent = options.indent === false ? 0 : 22,
      lines = wrap(text, font, size, width - indent);
    ensure(lines.length * leading + 6);
    lines.forEach((line, index) => {
      const last = index === lines.length - 1,
        x = PAGE.left + (index === 0 ? indent : 0),
        available = width - (index === 0 ? indent : 0),
        words = line.split(" "),
        baseWidth = font.widthOfTextAtSize(line, size),
        gap =
          !last && words.length > 1
            ? (available - baseWidth) / (words.length - 1)
            : 0;
      let cursor = x;
      words.forEach((word, wordIndex) => {
        page.drawText(word, {
          x: cursor,
          y,
          size,
          font,
          color: options.color || ink,
        });
        cursor +=
          font.widthOfTextAtSize(word, size) +
          (wordIndex < words.length - 1
            ? font.widthOfTextAtSize(" ", size) + gap
            : 0);
      });
      y -= leading;
    });
    y -= 4;
  };
  newPage();
  const titleLines = wrap(document.title, bold, 14, width - 28);
  titleLines.forEach((line) => {
    page.drawText(line, {
      x: (PAGE.width - bold.widthOfTextAtSize(line, 14)) / 2,
      y,
      size: 14,
      font: bold,
      color: accent,
    });
    y -= 19;
  });
  y -= 14;
  paragraph(
    "Pelo presente instrumento particular, as partes abaixo qualificadas ajustam o negócio imobiliário descrito neste documento, de acordo com a base documental conferida e com as condições livremente aceitas.",
    { font: italic },
  );
  document.sections.forEach((section, index) => {
    ensure(54);
    y -= 7;
    page.drawText(
      `CLÁUSULA ${String(index + 1).padStart(2, "0")} - ${section.title}`,
      { x: PAGE.left, y, size: 10.5, font: bold, color: ink },
    );
    y -= 19;
    section.paragraphs.forEach((text) => paragraph(text));
  });
  y -= 6;
  paragraph(document.closing);
  if (
    document.participants.length &&
    y - (46 + document.participants.length * 72) < PAGE.bottom + 22
  )
    newPage();
  ensure(54);
  y -= 12;
  page.drawText("ASSINATURAS", {
    x: PAGE.left,
    y,
    size: 10.5,
    font: bold,
    color: ink,
  });
  y -= 22;
  document.participants.forEach((person: any) => {
    ensure(72);
    page.drawLine({
      start: { x: PAGE.left, y },
      end: { x: PAGE.left + 235, y },
      thickness: 0.7,
      color: muted,
    });
    y -= 15;
    page.drawText(clean(person?.name) || "Parte a qualificar", {
      x: PAGE.left,
      y,
      size: 9.5,
      font: bold,
      color: ink,
    });
    y -= 13;
    page.drawText(roles[person?.role] || "Interveniente", {
      x: PAGE.left,
      y,
      size: 8,
      font: regular,
      color: muted,
    });
    page.drawText(`\\assinatura-${clean(person?.id)}\\`, {
      x: PAGE.left,
      y: y - 14,
      size: 4,
      font: regular,
      color: rgb(1, 1, 1),
    });
    y -= 46;
  });
  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawLine({
      start: { x: PAGE.left, y: 42 },
      end: { x: PAGE.width - PAGE.right, y: 42 },
      thickness: 0.5,
      color: rgb(0.82, 0.84, 0.87),
    });
    item.drawText(`Web Imóveis | Página ${index + 1} de ${pages.length}`, {
      x: PAGE.left,
      y: 27,
      size: 7,
      font: regular,
      color: muted,
    });
    if (document.snapshotHash)
      item.drawText(`Integridade: ${document.snapshotHash.slice(0, 16)}...`, {
        x: PAGE.width - PAGE.right - 145,
        y: 27,
        size: 6.5,
        font: regular,
        color: muted,
      });
  });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}
