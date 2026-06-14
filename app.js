const PIX_KEY = "05605646192";
const VALOR_APOSTA = 10;
const USUARIO_ADMIN_TESTE = "admin";
const SENHA_ADMIN_TESTE = "dbadbs";
const STORAGE_KEY = "bolao_brasil_haiti_apostas";
const CONFIG_KEY = "bolao_configuracao";
const CONFIG_PADRAO = {
  timeCasa: "Brasil",
  timeFora: "Haiti"
};

let apostasCache = [];
let configBolao = carregarConfigBolao();

document.addEventListener("DOMContentLoaded", () => {
  const cpf = document.getElementById("cpf");
  const whatsapp = document.getElementById("whatsapp");
  const formAposta = document.getElementById("formAposta");
  const formConfigBolao = document.getElementById("formConfigBolao");
  const senhaAdmin = document.getElementById("senhaAdmin");
  const usuarioAdmin = document.getElementById("usuarioAdmin");

  aplicarConfigBolaoNaTela();

  if (cpf) {
    cpf.addEventListener("input", e => e.target.value = mascaraCPF(e.target.value));
  }

  if (whatsapp) {
    whatsapp.addEventListener("input", e => e.target.value = mascaraTelefone(e.target.value));
  }

  if (formAposta) {
    formAposta.addEventListener("submit", enviarAposta);
  }

  if (formConfigBolao) {
    formConfigBolao.addEventListener("submit", salvarConfigBolao);
  }

  document.getElementById("timeCasaConfig")?.addEventListener("input", atualizarPreviewConfig);
  document.getElementById("timeForaConfig")?.addEventListener("input", atualizarPreviewConfig);

  if (senhaAdmin) {
    senhaAdmin.addEventListener("keydown", event => {
      if (event.key === "Enter") loginAdmin();
    });
  }

  if (usuarioAdmin) {
    usuarioAdmin.addEventListener("keydown", event => {
      if (event.key === "Enter") loginAdmin();
    });
    usuarioAdmin.focus();
  }

  carregarApostas();
});

window.addEventListener("storage", event => {
  if (event.key !== CONFIG_KEY) return;

  configBolao = carregarConfigBolao();
  aplicarConfigBolaoNaTela();
  renderPublico();
  renderAdmin();
});

function carregarApostas() {
  apostasCache = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  renderPublico();
  renderAdmin();
}

function salvarApostas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apostasCache));
}

function carregarConfigBolao() {
  const configSalva = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");

  return {
    ...CONFIG_PADRAO,
    ...(configSalva || {})
  };
}

function salvarConfigBolao(event) {
  event.preventDefault();

  const timeCasa = document.getElementById("timeCasaConfig").value.trim();
  const timeFora = document.getElementById("timeForaConfig").value.trim();

  if (!timeCasa || !timeFora) {
    alert("Informe os dois times do bolão.");
    return;
  }

  configBolao = { timeCasa, timeFora };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(configBolao));
  aplicarConfigBolaoNaTela();
  renderPublico();
  renderAdmin();
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

  if (tituloJogo) tituloJogo.textContent = jogo;
  if (tituloJogo) document.title = `Bolão ${jogo}`;
  if (cardJogoTexto) cardJogoTexto.textContent = jogo;
  if (labelTimeCasa) labelTimeCasa.textContent = configBolao.timeCasa;
  if (labelTimeFora) labelTimeFora.textContent = configBolao.timeFora;
  if (footerJogo) footerJogo.textContent = `Bolão ${jogo}`;
  if (timeCasaConfig) timeCasaConfig.value = configBolao.timeCasa;
  if (timeForaConfig) timeForaConfig.value = configBolao.timeFora;
  if (previewJogoConfig) previewJogoConfig.textContent = jogo;
}

function atualizarPreviewConfig() {
  const timeCasa = document.getElementById("timeCasaConfig")?.value.trim() || CONFIG_PADRAO.timeCasa;
  const timeFora = document.getElementById("timeForaConfig")?.value.trim() || CONFIG_PADRAO.timeFora;
  const previewJogoConfig = document.getElementById("previewJogoConfig");

  if (previewJogoConfig) {
    previewJogoConfig.textContent = nomeJogo({ timeCasa, timeFora });
  }
}

