import "./style.css";
import {EditorView, basicSetup} from "codemirror";
import {EditorState, Compartment} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags as t} from "@lezer/highlight";
import {javascript} from "@codemirror/lang-javascript";
import {html} from "@codemirror/lang-html";
import {css} from "@codemirror/lang-css";
import {json} from "@codemirror/lang-json";
import {python} from "@codemirror/lang-python";
import {markdown} from "@codemirror/lang-markdown";

const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<"]/g, c => ({"&": "&amp;", "<": "&lt;", '"': "&quot;"}[c]));
const cfg = {fs: 14, wrap: true, ...JSON.parse(localStorage.getItem("pc_cfg") || "{}")};
const saveCfg = () => localStorage.setItem("pc_cfg", JSON.stringify(cfg));
const store = () => localStorage.setItem("pc_files", JSON.stringify(files));
let files = JSON.parse(localStorage.getItem("pc_files") || "null") || {
  "index.html": "<!doctype html>\n<html>\n<body>\n  <h1>Hello PocketCode 👋</h1>\n  <script src=\"src/app.js\"></script>\n</body>\n</html>\n",
  "src/app.js": "document.body.style.fontFamily = 'sans-serif';\nconsole.log('Hello!');\n"
};
let tabs = [Object.keys(files).sort()[0]], active = tabs[0], states = {}, view, collapsed = new Set();
const wrapC = new Compartment(), wrapX = () => cfg.wrap ? EditorView.lineWrapping : [];

const hl = HighlightStyle.define([
  {tag: [t.keyword, t.bool, t.null, t.tagName], color: "#569cd6"},
  {tag: [t.controlKeyword, t.moduleKeyword], color: "#c586c0"},
  {tag: [t.string, t.special(t.string)], color: "#ce9178"}, {tag: t.number, color: "#b5cea8"},
  {tag: t.regexp, color: "#d16969"}, {tag: t.comment, color: "#6a9955", fontStyle: "italic"},
  {tag: t.function(t.variableName), color: "#dcdcaa"}, {tag: [t.variableName, t.propertyName, t.attributeName], color: "#9cdcfe"},
  {tag: [t.typeName, t.className], color: "#4ec9b0"}, {tag: t.heading, color: "#569cd6", fontWeight: "bold"},
  {tag: t.link, color: "#3794ff"}, {tag: [t.operator, t.punctuation, t.bracket], color: "#d4d4d4"}]);
const theme = EditorView.theme({
  "&": {backgroundColor: "#1e1e1e", color: "#d4d4d4", height: "100%"},
  ".cm-scroller": {fontFamily: "Menlo,Consolas,'DejaVu Sans Mono',monospace", fontSize: "var(--fs)"},
  ".cm-gutters": {backgroundColor: "#1e1e1e", color: "#858585", border: "none"},
  ".cm-activeLine": {backgroundColor: "#ffffff0d"}, ".cm-activeLineGutter": {backgroundColor: "transparent", color: "#c6c6c6"},
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {backgroundColor: "#264f78"},
  ".cm-cursor": {borderLeftColor: "#aeafad"}, "&.cm-focused": {outline: "none"},
  ".cm-panels": {backgroundColor: "#252526", color: "#ccc"}, ".cm-tooltip": {backgroundColor: "#252526", border: "1px solid #454545"}
}, {dark: true});

const ext = n => n.split(".").pop().toLowerCase();
const lang = n => ({js: javascript(), jsx: javascript({jsx: true}), ts: javascript({typescript: true}),
  html: html(), css: css(), json: json(), py: python(), md: markdown()})[ext(n)] || [];
const names = {js: "JavaScript", jsx: "JavaScript React", ts: "TypeScript", html: "HTML", css: "CSS", json: "JSON", py: "Python", md: "Markdown"};
const ic = n => { const m = {js: ["JS", "#e8d44d"], jsx: ["JS", "#61dafb"], ts: ["TS", "#3178c6"], html: ["<>", "#e44d26"],
  css: ["#", "#42a5f5"], json: ["{}", "#cbcb41"], py: ["Py", "#4b8bbe"], md: ["M↓", "#519aba"]}[ext(n)] || ["≡", "#999"];
  return `<u style="color:${m[1]}">${esc(m[0])}</u>`; };

const mk = n => EditorState.create({doc: files[n] ?? "", extensions: [
  basicSetup, theme, syntaxHighlighting(hl), keymap.of([indentWithTab]), lang(n), wrapC.of(wrapX()),
  EditorView.updateListener.of(u => {
    if (u.docChanged) { files[active] = u.state.doc.toString(); store(); }
    if (u.selectionSet || u.docChanged) status();
  })]});

