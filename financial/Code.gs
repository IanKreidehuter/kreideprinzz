/**
 * Personal Finance API (Google Apps Script). Create this as its OWN Apps Script project.
 * Script properties (Project Settings): ADMIN_TOKEN (required), SHEET_ID (only if the script is not bound to the spreadsheet),
 * PUBLIC_READ (optional: set to "false" to require the token for reading too; default = anyone can read, only the token holder can write).
 * Every request is POST text/plain JSON: { token, action, ...data }  ->  { ok:true, ... } | { ok:false, error }
 * Sheets (Transactions, Categories, Budgets, Settings) and headers are created automatically.
 */
const P = PropertiesService.getScriptProperties();
const SCHEMA = {
  Transactions: ["id", "type", "amount", "category", "description", "payment_method", "transaction_date", "created_at", "updated_at", "to_method"],
  Categories: ["id", "name", "type", "icon", "color", "created_at"],
  Budgets: ["id", "category_id", "month", "year", "amount", "created_at", "updated_at"],
  Settings: ["key", "value"]
};
const NUM = ["amount", "month", "year"], DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_CATS = [
  ["food", "Food & Beverages", "expense", "🍜", "#ff9a3c"], ["transport", "Transportation", "expense", "🚌", "#3b8de0"],
  ["shopping", "Shopping", "expense", "🛍️", "#ec6ccf"], ["internet", "Internet & Phone", "expense", "📱", "#46b7e8"],
  ["bills", "Utilities & Bills", "expense", "💡", "#f2c200"], ["health", "Health", "expense", "💊", "#ff4a5f"],
  ["fun", "Entertainment", "expense", "🎮", "#8c5bd8"], ["edu", "Education", "expense", "📚", "#4fc08d"],
  ["care", "Personal Care", "expense", "🧴", "#f28cb1"], ["home", "Household", "expense", "🏠", "#b0885a"], ["oth_e", "Other", "expense", "📦", "#9aa0b4"],
  ["allowance", "Monthly Allowance", "income", "💌", "#f2c200"], ["salary", "Salary", "income", "💼", "#2f9e63"],
  ["freelance", "Freelance", "income", "💻", "#3b8de0"], ["gift", "Gift", "income", "🎁", "#ec6ccf"], ["oth_i", "Other Income", "income", "✨", "#9aa0b4"]
];

const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const ss_ = () => P.getProperty("SHEET_ID") ? SpreadsheetApp.openById(P.getProperty("SHEET_ID")) : SpreadsheetApp.getActive();

const ready_ = {};
function tab_(n) {
  const ss = ss_(); if (!ss) throw new Error("No spreadsheet: set the SHEET_ID script property");
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); s.appendRow(SCHEMA[n]); s.setFrozenRows(1); s.getRange(1, 1, s.getMaxRows(), SCHEMA[n].length).setNumberFormat("@"); }
  else if (!ready_[n]) {   // migration: add any new columns (e.g. to_method) to an existing sheet
    const cur = s.getRange(1, 1, 1, s.getLastColumn() || 1).getValues()[0];
    SCHEMA[n].forEach(k => { if (!cur.includes(k)) {
      const c = s.getLastColumn() + 1; if (c > s.getMaxColumns()) s.insertColumnAfter(s.getMaxColumns());
      s.getRange(1, c).setValue(k); s.getRange(1, c, s.getMaxRows(), 1).setNumberFormat("@"); } });
  }
  ready_[n] = true; return s;
}
function rows_(n) {
  const v = tab_(n).getDataRange().getValues(), h = v.shift();
  return v.filter(r => r[0] !== "").map(r => { const o = {};
    h.forEach((k, i) => { let x = r[i]; if (x instanceof Date) x = Utilities.formatDate(x, Session.getScriptTimeZone(), "yyyy-MM-dd"); o[k] = NUM.includes(k) ? Number(x) : x; }); return o; });
}
function find_(s, id) { const l = s.getLastRow(); return l > 1 ? s.getRange(2, 1, l - 1, 1).getValues().flat().map(String).indexOf(String(id)) : -1; }
function upsert_(n, o) {
  const s = tab_(n), h = SCHEMA[n], i = find_(s, o[h[0]]), now = new Date().toISOString();
  if (i < 0) { if (h.includes("created_at")) o.created_at = now; }
  else { const old = s.getRange(i + 2, 1, 1, h.length).getValues()[0]; h.forEach((k, j) => { if (o[k] === undefined) o[k] = old[j]; }); }
  if (h.includes("updated_at")) o.updated_at = now;
  const vals = h.map(k => o[k] ?? "");
  i < 0 ? s.appendRow(vals) : s.getRange(i + 2, 1, 1, h.length).setValues([vals]);
  return o;
}
function del_(n, id) { const s = tab_(n), i = find_(s, id); if (i < 0) throw new Error("not found"); s.deleteRow(i + 2); return {}; }

