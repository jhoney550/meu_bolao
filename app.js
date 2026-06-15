const SUPABASE_URL = "https://wdejdywwabvfhcogjojj.supabase.co";
const SUPABASE_KEY = "sb_publishable_djDg2w0MmWuHmrTcdsBX3g_SM01x4WZ";

const USUARIO_ADMIN_TESTE = "admin";
const SENHA_ADMIN_TESTE = "dbadbs";

const CONFIG_PADRAO = {
  id: 1,
  time_casa: "Brasil",
  time_fora: "Haiti",
  valor_aposta: 10,
  chave_pix: "05605646192"
};

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let apostasCache = [];
let configBolao = { ...CONFIG_PADRAO };
let apostaComprovanteAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
  const cpf = document.getElementById("cpf");
  const whatsapp = document.getElementById("whatsapp");
  const formAposta = document.getElementById("formAposta");
  const formConfigBolao = document.getElementById("formConfigBolao");
  const senhaAdmin = document.getElementById("senhaAdmin");
  const usuarioAdmin = document.getElementById("usuarioAdmin");

  if (cpf) cpf.addEventListener("input", e => e.target.value = mascaraCPF(e.target.value));
  if (whatsapp) whatsapp.addEventListener("input", e => e.target.value = mascaraTelefone(e.target.value));
  if (formAposta) formAposta.addEventListener("submit", enviarAposta);
  if (formConfigBolao) formConfigBolao.addEventListener("submit", salvarConfigBolao);

  document.getElementById("timeCasaConfig")?.addEventListener("input", atualizarPreviewConfig);
  document.getElementById("timeForaConfig")?.addEventListener("input", atualizarPreviewConfig);

  if (senhaAdmin) senhaAdmin.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); });

  if (usuarioAdmin) {
    usuarioAdmin.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); });
    usuarioAdmin.focus();
  }

  await carregarConfigBolao();
  aplicarConfigBolaoNaTela();
  await carregarApostas();
});

async function carregarConfigBolao() {
  const { data, error } = await supabaseClient
    .from("configuracao_bolao")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar configuração:", error);
    alert("Erro ao carregar configuração do bolão.");
    return;
  }

  if (data) {
    configBolao = {
      id: 1,
      time_casa: data.time_casa || CONFIG_PADRAO.time_casa,
      time_fora: data.time_fora || CONFIG_PADRAO.time_fora,
      valor_aposta: Number(data.valor_aposta || CONFIG_PADRAO.valor_aposta),
      chave_pix: data.chave_pix || CONFIG_PADRAO.chave_pix
    };
  }
}

async function carregarApostas() {
  const { data, error } = await supabaseClient
    .from("apostas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar apostas:", error);
    alert("Erro ao carregar apostas.");
    return;
  }

  apostasCache = data || [];
  renderPublico();
  renderAdmin();
}

async function salvarConfigBolao(event) {
  event.preventDefault();

  const timeCasa = document.getElementById("timeCasaConfig").value.trim();
  const timeFora = document.getElementById("timeForaConfig").value.trim();

  if (!timeCasa || !timeFora) {
    alert("Informe os dois times do bolão.");
    return;
  }

  const novaConfig = {
    id: 1,
    time_casa: timeCasa,
    time_fora: timeFora,
    valor_aposta: getValorAposta(),
    chave_pix: getChavePix(),
    atualizado_em: new Date().toISOString()
  };

 const { data, error } = await supabaseClient
  .from("configuracao_bolao")
  .update({
    time_casa: timeCasa,
    time_fora: timeFora,
    atualizado_em: new Date().toISOString()
  })
  .eq("id", 1)
  .select()
  .single();

  if (error) {
    console.error("Erro ao salvar configuração:", error);
    alert("Erro ao salvar configuração. Confira as políticas RLS da tabela configuracao_bolao.");
    return;
  }

  configBolao = {
    id: 1,
    time_casa: data.time_casa,
    time_fora: data.time_fora,
    valor_aposta: Number(data.valor_aposta),
    chave_pix: data.chave_pix
  };

  aplicarConfigBolaoNaTela();
  await carregarApostas();
  alert("Configuração do bolão salva.");
}

