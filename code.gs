/**
 * Backend del Árbol de regalos usando Google Sheets.
 * Pégalo en: Hoja de cálculo → Extensiones → Apps Script.
 *
 * Hojas que usa (las crea la función setup()):
 *  - Regalos: persona | orden | titulo | nota | foto
 *  - Claves:  persona | clave      (SOLO la ve el dueño de la hoja; nunca sale al navegador)
 */
const HOJA_REGALOS = 'Regalos';
const HOJA_CLAVES = 'Claves';

const CLAVES = [
  ['Daniel Degollar',   'DANIEL-3817'],
  ['Mariano Lobaton',   'MARIANO-5426'],
  ['Alexia Bazan',      'ALEXIA-7092'],
  ['Amanda Candela',    'AMANDA-1634'],
  ['Diego Villanueva',  'DIEGO-8275'],
  ['Elias Monago',      'ELIAS-4953'],
  ['Evander Rodríguez', 'EVANDER-2368']
];

/* Ejecuta esta función UNA vez (▶ Ejecutar → setup) para crear las hojas. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let r = ss.getSheetByName(HOJA_REGALOS);
  if (!r) {
    r = ss.insertSheet(HOJA_REGALOS);
    r.getRange(1, 1, 1, 5).setValues([['persona', 'orden', 'titulo', 'nota', 'foto']]);
    r.setFrozenRows(1);
  }

  let c = ss.getSheetByName(HOJA_CLAVES);
  if (!c) {
    c = ss.insertSheet(HOJA_CLAVES);
    c.getRange(1, 1, 1, 2).setValues([['persona', 'clave']]);
    const rg = c.getRange(2, 1, CLAVES.length, 2);
    rg.setNumberFormat('@');
    rg.setValues(CLAVES);
    c.setFrozenRows(1);
  }
}

/* GET: devuelve nombres permitidos y todas las listas (sin contraseñas). */
function doGet() {
  return json_({ ok: true, names: nombres_(), people: leer_() });
}

/* POST: {action:'check'|'save', name, password, items?} */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!claveOk_(d.name, d.password)) return json_({ ok: false, error: 'clave' });
    if (d.action === 'check') return json_({ ok: true });
    if (d.action === 'save') { guardar_(d.name, d.items); return json_({ ok: true }); }
    return json_({ ok: false, error: 'accion' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Auxiliares ---------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function hoja_(nombre) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
}

function nombres_() {
  const v = hoja_(HOJA_CLAVES).getDataRange().getValues().slice(1);
  return v.map(r => String(r[0]).trim()).filter(Boolean);
}

function claveOk_(name, password) {
  const v = hoja_(HOJA_CLAVES).getDataRange().getValues().slice(1);
  const fila = v.find(r => String(r[0]).trim() === String(name));
  if (!fila) return false;
  return String(password || '').trim().toLowerCase() === String(fila[1]).trim().toLowerCase();
}

function leer_() {
  const v = hoja_(HOJA_REGALOS).getDataRange().getValues().slice(1);
  const mapa = {};
  v.forEach(r => {
    const n = String(r[0]).trim();
    if (!n) return;
    (mapa[n] = mapa[n] || []).push({
      o: Number(r[1]) || 0,
      title: String(r[2]),
      note: String(r[3]),
      photo: String(r[4])
    });
  });
  return Object.keys(mapa).sort((a, b) => a.localeCompare(b)).map(n => ({
    name: n,
    items: mapa[n].sort((a, b) => a.o - b.o).map(i => ({ title: i.title, note: i.note, photo: i.photo }))
  }));
}

function guardar_(name, items) {
  if (!Array.isArray(items)) throw new Error('items inválidos');
  const filas = items.slice(0, 20).map((it, i) => {
    const foto = String(it.photo || '');
    const fotoOk = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(foto) && foto.length <= 49000;
    return [name, i, String(it.title || '').trim().slice(0, 80), String(it.note || '').slice(0, 300), fotoOk ? foto : ''];
  }).filter(f => f[2]);
  if (!filas.length) throw new Error('La lista está vacía');

  const sh = hoja_(HOJA_REGALOS);
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) {
    if (String(v[i][0]).trim() === name) sh.deleteRow(i + 1);
  }
  const rg = sh.getRange(sh.getLastRow() + 1, 1, filas.length, 5);
  rg.setNumberFormat('@');   // texto plano: evita que "=algo" se interprete como fórmula
  rg.setValues(filas);
}
