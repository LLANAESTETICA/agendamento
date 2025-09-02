/* ====== API do Google Apps Script ====== */
const API = 'https://script.google.com/macros/s/AKfycbyjwTlBjTCm_ieX87ibiAQMB6zbpvWcfjrzKkQd6FcweHC2LJ2CktSQsspofZli7umL/exec';
const ESCONDER_OCUPADOS = true; // se false, mostra desabilitado com risco

/* ===== Swiper (se estiver usando) ===== */
try {
  new Swiper('.swiper', {
    loop: true,
    autoplay: { delay: 4500 },
    pagination: { el: '.swiper-pagination' },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
  });
} catch(e){}

/* ==== Utils ==== */
const $ = (sel) => document.querySelector(sel);

/* ==== Serviços (nome, duração, preço) ==== */
const SERVICOS = [
  { id:"limpeza",     nome:"Limpeza de pele",        duracao:60, preco:120 },
  { id:"sobrancelha", nome:"Design de sobrancelha",  duracao:30, preco:45  },
  { id:"depilacao",   nome:"Depilação (meia perna)", duracao:45, preco:70  },
  { id:"massagem",    nome:"Massagem relaxante",     duracao:60, preco:130 },
];

/* ==== Popular select de serviços + preço inicial ==== */
function popularServicos(){
  const sel = $('#servico');
  if(!sel) return;
  sel.innerHTML = '';
  SERVICOS.forEach(s=>{
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.nome;
    sel.appendChild(o);
  });
  const s0 = SERVICOS[0];
  if ($('#preco') && s0) $('#preco').value = `R$ ${s0.preco.toFixed(2).replace('.',',')}`;
}

function yyyy_mm_dd(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function toMin(hhmm){ const [h,m]=String(hhmm).split(':').map(Number); return h*60+m; }

/* ==== Carregar horários da API ==== */
async function carregarHorarios(){
  const data = $('#data')?.value;
  const servSel = $('#servico')?.value;
  const serv = SERVICOS.find(s=>s.id===servSel) || SERVICOS[0];
  if(!data || !serv) return;

  const url = `${API}?fn=livres&data=${data}&dur=${serv.duracao}`;
  let resp;
  try {
    resp = await fetch(url, {cache:'no-store'}).then(r=>r.json());
  } catch (e) {
    console.error('Erro ao buscar horários:', e);
    return;
  }
  const slots = (resp && resp.ok ? resp.data : []) || [];

  const sel = $('#hora');
  if(!sel) return;
  sel.innerHTML = '';

  // ⏱️ Se for hoje, não mostra horários que já passaram (com 5 min de folga)
  const hojeStr = yyyy_mm_dd();
  const ehHoje  = data === hojeStr;
  const agora   = new Date();
  const minsAgora = agora.getHours()*60 + agora.getMinutes() + 5; // folga de 5 min

  for (const s of slots){
    if (ehHoje && toMin(s.hora) < minsAgora) continue;       // filtra passado
    if (ESCONDER_OCUPADOS && s.ocupado) continue;            // sua regra atual

    const o = document.createElement('option');
    o.value = s.hora;
    o.textContent = s.ocupado ? `${s.hora} — indisponível` : s.hora;
    if (s.ocupado){ o.disabled = true; o.style.textDecoration='line-through'; }
    sel.appendChild(o);
  }

  if(!sel.options.length){
    const o = document.createElement('option');
    o.textContent = 'Sem horários livres neste dia';
    o.value=''; o.disabled = true;
    sel.appendChild(o);
  }
}


/* ==== Eventos ==== */
$('#servico')?.addEventListener('change', () => {
  const s = SERVICOS.find(x => x.id === $('#servico').value);
  if (s && $('#preco')) $('#preco').value = `R$ ${s.preco.toFixed(2).replace('.',',')}`;
  carregarHorarios();
});
$('#data')?.addEventListener('change', carregarHorarios);

/* ====== Reserva antes de abrir WhatsApp ====== */
/* ====== Reserva antes de abrir WhatsApp ====== */
$('#formAgendar')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const serv = SERVICOS.find(s=>s.id===$('#servico').value) || SERVICOS[0];
  const payload = {
    data:  $('#data').value,
    hora:  $('#hora').value,
    dur_min: serv.duracao,
    servico: serv.nome,
    nome:  $('#nome').value.trim(),
    whats: $('#whats').value.trim()
  };
  if(!payload.hora){ $('#msg').textContent='Escolha um horário.'; return; }

  let r;
  try{
    const resp = await fetch(API, { method:'POST', body: new URLSearchParams(payload) });
    const txt  = await resp.text();
    console.log('POST /exec →', txt);    // <- veja no console a resposta crua
    r = JSON.parse(txt);
  }catch(e){
    $('#msg').textContent = 'Falha ao reservar: ' + e.message;
    console.error('Erro ao reservar:', e);
    return;
  }

  if(!r.ok){
    $('#msg').textContent = 'Erro na API: ' + (r.msg || 'desconhecido');
    return;
  }
  if(!r.data?.reservado){
    $('#msg').textContent = (r.data?.motivo==='ocupado')
      ? 'Esse horário já foi reservado. Tente outro.'
      : 'Não foi possível reservar: ' + (r.data?.motivo || 'motivo desconhecido');
    await carregarHorarios();
    return;
  }

  const preco = `R$ ${serv.preco.toFixed(2).replace('.',',')}`;
  const texto = encodeURIComponent(
    `Olá, sou ${payload.nome}. Quero confirmar:\n` +
    `• ${payload.servico}\n• ${payload.data} às ${payload.hora}\n• Preço: ${preco}`
  );
  const WHATS_CLINICA = '553196716496';
  window.open(`https://wa.me/${WHATS_CLINICA}?text=${texto}`, '_blank');
  $('#msg').textContent = 'Pré-reservado! Vamos confirmar pelo WhatsApp.';
});


/* ==== Inicialização ==== */
window.addEventListener('DOMContentLoaded', () => {
  // data mínima = hoje
  const d = new Date();
  const hoje = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if ($('#data')){
    $('#data').min = hoje;
    if (!$('#data').value) $('#data').value = hoje;
  }
  popularServicos();
  carregarHorarios();
});