function status() {
  if (!active) { $("#s1").textContent = "PocketCode"; $("#s2").textContent = ""; return; }
  const s = view.state, p = s.selection.main.head, l = s.doc.lineAt(p);
  $("#s1").textContent = "PocketCode";
  $("#s2").textContent = `Ln ${l.number}, Col ${p - l.from + 1}   Spaces: 2   UTF-8   LF   ${names[ext(active)] || "Plain Text"}`;
}
function rows(n, pre, d) {
  let o = "";
  const isD = k => typeof n[k] == "object";
  for (const k of Object.keys(n).sort((a, b) => isD(a) == isD(b) ? a.localeCompare(b) : isD(a) ? -1 : 1)) {
    const v = n[k];
    if (isD(k)) {
      const id = pre + k, c = collapsed.has(id);
      o += `<div class="f dir" style="padding-left:${8 + d * 12}px" data-dir="${esc(id)}">${c ? "›" : "⌄"} ${esc(k)}</div>`;
      if (!c) o += rows(v, id + "/", d + 1);
    } else o += `<div class="f ${v == active ? "on" : ""}" style="padding-left:${22 + d * 12}px" data-f="${esc(v)}">${ic(k)}<span class="nm">${esc(k)}</span><i data-r="${esc(v)}">✎</i><i data-d="${esc(v)}">🗑</i></div>`;
  }
  return o;
}
function render() {
  const root = {};
  for (const p of Object.keys(files)) { let n = root; p.split("/").forEach((s, i, a) => { n = n[s] ??= (i == a.length - 1 ? p : {}); }); }
  $("#list").innerHTML = rows(root, "", 0);
  $("#tabs").innerHTML = tabs.map(x => `<div class="tab ${x == active ? "on" : ""}" data-t="${esc(x)}">${ic(x)}<span>${esc(x.split("/").pop())}</span><b data-x="${esc(x)}">×</b></div>`).join("");
  $("#bc").innerHTML = active ? active.split("/").map(esc).join(" › ") : "";
  $("#welcome").hidden = !!active; $("#ed").hidden = !active;
}
function openFile(n) {
  if (active) states[active] = view.state;
  if (!tabs.includes(n)) tabs.push(n);
  active = n; view.setState(states[n] || mk(n)); render(); status();
  if (innerWidth < 600) $("#side").classList.add("hide");
}
function closeTab(n) {
  if (active == n) states[n] = view.state;
  tabs = tabs.filter(x => x != n);
  if (active == n) {
    active = tabs[tabs.length - 1] || null;
    view.setState(active ? (states[active] || mk(active)) : EditorState.create({doc: ""}));
  }
  render(); status();
}
function create(name, text = "") {
  if (!name) return;
  if (files[name] != null && !confirm(name + " exists. Overwrite?")) return;
  files[name] = text; delete states[name]; store(); openFile(name);
}
const newFile = () => create(prompt("New file (use folder/name.js for folders):", "untitled.js"));
const goto = l => { const ln = view.state.doc.line(Math.min(+l, view.state.doc.lines));
  view.dispatch({selection: {anchor: ln.from}, scrollIntoView: true}); view.focus(); };
const dl = () => { if (!active) return; const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([files[active]])); a.download = active.split("/").pop(); a.click(); };
const toggleSide = () => $("#side").classList.toggle("hide");
function showView(v) {
  document.querySelectorAll("#side section").forEach(s => s.hidden = s.id != "v-" + v);
  document.querySelectorAll(".ab").forEach(b => b.classList.toggle("on", b.dataset.v == v));
  $("#side").classList.remove("hide"); if (v == "se") $("#q").focus();
}
function zoom(d) { cfg.fs = Math.min(28, Math.max(9, cfg.fs + d)); applyCfg(); }
function applyCfg() {
  $("#ed").style.setProperty("--fs", cfg.fs + "px"); $("#fs").value = cfg.fs; $("#fsv").textContent = cfg.fs; $("#wr").checked = cfg.wrap;
  for (const k in states) states[k] = states[k].update({effects: wrapC.reconfigure(wrapX())}).state;
  if (view) view.dispatch({effects: wrapC.reconfigure(wrapX())});
  saveCfg();
}
function run() {
  if (!active) return;
  let h = files[active];
  const rel = f => files[f] ?? files[active.split("/").slice(0, -1).concat(f).join("/")];
  h = h.replace(/<link[^>]+href="([^"]+)"[^>]*>/g, (m, f) => rel(f) != null ? `<style>${rel(f)}</style>` : m)
       .replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (m, f) => rel(f) != null ? `<script>${rel(f)}<\/script>` : m);
  if (!/\.html?$/i.test(active)) h = ext(active) == "js"
    ? `<body style="font:14px monospace;background:#fff"><pre id=o></pre><script>console.log=(...a)=>o.textContent+=a.join(" ")+"\\n";try{${files[active]}}catch(e){o.textContent+=e}<\/script>`
    : `<pre>${esc(h)}</pre>`;
  $("#pv iframe").srcdoc = h; $("#pv").hidden = false;
}
const cmds = {"File: New File": newFile, "File: Open from Device": () => $("#file").click(), "File: Download Current File": dl,
  "File: Close Editor": () => active && closeTab(active), "View: Toggle Sidebar": toggleSide, "View: Show Search": () => showView("se"),
  "View: Toggle Word Wrap": () => { cfg.wrap = !cfg.wrap; applyCfg(); }, "View: Zoom In": () => zoom(1), "View: Zoom Out": () => zoom(-1),
  "Run: Preview / Run File": run};