function tx_(t) {
  if (!t) throw new Error("missing transaction");
  const a = Number(t.amount), isT = t.type === "transfer";
  if (!["income", "expense", "transfer"].includes(t.type)) throw new Error("invalid type");
  if (!isFinite(a) || a <= 0) throw new Error("invalid amount");
  if (!isT && !t.category) throw new Error("missing category");
  if (isT && (!t.to_method || t.to_method === t.payment_method)) throw new Error("invalid transfer");
  if (!DATE.test(t.transaction_date || "")) throw new Error("invalid date");
  return { id: t.id, type: t.type, amount: Math.round(a * 100) / 100, category: isT ? "" : String(t.category), description: String(t.description || "").slice(0, 200),
    payment_method: String(t.payment_method || "cash"), to_method: isT ? String(t.to_method) : "", transaction_date: t.transaction_date };
}
function cat_(c) {
  if (!c || !String(c.name || "").trim()) throw new Error("missing category name");
  if (!["income", "expense"].includes(c.type)) throw new Error("invalid category type");
  return { id: c.id, name: String(c.name).trim().slice(0, 40), type: c.type, icon: String(c.icon || "📦").slice(0, 8), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#9aa0b4" };
}
function summary_(b) {
  const now = new Date(), m = Number(b.month) || now.getMonth() + 1, y = Number(b.year) || now.getFullYear(), tx = rows_("Transactions");
  const sum = (a, ty) => a.filter(x => x.type === ty).reduce((s, x) => s + x.amount, 0);
  const mo = tx.filter(x => String(x.transaction_date).slice(0, 7) === y + "-" + ("0" + m).slice(-2));
  const li = sum(tx, "income"), le = sum(tx, "expense"), mi = sum(mo, "income"), me = sum(mo, "expense");
  return { summary: { lifetimeIncome: li, lifetimeExpense: le, balance: li - le, month: m, year: y, monthIncome: mi, monthExpense: me, monthBalance: mi - me, savingsPercent: mi ? Math.round((mi - me) / mi * 100) : 0 } };
}

const API = {
  GET_TRANSACTIONS: () => ({ transactions: rows_("Transactions") }),
  ADD_TRANSACTION: b => { const t = tx_(b.transaction); t.id = Utilities.getUuid(); return { transaction: upsert_("Transactions", t) }; },
  UPDATE_TRANSACTION: b => { const t = tx_(b.transaction); if (!t.id || find_(tab_("Transactions"), t.id) < 0) throw new Error("not found"); return { transaction: upsert_("Transactions", t) }; },
  DELETE_TRANSACTION: b => del_("Transactions", b.id),
  GET_CATEGORIES: () => { let c = rows_("Categories"); if (!c.length) { DEFAULT_CATS.forEach(d => upsert_("Categories", { id: d[0], name: d[1], type: d[2], icon: d[3], color: d[4] })); c = rows_("Categories"); } return { categories: c }; },
  ADD_CATEGORY: b => { const c = cat_(b.category); c.id = "c_" + Utilities.getUuid().slice(0, 8); return { category: upsert_("Categories", c) }; },
  UPDATE_CATEGORY: b => { const c = cat_(b.category); if (!c.id || find_(tab_("Categories"), c.id) < 0) throw new Error("not found"); return { category: upsert_("Categories", c) }; },
  DELETE_CATEGORY: b => {   // refuses when still used, unless reassignTo (another category id) is given
    const s = tab_("Transactions"), v = s.getDataRange().getValues(), used = [];
    for (let i = 1; i < v.length; i++) if (v[i][3] === b.id) used.push(i + 1);
    if (used.length) { if (!b.reassignTo || b.reassignTo === b.id) throw new Error("category in use by " + used.length + " transactions"); used.forEach(r => s.getRange(r, 4).setValue(b.reassignTo)); }
    return del_("Categories", b.id);
  },
  GET_BUDGETS: () => ({ budgets: rows_("Budgets") }),
  SAVE_BUDGET: b => {   // category_id "" = overall monthly limit
    const x = b.budget || {}, m = Number(x.month), y = Number(x.year), a = Number(x.amount);
    if (!(m >= 1 && m <= 12) || !(y > 2000) || !isFinite(a) || a < 0) throw new Error("invalid budget");
    const old = rows_("Budgets").find(r => String(r.category_id) === String(x.category_id || "") && r.month === m && r.year === y);
    return { budget: upsert_("Budgets", { id: old ? old.id : Utilities.getUuid(), category_id: x.category_id || "", month: m, year: y, amount: a }) };
  },
  GET_SETTINGS: () => { const o = {}; rows_("Settings").forEach(r => o[r.key] = r.value); return { settings: o }; },
  SAVE_SETTINGS: b => { Object.keys(b.settings || {}).forEach(k => upsert_("Settings", { key: k, value: String(b.settings[k]) })); return {}; },
  GET_SUMMARY: summary_,
  PING: () => ({})   // lets the app verify the admin token
};
const READ = ["GET_TRANSACTIONS", "GET_CATEGORIES", "GET_BUDGETS", "GET_SETTINGS", "GET_SUMMARY"];

function doGet() { return out_({ ok: true, service: "finance-api" }); }   // health check only; data requires POST + token

function doPost(e) {
  let admin = false;
  const res = o => out_(Object.assign({ admin }, o));   // "admin" tells the app whether the token was valid
  try {
    const b = JSON.parse(e.postData.contents);
    admin = !!b.token && b.token === P.getProperty("ADMIN_TOKEN");
    const open = P.getProperty("PUBLIC_READ") !== "false" && READ.includes(b.action);   // public viewers: read-only
    if (!admin && !open) return res({ ok: false, error: "unauthorized" });
    const fn = API[b.action]; if (!fn) return res({ ok: false, error: "unknown action" });
    const write = /^(ADD|UPDATE|DELETE|SAVE)_|^GET_CATEGORIES$/.test(b.action), lock = write ? LockService.getScriptLock() : null;
    if (lock) lock.waitLock(20000);
    try { return res(Object.assign({ ok: true }, fn(b))); } finally { if (lock) lock.releaseLock(); }
  } catch (err) { return res({ ok: false, error: String(err.message || err) }); }
}

/** Run once from the editor to grant permissions and create the sheets. */
function setup() { Object.keys(SCHEMA).forEach(tab_); API.GET_CATEGORIES(); Logger.log("Ready: " + ss_().getUrl()); }
