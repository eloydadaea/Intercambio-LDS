(() => {
  /* ===== Pega aquí la URL de tu Apps Script (termina en /exec) ===== */
  const API_URL = 'https://script.google.com/macros/s/AKfycbyFssSXFPO1qPPXybpC6hnF6iy6tDo3iiNDhLPbQEOqx2-XV4kJ7FW3O2y47-ZF3c_h/exec';

  /* ===== Lista de villancicos reales (.mp3 en la carpeta /music) ===== */
  const CAROLS = [
    { title: 'Campana sobre campana', src: './music/campana.mp3' },
    { title: 'Los peces en el río',   src: './music/peces.mp3' },
    { title: 'Mi burrito sabanero',   src: './music/burrito.mp3' },
    { title: 'Noche de paz',          src: './music/noche-de-paz.mp3' }
  ];

  const PAPERS = [
    {p:'#2a7fa8',pat:'radial-gradient(circle at 25% 30%,#ffffff55 2.5px,transparent 3.5px),radial-gradient(circle at 75% 70%,#ffd54a88 2.5px,transparent 3.5px)',ps:'20px 20px',r:['#e6b93c','#ffd54a']},
    {p:'#9b2fb5',pat:'linear-gradient(45deg,#ffffff26 25%,transparent 25% 75%,#ffffff26 75%),linear-gradient(-45deg,#ffffff1a 25%,transparent 25% 75%,#ffffff1a 75%)',ps:'16px 16px',r:['#b9c2cf','#d9dee6']},
    {p:'#c42a2a',pat:'repeating-linear-gradient(135deg,#ffffff1c 0 3px,transparent 3px 13px)',ps:'auto',r:['#2f9e5b','#3fb870']},
    {p:'#d6b072',pat:'radial-gradient(circle,#ffffffaa 1.4px,transparent 2px)',ps:'11px 11px',r:['#3a4cc7','#4b5de0']},
    {p:'#1f8a5b',pat:'radial-gradient(circle at 30% 30%,#ffffff88 2px,transparent 3px),radial-gradient(circle at 70% 70%,#ff6b6b99 2px,transparent 3px)',ps:'18px 18px',r:['#e04a4a','#ff5a5a']},
    {p:'#e0589c',pat:'radial-gradient(circle,#ffffffbb 3px,transparent 3.6px)',ps:'18px 18px',r:['#ffffff','#f4f7fb']},
    {p:'#2b4a9b',pat:'repeating-linear-gradient(90deg,#ffffff22 0 4px,transparent 4px 14px)',ps:'auto',r:['#ffd54a','#e6b93c']},
    {p:'#e8892b',pat:'radial-gradient(circle at 50% 50%,#ffffff66 2px,transparent 3px)',ps:'14px 14px',r:['#7a2a8f','#9b2fb5']}
  ];
  const $ = s => document.querySelector(s);
  const EMPTY_TXT = $('#empty').textContent;

  /* ---------- Ocultar contenido hasta iniciar sesión ---------- */
  const topEl = $('.top');
  const stageEl = $('.stage');
  topEl.hidden = true;
  stageEl.hidden = true;

  const gateStyle = document.createElement('style');
  gateStyle.textContent = `
    .gate{
      position:fixed;inset:0;z-index:50;
      display:grid;place-items:center;padding:16px;
      background:rgba(8,15,30,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    }
    .gate[hidden]{display:none}
    .gate-card{
      width:min(410px,94vw);padding:28px 26px;border-radius:16px;
      background:var(--paper,#faf6ef);color:var(--card-ink,#231f1c);
      border:1px solid var(--paper-border,#dfd6c5);
      box-shadow:0 24px 60px rgba(0,0,0,.55);
      outline:1px solid rgba(181,43,39,.14);outline-offset:-7px;
      animation:dlgIn .22s ease-out;
    }
    .gate-card h2{
      margin:0;font-family:var(--font-serif,Georgia,serif);
      font-size:1.55rem;color:var(--card-ink,#231f1c);
    }
    .gate-card .sub{margin:6px 0 18px;color:var(--card-muted,#6b6359);font-size:.92rem}
    .gate-actions{display:flex;justify-content:flex-end;margin-top:18px}
    .gate-actions .btn{width:100%}
    .user-bar{
      display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;
      padding:5px 12px;border-radius:999px;font-size:.82rem;
      background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);color:var(--ink,#f6f3ed);
    }
    .user-bar button{
      border:0;background:none;color:var(--gold,#d4a73c);font:inherit;font-weight:600;
      cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;
    }
  `;
  document.head.appendChild(gateStyle);

  const gate = document.createElement('div');
  gate.className = 'gate';
  gate.innerHTML = `
    <form class="gate-card" id="gateForm">
      <h2>Intercambio navideño</h2>
      <p class="sub">Elige tu nombre e ingresa tu contraseña para entrar.</p>
      <label class="field">¿Quién eres?
        <select id="gName" required disabled>
          <option value="">Cargando participantes…</option>
        </select>
      </label>
      <label class="field">Contraseña
        <input id="gPass" type="password" required autocomplete="current-password" placeholder="Tu clave secreta">
      </label>
      <p class="err" id="gateErr" hidden></p>
      <div class="gate-actions">
        <button type="submit" class="btn primary" id="gSubmit" disabled>Entrar</button>
      </div>
    </form>
  `;
  document.body.appendChild(gate);

  // Barra discreta con el usuario conectado
  const userBar = document.createElement('div');
  userBar.className = 'user-bar';
  userBar.hidden = true;
  userBar.innerHTML = `<span id="loggedName"></span> · <button type="button" id="btnLogout">Cambiar usuario</button>`;
  topEl.insertBefore(userBar, topEl.firstChild);

  let authUser = null; // { name, password }

  /* ---------- Reproductor de villancicos (.mp3) ---------- */
  const player = new Audio();
  player.volume = 0.45;
  player.preload = 'auto';

  let songIdx = 0;
  let userMuted = false;
  let failedCount = 0;

  const musicBox = document.createElement('div');
  musicBox.className = 'music-ctl';
  musicBox.innerHTML = `
    <button type="button" class="music-btn" id="btnMusic" aria-label="Música navideña">Activar música</button>
    <button type="button" class="music-btn music-skip" id="btnNextSong" title="Siguiente villancico" hidden>⏭</button>
  `;
  document.body.appendChild(musicBox);

  function updateMusicUI(){
    const btn = $('#btnMusic'), skip = $('#btnNextSong');
    const playing = !player.paused && !player.ended && player.currentSrc;
    if (playing){
      btn.textContent = `♪ ${CAROLS[songIdx].title}`;
      skip.hidden = CAROLS.length <= 1;
    } else {
      btn.textContent = 'Activar música';
      skip.hidden = true;
    }
  }

  async function playCarol(idx = songIdx){
    if (!CAROLS.length) return;
    songIdx = (idx + CAROLS.length) % CAROLS.length;
    const targetSrc = new URL(CAROLS[songIdx].src, location.href).href;
    if (player.src !== targetSrc) {
      player.src = CAROLS[songIdx].src;
    }
    try {
      await player.play();
      failedCount = 0;
      updateMusicUI();
    } catch {
      updateMusicUI();
    }
  }

  player.onended = () => {
    failedCount = 0;
    playCarol(songIdx + 1);
  };

  player.onerror = () => {
    failedCount++;
    if (failedCount < CAROLS.length) {
      playCarol(songIdx + 1);
    } else {
      updateMusicUI();
    }
  };

  $('#btnMusic').onclick = async e => {
    e.stopPropagation();
    if (!player.paused){
      userMuted = true;
      player.pause();
      updateMusicUI();
    } else {
      userMuted = false;
      failedCount = 0;
      await playCarol(songIdx);
    }
  };

  $('#btnNextSong').onclick = async e => {
    e.stopPropagation();
    userMuted = false;
    failedCount = 0;
    await playCarol(songIdx + 1);
  };

  ['pointerdown','keydown'].forEach(ev => {
    document.addEventListener(ev, () => {
      if (!userMuted && player.paused) playCarol(songIdx);
    }, { once: true });
  });

  /* ---------- Barra de carga ---------- */
  let loadTimer = null;
  function startLoader(){
    const el = $('#empty');
    el.innerHTML = `
      <div class="ld-wrap" role="progressbar" aria-label="Cargando regalos" aria-valuemin="0" aria-valuemax="100">
        <span class="ld-txt">Cargando regalos…</span>
        <div class="ld-track"><div class="ld-fill" id="ldFill"></div></div>
      </div>`;
    el.hidden = false;
    let pct = 8;
    const fill = $('#ldFill');
    if (fill) fill.style.width = pct + '%';
    clearInterval(loadTimer);
    loadTimer = setInterval(() => {
      pct += (88 - pct) * 0.14;
      const f = $('#ldFill');
      if (f) f.style.width = pct.toFixed(1) + '%';
    }, 180);
  }

  function finishLoader(ok){
    clearInterval(loadTimer);
    if (!ok) return Promise.resolve();
    const f = $('#ldFill');
    if (f) f.style.width = '100%';
    return new Promise(r => setTimeout(r, 240));
  }

  /* ---------- Servidor (Google Sheets + Drive vía Apps Script) ---------- */
  const api = {
    async get(){ const r = await fetch(API_URL); return r.json(); },
    async post(body){ const r = await fetch(API_URL,{method:'POST',body:JSON.stringify(body)}); return r.json(); }
  };
  let people = [];           // [{id,name,items}]
  let names = [];            // nombres permitidos (hoja "Claves")
  let currentId = null;      // persona abierta en "ver"
  let editingId = null;      // persona en edición
  let editPass = '';         // contraseña ya validada para guardar la edición

  function showErr(id,msg){ const e=$(id); e.textContent=msg; e.hidden=false; }
  function setBusy(btn,on,txt){
    if(on){ btn.dataset.t=btn.textContent; btn.textContent=txt; btn.disabled=true; }
    else { btn.textContent=btn.dataset.t||btn.textContent; btn.disabled=false; }
  }

  function fillGateSelect(){
    const sel = $('#gName');
    sel.innerHTML = '<option value="">Elige tu nombre…</option>' +
      names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    sel.disabled = false;
    $('#gSubmit').disabled = false;
  }

  function unlockApp(user){
    authUser = user;
    sessionStorage.setItem('arbol_auth', JSON.stringify(user));
    gate.hidden = true;
    topEl.hidden = false;
    stageEl.hidden = false;
    userBar.hidden = false;
    $('#loggedName').textContent = `Hola, ${user.name}`;
    updateMainActionBtn();
  }

  function updateMainActionBtn(){
    if (!authUser) return;
    const miLista = people.find(x => x.id === authUser.name);
    $('#btnAdd').textContent = miLista ? 'Editar mi lista' : '+ Agregar mi lista';
  }

  $('#btnLogout').onclick = () => {
    sessionStorage.removeItem('arbol_auth');
    authUser = null;
    editPass = '';
    topEl.hidden = true;
    stageEl.hidden = true;
    userBar.hidden = true;
    $('#gPass').value = '';
    $('#gateErr').hidden = true;
    gate.hidden = false;
    $('#gName').focus();
  };

  $('#gateForm').onsubmit = async e => {
    e.preventDefault();
    const name = $('#gName').value.trim();
    const pw = $('#gPass').value;
    if (!name || !pw) return;
    const btn = $('#gSubmit');
    $('#gateErr').hidden = true;
    setBusy(btn, true, 'Verificando…');
    try {
      const r = await api.post({ action: 'check', name, password: pw });
      if (r.ok) {
        unlockApp({ name, password: pw });
        if (!userMuted && player.paused) playCarol(songIdx);
        await load(true);
      } else {
        showErr('#gateErr', r.error === 'clave' ? 'Contraseña incorrecta.' : 'Error del servidor. Intenta de nuevo.');
      }
    } catch {
      showErr('#gateErr', 'No hay conexión con el servidor.');
    }
    setBusy(btn, false);
  };

  async function initGate(){
    // Revisa si ya inició sesión en esta pestaña
    try {
      const saved = JSON.parse(sessionStorage.getItem('arbol_auth') || 'null');
      if (saved && saved.name && saved.password) {
        const check = await api.post({ action: 'check', name: saved.name, password: saved.password });
        if (check.ok) {
          unlockApp(saved);
          await load(true);
          return;
        }
      }
    } catch {}

    // Si no hay sesión válida, carga solo los nombres para el desplegable del login
    try {
      const d = await api.get();
      if (!d.ok) throw new Error(d.error);
      names = d.names;
      fillGateSelect();
    } catch {
      showErr('#gateErr', 'No se pudo conectar con el servidor. Recarga la página.');
    }
  }

  async function load(showBar = false){
    if (showBar) startLoader();
    try{
      const d = await api.get();
      if(!d.ok) throw new Error(d.error);
      people = d.people.map(p=>({...p,id:p.name}));
      names = d.names;
      if (showBar) await finishLoader(true);
    }catch{
      if (showBar) await finishLoader(false);
      $('#empty').textContent='No se pudo cargar. Revisa tu conexión y recarga la página.';
      $('#empty').hidden=false; return false;
    }
    $('#empty').textContent = EMPTY_TXT;
    updateMainActionBtn();
    renderGifts(); return true;
  }

  /* ---------- Nieve y luces ---------- */
  const snow = $('#snow');
  for(let i=0;i<40;i++){
    const f = document.createElement('span');
    f.className='flake'; f.textContent='❄';
    f.style.left = Math.random()*100+'%';
    f.style.fontSize = (8+Math.random()*12)+'px';
    f.style.animationDuration = (8+Math.random()*12)+'s';
    f.style.animationDelay = (-Math.random()*20)+'s';
    snow.appendChild(f);
  }
  const lights = $('#lights');
  const lc = ['#ff5a5a','#ffd54a','#5ab8ff','#ff9be0','#8dffa0'];
  [[200,90],[170,120],[230,150],[150,170],[200,175],[250,200],[110,230],[160,250],[225,245],[280,260],[90,300],[140,330],[200,310],[260,340],[310,320],[120,375],[240,380],[290,385]]
    .forEach(([x,y],i)=>{
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',5);
      c.setAttribute('fill',lc[i%lc.length]);c.setAttribute('class','light');
      c.style.animationDelay=(i*0.17)+'s';
      lights.appendChild(c);
    });

  /* ---------- Render de regalos ---------- */
  function rnd(id,salt){ let h=salt*977+7; for(const ch of id) h=Math.imul(h^ch.charCodeAt(0),2654435761)>>>0; h^=h>>>15; h=Math.imul(h,2246822519)>>>0; h^=h>>>13; return (h>>>0)/4294967296; }
  function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function linkify(t){ return esc(t).replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  function renderGifts(){
    const box = $('#gifts'); box.innerHTML='';
    $('#empty').hidden = people.length>0;
    people.forEach((p,i)=>{
      const b = document.createElement('button');
      b.className='gift'; const pp = PAPERS[Math.floor(rnd(p.id,1)*PAPERS.length)];
      const w = Math.round(56 + rnd(p.id,2)*56), h = Math.round(46 + rnd(p.id,3)*74);
      const st = b.style;
      st.setProperty('--w',w+'px'); st.setProperty('--h',h+'px'); st.setProperty('--k',(w/80).toFixed(2));
      st.setProperty('--p',pp.p); st.setProperty('--pat',pp.pat); st.setProperty('--ps',pp.ps);
      st.setProperty('--r',pp.r[Math.floor(rnd(p.id,4)*2)]); st.setProperty('--rw',Math.max(9,Math.round(w*0.16))+'px');
      b.dataset.cross = rnd(p.id,5)>0.6 ? '1' : '0';
      b.style.animationDelay=(i*0.05)+'s';
      b.setAttribute('aria-label',`Ver lista de ${p.name}`);
      b.innerHTML=`<span class="badge">${p.items.length}</span><span class="box"><span class="front"></span><span class="top"></span><span class="side"></span><span class="bow"><i></i><i></i><b></b></span></span><span class="name">${esc(p.name)}</span>`;
      b.onclick=()=>openView(p.id);
      box.appendChild(b);
    });
  }

  /* ---------- Ver lista ---------- */
  $('#btnEdit').textContent = 'Editar mi lista';

  function openView(id){
    const p = people.find(x=>x.id===id); if(!p) return;
    currentId=id;
    $('#viewName').textContent = p.name;
    $('#viewCount').textContent = p.items.length===1 ? '1 regalo en su lista' : `${p.items.length} regalos en su lista`;
    // Solo muestra el botón "Editar mi lista" si la lista pertenece al usuario conectado
    $('#btnEdit').hidden = !authUser || authUser.name !== p.name;

    const wrap = $('#viewItems'); wrap.innerHTML='';
    p.items.forEach(it=>{
      const d = document.createElement('div'); d.className='item';
      const photoHtml = it.photo
        ? `<div class="thumb-wrap" title="Toca para ampliar"><img src="${esc(it.photo)}" alt="${esc(it.title)}"></div>`
        : `<div class="ph">🎁</div>`;
      d.innerHTML = `${photoHtml}<div><h3>${esc(it.title)}</h3>${it.note?`<p>${linkify(it.note)}</p>`:''}</div>`;
      const thumb = d.querySelector('.thumb-wrap');
      if(thumb) thumb.onclick=()=>showPhoto(it.photo,it.title);
      wrap.appendChild(d);
    });
    $('#viewDlg').showModal();
  }

  function showPhoto(src,alt){
    const dlg = $('#photoDlg');
    $('#bigPhoto').src=src;
    $('#bigPhoto').alt=alt;
    let cap = dlg.querySelector('.photo-cap');
    if(!cap){
      cap = document.createElement('div');
      cap.className = 'photo-cap';
      dlg.appendChild(cap);
    }
    cap.textContent = `${alt} · Toca para cerrar`;
    dlg.showModal();
  }
  $('#photoDlg').onclick=()=>$('#photoDlg').close();

  /* ---------- Editar (usa la sesión activa o pide contraseña) ---------- */
  let pendingEditId = null;
  $('#btnEdit').onclick=()=>{
    const p = people.find(x=>x.id===currentId); if(!p) return;
    $('#viewDlg').close();
    if (authUser && authUser.name === p.name) {
      editPass = authUser.password;
      openForm(p.id);
      return;
    }
    pendingEditId = p.id;
    $('#passSub').textContent = `Escribe la contraseña de ${p.name} para editar esta lista.`;
    $('#pPass').value=''; $('#passErr').hidden=true;
    $('#passDlg').showModal(); $('#pPass').focus();
  };
  $('#passForm').onsubmit=async e=>{
    e.preventDefault();
    const p = people.find(x=>x.id===pendingEditId); if(!p) return;
    const pw = $('#pPass').value, btn = $('#passForm button[type=submit]');
    $('#passErr').hidden=true; setBusy(btn,true,'Verificando…');
    try{
      const r = await api.post({action:'check',name:p.name,password:pw});
      if(r.ok){ editPass=pw; $('#passDlg').close(); openForm(p.id); }
      else showErr('#passErr', r.error==='clave' ? 'Contraseña incorrecta. Este no es tu regalo 🎁' : 'Error del servidor. Intenta de nuevo.');
    }catch{ showErr('#passErr','No hay conexión con el servidor.'); }
    setBusy(btn,false);
  };

  /* ---------- Formulario ---------- */
  function optimizeImage(file, max=1600){
    return new Promise((res,rej)=>{
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload=()=>{
        const k = Math.min(1, max/Math.max(img.width,img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1,Math.round(img.width*k));
        c.height = Math.max(1,Math.round(img.height*k));
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img,0,0,c.width,c.height);
        const out = c.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(url);
        res(out);
      };
      img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('Imagen no válida')); };
      img.src=url;
    });
  }

  function addFormItem(data={}){
    const n = document.createElement('div'); n.className='fitem';
    n.dataset.photo = data.photo || '';
    n.innerHTML = `
      <button type="button" class="rm">Quitar</button>
      <label class="field" style="margin-top:0">¿Qué regalo quieres?
        <input class="t" required maxlength="80" placeholder="Ej. Audífonos inalámbricos" value="${esc(data.title||'')}">
      </label>
      <label class="field">Detalles (talla, color, link…)
        <textarea class="nt" rows="2" maxlength="300">${esc(data.note||'')}</textarea>
      </label>
      <div class="row">
        <img class="prev" alt="" ${data.photo?`src="${esc(data.photo)}"`:'hidden'}>
        <div class="photo-ctl">Foto de referencia
          <input class="f" type="file" accept="image/*">
        </div>
      </div>`;
    n.querySelector('.rm').onclick=()=>{ if($('#formItems').children.length>1) n.remove(); };
    n.querySelector('.f').onchange=async e=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const d = await optimizeImage(f); n.dataset.photo=d;
        const pv = n.querySelector('.prev'); pv.src=d; pv.hidden=false;
      }catch{ alert('No se pudo leer esa imagen.'); }
    };
    $('#formItems').appendChild(n);
  }

  function openForm(id=null){
    const targetName = id || (authUser ? authUser.name : null);
    const p = targetName ? people.find(x=>x.id===targetName) : null;
    editingId = p ? p.id : null;
    if (authUser && authUser.name === targetName) editPass = authUser.password;

    $('#formTitle').textContent = p ? 'Editar mi lista' : 'Mi lista de regalos';
    const sel = $('#fName');
    if (authUser) {
      sel.innerHTML = `<option value="${esc(authUser.name)}">${esc(authUser.name)}</option>`;
      sel.value = authUser.name;
      sel.disabled = true;
      $('#passWrap').hidden = true;
      $('#fPass').required = false;
    } else {
      const taken = new Set(people.map(x=>x.name));
      sel.innerHTML = '<option value="">Elige tu nombre…</option>' +
        names.filter(n => p ? n===p.name : !taken.has(n))
          .map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
      sel.value = p ? p.name : ''; sel.disabled = !!p;
      $('#passWrap').hidden = !!p; $('#fPass').required = !p;
    }
    $('#fPass').value='';
    $('#formErr').hidden = true;
    $('#formItems').innerHTML='';
    (p ? p.items : [{}]).forEach(addFormItem);
    $('#formDlg').showModal();
  }

  $('#btnAdd').onclick=()=>{
    if(!names.length){ alert('Aún no se cargan los datos. Espera un momento e intenta de nuevo.'); return; }
    openForm(authUser ? authUser.name : null);
  };
  $('#btnMore').onclick=()=>addFormItem();

  $('#form').onsubmit=async e=>{
    e.preventDefault();
    const items = [...document.querySelectorAll('.fitem')].map(n=>({
      title:n.querySelector('.t').value.trim(),
      note:n.querySelector('.nt').value.trim(),
      photo:n.dataset.photo||''
    })).filter(i=>i.title);
    const name = $('#fName').value.trim();
    if(!name || !items.length) return;
    const password = (authUser && authUser.name === name)
      ? authUser.password
      : (editingId ? editPass : $('#fPass').value);
    const btn = $('#form button[type=submit]');
    $('#formErr').hidden=true; setBusy(btn,true,'Guardando…');
    try{
      const r = await api.post({action:'save',name,password,items});
      if(r.ok){ await load(); $('#formDlg').close(); }
      else showErr('#formErr', r.error==='clave' ? 'Esa contraseña no corresponde a ese nombre.' : 'No se pudo guardar. Intenta de nuevo.');
    }catch{ showErr('#formErr','No hay conexión con el servidor.'); }
    setBusy(btn,false);
  };

  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog:not(.photo)').forEach(d=>d.addEventListener('click',e=>{ if(e.target===d) d.close(); }));

  initGate();
})();
