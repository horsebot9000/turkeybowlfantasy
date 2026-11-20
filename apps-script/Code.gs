/* Contest backend. Bind to a Google Sheet (Extensions > Apps Script), run setup() once, then deploy as Web App. */

const SH = {P: 'Players', E: 'Entries', S: 'Stats', C: 'Config'};

const DEFAULT_CONFIG = [
  ['contestName', 'GFA Turkey Bowl (Round 1 only)'],
  ['salaryCap', 35000],
  ['slots', 'QB,RB,WR,WR,WR,DST'],
  ['maxEntries', 3],
  ['locked', false]
];

const ELIG = {QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], DST: ['DST'], FLEX: ['RB', 'WR', 'TE'], SFLEX: ['QB', 'RB', 'WR', 'TE']};

const STAT_HEAD = ['Player',
  'PassYds', 'PassTD', 'INT', 'RushYds', 'RushTD', 'Rec', 'RecYds', 'RecTD', 'FumLost', 'TwoPt', 'OtherTD',
  'Sack', 'DefINT', 'FumRec', 'DefTD', 'Safety', 'Blk', 'PtsAllowed',
  'FPTS_Override', 'FPTS'];

/* DraftKings NFL scoring. Columns B..S per STAT_HEAD, override in T, result in U. */
const FPTS_FORMULA =
  '=ARRAYFORMULA(IF(A2:A="","",IF(T2:T<>"",T2:T,ROUND(' +
  'B2:B*0.04+C2:C*4-D2:D+IF(B2:B>=300,3,0)' +
  '+E2:E*0.1+F2:F*6+IF(E2:E>=100,3,0)' +
  '+G2:G+H2:H*0.1+I2:I*6+IF(H2:H>=100,3,0)' +
  '-J2:J+K2:K*2+L2:L*6' +
  '+M2:M+N2:N*2+O2:O*2+P2:P*6+Q2:Q*2+R2:R*2' +
  '+IF(S2:S="",0,IF(S2:S=0,10,IF(S2:S<=6,7,IF(S2:S<=13,4,IF(S2:S<=20,1,IF(S2:S<=27,0,IF(S2:S<=34,-1,-4))))))),2))))';