function aplicarConfigBolaoNaTela() {
  const jogo = nomeJogo(configBolao);
  const tituloJogo = document.getElementById("tituloJogo");
  const cardJogoTexto = document.getElementById("cardJogoTexto");
  const labelTimeCasa = document.getElementById("labelTimeCasa");
  const labelTimeFora = document.getElementById("labelTimeFora");
  const footerJogo = document.getElementById("footerJogo");
  const timeCasaConfig = document.getElementById("timeCasaConfig");
  const timeForaConfig = document.getElementById("timeForaConfig");
  const previewJogoConfig = document.getElementById("previewJogoConfig");
  const pixKey = document.getElementById("pixKey");

  if (tituloJogo) tituloJogo.textContent = jogo;
  if (tituloJogo) document.title = `Bolão ${jogo}`;
  if (cardJogoTexto) cardJogoTexto.textContent = jogo;
  if (labelTimeCasa) labelTimeCasa.textContent = configBolao.time_casa;
  if (labelTimeFora) labelTimeFora.textContent = configBolao.time_fora;
  if (footerJogo) footerJogo.textContent = `Bolão ${jogo}`;
  if (timeCasaConfig) timeCasaConfig.value = configBolao.time_casa;
  if (timeForaConfig) timeForaConfig.value = configBolao.time_fora;
  if (previewJogoConfig) previewJogoConfig.textContent = jogo;
  if (pixKey) pixKey.textContent = getChavePix();
}

function atualizarPreviewConfig() {
  const timeCasa = document.getElementById("timeCasaConfig")?.value.trim() || CONFIG_PADRAO.time_casa;
  const timeFora = document.getElementById("timeForaConfig")?.value.trim() || CONFIG_PADRAO.time_fora;
  const previewJogoConfig = document.getElementById("previewJogoConfig");
  if (previewJogoConfig) previewJogoConfig.textContent = nomeJogo({ time_casa: timeCasa, time_fora: timeFora });
}

function nomeJogo(config = configBolao) {
  return `${config.time_casa} x ${config.time_fora}`;
}

function getValorAposta() {
  return Number(configBolao.valor_aposta || CONFIG_PADRAO.valor_aposta);
}

function getChavePix() {
  return String(configBolao.chave_pix || CONFIG_PADRAO.chave_pix);
}

async function enviarAposta(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cpf = somenteNumeros(document.getElementById("cpf").value);
  const whatsapp = somenteNumeros(document.getElementById("whatsapp").value);
  const placarCasa = Number(document.getElementById("brasil").value);
  const placarFora = Number(document.getElementById("haiti").value);

  if (!validarCPF(cpf)) {
    alert("CPF inválido.");
    return;
  }

  if (whatsapp.length < 10) {
    alert("WhatsApp inválido.");
    return;
  }

  const aposta = {
    nome,
    cpf,
    whatsapp,
    jogo: nomeJogo(),
    time_casa: configBolao.time_casa,
    time_fora: configBolao.time_fora,
    palpite_casa: placarCasa,
    palpite_fora: placarFora,
    valor: getValorAposta(),
    status_pagamento: "pendente"
  };

  const { data, error } = await supabaseClient
    .from("apostas")
    .insert(aposta)
    .select()
    .single();

  if (error) {
    console.error("Erro ao cadastrar aposta:", error);

    if (error.code === "23505" || String(error.message).toLowerCase().includes("duplicate")) {
      alert("Já existe uma aposta cadastrada para este CPF.");
      return;
    }

    alert("Erro ao cadastrar aposta. Confira o console e as permissões da tabela apostas.");
    return;
  }

  gerarComprovante(data);
  document.getElementById("formAposta").reset();
  document.getElementById("brasil").value = 0;
  document.getElementById("haiti").value = 0;

  await carregarApostas();
}

