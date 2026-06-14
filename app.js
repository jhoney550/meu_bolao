const PIX_KEY = "05605646192";
const VALOR_APOSTA = 10;
const USUARIO_ADMIN_TESTE = "admin";
const SENHA_ADMIN_TESTE = "dbadbs";
const STORAGE_KEY = "bolao_brasil_haiti_apostas";

let apostasCache = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cpf").addEventListener("input", e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById("whatsapp").addEventListener("input", e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById("formAposta").addEventListener("submit", enviarAposta);
  document.getElementById("senhaAdmin").addEventListener("keydown", event => {
    if (event.key === "Enter") loginAdmin();
  });
  document.getElementById("usuarioAdmin").addEventListener("keydown", event => {
    if (event.key === "Enter") loginAdmin();
  });

  carregarApostas();
});

function carregarApostas() {
  apostasCache = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  renderPublico();
  renderAdmin();
}

function salvarApostas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apostasCache));
}

function enviarAposta(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cpf = somenteNumeros(document.getElementById("cpf").value);
  const whatsapp = somenteNumeros(document.getElementById("whatsapp").value);
  const brasil = Number(document.getElementById("brasil").value);
  const haiti = Number(document.getElementById("haiti").value);

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
    jogo: "Brasil x Haiti",
    palpite_brasil: brasil,
    palpite_haiti: haiti,
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
  tbody.innerHTML = "";

  apostasCache.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(a.nome)}</td>
      <td>Brasil ${a.palpite_brasil} x ${a.palpite_haiti} Haiti</td>
      <td class="${a.status_pagamento === "pago" ? "status-pago" : "status-pendente"}">${a.status_pagamento}</td>
      <td>${new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("totalPublico").textContent =
    `${apostasCache.length} aposta${apostasCache.length === 1 ? "" : "s"}`;
}

function renderAdmin() {
  const tbody = document.getElementById("listaAdmin");
  tbody.innerHTML = "";

  const pagas = apostasCache.filter(a => a.status_pagamento === "pago");

  document.getElementById("admTotal").textContent = apostasCache.length;
  document.getElementById("admPagas").textContent = pagas.length;
  document.getElementById("admArrecadado").textContent = dinheiro(pagas.length * VALOR_APOSTA);

  apostasCache.forEach(a => {
    const novoStatus = a.status_pagamento === "pago" ? "pendente" : "pago";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(a.nome)}</td>
      <td>${mascaraCPF(a.cpf)}</td>
      <td>${mascaraTelefone(a.whatsapp)}</td>
      <td>Brasil ${a.palpite_brasil} x ${a.palpite_haiti} Haiti</td>
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

function gerarComprovante(aposta) {
  const div = document.getElementById("dadosComprovante");
  const tela = document.getElementById("comprovante");
  const data = new Date(aposta.created_at).toLocaleString("pt-BR");

  div.innerHTML = `
    <p><strong>Nº comprovante:</strong> ${aposta.id}</p>
    <p><strong>Nome:</strong> ${escapeHtml(aposta.nome)}</p>
    <p><strong>Jogo:</strong> ${aposta.jogo}</p>
    <p><strong>Palpite:</strong> Brasil ${aposta.palpite_brasil} x ${aposta.palpite_haiti} Haiti</p>
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
  const dados = apostasCache.map(a => ({
    Nome: a.nome,
    CPF: a.cpf,
    WhatsApp: a.whatsapp,
    Jogo: a.jogo,
    "Palpite Brasil": a.palpite_brasil,
    "Palpite Haiti": a.palpite_haiti,
    Valor: a.valor,
    Status: a.status_pagamento,
    Data: new Date(a.created_at).toLocaleString("pt-BR")
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, "Apostas");
  XLSX.writeFile(arquivo, "bolao-brasil-haiti.xlsx");
}

function limparTudo() {
  if (!confirm("Tem certeza que deseja apagar todos os testes deste navegador?")) return;

  localStorage.removeItem(STORAGE_KEY);
  carregarApostas();
}

function alternarAdmin() {
  const login = document.getElementById("adminLogin");
  const area = document.getElementById("adminArea");

  if (!area.classList.contains("oculto")) {
    area.classList.add("oculto");
    return;
  }

  login.classList.toggle("oculto");

  if (!login.classList.contains("oculto")) {
    document.querySelector(".admin").scrollIntoView({ behavior: "smooth" });
    document.getElementById("usuarioAdmin").focus();
  }
}

function loginAdmin() {
  const usuario = document.getElementById("usuarioAdmin").value.trim();
  const senha = document.getElementById("senhaAdmin").value;

  if (usuario !== USUARIO_ADMIN_TESTE || senha !== SENHA_ADMIN_TESTE) {
    alert("Usuario ou senha incorretos.");
    return;
  }

  document.getElementById("adminArea").classList.remove("oculto");
  document.getElementById("adminLogin").classList.add("oculto");
  document.getElementById("usuarioAdmin").value = "";
  document.getElementById("senhaAdmin").value = "";
  renderAdmin();
}

function sairAdmin() {
  document.getElementById("adminArea").classList.add("oculto");
  document.getElementById("adminLogin").classList.add("oculto");
  document.getElementById("usuarioAdmin").value = "";
  document.getElementById("senhaAdmin").value = "";
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
