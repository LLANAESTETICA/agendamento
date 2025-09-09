/* ====== API do Google Apps Script ====== */
const API = 'https://script.google.com/macros/s/AKfycbxPKwXdGfvdSs5Ytm1JRBqx06ruQ2lBApvHSynQNpju249TqihsBebrGh_hGLl-toXY_Q/exec';
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

function precoTexto(serv){
  if (!serv || typeof serv.preco !== 'number') return '';
  if (serv.preco < 0) return 'Sob consulta';
  return `R$ ${serv.preco.toFixed(2).replace('.',',')}`;
}

const $ = (sel) => document.querySelector(sel);

/* ==== Serviços (nome, duração, preço) ==== */
const SERVICOS = [
  { id:"sobrancelha",  nome:"Design de sobrancelha",           duracao:120, preco:25  },
  { id:"sobrancelhaH", nome:"Design de sobrancelha com Henna", duracao:120, preco:45  },
  { id:"SPALabial",    nome:"SPA labial",                      duracao:120, preco:25  },
  { id:"HydraLips",    nome:"Hydra lips",                      duracao:120, preco:60  },
  { id:"RevitaFace",   nome:"Revitalização facial",            duracao:120, preco:80  },
  { id:"Peeling Q",    nome:"Peeling químico",                 duracao:120, preco:-1 },
  { id:"SPAPES",       nome:"SPA dos pés",                     duracao:120 , preco:55 },
  { id:"EscaldaPés",   nome:"Escalda pés + massagem",          duracao:120 , preco:40 },
  { id:"DrenagemL",    nome:"Drenagem linfática",              duracao:120 , preco:80 },
  { id:"Massagem",     nome:"Massagem Relaxante",              duracao:120 , preco:80 },
  { id:"limpeza",      nome:"Limpeza de pele",                 duracao:120 , preco:120},  
  { id:"depilacao",    nome:"Depilação (meia perna)",          duracao:120, preco:70  },
  { id:"massagem",     nome:"Massagem relaxante",               duracao:120, preco:130},
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
  if ($('#preco') && s0) $('#preco').value = precoTexto(s0);
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
  if (s && $('#preco')) $('#preco').value = precoTexto(s);
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

    // Monta a mensagem sem exibir "R$ -1,00" quando for Sob consulta
  const linhas = [
    `Olá, sou ${payload.nome}. Quero confirmar:`,
    `• ${payload.servico}`,
    `• ${payload.data} às ${payload.hora}`
  ];
  // Só inclui a linha de preço se o valor for >= 0
  if (serv.preco >= 0) linhas.push(`• Preço: ${precoTexto(serv)}`);

  const texto = encodeURIComponent(linhas.join('\n'));

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