function renderPublico() {
  const tbody = document.getElementById("listaPublica");
  const totalPublico = document.getElementById("totalPublico");

  if (!tbody || !totalPublico) return;

  tbody.innerHTML = "";

  apostasCache.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(a.nome)}</td>
      <td>${formatarPalpite(a)}</td>
      <td class="${a.status_pagamento === "pago" ? "status-pago" : "status-pendente"}">${a.status_pagamento}</td>
      <td>${new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
    `;
    tbody.appendChild(tr);
  });

  totalPublico.textContent = `${apostasCache.length} aposta${apostasCache.length === 1 ? "" : "s"}`;
}

function renderAdmin() {
  const tbody = document.getElementById("listaAdmin");
  const admTotal = document.getElementById("admTotal");
  const admPagas = document.getElementById("admPagas");
  const admArrecadado = document.getElementById("admArrecadado");

  if (!tbody || !admTotal || !admPagas || !admArrecadado) return;

  tbody.innerHTML = "";

  const pagas = apostasCache.filter(a => a.status_pagamento === "pago");

  admTotal.textContent = apostasCache.length;
  admPagas.textContent = pagas.length;
  admArrecadado.textContent = dinheiro(pagas.reduce((total, a) => total + Number(a.valor || 0), 0));

  apostasCache.forEach(a => {
    const novoStatus = a.status_pagamento === "pago" ? "pendente" : "pago";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(a.nome)}</td>
      <td>${mascaraCPF(a.cpf)}</td>
      <td>${mascaraTelefone(a.whatsapp)}</td>
      <td>${formatarPalpite(a)}</td>
      <td class="${a.status_pagamento === "pago" ? "status-pago" : "status-pendente"}">${a.status_pagamento}</td>
      <td>
        <button class="btn-secundario" onclick="alterarStatus('${a.id}', '${novoStatus}')">
          Marcar ${novoStatus}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarPalpite(aposta) {
  return escapeHtml(formatarPalpiteTexto(aposta));
}

function formatarPalpiteTexto(aposta) {
  const timeCasa = aposta.time_casa || "Brasil";
  const timeFora = aposta.time_fora || "Haiti";
  const placarCasa = aposta.palpite_casa ?? 0;
  const placarFora = aposta.palpite_fora ?? 0;

  return `${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}`;
}

function gerarComprovante(aposta) {
  const div = document.getElementById("dadosComprovante");
  const tela = document.getElementById("comprovante");
  const qrPixBox = document.getElementById("qrPixBox");
  const qrPixImagem = document.getElementById("qrPixImagem");
  const data = new Date(aposta.created_at).toLocaleString("pt-BR");

  if (!div || !tela) return;

  apostaComprovanteAtual = aposta;

  if (qrPixBox && qrPixImagem) {
    qrPixBox.classList.add("oculto");
    qrPixImagem.removeAttribute("src");
  }

  div.innerHTML = `
    <p><strong>Nº comprovante:</strong> ${aposta.id}</p>
    <p><strong>Nome:</strong> ${escapeHtml(aposta.nome)}</p>
    <p><strong>Jogo:</strong> ${escapeHtml(aposta.jogo)}</p>
    <p><strong>Palpite:</strong> ${formatarPalpite(aposta)}</p>
    <p><strong>Valor:</strong> ${dinheiro(aposta.valor)}</p>
    <p><strong>Status:</strong> ${aposta.status_pagamento}</p>
    <p><strong>Chave Pix:</strong> ${getChavePix()}</p>
    <p><strong>Data:</strong> ${data}</p>
    <hr>
    <p>Guarde este comprovante. O pagamento será validado pelo administrador após conferência do Pix.</p>
  `;

  tela.classList.remove("oculto");
  tela.querySelector("button")?.focus();
}

function fecharComprovante() {
  const dados = document.getElementById("dadosComprovante");
  const comprovante = document.getElementById("comprovante");

  if (dados) dados.innerHTML = "";
  if (comprovante) comprovante.classList.add("oculto");

  document.getElementById("qrPixBox")?.classList.add("oculto");
  document.getElementById("qrPixImagem")?.removeAttribute("src");
  apostaComprovanteAtual = null;
  document.getElementById("nome")?.focus();
}

function gerarQrCodePix() {
  const qrPixBox = document.getElementById("qrPixBox");
  const qrPixImagem = document.getElementById("qrPixImagem");

  if (!apostaComprovanteAtual || !qrPixBox || !qrPixImagem) return;

  const payload = gerarPayloadPix(apostaComprovanteAtual);
  const urlQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(payload)}`;

  qrPixImagem.src = urlQr;
  qrPixBox.classList.remove("oculto");
}

function gerarPayloadPix(aposta) {
  const merchantAccount = montarCampo("00", "br.gov.bcb.pix") +
    montarCampo("01", getChavePix()) +
    montarCampo("02", `Bolao ${aposta.id}`);

  const txid = normalizarPixTexto(aposta.id).replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

  const payloadSemCrc =
    montarCampo("00", "01") +
    montarCampo("26", merchantAccount) +
    montarCampo("52", "0000") +
    montarCampo("53", "986") +
    montarCampo("54", Number(aposta.valor || getValorAposta()).toFixed(2)) +
    montarCampo("58", "BR") +
    montarCampo("59", normalizarPixTexto("Bolao")) +
    montarCampo("60", normalizarPixTexto("Cuiaba")) +
    montarCampo("62", montarCampo("05", txid)) +
    "6304";

  return payloadSemCrc + crc16Pix(payloadSemCrc);
}

function montarCampo(id, valor) {
  const texto = String(valor);
  const tamanho = String(texto.length).padStart(2, "0");
  return `${id}${tamanho}${texto}`;
}

function normalizarPixTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, 25);
}

