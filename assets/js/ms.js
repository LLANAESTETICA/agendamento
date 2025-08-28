/* ===== Swiper (se estiver usando) ===== */
try {
  new Swiper('.swiper', {
    loop: true,
    autoplay: { delay: 4500 },
    pagination: { el: '.swiper-pagination' },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
  });
} catch(e){ /* se a página não tiver swiper, ignora */ }

/* ===== Dados do MVP =====
   Você pode editar serviços aqui. duração em minutos e preço em R$ */
const PROFISSIONAL = {
  nome: "Llana",
  // faixa de atendimento padrão (segunda–sábado, 09:00–18:00) — ajuste se quiser
  inicio: "09:00", fim: "18:00",
  intervaloMin: 15,  // grade mínima
  indisponiveis: []  // ex.: ["2025-09-10T10:00","2025-09-10T14:30"]
};

const SERVICOS = [
  { id:"limpeza",   nome:"Limpeza de pele",         duracao: 60,  preco: 120 },
  { id:"sobrancelha", nome:"Design de sobrancelha", duracao: 30,  preco: 45  },
  { id:"depilacao", nome:"Depilação (perna meia)",  duracao: 45,  preco: 70  },
  { id:"massagem",  nome:"Massagem",                duracao: 60,  preco: 130 },
]; 

/* ===== Utilitários ===== */
const $ = sel => document.querySelector(sel);
function toMin(hhmm){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function toHHMM(min){ const h=String(Math.floor(min/60)).padStart(2,'0'); const m=String(min%60).padStart(2,'0'); return `${h}:${m}`; }
function isToday(dateStr){ return new Date(dateStr).toDateString() === new Date().toDateString(); }

/* ===== Monta serviços ===== */
const selServ = $('#servico'), inpPreco = $('#preco'), selHora = $('#hora'), inpData = $('#data');
if (selServ){
  SERVICOS.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.nome;
    selServ.appendChild(o);
  });
  // preço inicial
  const s0 = SERVICOS[0]; inpPreco.value = `R$ ${s0.preco.toFixed(2).replace('.',',')}`;
}

/* Atualiza preço ao trocar serviço */
selServ?.addEventListener('change', () => {
  const s = SERVICOS.find(x => x.id === selServ.value);
  inpPreco.value = `R$ ${s.preco.toFixed(2).replace('.',',')}`;
  gerarHorarios(); // recalcula grade pela duração
});

/* ===== Gera horários ===== */
function gerarHorarios(){
  if(!selHora) return;
  selHora.innerHTML = '';
  const serv = SERVICOS.find(x => x.id === selServ.value) || SERVICOS[0];
  const data = inpData.value;
  if(!data) return;

  const inicio = toMin(PROFISSIONAL.inicio);
  const fim    = toMin(PROFISSIONAL.fim);
  const passo  = Math.max(PROFISSIONAL.intervaloMin, 5);
  const dur    = serv.duracao;

  // horários já ocupados (mock só para hoje)
  const ocupados = new Set(PROFISSIONAL.indisponiveis);

  for(let t = inicio; t + dur <= fim; t += passo){
    const ini = toHHMM(t);
    const fimSlot = toHHMM(t + dur);
    const iso = `${data}T${ini}`;

    // regra simples: se é hoje, bloqueia horários já passados
    if(isToday(data)){
      const agora = new Date();
      const minsAgora = agora.getHours()*60 + agora.getMinutes();
      if(t < minsAgora) continue;
    }
    if(ocupados.has(iso)) continue;

    const opt = document.createElement('option');
    opt.value = ini;
    opt.textContent = `${ini} – ${fimSlot}`;
    selHora.appendChild(opt);
  }

  if(!selHora.options.length){
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'Sem horários livres neste dia';
    selHora.appendChild(opt);
  }
}

/* ===== Data mínima: hoje ===== */
if (inpData){
  const hoje = new Date();
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth()+1).padStart(2,'0');
  const dd = String(hoje.getDate()).padStart(2,'0');
  inpData.min = `${yyyy}-${mm}-${dd}`;
  inpData.value = inpData.min;
  gerarHorarios();
}
inpData?.addEventListener('change', gerarHorarios);

/* ===== Enviar para WhatsApp ===== */
$('#formAgendar')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const serv = SERVICOS.find(x => x.id === selServ.value) || SERVICOS[0];
  const nome = $('#nome').value.trim();
  const fone = $('#whats').value.trim();
  const data = inpData.value;
  const hora = selHora.value;
  if(!nome || !fone || !data || !hora){ $('#msg').textContent='Preencha todos os campos.'; return; }

  const preco = `R$ ${serv.preco.toFixed(2).replace('.',',')}`;
  const texto = encodeURIComponent(
    `Olá, sou ${nome}. Quero agendar:\n` +
    `• Serviço: ${serv.nome}\n` +
    `• Data/Horário: ${data} às ${hora}\n` +
    `• Preço informado: ${preco}\n` +
    `Pode confirmar pra mim?`
  );

  // coloque aqui o WhatsApp da clínica (somente números, com DDI 55 + DDD)
  const WHATS_CLINICA = '55XXXXXXXXXXX'; // ex.: 5531999999999

  const url = `https://wa.me/${WHATS_CLINICA}?text=${texto}`;
  window.open(url, '_blank');

  $('#msg').textContent = 'Abrindo WhatsApp para confirmação…';
});