const SEED = [
  ["Coleworld", "WR", 8600, "Turkey Stuffers", "Harvest Havoc", 520],
  ["Sebb", "WR", 8200, "Foggy Pumpkins", "The Drunkles", 470],
  ["AK41", "WR", 8000, "The Drunkles", "Foggy Pumpkins", 380],
  ["Jett", "WR", 7800, "Mashed Mafia", "YAMS", 390],
  ["CSN", "WR", 7700, "Groovy Gravys", "Mac n Maniacs", 380],
  ["Death", "WR", 7400, "No Feast No Peace", "The CranBerry JAMS", 320],
  ["Mai", "WR", 7200, "YAMS", "Mashed Mafia", 310],
  ["juju", "WR", 7100, "The CranBerry JAMS", "No Feast No Peace", 330],
  ["Kenny", "WR", 6800, "No Feast No Peace", "The CranBerry JAMS", 260],
  ["DivinerLoco", "WR", 6600, "YAMS", "Mashed Mafia", 290],
  ["Matt", "WR", 6500, "Mac n Maniacs", "Groovy Gravys", 300],
  ["Visc", "WR", 6200, "Mashed Mafia", "YAMS", 230],
  ["numms", "WR", 6100, "The CranBerry JAMS", "No Feast No Peace", 220],
  ["Aquas", "WR", 5800, "Harvest Havoc", "Turkey Stuffers", 210],
  ["Hyreek", "WR", 5700, "Baked Birds", "The Pilgrims", 160],
  ["Davante", "WR", 5600, "Mac n Maniacs", "Groovy Gravys", 100],
  ["Flows", "WR", 5500, "Harvest Havoc", "Turkey Stuffers", 80],
  ["DJKay", "WR", 5400, "Foggy Pumpkins", "The Drunkles", 60],
  ["Salty", "WR", 5300, "Baked Birds", "The Pilgrims", 60],
  ["Yams", "WR", 5000, "The Drunkles", "Foggy Pumpkins", 70],
  ["Leadoffplague", "WR", 4900, "Groovy Gravys", "Mac n Maniacs", 40],
  ["Thunder", "WR", 4700, "The Pilgrims", "Baked Birds", 50],
  ["Ethan", "WR", 4600, "Turkey Stuffers", "Harvest Havoc", 40],
  ["GaiminBruh", "WR", 4500, "The Pilgrims", "Baked Birds", 100],
  ["Itachi", "RB", 5200, "Foggy Pumpkins", "The Drunkles", 100],
  ["Eden", "RB", 5100, "No Feast No Peace", "The CranBerry JAMS", 70],
  ["TeaTree", "RB", 4700, "The Drunkles", "Foggy Pumpkins", 40],
  ["Sethj4", "RB", 4600, "Baked Birds", "The Pilgrims", 60],
  ["Qwack", "RB", 4500, "Mac n Maniacs", "Groovy Gravys", 70],
  ["turkey-", "RB", 4400, "Turkey Stuffers", "Harvest Havoc", 90],
  ["tco", "RB", 4300, "YAMS", "Mashed Mafia", 10],
  ["devil", "RB", 4200, "The CranBerry JAMS", "No Feast No Peace", 20],
  ["Nick Chubb", "RB", 4100, "Harvest Havoc", "Turkey Stuffers", 30],
  ["Twhy", "RB", 4000, "Mashed Mafia", "YAMS", 20],
  ["Exceptionally Mediocre", "RB", 4000, "Groovy Gravys", "Mac n Maniacs", 40],
  ["Bama Nick", "RB", 4000, "The Pilgrims", "Baked Birds", 30],
  ["Jipper", "QB", 7100, "Foggy Pumpkins", "The Drunkles", ""],
  ["Lunar", "QB", 6900, "Groovy Gravys", "Mac n Maniacs", ""],
  ["Dome", "QB", 6700, "The Drunkles", "Foggy Pumpkins", ""],
  ["Matteh", "QB", 6600, "YAMS", "Mashed Mafia", ""],
  ["JBX", "QB", 6500, "Baked Birds", "The Pilgrims", ""],
  ["Icczz", "QB", 6400, "No Feast No Peace", "The CranBerry JAMS", ""],
  ["Sparks", "QB", 6300, "Turkey Stuffers", "Harvest Havoc", ""],
  ["Malik", "QB", 6200, "Harvest Havoc", "Turkey Stuffers", ""],
  ["Quan", "QB", 6100, "Mac n Maniacs", "Groovy Gravys", ""],
  ["Miskie", "QB", 6000, "Mashed Mafia", "YAMS", ""],
  ["Blurry", "QB", 5900, "The CranBerry JAMS", "No Feast No Peace", ""],
  ["DarkSubject", "QB", 5800, "The Pilgrims", "Baked Birds", ""],
  ["No Feast No Peace", "DST", 3600, "No Feast No Peace", "The CranBerry JAMS", "", "RJ, Stach, Velcarus"],
  ["Baked Birds", "DST", 3500, "Baked Birds", "The Pilgrims", "", "Onkey, The Dave, Vishy"],
  ["Turkey Stuffers", "DST", 3400, "Turkey Stuffers", "Harvest Havoc", "", "Soy, Xeno, LT Dan"],
  ["Mac n Maniacs", "DST", 3300, "Mac n Maniacs", "Groovy Gravys", "", "Resp, Alto, 2tacos"],
  ["The Pilgrims", "DST", 3200, "The Pilgrims", "Baked Birds", "", "Deion Sandals, Yfi, Pulszy"],
  ["Groovy Gravys", "DST", 3100, "Groovy Gravys", "Mac n Maniacs", "", "PunisherF5, Alexander, JBKnuckles"],
  ["Foggy Pumpkins", "DST", 3000, "Foggy Pumpkins", "The Drunkles", "", "Meritor, Jarebear, The Guy"],
  ["YAMS", "DST", 2900, "YAMS", "Mashed Mafia", "", "Juice, Halo, Chaunce"],
  ["Harvest Havoc", "DST", 2800, "Harvest Havoc", "Turkey Stuffers", "", "Loba, Hippy, Hab"],
  ["Mashed Mafia", "DST", 2700, "Mashed Mafia", "YAMS", "", "Leo, Xtails, Chris P Nutts"],
  ["The Drunkles", "DST", 2600, "The Drunkles", "Foggy Pumpkins", "", "Sushi, BigBroBanana, Begrip"],
  ["The CranBerry JAMS", "DST", 2500, "The CranBerry JAMS", "No Feast No Peace", "", "Abdul Carter, Major Syn, Uki"]
];

/* ===== SETUP ===== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  make_(ss, SH.C, [['Key', 'Value']].concat(DEFAULT_CONFIG));
  make_(ss, SH.P, [['Name', 'Pos', 'Salary', 'Team', 'Opp', 'Bid', 'Linemen']].concat(SEED));
  const slots = String(DEFAULT_CONFIG.find(r => r[0] === 'slots')[1]).split(',');
  make_(ss, SH.E, [['Timestamp', 'Name', 'Entry', 'Salary'].concat(slots)]);
  const blankStats = STAT_HEAD.slice(1).map(() => '');
  const st = make_(ss, SH.S, [STAT_HEAD].concat(SEED.map(r => [r[0]].concat(blankStats))));
  if (st) {
    st.getRange(2, STAT_HEAD.length, st.getMaxRows() - 1, 1).clearContent();
    st.getRange(2, STAT_HEAD.length).setFormula(FPTS_FORMULA);
  }
}

function make_(ss, name, rows) {
  if (ss.getSheetByName(name)) return null;
  const sh = ss.insertSheet(name);
  const w = rows[0].length;
  const data = rows.map(r => r.concat(Array(Math.max(0, w - r.length)).fill('')).slice(0, w));
  sh.getRange(1, 1, data.length, w).setValues(data);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, w).setFontWeight('bold');
  return sh;
}

/* ===== READ ===== */
function readCfg_(ss) {
  const o = {};
  DEFAULT_CONFIG.forEach(r => o[r[0]] = r[1]);
  const sh = ss.getSheetByName(SH.C);
  if (sh) sh.getDataRange().getValues().slice(1).forEach(r => { if (r[0] !== '') o[String(r[0]).trim()] = r[1]; });
  return {
    contestName: String(o.contestName),
    salaryCap: Number(o.salaryCap) || 0,
    slots: String(o.slots).split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    maxEntries: Number(o.maxEntries) || 3,
    locked: o.locked === true || String(o.locked).trim().toUpperCase() === 'TRUE'
  };
}

