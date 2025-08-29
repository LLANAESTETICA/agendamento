/* ====== API do Google Apps Script ====== */
const API = 'https://script.google.com/macros/s/AKfycbyAwNm0drO0i_gaazU7bbvTPfGQYiWckaeGFDBAB-RWQNoEDN9RE0Jwtq9N0cYmNk7s/exec'; // cole a URL /exec aqui
const ESCONDER_OCUPADOS = true; // se false, mostra desabilitado com risco

/* ====== Serviços (nome, duração, preço) ====== */
const SERVICOS = [
  { id:"limpeza",   nome:"Limpeza de pele", duracao:60, preco:120 },
  { id:"sobrancelha", nome:"Design de sobrancelha", duracao:30, preco:45 },
  { id:"depilacao", nome:"Depilação (meia perna)", duracao:45, preco:70 },
  { id:"massagem",  nome:"Massagem relaxante", duracao:60, preco:130 },
];

async function carregarHorarios(){
  const data = $('#data').value;
  const serv = SERVICOS.find(s=>s.id===$('#servico').value) || SERVICOS[0];
  if(!data) return;

  const url = `${API}?fn=livres&data=${data}&dur=${serv.duracao}`;
  const resp = await fetch(url, {cache:'no-store'}).then(r=>r.json());
  const slots = (resp.ok ? resp.data : []) || [];

  const sel = $('#hora'); sel.innerHTML = '';
  for(const s of slots){
    if(ESCONDER_OCUPADOS && s.ocupado) continue;
    const o = document.createElement('option');
    o.value = s.hora;
    o.textContent = s.ocupado ? `${s.hora} — indisponível` : s.hora;
    if(s.ocupado){ o.disabled = true; o.style.textDecoration='line-through'; }
    sel.appendChild(o);
  }
  if(!sel.options.length){
    const o = document.createElement('option');
    o.textContent = 'Sem horários livres neste dia'; o.value=''; o.disabled = true; sel.appendChild(o);
  }
}

$('#data')?.addEventListener('change', carregarHorarios);
$('#servico')?.addEventListener('change', carregarHorarios);
window.addEventListener('DOMContentLoaded', carregarHorarios);

/* ====== Reserva antes de abrir WhatsApp ====== */
$('#formAgendar')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const serv = SERVICOS.find(s=>s.id===$('#servico').value) || SERVICOS[0];
  const payload = {
    data: $('#data').value,
    hora: $('#hora').value,
    dur_min: serv.duracao,
    servico: serv.nome,
    nome: $('#nome').value.trim(),
    whats: $('#whats').value.trim()
  };
  if(!payload.hora){ $('#msg').textContent='Escolha um horário.'; return; }

  const r = await fetch(API, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(x=>x.json()).catch(()=>({ok:false}));

  if(!r.ok || !r.data?.reservado){
    $('#msg').textContent = 'Esse horário acabou de ser reservado. Tente outro.';
    await carregarHorarios();
    return;
  }

  // abertura do WhatsApp (pré-reserva "pending" já gravada)
  const preco = `R$ ${serv.preco.toFixed(2).replace('.',',')}`;
  const texto = encodeURIComponent(
    `Olá, sou ${payload.nome}. Quero confirmar:\n` +
    `• ${payload.servico}\n• ${payload.data} às ${payload.hora}\n• Preço: ${preco}`
  );
  const WHATS_CLINICA = '55XXXXXXXXXXX'; // ajuste aqui
  window.open(`https://wa.me/${WHATS_CLINICA}?text=${texto}`, '_blank');
  $('#msg').textContent = 'Pré-reservado! Vamos confirmar pelo WhatsApp.';
});
