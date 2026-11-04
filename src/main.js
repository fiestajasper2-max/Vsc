import "./style.css";
import {EditorView, basicSetup} from "codemirror";
import {EditorState} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {oneDark} from "@codemirror/theme-one-dark";
import {javascript} from "@codemirror/lang-javascript";
import {html} from "@codemirror/lang-html";
import {css} from "@codemirror/lang-css";
import {json} from "@codemirror/lang-json";
import {python} from "@codemirror/lang-python";
import {markdown} from "@codemirror/lang-markdown";

const $ = s => document.querySelector(s);
const store = () => localStorage.setItem("pc_files", JSON.stringify(files));
let files = JSON.parse(localStorage.getItem("pc_files") || "null") || {
  "index.html": "<!doctype html>\n<html>\n<body>\n  <h1>Hello PocketCode 👋</h1>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n",
  "app.js": "document.body.style.fontFamily = 'sans-serif';\nconsole.log('Hello!');\n"
};
let tabs = [Object.keys(files)[0]], active = tabs[0], states = {}, view;

const lang = n => ({js: javascript(), jsx: javascript({jsx: true}), ts: javascript({typescript: true}),
  html: html(), css: css(), json: json(), py: python(), md: markdown()})[n.split(".").pop().toLowerCase()] || [];

function status() {
  const s = view.state, p = s.selection.main.head, l = s.doc.lineAt(p);
  $("#st").textContent = `${active || "No file"}  ·  Ln ${l.number}, Col ${p - l.from + 1}`;
}
const mk = n => EditorState.create({doc: files[n] ?? "", extensions: [
  basicSetup, oneDark, keymap.of([indentWithTab]), lang(n), EditorView.lineWrapping,
  EditorView.updateListener.of(u => {
    if (u.docChanged) { files[active] = u.state.doc.toString(); store(); }
    if (u.selectionSet || u.docChanged) status();
  })]});

function render() {
  $("#tabs").innerHTML = tabs.map(t => `<div class="tab ${t == active ? "on" : ""}" data-t="${t}">${t}<b data-x="${t}">×</b></div>`).join("");
  $("#list").innerHTML = Object.keys(files).sort().map(f =>
    `<div class="f ${f == active ? "on" : ""}" data-f="${f}">${f}<span data-r="${f}">✎</span><span data-d="${f}">🗑</span></div>`).join("");
}
function openFile(n) {
  if (active) states[active] = view.state;
  if (!tabs.includes(n)) tabs.push(n);
  active = n;
  view.setState(states[n] || mk(n));
  render(); status();
  if (innerWidth < 600) $("#side").classList.add("hide");
}
function closeTab(n) {
  tabs = tabs.filter(t => t != n);
  if (active == n) {
    active = tabs[tabs.length - 1] || null;
    view.setState(active ? (states[active] || mk(active)) : EditorState.create({doc: "", extensions: [oneDark, EditorState.readOnly.of(true)]}));
  }
  render(); status();
}
function create(name, text = "") {
  if (!name) return;
  if (files[name] != null && !confirm(name + " exists. Overwrite?")) return;
  files[name] = text; delete states[name]; store(); openFile(name);
}

view = new EditorView({parent: $("#ed"), state: mk(active)});
render(); status();

$("#tabs").onclick = e => { const x = e.target.dataset.x, t = e.target.closest(".tab")?.dataset.t; x ? closeTab(x) : t && openFile(t); };
$("#list").onclick = e => {
  const d = e.target.dataset;
  if (d.d) { if (confirm("Delete " + d.d + "?")) { delete files[d.d]; delete states[d.d]; store(); tabs.includes(d.d) ? closeTab(d.d) : render(); } }
  else if (d.r) {
    const n = prompt("Rename to:", d.r);
    if (n && n != d.r) {
      files[n] = files[d.r]; delete files[d.r]; delete states[d.r]; delete states[n];
      tabs = tabs.map(t => t == d.r ? n : t); if (active == d.r) active = n;
      store(); openFile(n);
    }
  } else { const f = e.target.closest(".f")?.dataset.f; f && openFile(f); }
};
$("#new").onclick = () => create(prompt("New file name:", "untitled.js"));
$("#menu").onclick = () => $("#side").classList.toggle("hide");
$("#open").onclick = () => $("#file").click();
$("#file").onchange = async e => { for (const f of e.target.files) create(f.name, await f.text()); e.target.value = ""; };
$("#dl").onclick = () => {
  if (!active) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([files[active]], {type: "text/plain"}));
  a.download = active; a.click();
};
$("#run").onclick = () => {
  let h = files[active] || "";
  h = h.replace(/<link[^>]+href="([^"]+)"[^>]*>/g, (m, f) => files[f] != null ? `<style>${files[f]}</style>` : m)
       .replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (m, f) => files[f] != null ? `<script>${files[f]}<\/script>` : m);
  if (!/\.html?$/i.test(active || "")) h = /\.js$/i.test(active || "") ? `<body style="font-family:monospace"><pre id=o></pre><script>console.log=(...a)=>o.textContent+=a.join(" ")+"\\n";try{${files[active]}}catch(e){o.textContent+=e}<\/script>` : `<pre>${h.replace(/</g, "&lt;")}</pre>`;
  $("#pv iframe").srcdoc = h; $("#pv").hidden = false;
};
$("#pvx").onclick = () => $("#pv").hidden = true;

$("#keys").innerHTML = ["⇥", "{", "}", "(", ")", "[", "]", ";", ":", "\"", "'", "<", ">", "/", "=", "!", "&", "|", "$"]
  .map(k => `<button>${k}</button>`).join("");
$("#keys").onpointerdown = e => {
  e.preventDefault();
  const k = e.target.textContent;
  if (e.target.tagName != "BUTTON" || !active) return;
  view.dispatch(view.state.replaceSelection(k == "⇥" ? "  " : k));
  view.focus();
};
