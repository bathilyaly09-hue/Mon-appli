/* ElecVision client — local-first editor with optional account sync. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const API = 'api.php';
  const price = { wire: 500, prise: 3000, interrupteur: 2500, lampe: 4000, tableau: 25000, 'chauffe-eau': 75000, clim: 150000, ventilateur: 25000, labor: 15000 };
  const labels = { prise: 'Prises', interrupteur: 'Interrupteurs', lampe: 'Éclairages', tableau: 'Tableaux', 'chauffe-eau': 'Chauffe-eau', clim: 'Climatiseurs', ventilateur: 'Ventilateurs' };
  let canvas, csrf = '', user = null, registerMode = false, wireMode = false, firstWirePoint = null, toastTimer;
  const localProjects = () => { try { return JSON.parse(localStorage.getItem('elecvision.projects') || '[]'); } catch { return []; } };
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800); }
  async function request(action, {method = 'GET', body} = {}) {
    const options = { method, headers: { Accept: 'application/json' } };
    if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.headers['X-CSRF-Token'] = csrf; options.body = JSON.stringify(body); }
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || `Erreur serveur (${response.status})`);
    if (data.csrf) csrf = data.csrf;
    return data;
  }
  function projectData() { return { id: crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`, name: '', updated_at: new Date().toISOString(), canvas: canvas.toJSON(['data']) }; }
  function setupCanvas() {
    if (!window.fabric) { toast('Le module de dessin n’a pas pu être chargé. Vérifiez votre connexion.'); return; }
    fabric.Object.prototype.objectCaching = false;
    canvas = new fabric.Canvas('canvas', { selection: true, preserveObjectStacking: true, backgroundColor: '#fff' });
    canvas.on('object:added', calculate); canvas.on('object:removed', calculate); canvas.on('object:modified', calculate);
    canvas.on('mouse:down', (event) => {
      if (!wireMode) return;
      const p = canvas.getPointer(event.e);
      if (!firstWirePoint) { firstWirePoint = p; toast('Cliquez sur le point d’arrivée du câble.'); return; }
      const line = new fabric.Line([firstWirePoint.x, firstWirePoint.y, p.x, p.y], { stroke: '#2563eb', strokeWidth: 4, selectable: true, data: { kind: 'wire' } });
      canvas.add(line); firstWirePoint = null; wireMode = false; $('#wireMode').classList.remove('active'); calculate();
    });
    calculate();
  }
  function symbol(type) {
    if (!canvas || !labels[type]) return;
    const glyphs = { prise: '🔌', interrupteur: '◉', lampe: '💡', tableau: '▦', 'chauffe-eau': '♨', clim: '❄', ventilateur: '✳' };
    const group = new fabric.Group([
      new fabric.Circle({ radius: 25, fill: '#eef0ff', stroke: '#4338ca', strokeWidth: 2, originX: 'center', originY: 'center' }),
      new fabric.Text(glyphs[type], { fontSize: 22, originX: 'center', originY: 'center' })
    ], { left: 250, top: 180, data: { kind: 'symbol', type } });
    canvas.add(group); canvas.setActiveObject(group); canvas.renderAll();
  }
  function calculate() {
    if (!canvas) return;
    const scale = Math.max(1, Number($('#scale').value) || 10), counts = Object.fromEntries(Object.keys(labels).map(k => [k, 0]));
    let pixels = 0;
    canvas.getObjects().forEach(obj => {
      if (obj.data?.kind === 'symbol' && counts[obj.data.type] !== undefined) counts[obj.data.type]++;
      if (obj.type === 'line') pixels += Math.hypot((obj.x2 || 0) - (obj.x1 || 0), (obj.y2 || 0) - (obj.y1 || 0));
    });
    const meters = pixels / scale / 100;
    const cable = meters * price.wire;
    const materials = Object.entries(counts).reduce((sum, [key, count]) => sum + count * (price[key] || 0), 0);
    const labor = Math.ceil(meters / 50) * price.labor;
    const power = counts.prise * 2300 + counts.clim * 3500 + counts['chauffe-eau'] * 3000 + counts.lampe * 100;
    const breaker = Math.min(63, Math.max(20, Math.ceil(power / 230) + 10));
    $('#totalLength').textContent = `${meters.toFixed(1)} m`;
    $('#wireSection').textContent = meters > 100 ? '6 mm²*' : meters > 50 ? '4 mm²*' : '2,5 mm²*';
    $('#breakerSize').textContent = `${breaker} A*`;
    $('#cableCost').textContent = `${Math.round(cable).toLocaleString('fr-FR')} FCFA`;
    $('#materialCost').textContent = `${materials.toLocaleString('fr-FR')} FCFA`;
    $('#laborCost').textContent = `${labor.toLocaleString('fr-FR')} FCFA`;
    $('#totalCost').textContent = `${Math.round(cable + materials + labor).toLocaleString('fr-FR')} FCFA`;
    $('#materials').innerHTML = Object.entries(counts).filter(([,n]) => n).map(([k,n]) => `<li>${labels[k]} : ${n}</li>`).join('') || '<li>Aucun équipement ajouté.</li>';
  }
  function snapshot(name, id) { return { id: id || (crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}`), name: name.trim(), updated_at: new Date().toISOString(), canvas: canvas.toJSON(['data']) }; }
  async function save() {
    if (!canvas) return;
    const name = prompt('Nom du projet :', 'Mon installation'); if (!name?.trim()) return;
    const data = snapshot(name);
    if (user) {
      try { await request('project_save', { method: 'POST', body: { project: data } }); toast('Projet enregistré sur votre compte.'); }
      catch (error) { toast(`${error.message} — copie locale conservée.`); saveLocal(data); }
    } else { saveLocal(data); toast('Projet enregistré dans ce navigateur. Connectez-vous pour la synchronisation serveur.'); }
    renderProjects();
  }
  function saveLocal(data) { const projects = localProjects().filter(p => p.id !== data.id); projects.unshift(data); localStorage.setItem('elecvision.projects', JSON.stringify(projects)); }
  async function renderProjects() {
    let projects = localProjects();
    if (user) { try { const data = await request('project_list'); projects = data.projects; } catch (e) { $('#projectMessage').textContent = `${e.message} — affichage des copies locales.`; } }
    const container = $('#projectList');
    container.innerHTML = projects.map(p => `<article class="project-card"><h3>${escapeHtml(p.name)}</h3><p>Modifié le ${new Date(p.updated_at).toLocaleString('fr-FR')}</p><button class="button secondary" data-open="${escapeHtml(p.id)}">Ouvrir</button><button class="button secondary" data-delete="${escapeHtml(p.id)}">Supprimer</button></article>`).join('') || '<p class="muted">Aucun projet enregistré.</p>';
    container.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openProject(button.dataset.open)));
    container.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteProject(button.dataset.delete)));
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function openProject(id) {
    let p = localProjects().find(item => item.id === id);
    if (user) { try { p = (await request('project_load&id=' + encodeURIComponent(id))).project; } catch (e) { toast(e.message); } }
    if (!p?.canvas) return toast('Projet introuvable.');
    canvas.loadFromJSON(p.canvas, () => { canvas.renderAll(); calculate(); location.hash = '#planner'; toast(`Projet « ${p.name} » ouvert.`); });
  }
  async function deleteProject(id) {
    if (!confirm('Supprimer ce projet ?')) return;
    localStorage.setItem('elecvision.projects', JSON.stringify(localProjects().filter(p => p.id !== id)));
    if (user) { try { await request('project_delete', { method: 'POST', body: { id } }); } catch (e) { toast(e.message); } }
    renderProjects();
  }
  async function syncAccount() {
    try { const state = await request('session'); user = state.user || null; csrf = state.csrf || csrf; }
    catch { user = null; }
    $('#accountStatus').textContent = user ? user.email : 'Mode local';
    $('#authOpen').classList.toggle('hidden', !!user); $('#logout').classList.toggle('hidden', !user);
    $('#projectMessage').textContent = user ? 'Vos projets synchronisés sont privés et associés à votre compte.' : 'Connectez-vous pour synchroniser vos projets sur ce serveur. Sans compte, le projet reste dans ce navigateur.';
    renderProjects();
  }
  async function submitAuth(event) {
    event.preventDefault(); $('#authError').textContent = '';
    try {
      const data = await request(registerMode ? 'register' : 'login', { method: 'POST', body: { email: $('#authEmail').value, password: $('#authPassword').value } });
      user = data.user; $('#authDialog').close(); $('#authForm').reset(); await syncAccount(); toast(registerMode ? 'Compte créé.' : 'Connexion réussie.');
    } catch (e) { $('#authError').textContent = e.message; }
  }
  async function exportQuote() {
    const content = `<h1>ElecVision — Devis estimatif</h1><p>Date : ${new Date().toLocaleDateString('fr-FR')}</p><h2>Estimation : ${$('#totalCost').textContent}</h2><p>Câbles : ${$('#totalLength').textContent} — ${$('#cableCost').textContent}</p><p>Matériel : ${$('#materialCost').textContent}</p><p>Main-d’œuvre : ${$('#laborCost').textContent}</p><h3>Équipements</h3>${$('#materials').innerHTML}<p><em>Estimation indicative à faire valider par un professionnel qualifié. Ce document n’est pas un devis contractuel.</em></p>`;
    const w = window.open('', '_blank'); if (!w) return toast('Autorisez les fenêtres contextuelles pour imprimer le devis.');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Devis ElecVision</title><style>body{font:16px Arial;max-width:800px;margin:50px auto;color:#172033}h1{color:#4338ca}li{margin:6px 0}@media print{button{display:none}}</style>${content}<button onclick="print()">Imprimer / Enregistrer en PDF</button>`); w.document.close();
  }
  window.addEventListener('DOMContentLoaded', async () => {
    setupCanvas();
    document.querySelectorAll('[data-symbol]').forEach(b => b.addEventListener('click', () => symbol(b.dataset.symbol)));
    $('#saveProject').addEventListener('click', save);
    $('#newProject').addEventListener('click', () => { if (confirm('Effacer le plan actuel ?')) { canvas.clear(); canvas.setBackgroundColor('#fff', canvas.renderAll.bind(canvas)); calculate(); } });
    $('#wireMode').addEventListener('click', () => { wireMode = !wireMode; firstWirePoint = null; $('#wireMode').classList.toggle('active', wireMode); if (wireMode) toast('Cliquez deux fois sur le plan pour tracer un câble.'); });
    $('#selectMode').addEventListener('click', () => { wireMode = false; firstWirePoint = null; $('#wireMode').classList.remove('active'); });
    $('#deleteSelected').addEventListener('click', () => { const obj = canvas?.getActiveObject(); if (obj) { canvas.remove(obj); calculate(); } });
    $('#scale').addEventListener('input', calculate); $('#exportQuote').addEventListener('click', exportQuote);
    $('#planImage').addEventListener('change', (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) return toast('Image trop volumineuse (limite 8 Mo).'); const reader = new FileReader(); reader.onload = () => fabric.Image.fromURL(reader.result, image => { image.scaleToWidth(Math.min(850, image.width)); image.set({ selectable: false, evented: false }); canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas)); }); reader.readAsDataURL(file); event.target.value = ''; });
    $('#authOpen').addEventListener('click', () => $('#authDialog').showModal()); $('#authClose').addEventListener('click', () => $('#authDialog').close());
    $('#authForm').addEventListener('submit', submitAuth);
    $('#authToggle').addEventListener('click', () => { registerMode = !registerMode; $('#authTitle').textContent = registerMode ? 'Créer un compte' : 'Connexion'; $('#authSubmit').textContent = registerMode ? 'Créer mon compte' : 'Se connecter'; $('#authToggle').textContent = registerMode ? 'J’ai déjà un compte' : 'Créer un compte'; $('#authPassword').autocomplete = registerMode ? 'new-password' : 'current-password'; });
    $('#logout').addEventListener('click', async () => { try { await request('logout', { method: 'POST', body: {} }); } catch (e) { toast(e.message); } user = null; await syncAccount(); });
    $('#refreshProjects').addEventListener('click', renderProjects);
    await syncAccount();
  });
})();