function nomeJogo(config = configBolao) {
  return `${config.timeCasa} x ${config.timeFora}`;
}

function enviarAposta(event) {
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

  const cpfJaExiste = apostasCache.some(a => a.cpf === cpf);

  if (cpfJaExiste) {
    alert("Já existe uma aposta cadastrada para este CPF neste navegador.");
    return;
  }

  const aposta = {
    id: gerarId(),
    nome,
    cpf,
    whatsapp,
    jogo: nomeJogo(),
    time_casa: configBolao.timeCasa,
    time_fora: configBolao.timeFora,
    palpite_casa: placarCasa,
    palpite_fora: placarFora,
    palpite_brasil: placarCasa,
    palpite_haiti: placarFora,
    valor: VALOR_APOSTA,
    status_pagamento: "pendente",
    created_at: new Date().toISOString()
  };

  apostasCache.unshift(aposta);
  salvarApostas();

  gerarComprovante(aposta);
  document.getElementById("formAposta").reset();
  document.getElementById("brasil").value = 0;
  document.getElementById("haiti").value = 0;

  carregarApostas();
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

  totalPublico.textContent =
    `${apostasCache.length} aposta${apostasCache.length === 1 ? "" : "s"}`;
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
  admArrecadado.textContent = dinheiro(pagas.length * VALOR_APOSTA);

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
  const placarCasa = aposta.palpite_casa ?? aposta.palpite_brasil ?? 0;
  const placarFora = aposta.palpite_fora ?? aposta.palpite_haiti ?? 0;

  return `${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}`;
}

function gerarComprovante(aposta) {
  const div = document.getElementById("dadosComprovante");
  const tela = document.getElementById("comprovante");
  const data = new Date(aposta.created_at).toLocaleString("pt-BR");

  if (!div || !tela) return;

  div.innerHTML = `
    <p><strong>Nº comprovante:</strong> ${aposta.id}</p>
    <p><strong>Nome:</strong> ${escapeHtml(aposta.nome)}</p>
    <p><strong>Jogo:</strong> ${escapeHtml(aposta.jogo)}</p>
    <p><strong>Palpite:</strong> ${formatarPalpite(aposta)}</p>
    <p><strong>Valor:</strong> ${dinheiro(aposta.valor)}</p>
    <p><strong>Status:</strong> ${aposta.status_pagamento}</p>
    <p><strong>Chave Pix:</strong> ${PIX_KEY}</p>
    <p><strong>Data:</strong> ${data}</p>
    <hr>
    <p>Guarde este comprovante. O pagamento será validado pelo administrador após conferência do Pix.</p>
  `;

  tela.classList.remove("oculto");
  tela.querySelector("button").focus();
}

function fecharComprovante() {
  document.getElementById("dadosComprovante").innerHTML = "";
  document.getElementById("comprovante").classList.add("oculto");
  document.getElementById("nome").focus();
}

function alterarStatus(id, status) {
  const aposta = apostasCache.find(a => a.id === id);

  if (!aposta) {
    alert("Aposta não encontrada.");
    return;
  }

  aposta.status_pagamento = status;
  salvarApostas();
  carregarApostas();
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
    "Palpite": formatarPalpiteTexto(a),
    Valor: a.valor,
    Status: a.status_pagamento,
    Data: new Date(a.created_at).toLocaleString("pt-BR")
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, "Apostas");
  XLSX.writeFile(arquivo, "bolao-apostas.xlsx");
}

function limparTudo() {
  if (!confirm("Tem certeza que deseja apagar todos os testes deste navegador?")) return;

  localStorage.removeItem(STORAGE_KEY);
  carregarApostas();
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
  navigator.clipboard.writeText(PIX_KEY);
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

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i);
  }

  let dig1 = 11 - (soma % 11);
  dig1 = dig1 >= 10 ? 0 : dig1;

  if (dig1 !== Number(cpf[9])) return false;

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i);
  }

  let dig2 = 11 - (soma % 11);
  dig2 = dig2 >= 10 ? 0 : dig2;

  return dig2 === Number(cpf[10]);
}

function gerarId() {
  const data = new Date();
  const parteData = data.toISOString().slice(0, 10).replaceAll("-", "");
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `BH-${parteData}-${aleatorio}`;
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