function crc16Pix(payload) {
  let crc = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

async function alterarStatus(id, status) {
  const { error } = await supabaseClient
    .from("apostas")
    .update({ status_pagamento: status })
    .eq("id", id);

  if (error) {
    console.error("Erro ao alterar status:", error);
    alert("Erro ao alterar status. Confira a política de update no Supabase.");
    return;
  }

  await carregarApostas();
}

function exportarExcel() {
  if (typeof XLSX === "undefined") {
    alert("Biblioteca de exportação não carregada.");
    return;
  }

  const dados = apostasCache.map(a => ({
    Nome: a.nome,
    CPF: a.cpf,
    WhatsApp: a.whatsapp,
    Jogo: a.jogo || `${a.time_casa || "Brasil"} x ${a.time_fora || "Haiti"}`,
    Palpite: formatarPalpiteTexto(a),
    Valor: a.valor,
    Status: a.status_pagamento,
    Data: new Date(a.created_at).toLocaleString("pt-BR")
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, "Apostas");
  XLSX.writeFile(arquivo, "bolao-apostas.xlsx");
}

async function limparTudo() {
  if (!confirm("Tem certeza que deseja apagar todas as apostas do banco?")) return;

  const { error } = await supabaseClient
    .from("apostas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("Erro ao limpar apostas:", error);
    alert("Erro ao limpar apostas. Para usar este botão, precisa liberar DELETE nas políticas RLS.");
    return;
  }

  await carregarApostas();
}

function loginAdmin() {
  const usuarioAdmin = document.getElementById("usuarioAdmin");
  const senhaAdmin = document.getElementById("senhaAdmin");
  const adminLogin = document.getElementById("adminLogin");
  const adminArea = document.getElementById("adminArea");

  if (!usuarioAdmin || !senhaAdmin || !adminLogin || !adminArea) return;

  const usuario = usuarioAdmin.value.trim();
  const senha = senhaAdmin.value;

  if (usuario !== USUARIO_ADMIN_TESTE || senha !== SENHA_ADMIN_TESTE) {
    alert("Usuario ou senha incorretos.");
    return;
  }

  adminArea.classList.remove("oculto");
  adminLogin.classList.add("oculto");
  usuarioAdmin.value = "";
  senhaAdmin.value = "";
  mostrarAbaAdmin("painel");
  aplicarConfigBolaoNaTela();
  renderAdmin();
}

function sairAdmin() {
  const usuarioAdmin = document.getElementById("usuarioAdmin");
  const senhaAdmin = document.getElementById("senhaAdmin");
  const adminLogin = document.getElementById("adminLogin");
  const adminArea = document.getElementById("adminArea");

  if (!usuarioAdmin || !senhaAdmin || !adminLogin || !adminArea) return;

  adminArea.classList.add("oculto");
  adminLogin.classList.remove("oculto");
  usuarioAdmin.value = "";
  senhaAdmin.value = "";
  usuarioAdmin.focus();
}

function mostrarAbaAdmin(aba) {
  const abaPainel = document.getElementById("abaPainelAdmin");
  const abaConfig = document.getElementById("abaConfigBolao");
  const btnPainel = document.getElementById("btnAbaPainel");
  const btnConfig = document.getElementById("btnAbaConfig");

  if (!abaPainel || !abaConfig || !btnPainel || !btnConfig) return;

  const mostrarConfig = aba === "config";

  abaPainel.classList.toggle("oculto", mostrarConfig);
  abaConfig.classList.toggle("oculto", !mostrarConfig);
  btnPainel.className = mostrarConfig ? "btn-secundario" : "btn-principal";
  btnConfig.className = mostrarConfig ? "btn-principal" : "btn-secundario";

  if (mostrarConfig) aplicarConfigBolaoNaTela();
}

function copiarPix() {
  navigator.clipboard.writeText(getChavePix());
  alert("Chave Pix copiada.");
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function mascaraCPF(valor) {
  const v = somenteNumeros(valor).slice(0, 11);

  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascaraTelefone(valor) {
  const v = somenteNumeros(valor).slice(0, 11);

  if (v.length <= 10) {
    return v
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return v
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function validarCPF(cpf) {
  cpf = somenteNumeros(cpf);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;

  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);

  let dig1 = 11 - (soma % 11);
  dig1 = dig1 >= 10 ? 0 : dig1;

  if (dig1 !== Number(cpf[9])) return false;

  soma = 0;

  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);

  let dig2 = 11 - (soma % 11);
  dig2 = dig2 >= 10 ? 0 : dig2;

  return dig2 === Number(cpf[10]);
}

function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escapeHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}