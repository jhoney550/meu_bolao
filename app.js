const SUPABASE_URL = "https://wdejdywwabvfhcogjojj.supabase.co";
const SUPABASE_KEY = "sb_publishable_djDg2w0MmWuHmrTcdsBX3g_SM01x4WZ";
const USUARIO_ADMIN_TESTE = "admin";
const SENHA_ADMIN_TESTE = "dbadbs";
const CONFIG_PADRAO = { time_casa: "Brasil", time_fora: "Haiti", valor_aposta: 10, chave_pix: "05605646192" };
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let apostasCache = [];
let bolaoAtivo = null;
let configBolao = { ...CONFIG_PADRAO };
let apostaComprovanteAtual = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("cpf")?.addEventListener("input", e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById("whatsapp")?.addEventListener("input", e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById("formAposta")?.addEventListener("submit", enviarAposta);
  document.getElementById("formConfigBolao")?.addEventListener("submit", salvarOuCriarBolao);
  document.getElementById("timeCasaConfig")?.addEventListener("input", atualizarPreviewConfig);
  document.getElementById("timeForaConfig")?.addEventListener("input", atualizarPreviewConfig);
  document.getElementById("senhaAdmin")?.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); });
  const usuarioAdmin = document.getElementById("usuarioAdmin");
  if (usuarioAdmin) { usuarioAdmin.addEventListener("keydown", e => { if (e.key === "Enter") loginAdmin(); }); usuarioAdmin.focus(); }
  await carregarBolaoAtivo();
  aplicarConfigBolaoNaTela();
  await carregarApostas();
});

async function carregarBolaoAtivo() {
  const { data, error } = await supabaseClient.from("boloes").select("*").eq("status", "ativo").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) { console.error(error); alert("Erro ao carregar bolão ativo. Rode o SQL da tabela boloes."); return; }
  bolaoAtivo = data || null;
  configBolao = bolaoAtivo ? {
    time_casa: bolaoAtivo.time_casa,
    time_fora: bolaoAtivo.time_fora,
    valor_aposta: Number(bolaoAtivo.valor_aposta || 10),
    chave_pix: bolaoAtivo.chave_pix || CONFIG_PADRAO.chave_pix
  } : { ...CONFIG_PADRAO };
}

async function carregarApostas() {
  if (!bolaoAtivo) { apostasCache = []; renderPublico(); renderAdmin(); atualizarInfoBolaoAtivo(); return; }
  const { data, error } = await supabaseClient.from("apostas").select("*").eq("bolao_id", bolaoAtivo.id).order("created_at", { ascending: false });
  if (error) { console.error(error); alert("Erro ao carregar apostas."); return; }
  apostasCache = data || [];
  renderPublico(); renderAdmin(); atualizarInfoBolaoAtivo();
}

async function salvarOuCriarBolao(event) {
  event.preventDefault();
  const timeCasa = document.getElementById("timeCasaConfig").value.trim();
  const timeFora = document.getElementById("timeForaConfig").value.trim();
  if (!timeCasa || !timeFora) { alert("Informe os dois times do bolão."); return; }
  const payload = { time_casa: timeCasa, time_fora: timeFora, valor_aposta: getValorAposta(), chave_pix: getChavePix(), atualizado_em: new Date().toISOString() };
  let result;
  if (bolaoAtivo) result = await supabaseClient.from("boloes").update(payload).eq("id", bolaoAtivo.id).select().single();
  else result = await supabaseClient.from("boloes").insert({ ...payload, status: "ativo" }).select().single();
  if (result.error) { console.error(result.error); alert("Erro ao salvar/criar bolão."); return; }
  bolaoAtivo = result.data;
  configBolao = { time_casa: bolaoAtivo.time_casa, time_fora: bolaoAtivo.time_fora, valor_aposta: Number(bolaoAtivo.valor_aposta), chave_pix: bolaoAtivo.chave_pix };
  aplicarConfigBolaoNaTela();
  await carregarApostas();
  alert(bolaoAtivo ? "Bolão ativo salvo." : "Bolão criado.");
}

