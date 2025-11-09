// CitiTool • ASSISTENT (Material • Fasen • Passmassen)
// ЧИСТАЯ ЛОГИКА • БЕЗ UI • БЕЗ DOM
;(function(global){
  "use strict";

  // ---------- Storage keys ----------
  const K_AS_MAT_PRESETS   = 'CT_AS_MAT_PRESETS_V1';
  const K_AS_MAT_HISTORY   = 'CT_AS_MAT_HISTORY_V1';
  const K_AS_FASEN_PRESETS = 'CT_AS_FASEN_PRESETS_V1';
  const K_AS_PASS_TABLE    = 'CT_AS_PASS_TABLE_V1';

  // ---------- Mini-helpers ----------
  const storage = {
    get: (k, def=null) => CT.load ? CT.load(k, def) : (JSON.parse(localStorage.getItem(k) || 'null') ?? def),
    set: (k, v) => { if (CT.save) CT.save(k, v); else localStorage.setItem(k, JSON.stringify(v)); }
  };

  const now  = () => Date.now();
  const uid  = () => Math.random().toString(36).slice(2,10);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v, p=0) => {
    const m = Math.pow(10, p|0);
    return Math.round((+v + Number.EPSILON) * m) / m;
  };
  const deg2rad = (x) => (+x) * Math.PI / 180;
  const rad2deg = (x) => (+x) * 180 / Math.PI;

  // ---------- Internal utils ----------
  const toNum = (v, d=0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const uniqBy = (arr, key) => {
    const m = new Set(); const out = [];
    for (const x of arr||[]) { const k = key(x); if (!m.has(k)) { m.add(k); out.push(x); } }
    return out;
  };

  // ======================================================================
  //                                 API
  // ======================================================================
  const Ass = { material:{}, fasen:{ presets:{} }, pass:{}, ensureSeeds };

  // ---------- Seeds ----------
  function ensureSeeds(){
    if (!storage.get(K_AS_MAT_PRESETS)) {
      storage.set(K_AS_MAT_PRESETS, [
        {id:uid(), name:'1.4112', procedure:'drehen', mode:'schruppen', defaults:{Vc:180, fn:0.25}, notes:''},
        {id:uid(), name:'1.4112', procedure:'drehen', mode:'schlichten', defaults:{Vc:220, fn:0.15}, notes:''},
        {id:uid(), name:'Ms58',   procedure:'drehen', mode:'schruppen',  defaults:{Vc:300, fn:0.30}, notes:''},
      ]);
    }
    if (!storage.get(K_AS_MAT_HISTORY))   storage.set(K_AS_MAT_HISTORY, []);
    if (!storage.get(K_AS_FASEN_PRESETS)) storage.set(K_AS_FASEN_PRESETS, [ {id:uid(), angle:45} ]);
    if (!storage.get(K_AS_PASS_TABLE)) {
      storage.set(K_AS_PASS_TABLE, [
        {system:'shaft', nominal:12, symbol:'h6', lower:-0.006, upper: 0.000},
        {system:'hole',  nominal:12, symbol:'H7', lower: 0.000, upper:+0.018},
        {system:'shaft', nominal:10, symbol:'g6', lower:-0.004, upper: 0.000},
      ]);
    }
    // дедупликация на всякий
    const mat = storage.get(K_AS_MAT_PRESETS, []);
    storage.set(K_AS_MAT_PRESETS, uniqBy(mat, x=>`${x.name}|${x.procedure}|${x.mode}`));
  }

  // ======================================================================
  //                           MATERIAL (Drehen)
  // ======================================================================
  Ass.material.listPresets = (f={})=>{
    const all = storage.get(K_AS_MAT_PRESETS, []);
    return all.filter(p =>
      (!f.procedure || p.procedure===f.procedure) &&
      (!f.mode || p.mode===f.mode)
    );
  };

  Ass.material.addPreset = (p={})=>{
    const cur = storage.get(K_AS_MAT_PRESETS, []);
    const np = {
      id: uid(),
      name: (p.name||'Material').toString().trim(),
      procedure: p.procedure||'drehen',
      mode: p.mode||'schruppen',
      defaults: { Vc: toNum(p?.defaults?.Vc, 180), fn: toNum(p?.defaults?.fn, .2) },
      notes: p.notes||''
    };
    storage.set(K_AS_MAT_PRESETS, [...cur, np]);
    return np;
  };

  Ass.material.updatePreset = (id, patch={})=>{
    const cur = storage.get(K_AS_MAT_PRESETS, []);
    const i = cur.findIndex(x=>x.id===id);
    if (i<0) throw new Error('Preset not found');
    const up = {...cur[i], ...patch};
    if (patch.defaults) {
      up.defaults = {
        Vc: toNum(patch.defaults.Vc, cur[i].defaults.Vc),
        fn: toNum(patch.defaults.fn, cur[i].defaults.fn),
      };
    }
    cur[i] = up;
    storage.set(K_AS_MAT_PRESETS, cur);
    return up;
  };

  Ass.material.removePreset = (id)=>{
    const cur = storage.get(K_AS_MAT_PRESETS, []);
    storage.set(K_AS_MAT_PRESETS, cur.filter(x=>x.id!==id));
  };

  Ass.material.suggestDefaults = (materialName, mode)=>{
    const hit = Ass.material.listPresets({}).find(p=> p.name===materialName && (!mode || p.mode===mode));
    return hit ? {...hit.defaults} : null;
  };

  // MatInput { D, L?, Vc, fn }
  // MatResult { n, Vf, warnings[], info[], input, presetId?, createdAt }
  Ass.material.calc = (input={}, {presetId}={})=>{
    const D  = toNum(input.D, 0);
    const Vc = toNum(input.Vc, 0);
    const fn = toNum(input.fn, 0);
    const res = { n:0, Vf:0, warnings:[], info:[], input:{...input}, presetId, createdAt: now() };

    if (D<=0 || Vc<=0 || fn<=0) {
      res.warnings.push('Ungültige Eingaben');
      return res;
    }
    // n = (1000 * Vc) / (π * D)
    const n  = Math.round((1000 * Vc) / (Math.PI * D));
    const Vf = Math.round(fn * n);

    res.n  = n;
    res.Vf = Vf;

    if (n > 6000) res.warnings.push('n sehr hoch — prüfen!');
    if (n < 100)  res.info.push('n sehr niedrig — Werkzeugdaten prüfen');

    return res;
  };

  Ass.material.history = {
    list(limit=20){
      const arr = storage.get(K_AS_MAT_HISTORY, []);
      return arr.slice(0, limit);
    },
    add(r){
      const cur = storage.get(K_AS_MAT_HISTORY, []);
      storage.set(K_AS_MAT_HISTORY, [r, ...cur].slice(0, 50));
    }
  };

  // Возвращаем и body, и text — чтобы можно было сунуть прямо в Docs.create(...)
  Ass.material.toNote = (r)=>{
    const lines = [
      `Material: ${r.input?.material||'-'}`,
      `Ø = ${r.input?.D} mm`,
      `Vc = ${r.input?.Vc} m/min`,
      `fn = ${r.input?.fn} mm/U`,
      `n = ${r.n} 1/min`,
      `Vf = ${r.Vf} mm/min`,
      ...(r.warnings||[]).map(w=>'⚠ ' + w),
      ...(r.info||[]).map(i=>'• ' + i),
    ];
    const payload = {
      title: (`Schnittdaten ${r.input?.material||''}`).trim() || 'Schnittdaten',
      category: 'Material',
      tags: ['calc','drehen'],
      body: lines.join('\n'),
      text: lines.join('\n')  // на случай прямого вызова Docs.create(...)
    };
    return payload;
  };

  // ======================================================================
  //                                FASEN
  // ======================================================================
  // FasenParams: angle + любые 2 из {Xstart, Xend, L}
  Ass.fasen.solve = (p={})=>{
    const angle = toNum(p.angle, 0);
    const t = Math.tan(deg2rad(angle||0));
    const out = {
      angle, Xstart:p.Xstart, Xend:p.Xend, L:p.L,
      depth: NaN, slope: t, valid: false, errors:[]
    };

    const known = ['Xstart','Xend','L'].filter(k => typeof p[k] === 'number' && isFinite(p[k]));
    if (angle <= 0) out.errors.push('Winkel fehlt/ungültig');
    if (known.length < 2) out.errors.push('Mind. zwei Werte aus {Xstart, Xend, L}');

    let Xs = (typeof p.Xstart==='number') ? p.Xstart : null;
    let Xe = (typeof p.Xend  ==='number') ? p.Xend   : null;
    let L  = (typeof p.L     ==='number') ? p.L      : null;

    if (angle > 0 && known.length >= 2) {
      if (Xs!=null && Xe!=null && L==null) {             // найти L
        const depth = (Xs - Xe) / 2;
        L = depth / t;
      } else if (Xs!=null && L!=null && Xe==null) {      // найти Xend
        const depth = L * t;
        Xe = Xs - 2*depth;
      } else if (Xe!=null && L!=null && Xs==null) {      // найти Xstart
        const depth = L * t;
        Xs = Xe + 2*depth;
      }
    }

    const depth = (Xs!=null && Xe!=null) ? (Xs - Xe)/2 : NaN;
    const ok = angle>0 && Number.isFinite(t) && Xs!=null && Xe!=null && L!=null;

    Object.assign(out, {
      Xstart: Number(Xs), Xend: Number(Xe), L: Number(L),
      depth, valid: !!ok
    });

    if (!ok) out.errors.push('Nicht lösbar — Eingaben prüfen');
    if (Number.isFinite(out.depth) && out.depth < 0) out.errors.push('Xend > Xstart (negative Tiefe)');

    return out;
  };

  Ass.fasen.gcode = (s, opts={})=>{
    const lines = [];
    if (!s?.valid) return { lines: ['(Fase: Eingaben unvollständig)'] };

    if (opts.toolT) lines.push(`(${opts.toolT})`);
    if (opts.side)  lines.push(opts.side === 'ro' ? 'G54' : 'G55');
    lines.push('(Fase)');

    // Минимально безопасный линейный проход (пример):
    // от текущей позиции к Xend, Z- (L), подача F...
    const F = toNum(opts.feed, 0.15);
    lines.push(`G1 X${round(s.Xend,3)} Z-${round(s.L,3)} F${round(F,3)}`);

    return {
      lines,
      note: `Fase ${round(s.angle,1)}°, L=${round(s.L,3)} mm, X: ${round(s.Xstart,3)}→${round(s.Xend,3)}`
    };
  };

  Ass.fasen.presets.list   = ()=> storage.get(K_AS_FASEN_PRESETS, []);
  Ass.fasen.presets.add    = (p)=> storage.set(K_AS_FASEN_PRESETS, [...Ass.fasen.presets.list(), {...p, id:uid()}]);
  Ass.fasen.presets.remove = (id)=> storage.set(K_AS_FASEN_PRESETS, Ass.fasen.presets.list().filter(x=>x.id!==id));

  // ======================================================================
  //                              PASSMASSEN
  // ======================================================================
  // Parse 'd12 h6' | 'H7/g6' | 'D=25 H7'
  Ass.pass.parse = (q)=>{
    const raw = (q?.raw || '').trim();
    // d12 h6  |  D=25 H7
    const m1 = raw.match(/d?\s*=?\s*(\d+(?:\.\d+)?)\s*([HhGg][0-9A-Za-z]+)?/);
    // H7/g6
    const m2 = raw.match(/([Hh][0-9A-Za-z]+)\s*\/\s*([gGhH][0-9A-Za-z]+)/);
    const out = {};
    if (m1) { out.nominal = Number(m1[1]); if (m1[2]) out.symbolA = m1[2]; }
    if (m2) { out.symbolA = m2[1]; out.symbolB = m2[2]; }
    return out;
  };

  // Lookup
  Ass.pass.lookup = (system, nominal, symbol)=>{
    const tbl = storage.get(K_AS_PASS_TABLE, []);
    const hit = tbl.find(e =>
      e.system === system &&
      e.symbol === symbol &&
      Math.abs(e.nominal - nominal) < 1e-6
    );
    if (hit) return { ok:true, entry: hit };

    // подсказки по символу (ближайшие номиналы)
    const near = tbl
      .filter(e=> e.system===system && e.symbol===symbol)
      .sort((a,b)=> Math.abs(a.nominal - nominal) - Math.abs(b.nominal - nominal))
      .slice(0,3)
      .map(e=> `${e.system} ${e.nominal} ${e.symbol}`);
    return { ok:false, text:'Not found', suggestions: near };
  };

  Ass.pass.add = (entry)=>{
    const tbl = storage.get(K_AS_PASS_TABLE, []);
    tbl.push({
      system: entry.system,
      nominal: toNum(entry.nominal, 0),
      symbol: entry.symbol,
      lower : toNum(entry.lower, 0),
      upper : toNum(entry.upper, 0),
    });
    storage.set(K_AS_PASS_TABLE, tbl);
  };

  Ass.pass.update = (match, patch)=>{
    const tbl = storage.get(K_AS_PASS_TABLE, []);
    const i = tbl.findIndex(e => e.system===match.system && e.symbol===match.symbol && e.nominal===match.nominal);
    if (i < 0) throw new Error('Entry not found');
    const up = {...tbl[i], ...patch};
    if (patch.lower!=null) up.lower = toNum(patch.lower, up.lower);
    if (patch.upper!=null) up.upper = toNum(patch.upper, up.upper);
    if (patch.nominal!=null) up.nominal = toNum(patch.nominal, up.nominal);
    tbl[i] = up;
    storage.set(K_AS_PASS_TABLE, tbl);
  };

  Ass.pass.remove = (match)=>{
    const left = storage.get(K_AS_PASS_TABLE, [])
      .filter(e => !(e.system===match.system && e.symbol===match.symbol && e.nominal===match.nominal));
    storage.set(K_AS_PASS_TABLE, left);
  };

  Ass.pass.search = (raw)=>{
    const p = Ass.pass.parse({raw});
    const out = {};
    if (p.nominal && p.symbolA) out.shaft = Ass.pass.lookup('shaft', p.nominal, p.symbolA);
    if (p.nominal && p.symbolB) out.hole  = Ass.pass.lookup('hole',  p.nominal, p.symbolB);
    return out;
  };

  // ---------- export ----------
  Ass.__util = { now, uid, clamp, round, deg2rad, rad2deg }; // на случай unit-тестов
  global.Ass = Ass;
})(window);