function palette(v = "") { $("#pal").hidden = false; $("#pi").value = v; $("#pi").focus(); plist(); }
function plist() {
  const q = $("#pi").value, c = q.startsWith(">"), s = (c ? q.slice(1) : q).trim().toLowerCase();
  $("#pl").innerHTML = (c ? Object.keys(cmds) : Object.keys(files).sort()).filter(x => x.toLowerCase().includes(s)).slice(0, 50)
    .map(x => `<div data-p="${esc(x)}">${esc(x)}</div>`).join("");
}
function pick(p) { const c = $("#pi").value.startsWith(">"); $("#pal").hidden = true; c ? cmds[p]?.() : openFile(p); }

view = new EditorView({parent: $("#ed"), state: mk(active)});
render(); status(); applyCfg();
if (innerWidth < 600) $("#side").classList.add("hide");

$("#tabs").onclick = e => { const x = e.target.dataset.x, tb = e.target.closest(".tab")?.dataset.t; x ? closeTab(x) : tb && openFile(tb); };
$("#list").onclick = e => {
  const d = e.target.dataset, dir = e.target.closest("[data-dir]")?.dataset.dir, f = e.target.closest("[data-f]")?.dataset.f;
  if (d.d) { if (confirm("Delete " + d.d + "?")) { delete files[d.d]; delete states[d.d]; store(); tabs.includes(d.d) ? closeTab(d.d) : render(); } }
  else if (d.r) {
    const n = prompt("Rename to:", d.r);
    if (n && n != d.r) { files[n] = files[d.r]; delete files[d.r]; delete states[d.r]; delete states[n];
      tabs = tabs.map(x => x == d.r ? n : x); if (active == d.r) active = n; store(); openFile(n); }
  } else if (dir) { collapsed.has(dir) ? collapsed.delete(dir) : collapsed.add(dir); render(); }
  else if (f) openFile(f);
};
document.querySelectorAll(".ab").forEach(b => b.onclick = () =>
  b.classList.contains("on") && !$("#side").classList.contains("hide") ? toggleSide() : showView(b.dataset.v));
$("#new").onclick = $("#w1").onclick = newFile;
$("#open").onclick = $("#w2").onclick = () => $("#file").click();
$("#w3").onclick = $("#cc").onclick = () => palette();
$("#menu").onclick = toggleSide; $("#run").onclick = run; $("#pvx").onclick = () => $("#pv").hidden = true;
$("#file").onchange = async e => { for (const f of e.target.files) create(f.name, await f.text()); e.target.value = ""; };
$("#fs").oninput = e => { cfg.fs = +e.target.value; applyCfg(); };
$("#wr").onchange = e => { cfg.wrap = e.target.checked; applyCfg(); };
$("#reset").onclick = () => { if (confirm("Delete ALL files and settings?")) { localStorage.clear(); location.reload(); } };
$("#pi").oninput = plist;
$("#pi").onkeydown = e => { if (e.key == "Escape") $("#pal").hidden = true;
  if (e.key == "Enter") { const f = $("#pl div"); f && pick(f.dataset.p); } };
$("#pl").onclick = e => e.target.dataset.p && pick(e.target.dataset.p);
$("#pal").onclick = e => { if (e.target.id == "pal") $("#pal").hidden = true; };
$("#q").oninput = () => {
  const q = $("#q").value.toLowerCase(); if (!q) { $("#sr").innerHTML = ""; return; }
  let o = "", n = 0;
  for (const f of Object.keys(files).sort()) {
    const h = [];
    files[f].split("\n").forEach((l, i) => { if (n < 300 && l.toLowerCase().includes(q)) { n++; h.push(`<div class="hit" data-f="${esc(f)}" data-l="${i + 1}">${esc(l.trim().slice(0, 80))}</div>`); } });
    if (h.length) o += `<div class="sf">${esc(f)}<b>${h.length}</b></div>` + h.join("");
  }
  $("#sr").innerHTML = o || "<p class=m>No results.</p>";
};
$("#sr").onclick = e => { const d = e.target.dataset; if (d.f) { openFile(d.f); goto(d.l); } };
addEventListener("keydown", e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k == "p") { e.preventDefault(); palette(e.shiftKey ? ">" : ""); }
  else if (k == "b") { e.preventDefault(); toggleSide(); } else if (k == "s") e.preventDefault();
});
$("#keys").innerHTML = ["⇥", "{", "}", "(", ")", "[", "]", ";", ":", "\"", "'", "<", ">", "/", "=", "!", "&", "|", "$"].map(k => `<button>${k}</button>`).join("");
$("#keys").onpointerdown = e => {
  e.preventDefault();
  if (e.target.tagName != "BUTTON" || !active) return;
  const k = e.target.textContent;
  view.dispatch(view.state.replaceSelection(k == "⇥" ? "  " : k)); view.focus();
};