function readPlayers_(ss) {
  const sh = ss.getSheetByName(SH.P);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  const h = v[0].map(x => String(x).trim().toLowerCase());
  const c = k => h.indexOf(k);
  const iN = c('name'), iP = c('pos'), iS = c('salary'), iT = c('team'), iO = c('opp'), iB = c('bid'), iL = c('linemen');
  const get = (r, i) => i < 0 || r[i] == null ? '' : r[i];
  return v.slice(1)
    .map(r => ({
      name: String(get(r, iN)).trim(),
      pos: String(get(r, iP)).trim().toUpperCase(),
      salary: Number(get(r, iS)) || 0,
      team: String(get(r, iT)).trim(),
      opp: String(get(r, iO)).trim(),
      bid: get(r, iB) === '' ? null : Number(get(r, iB)),
      linemen: String(get(r, iL)).trim()
    }))
    .filter(p => p.name);
}

function getData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = readCfg_(ss);
  const n = cfg.slots.length;

  const esh = ss.getSheetByName(SH.E);
  const ev = esh ? esh.getDataRange().getValues().slice(1) : [];
  const entries = ev.filter(r => String(r[1]).trim()).map(r => {
    const o = {ts: new Date(r[0]).getTime() || 0, name: String(r[1]).trim(), entry: Number(r[2]) || 0, salary: Number(r[3]) || 0};
    if (cfg.locked) o.players = r.slice(4, 4 + n).map(x => String(x).trim());
    return o;
  });

  const points = {};
  const ssh = ss.getSheetByName(SH.S);
  if (ssh) {
    const sv = ssh.getDataRange().getValues();
    const fi = sv[0].indexOf('FPTS');
    sv.slice(1).forEach(r => {
      const name = String(r[0]).trim();
      if (name && fi >= 0 && r[fi] !== '') points[name] = Number(r[fi]) || 0;
    });
  }

  return {ok: true, config: cfg, players: readPlayers_(ss), entries: entries, points: points};
}

/* ===== WRITE ===== */
function submit_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = readCfg_(ss);
  if (cfg.locked) return {ok: false, error: 'Contest is locked'};

  let name = String(b.name || '').trim().slice(0, 32);
  if (!name) return {ok: false, error: 'Enter your Discord name'};
  const lineups = Array.isArray(b.lineups) ? b.lineups : [];
  if (!lineups.length) return {ok: false, error: 'Lineup 1 is incomplete'};

  const pmap = {};
  readPlayers_(ss).forEach(p => pmap[p.name] = p);

  const esh = ss.getSheetByName(SH.E);
  const mine = esh.getDataRange().getValues().slice(1)
    .filter(r => String(r[1]).trim().toLowerCase() === name.toLowerCase());
  if (mine.length) name = String(mine[0][1]).trim();
  if (mine.length + lineups.length > cfg.maxEntries) {
    const left = Math.max(0, cfg.maxEntries - mine.length);
    return {ok: false, error: left ? name + ' has ' + left + (left === 1 ? ' entry' : ' entries') + ' remaining' : name + ' already has ' + cfg.maxEntries + ' entries'};
  }

  const out = [];
  let k = mine.length;
  for (let i = 0; i < lineups.length; i++) {
    const l = lineups[i], tag = 'Lineup ' + (i + 1);
    if (!Array.isArray(l) || l.length !== cfg.slots.length || l.some(x => !x)) return {ok: false, error: tag + ' is incomplete'};
    const seen = {};
    let sal = 0;
    for (let j = 0; j < l.length; j++) {
      const p = pmap[String(l[j])];
      if (!p) return {ok: false, error: tag + ': unknown player ' + l[j]};
      if (seen[p.name]) return {ok: false, error: tag + ': duplicate player ' + p.name};
      if ((ELIG[cfg.slots[j]] || [cfg.slots[j]]).indexOf(p.pos) < 0) return {ok: false, error: tag + ': ' + p.name + ' not eligible at ' + cfg.slots[j]};
      seen[p.name] = true;
      sal += p.salary;
    }
    if (sal > cfg.salaryCap) return {ok: false, error: tag + ' is over the salary cap'};
    out.push([new Date(), name, ++k, sal].concat(l.map(String)));
  }

  esh.getRange(esh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  return {ok: true, data: getData_()};
}

/* ===== WEB APP ===== */
function doGet() {
  return json_(getData_());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);
    if (b.action !== 'submit') return json_({ok: false, error: 'Bad request'});
    return json_(submit_(b));
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
