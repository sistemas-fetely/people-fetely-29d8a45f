export const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export const bancos = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú Unibanco" },
  { codigo: "077", nome: "Inter" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "290", nome: "PagSeguro" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "422", nome: "Safra" },
];

export const parentescos = [
  "Cônjuge", "Companheiro(a)", "Filho(a)", "Enteado(a)",
  "Pai", "Mãe", "Irmão(ã)", "Avô(ó)", "Outro",
];

export const statusStyles: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 border-0",
  email_enviado: "bg-sky-100 text-sky-700 border-0",
  preenchido: "bg-emerald-100 text-emerald-700 border-0",
  cadastrado: "bg-blue-100 text-blue-700 border-0",
  expirado: "bg-muted text-muted-foreground border-0",
  cancelado: "bg-red-100 text-red-700 border-0",
};