async function encerrarBolaoAtual() {
  if (!bolaoAtivo) { alert("Não existe bolão ativo para encerrar."); return; }
  const pagas = apostasCache.filter(a => a.status_pagamento === "pago");
  const arrecadado = pagas.reduce((t, a) => t + Number(a.valor || 0), 0);
  if (!confirm(`Encerrar o bolão ${nomeJogo()}?\n\nTotal de apostas: ${apostasCache.length}\nPagas: ${pagas.length}\nArrecadado: ${dinheiro(arrecadado)}\n\nAs apostas ficarão no histórico.`)) return;
  const { error } = await supabaseClient.from("boloes").update({ status: "encerrado", encerrado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq("id", bolaoAtivo.id);
  if (error) { console.error(error); alert("Erro ao encerrar bolão."); return; }
  bolaoAtivo = null; apostasCache = []; configBolao = { ...CONFIG_PADRAO };
  aplicarConfigBolaoNaTela(); renderPublico(); renderAdmin(); atualizarInfoBolaoAtivo();
  alert("Bolão encerrado. Configure o próximo jogo e clique em Salvar / criar bolão ativo.");
}

function aplicarConfigBolaoNaTela() {
  const jogo = nomeJogo();
  const tituloJogo = document.getElementById("tituloJogo");
  if (tituloJogo) { tituloJogo.textContent = bolaoAtivo ? jogo : "Bolão indisponível"; document.title = bolaoAtivo ? `Bolão ${jogo}` : "Bolão"; }
  const cardJogoTexto = document.getElementById("cardJogoTexto"); if (cardJogoTexto) cardJogoTexto.textContent = bolaoAtivo ? jogo : "Aguardando novo bolão";
  const labelTimeCasa = document.getElementById("labelTimeCasa"); if (labelTimeCasa) labelTimeCasa.textContent = configBolao.time_casa;
  const labelTimeFora = document.getElementById("labelTimeFora"); if (labelTimeFora) labelTimeFora.textContent = configBolao.time_fora;
  const footerJogo = document.getElementById("footerJogo"); if (footerJogo) footerJogo.textContent = bolaoAtivo ? `Bolão ${jogo}` : "Bolão";
  const timeCasaConfig = document.getElementById("timeCasaConfig"); if (timeCasaConfig) timeCasaConfig.value = configBolao.time_casa;
  const timeForaConfig = document.getElementById("timeForaConfig"); if (timeForaConfig) timeForaConfig.value = configBolao.time_fora;
  const previewJogoConfig = document.getElementById("previewJogoConfig"); if (previewJogoConfig) previewJogoConfig.textContent = jogo;
  const pixKey = document.getElementById("pixKey"); if (pixKey) pixKey.textContent = getChavePix();
  atualizarInfoBolaoAtivo();
}
function atualizarInfoBolaoAtivo(){ const el=document.getElementById("bolaoAtivoInfo"); if(el) el.textContent = bolaoAtivo ? `${nomeJogo()} — ativo` : "Nenhum bolão ativo"; }
function atualizarPreviewConfig(){ const c=document.getElementById("timeCasaConfig")?.value.trim()||CONFIG_PADRAO.time_casa; const f=document.getElementById("timeForaConfig")?.value.trim()||CONFIG_PADRAO.time_fora; const p=document.getElementById("previewJogoConfig"); if(p) p.textContent=`${c} x ${f}`; }
function nomeJogo(config=configBolao){ return `${config.time_casa} x ${config.time_fora}`; }
function getValorAposta(){ return Number(configBolao.valor_aposta || CONFIG_PADRAO.valor_aposta); }
function getChavePix(){ return String(configBolao.chave_pix || CONFIG_PADRAO.chave_pix); }

async function enviarAposta(event){
  event.preventDefault();
  if(!bolaoAtivo){ alert("Nenhum bolão ativo no momento."); return; }
  const nome=document.getElementById("nome").value.trim();
  const cpf=somenteNumeros(document.getElementById("cpf").value);
  const whatsapp=somenteNumeros(document.getElementById("whatsapp").value);
  const placarCasa=Number(document.getElementById("brasil").value);
  const placarFora=Number(document.getElementById("haiti").value);
  if(!validarCPF(cpf)){ alert("CPF inválido."); return; }
  if(whatsapp.length<10){ alert("WhatsApp inválido."); return; }
  const aposta={ bolao_id: bolaoAtivo.id, nome, cpf, whatsapp, jogo:nomeJogo(), time_casa:configBolao.time_casa, time_fora:configBolao.time_fora, palpite_casa:placarCasa, palpite_fora:placarFora, valor:getValorAposta(), status_pagamento:"pendente" };
  const {data,error}=await supabaseClient.from("apostas").insert(aposta).select().single();
  if(error){ console.error(error); if(error.code==="23505" || String(error.message).toLowerCase().includes("duplicate")){ alert("Já existe uma aposta cadastrada para este CPF neste bolão."); return; } alert("Erro ao cadastrar aposta."); return; }
  gerarComprovante(data);
  document.getElementById("formAposta").reset(); document.getElementById("brasil").value=0; document.getElementById("haiti").value=0;
  await carregarApostas();
}

function renderPublico(){ const tbody=document.getElementById("listaPublica"), total=document.getElementById("totalPublico"); if(!tbody||!total)return; tbody.innerHTML=""; apostasCache.forEach(a=>{ const tr=document.createElement("tr"); tr.innerHTML=`<td>${escapeHtml(a.nome)}</td><td>${formatarPalpite(a)}</td><td class="${a.status_pagamento==="pago"?"status-pago":"status-pendente"}">${a.status_pagamento}</td><td>${new Date(a.created_at).toLocaleDateString("pt-BR")}</td>`; tbody.appendChild(tr); }); total.textContent=`${apostasCache.length} aposta${apostasCache.length===1?"":"s"}`; }
function renderAdmin(){ const tbody=document.getElementById("listaAdmin"), t=document.getElementById("admTotal"), p=document.getElementById("admPagas"), a=document.getElementById("admArrecadado"); if(!tbody||!t||!p||!a)return; tbody.innerHTML=""; const pagas=apostasCache.filter(x=>x.status_pagamento==="pago"); t.textContent=apostasCache.length; p.textContent=pagas.length; a.textContent=dinheiro(pagas.reduce((s,x)=>s+Number(x.valor||0),0)); apostasCache.forEach(x=>{ const novo=x.status_pagamento==="pago"?"pendente":"pago"; const tr=document.createElement("tr"); tr.innerHTML=`<td>${escapeHtml(x.nome)}</td><td>${mascaraCPF(x.cpf)}</td><td>${mascaraTelefone(x.whatsapp)}</td><td>${formatarPalpite(x)}</td><td class="${x.status_pagamento==="pago"?"status-pago":"status-pendente"}">${x.status_pagamento}</td><td><button class="btn-secundario" onclick="alterarStatus('${x.id}', '${novo}')">Marcar ${novo}</button></td>`; tbody.appendChild(tr); }); }
function formatarPalpite(aposta){ return escapeHtml(formatarPalpiteTexto(aposta)); }
function formatarPalpiteTexto(aposta){ return `${aposta.time_casa||"Brasil"} ${aposta.palpite_casa??0} x ${aposta.palpite_fora??0} ${aposta.time_fora||"Haiti"}`; }
function gerarComprovante(aposta){ const div=document.getElementById("dadosComprovante"), tela=document.getElementById("comprovante"); if(!div||!tela)return; apostaComprovanteAtual=aposta; document.getElementById("qrPixBox")?.classList.add("oculto"); document.getElementById("qrPixImagem")?.removeAttribute("src"); div.innerHTML=`<p><strong>Nº comprovante:</strong> ${aposta.id}</p><p><strong>Nome:</strong> ${escapeHtml(aposta.nome)}</p><p><strong>Jogo:</strong> ${escapeHtml(aposta.jogo)}</p><p><strong>Palpite:</strong> ${formatarPalpite(aposta)}</p><p><strong>Valor:</strong> ${dinheiro(aposta.valor)}</p><p><strong>Status:</strong> ${aposta.status_pagamento}</p><p><strong>Chave Pix:</strong> ${getChavePix()}</p><p><strong>Data:</strong> ${new Date(aposta.created_at).toLocaleString("pt-BR")}</p><hr><p>Guarde este comprovante. O pagamento será validado pelo administrador após conferência do Pix.</p>`; tela.classList.remove("oculto"); tela.querySelector("button")?.focus(); }
function fecharComprovante(){ const d=document.getElementById("dadosComprovante"), c=document.getElementById("comprovante"); if(d)d.innerHTML=""; if(c)c.classList.add("oculto"); document.getElementById("qrPixBox")?.classList.add("oculto"); document.getElementById("qrPixImagem")?.removeAttribute("src"); apostaComprovanteAtual=null; document.getElementById("nome")?.focus(); }
function gerarQrCodePix(){ const box=document.getElementById("qrPixBox"), img=document.getElementById("qrPixImagem"); if(!apostaComprovanteAtual||!box||!img)return; const payload=gerarPayloadPix(apostaComprovanteAtual); img.src=`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(payload)}`; box.classList.remove("oculto"); }
function abrirWhatsappComprovante(){ if(!apostaComprovanteAtual){ alert("Nenhum comprovante aberto."); return; } const texto=montarMensagemWhatsappComprovante(apostaComprovanteAtual); window.open(`https://wa.me/5566981402391?text=${encodeURIComponent(texto)}`,"_blank","noopener"); }
function montarMensagemWhatsappComprovante(aposta){ return ["Comprovante da aposta",`Nome: ${aposta.nome}`,`WhatsApp: ${mascaraTelefone(aposta.whatsapp)}`,`Jogo: ${aposta.jogo||nomeJogo()}`,`Palpite: ${formatarPalpiteTexto(aposta)}`,`Valor: ${dinheiro(aposta.valor)}`,`Status: ${formatarStatusComprovante(aposta.status_pagamento)}`].join("\n"); }
function formatarStatusComprovante(status){ return status==="pago" ? "pago" : "aguardando pagamento"; }
function gerarPayloadPix(aposta){ const merchant=montarCampo("00","br.gov.bcb.pix")+montarCampo("01",getChavePix())+montarCampo("02",`Bolao ${aposta.id}`); const txid=normalizarPixTexto(aposta.id).replace(/[^A-Z0-9]/g,"").slice(0,25)||"***"; const sem=montarCampo("00","01")+montarCampo("26",merchant)+montarCampo("52","0000")+montarCampo("53","986")+montarCampo("54",Number(aposta.valor||getValorAposta()).toFixed(2))+montarCampo("58","BR")+montarCampo("59",normalizarPixTexto("Bolao"))+montarCampo("60",normalizarPixTexto("Cuiaba"))+montarCampo("62",montarCampo("05",txid))+"6304"; return sem+crc16Pix(sem); }
function montarCampo(id,valor){ const texto=String(valor); return `${id}${String(texto.length).padStart(2,"0")}${texto}`; }
function normalizarPixTexto(texto){ return String(texto||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9 $%*+\-./:]/g,"").trim().toUpperCase().slice(0,25); }
function crc16Pix(payload){ let crc=0xFFFF; for(let i=0;i<payload.length;i++){ crc^=payload.charCodeAt(i)<<8; for(let b=0;b<8;b++){ crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1; crc&=0xFFFF; } } return crc.toString(16).toUpperCase().padStart(4,"0"); }
async function alterarStatus(id,status){ const {error}=await supabaseClient.from("apostas").update({status_pagamento:status}).eq("id",id); if(error){ console.error(error); alert("Erro ao alterar status."); return; } await carregarApostas(); }
function exportarExcel(){ if(typeof XLSX==="undefined"){ alert("Biblioteca de exportação não carregada."); return; } const dados=apostasCache.map(a=>({Nome:a.nome,CPF:a.cpf,WhatsApp:a.whatsapp,Jogo:a.jogo,Palpite:formatarPalpiteTexto(a),Valor:a.valor,Status:a.status_pagamento,Data:new Date(a.created_at).toLocaleString("pt-BR")})); const planilha=XLSX.utils.json_to_sheet(dados); const arquivo=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(arquivo,planilha,"Apostas"); XLSX.writeFile(arquivo,`bolao-${nomeJogo().replaceAll(" ","-").toLowerCase()}.xlsx`); }
async function limparTudo(){ alert("Nesta versão, use o botão Encerrar bolão atual. Ele limpa a tela do jogo sem apagar o histórico."); }
async function atualizarDadosAdmin(){ await carregarBolaoAtivo(); aplicarConfigBolaoNaTela(); await carregarApostas(); }
async function loginAdmin(){ const u=document.getElementById("usuarioAdmin"), s=document.getElementById("senhaAdmin"), l=document.getElementById("adminLogin"), area=document.getElementById("adminArea"); if(!u||!s||!l||!area)return; if(u.value.trim()!==USUARIO_ADMIN_TESTE||s.value!==SENHA_ADMIN_TESTE){ alert("Usuario ou senha incorretos."); return; } await atualizarDadosAdmin(); area.classList.remove("oculto"); l.classList.add("oculto"); u.value=""; s.value=""; mostrarAbaAdmin("painel"); }
function sairAdmin(){ const u=document.getElementById("usuarioAdmin"), s=document.getElementById("senhaAdmin"), l=document.getElementById("adminLogin"), area=document.getElementById("adminArea"); if(!u||!s||!l||!area)return; area.classList.add("oculto"); l.classList.remove("oculto"); u.value=""; s.value=""; window.location.reload(); }
function mostrarAbaAdmin(aba){ const p=document.getElementById("abaPainelAdmin"), c=document.getElementById("abaConfigBolao"), bp=document.getElementById("btnAbaPainel"), bc=document.getElementById("btnAbaConfig"); if(!p||!c||!bp||!bc)return; const show=aba==="config"; p.classList.toggle("oculto",show); c.classList.toggle("oculto",!show); bp.className=show?"btn-secundario":"btn-principal"; bc.className=show?"btn-principal":"btn-secundario"; if(show) aplicarConfigBolaoNaTela(); }
function copiarPix(){ navigator.clipboard.writeText(getChavePix()); alert("Chave Pix copiada."); }
function somenteNumeros(valor){ return String(valor||"").replace(/\D/g,""); }
function mascaraCPF(valor){ const v=somenteNumeros(valor).slice(0,11); return v.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1-$2"); }
function mascaraTelefone(valor){ const v=somenteNumeros(valor).slice(0,11); if(v.length<=10)return v.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2"); return v.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2"); }
function validarCPF(cpf){ cpf=somenteNumeros(cpf); if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false; let soma=0; for(let i=0;i<9;i++)soma+=Number(cpf[i])*(10-i); let d1=11-(soma%11); d1=d1>=10?0:d1; if(d1!==Number(cpf[9]))return false; soma=0; for(let i=0;i<10;i++)soma+=Number(cpf[i])*(11-i); let d2=11-(soma%11); d2=d2>=10?0:d2; return d2===Number(cpf[10]); }
function dinheiro(valor){ return Number(valor).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function escapeHtml(texto){ return String(texto||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
