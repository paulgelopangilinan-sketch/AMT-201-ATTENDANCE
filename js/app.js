const STUDENTS = [
"AGUIRRE, GEORGE LEANNE MENDOZA",
"DAYRIT, JEANNE RAIZEN MAMAWAG",
"FELICIANO, JALLENE SANTOS",
"JIMENEZ, TRISTAN JED BROQUEZA",
"RODRIGUEZ, PRINCE LUIGI RICIO",
"BAUTISTA, MARC RANIEL ANGELES",
"SANTIAGO, SIMON LUKE",
"CARDENAS, NEIL GEOFFREY VELASCO",
"DE GUZMAN, HANS ANTHONY LOPEZ",
"GAJUDO, LEWIS EMMANUEL SANTIAGO",
"LITIMCO, FRANCIS CHESTER GALANG",
"JOSON, YHENS JHOSEL ROQUE",
"DELA PEÑA, CHELCY MAE LAGOS",
"CUIZON, JARED LANCE OCENAR",
"ROLDAN, BENEDICT ROXAS",
"GONZALES, SEAN ANDREI CONCEPCION",
"MANALAYSAY, TRICIA LABONG",
"SUMALDE, MICO ZAKI PERALTA",
"NUQUI, KLARENCE ESPINOS",
"DUNGCA, RIAN CARLO NAVARRO",
"IGNACIO, SAM LUIS VALDEZ",
"MATA, JAMES EARL PASAY",
"VALDEZ, THRISHIA NATALIP",
"LORENZO, JEHOIAKIM COMENDADOR",
"CRUZ",
"FAJARDO, IAN CARLOS BARRUN",
"MENDOZA, DUSTIN MICHAEL AUREADA",
"ZAPATA, CLAUDE NIMBUS DE GUZMAN",
"MERCADO, BRANDON HAIS CATINDIHAN",
"DELOS REYES, JHECCOBE MARTINEZ",
"MERCADO, BRANDON HAIS C.",
"PAGUIA, RYAN MIGUEL FELIPE",
"PANGILINAN, PAUL ANGELO MAGBITANG",
"CLAVIO, JOHANNES KENJI DAGATAN",
"SANTOS, KING RANDELL SOTTO",
"RICARDO, AVERY NICKELBERT DUNGCA",
"ESGUERRA, GERALD M."
];

const STORAGE_KEY = "section201-time-tracker-v1";
let records = loadRecords();
let violations = loadViolations();
let attendanceGroups = loadAttendanceGroups();
let attendanceSelected = new Set();
let attendanceSignatures = {};
let headSignature = "";
let pendingSignatureKey = "";
let selectedId = "";
let selectedViolationStudent = "";
let currentRole = null;
const ADMIN_USERNAME = "amt201";
const ADMIN_PASSWORD = "amt201";

const $ = id => document.getElementById(id);
const normalize = s => s.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(r => r && r.id && typeof r.student === "string") : [];
  } catch { return []; }
}
function loadViolations() {
  try {
    const parsed = JSON.parse(localStorage.getItem("section201-violations-v1") || "[]");
    return Array.isArray(parsed) ? parsed.filter(v => v && v.id && typeof v.student === "string") : [];
  } catch { return []; }
}
function loadAttendanceGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem("section201-attendance-groups-v1") || "[]");
    return Array.isArray(parsed) ? parsed.filter(g => g && g.id && Array.isArray(g.students)) : [];
  } catch { return []; }
}
function saveAttendanceGroups() {
  try { localStorage.setItem("section201-attendance-groups-v1", JSON.stringify(attendanceGroups)); return true; }
  catch { attendanceMessage("Browser storage is full. Remove large photos or download records and try again.", "error"); return false; }
}
function attendanceMessage(message, type) {
  const el = $("attendanceMessage"); if (!el) return;
  el.textContent = message; el.className = `message ${type || ""}`;
}
function saveViolations() {
  try { localStorage.setItem("section201-violations-v1", JSON.stringify(violations)); }
  catch { showViolationMessage("Could not save to this browser. Download your violation list as a backup.", "error"); }
}
function violationCount(student) { return violations.filter(v => v.student === student).length; }
function showViolationMessage(message, type) {
  const el = $("violationMessage"); el.textContent = message; el.className = `message ${type || ""}`;
}
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    showMessage("Browser storage is full. Download a backup and remove large stored photos, or use the smaller-photo fallback.", "error");
    return false;
  }
}
function durationMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}
function formatDuration(mins) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function studentRecords(student) { return records.filter(r => r.student === student); }
function totalMinutes(student) { return studentRecords(student).reduce((sum, r) => sum + r.minutes, 0); }
function showMessage(message, type) {
  const el = $("formMessage");
  el.textContent = message;
  el.className = `message ${type || ""}`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function chooseStudent(name) {
  selectedId = name;
  $("selectedStudent").value = name;
  $("selectedStudentId").value = name;
  $("studentSearch").value = name;
  $("searchResults").classList.remove("show");
  showMessage("", "");
  $("startTime").focus();
}
function renderSearch() {
  const q = normalize($("studentSearch").value.trim());
  const box = $("searchResults");
  if (!q) { box.innerHTML = ""; box.classList.remove("show"); return; }
  const matches = STUDENTS.filter(n => normalize(n).includes(q)).slice(0, 12);
  box.innerHTML = matches.map(n => `<button class="search-option ${violationCount(n) ? "flagged-name" : ""}" type="button" role="option" data-name="${escapeHtml(n)}">${violationCount(n) ? "⚑ " : ""}${escapeHtml(n)}${violationCount(n) ? ` — ${violationCount(n)} violation(s)` : ""}</button>`).join("");
  if (!matches.length) box.innerHTML = `<div class="search-option">No matching student found.</div>`;
  box.classList.add("show");
}
function renderRoster() {
  const q = normalize($("rosterSearch").value.trim());
  const sort = $("sortBy").value;
  let list = STUDENTS.filter(n => normalize(n).includes(q));
  if (sort === "hours") list.sort((a,b) => totalMinutes(b)-totalMinutes(a) || a.localeCompare(b));
  else if (sort === "entries") list.sort((a,b) => studentRecords(b).length-studentRecords(a).length || a.localeCompare(b));
  else list.sort((a,b) => a.localeCompare(b));
  $("rosterBody").innerHTML = list.map(name => {
    const count = studentRecords(name).length;
    const vCount = violationCount(name);
    return `<tr class="${vCount ? "flagged-row" : ""}"><td class="${vCount ? "flagged-name" : ""}">${escapeHtml(name)}</td><td>${count}</td><td><span class="hours-pill">${formatDuration(totalMinutes(name))}</span></td><td>${vCount ? `<span class="status-flag">⚑ ${vCount} violation(s)</span>` : `<span class="status-clear">No violations</span>`}</td><td><div class="row-actions">${currentRole === "admin" ? `<button class="mini-button" data-action="select" data-name="${escapeHtml(name)}">Time in/out</button>` : ""}<button class="mini-button" data-action="view" data-name="${escapeHtml(name)}">History</button></div></td></tr>`;
  }).join("");
  if (!list.length) $("rosterBody").innerHTML = `<tr><td colspan="5">No students match your search.</td></tr>`;
}
function renderHistory() {
  const q = normalize($("historySearch").value.trim());
  const filtered = records.filter(r => normalize(r.student).includes(q) || normalize(r.date).includes(q))
    .slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  $("historyBody").innerHTML = filtered.map(r => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.student)}</td><td>${escapeHtml(formatTime(r.start))}</td><td>${escapeHtml(formatTime(r.end))}${r.overnight ? ' <span title="Ended next day">(+1 day)</span>' : ""}</td><td><span class="hours-pill">${formatDuration(r.minutes)}</span></td><td>${currentRole === "admin" ? `<div class="row-actions"><button class="mini-button" data-edit="${escapeHtml(r.id)}">Edit</button><button class="mini-button delete" data-delete="${escapeHtml(r.id)}">Delete</button></div>` : `<span class="muted">View only</span>`}</td></tr>`).join("");
  $("emptyHistory").classList.toggle("show", filtered.length === 0);
  $("historyBody").parentElement.style.display = filtered.length ? "" : "none";
}
function formatTime(t) {
  if (!t) return "";
  const [h,m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,"0")} ${suffix}`;
}
function renderViolations() {
  const list = violations.slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  $("violationsBody").innerHTML = list.map(v => `<tr><td>${escapeHtml(v.date)}</td><td class="flagged-name">${escapeHtml(v.student)}</td><td><span class="status-flag">${escapeHtml(v.type)}</span></td><td>${escapeHtml(v.notes || "—")}</td><td><button class="mini-button delete" data-delete-violation="${escapeHtml(v.id)}">Delete</button></td></tr>`).join("");
  $("emptyViolations").classList.toggle("show", list.length === 0);
  $("violationsBody").parentElement.parentElement.style.display = list.length ? "" : "none";
}
function renderStats() {
  $("studentCount").textContent = STUDENTS.length;
  $("violationCount").textContent = violations.length;
  $("sessionCount").textContent = records.length;
  const total = records.reduce((sum,r) => sum + r.minutes, 0);
  $("totalHours").textContent = formatDuration(total);
}
function renderAll() { renderRoster(); renderHistory(); renderViolations(); renderStats(); renderAttendance(); }
function clearForm() {
  selectedId = "";
  $("studentSearch").value = "";
  $("selectedStudent").value = "";
  $("selectedStudentId").value = "";
  $("startTime").value = "";
  $("endTime").value = "";
  $("entryDate").value = new Date().toLocaleDateString("en-CA");
  $("searchResults").classList.remove("show");
  showMessage("", "");
}
function csvEscape(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function downloadCsv(filename, rows) {
  const csv = "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function exportRoster() {
  const rows = [["Student name","Number of entries","Total minutes","Total hours","Total hours (decimal)"]];
  [...STUDENTS].sort((a,b)=>a.localeCompare(b)).forEach(n => {
    const mins = totalMinutes(n);
    rows.push([n, studentRecords(n).length, mins, formatDuration(mins), (mins/60).toFixed(2)]);
  });
  downloadCsv("Section_201_Student_Hours.csv", rows);
}
function exportViolations() {
  const rows = [["Date","Student name","Violation type","Details"]];
  violations.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(v => rows.push([v.date,v.student,v.type,v.notes || ""]));
  downloadCsv("Section_201_Violations.csv", rows);
}
function renderViolationSearch() {
  const q = normalize($("violationStudentSearch").value.trim());
  const box = $("violationSearchResults");
  if (!q) { box.innerHTML = ""; box.classList.remove("show"); return; }
  const matches = STUDENTS.filter(n => normalize(n).includes(q)).slice(0,12);
  box.innerHTML = matches.map(n => `<button class="search-option ${violationCount(n) ? "flagged-name" : ""}" type="button" data-violation-name="${escapeHtml(n)}">${violationCount(n) ? "⚑ " : ""}${escapeHtml(n)}</button>`).join("");
  if (!matches.length) box.innerHTML = `<div class="search-option">No matching student found.</div>`;
  box.classList.add("show");
}
function clearViolationForm() {
  selectedViolationStudent = ""; $("violationStudentSearch").value = ""; $("violationStudent").value = "";
  $("violationType").value = "Late"; $("violationDate").value = new Date().toLocaleDateString("en-CA");
$("attendanceDate").value = new Date().toLocaleDateString("en-CA");
renderAttendanceStudentList(); renderAttendanceSignatures(); $("violationNotes").value = "";
  $("violationSearchResults").classList.remove("show"); showViolationMessage("", "");
}
function exportSessions() {
  const rows = [["Date","Student name","Start time","End time","Duration minutes","Duration","Overnight"]];
  records.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt).forEach(r => rows.push([r.date,r.student,formatTime(r.start),formatTime(r.end),r.minutes,formatDuration(r.minutes),r.overnight?"Yes":"No"]));
  downloadCsv("Section_201_Time_Entries.csv", rows);
}


function setRole(role) {
  currentRole = role;
  $("accessGate").hidden = true;
  $("appShell").hidden = false;
  $("roleLabel").textContent = role === "admin" ? "Administrator mode · Editing enabled" : "Manpower viewer mode · Read only";
  $("roleLabel").className = role === "admin" ? "role-admin" : "role-viewer";
  document.querySelectorAll(".admin-only").forEach(el => el.hidden = role !== "admin");
  $("saveEntry").disabled = role !== "admin";
  $("saveViolation").disabled = role !== "admin";
  renderAll();
}
function signOut() {
  currentRole = null;
  $("appShell").hidden = true;
  $("accessGate").hidden = false;
  $("loginUsername").value = "";
  $("loginPassword").value = "";
  $("loginMessage").textContent = "";
  $("adminModeBtn").classList.add("active");
  $("viewerModeBtn").classList.remove("active");
  $("adminLoginForm").hidden = false;
  $("viewerPrompt").hidden = true;
}
$("adminModeBtn").addEventListener("click", () => {
  $("adminModeBtn").classList.add("active");
  $("viewerModeBtn").classList.remove("active");
  $("adminLoginForm").hidden = false;
  $("viewerPrompt").hidden = true;
  $("loginMessage").textContent = "";
});
$("viewerModeBtn").addEventListener("click", () => {
  $("viewerModeBtn").classList.add("active");
  $("adminModeBtn").classList.remove("active");
  $("adminLoginForm").hidden = true;
  $("viewerPrompt").hidden = false;
  $("loginMessage").textContent = "";
});
$("adminLoginForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("loginUsername").value.trim() === ADMIN_USERNAME && $("loginPassword").value === ADMIN_PASSWORD) {
    setRole("admin");
  } else {
    $("loginMessage").textContent = "Incorrect username or password.";
  }
});
$("enterViewerBtn").addEventListener("click", () => setRole("viewer"));
$("signOutBtn").addEventListener("click", signOut);

$("studentSearch").addEventListener("input", renderSearch);
$("studentSearch").addEventListener("focus", renderSearch);
$("searchResults").addEventListener("click", e => {
  const button = e.target.closest("[data-name]");
  if (button) chooseStudent(button.dataset.name);
});
document.addEventListener("click", e => {
  if (!e.target.closest(".field.full")) $("searchResults").classList.remove("show");
});
$("saveEntry").addEventListener("click", () => {
  if (currentRole !== "admin") return;
  const student = selectedId;
  const start = $("startTime").value;
  const end = $("endTime").value;
  const date = $("entryDate").value;
  if (!student || !STUDENTS.includes(student)) return showMessage("Search for and select a student first.", "error");
  if (!start || !end || !date) return showMessage("Please enter a start time, end time, and date.", "error");
  if (start === end) return showMessage("Start and end time are the same. Enter a different end time for a full-day session.", "error");
  const mins = durationMinutes(start, end);
  records.push({id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, student, start, end, date, minutes: mins, overnight: end < start, createdAt: Date.now()});
  saveRecords();
  renderAll();
  showMessage(`${formatDuration(mins)} added for ${student}. Their new total is ${formatDuration(totalMinutes(student))}.`, "success");
  $("startTime").value = ""; $("endTime").value = "";
});
$("clearForm").addEventListener("click", () => { if (currentRole === "admin") clearForm(); });
$("rosterSearch").addEventListener("input", renderRoster);
$("sortBy").addEventListener("change", renderRoster);
$("historySearch").addEventListener("input", renderHistory);
$("downloadCsv").addEventListener("click", exportRoster);
$("downloadEntries").addEventListener("click", exportSessions);
$("rosterBody").addEventListener("click", e => {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  if (b.dataset.action === "select") {
    if (currentRole !== "admin") return;
    chooseStudent(b.dataset.name);
    window.scrollTo({top:0,behavior:"smooth"});
  } else {
    $("historySearch").value = b.dataset.name;
    renderHistory();
    document.querySelector("#historyBody").closest(".panel")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
});
$("historyBody").addEventListener("click", e => {
  if (currentRole !== "admin") return;
  const editButton = e.target.closest("button[data-edit]");
  if (editButton) {
    const record = records.find(r => r.id === editButton.dataset.edit);
    if (!record) return;
    const newStart = prompt(`Edit START time for ${record.student} on ${record.date} (24-hour HH:MM):`, record.start);
    if (newStart === null) return;
    const newEnd = prompt(`Edit END time for ${record.student} on ${record.date} (24-hour HH:MM):`, record.end);
    if (newEnd === null) return;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(newStart) || !timePattern.test(newEnd) || newStart === newEnd) {
      alert("Please use valid 24-hour times such as 08:30 and 15:00. Start and end cannot be the same.");
      return;
    }
    record.start = newStart;
    record.end = newEnd;
    record.minutes = durationMinutes(newStart, newEnd);
    record.overnight = newEnd < newStart;
    saveRecords();
    renderAll();
    return;
  }
  const b = e.target.closest("button[data-delete]");
  if (!b) return;
  const record = records.find(r => r.id === b.dataset.delete);
  if (!record) return;
  if (confirm(`Delete this ${formatDuration(record.minutes)} entry for ${record.student} on ${record.date}?`)) {
    records = records.filter(r => r.id !== record.id);
    saveRecords(); renderAll();
  }
});
$("entryDate").value = new Date().toLocaleDateString("en-CA");
$("violationDate").value = new Date().toLocaleDateString("en-CA");
$("attendanceDate").value = new Date().toLocaleDateString("en-CA");
renderAttendanceStudentList(); renderAttendanceSignatures();
$("violationStudentSearch").addEventListener("input", renderViolationSearch);
$("violationStudentSearch").addEventListener("focus", renderViolationSearch);
$("violationSearchResults").addEventListener("click", e => {
  const b = e.target.closest("[data-violation-name]"); if (!b) return;
  selectedViolationStudent = b.dataset.violationName;
  $("violationStudent").value = selectedViolationStudent;
  $("violationStudentSearch").value = selectedViolationStudent;
  $("violationSearchResults").classList.remove("show");
  showViolationMessage("", "");
});
$("saveViolation").addEventListener("click", () => {
  if (currentRole !== "admin") return;
  if (!selectedViolationStudent || !STUDENTS.includes(selectedViolationStudent)) return showViolationMessage("Search for and select a student first.", "error");
  const date = $("violationDate").value;
  if (!date) return showViolationMessage("Please choose the violation date.", "error");
  const v = {id:`v-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, student:selectedViolationStudent, type:$("violationType").value, date, notes:$("violationNotes").value.trim(), createdAt:Date.now()};
  violations.push(v); saveViolations(); renderAll();
  showViolationMessage(`Violation recorded. ${selectedViolationStudent} is now flagged red in the roster.`, "success");
  $("violationNotes").value = "";
});
$("clearViolation").addEventListener("click", () => { if (currentRole === "admin") clearViolationForm(); });
$("downloadViolations").addEventListener("click", exportViolations);
$("violationsBody").addEventListener("click", e => {
  if (currentRole !== "admin") return;
  const b = e.target.closest("button[data-delete-violation]"); if (!b) return;
  const v = violations.find(x => x.id === b.dataset.deleteViolation); if (!v) return;
  if (confirm(`Delete this violation record for ${v.student} on ${v.date}?`)) {
    violations = violations.filter(x => x.id !== v.id); saveViolations(); renderAll();
  }
});

// ---------- Attendance, signatures, group photo, and student profiles ----------

function downloadFullBackup() {
  const payload = {
    app: "Section 201 Student Time Tracker",
    exportedAt: new Date().toISOString(),
    records,
    violations,
    attendanceGroups
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="Section_201_Full_Backup.json";
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
$("downloadFullBackup").addEventListener("click", downloadFullBackup);
$("removeSavedPhotos").addEventListener("click", () => {
  if (currentRole !== "admin") return;
  const count=attendanceGroups.filter(g=>g.photo).length;
  if (!count) return attendanceMessage("There are no saved group photos to remove.", "success");
  if (!confirm(`Remove ${count} saved group photo(s) to free browser storage? Attendance, student signatures, head signatures, and time totals will be preserved. Download a full data backup first if you need the photos.`)) return;
  const previous=attendanceGroups;
  attendanceGroups=attendanceGroups.map(g=>({...g,photo:""}));
  if (!saveAttendanceGroups()) { attendanceGroups=previous; return attendanceMessage("Could not update saved attendance. Browser storage may be full; download a full backup first.", "error"); }
  renderAttendance();
  attendanceMessage(`Removed ${count} saved group photo(s). Attendance and signatures were preserved. You can now retry recording attendance.`, "success");
});

function renderAttendanceStudentList() {
  const q = normalize(($("attendanceStudentSearch")?.value || "").trim());
  const host = $("attendanceStudentList");
  if (!host) return;
  const matches = STUDENTS.filter(n => normalize(n).includes(q));
  host.innerHTML = matches.map(n => `<label class="attendance-student"><input type="checkbox" data-attendance-student="${escapeHtml(n)}" ${attendanceSelected.has(n) ? "checked" : ""}><span>${escapeHtml(n)}</span>${violationCount(n) ? `<small class="flagged-name">${violationCount(n)} violation(s)</small>` : ""}</label>`).join("") || '<p class="muted">No matching students.</p>';
}
function renderAttendanceSignatures() {
  const host = $("attendanceSignatureList");
  if (!host) return;
  const names = [...attendanceSelected];
  if (!names.length) { host.innerHTML = '<span class="muted">Select students above to add their signatures.</span>'; return; }
  host.innerHTML = names.map(n => `<div class="signature-row"><span>${escapeHtml(n)}</span><span class="${attendanceSignatures[n] ? "signature-done" : "signature-missing"}">${attendanceSignatures[n] ? "Signed" : "Not signed"}</span><button class="mini-button" type="button" data-sign-student="${escapeHtml(n)}">${attendanceSignatures[n] ? "Redo signature" : "Capture signature"}</button></div>`).join("");
}
function renderAttendance() {
  const body = $("attendanceBody");
  if (!body) return;
  const list = attendanceGroups.slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  body.innerHTML = list.map(g => `<tr><td>${escapeHtml(g.date)}</td><td>${escapeHtml(g.shift)}</td><td>${escapeHtml(formatTime(g.start))}–${escapeHtml(formatTime(g.end))}${g.overnight ? " (+1 day)" : ""}</td><td>${g.students.length} <button type="button" class="mini-button" data-view-attendance="${escapeHtml(g.id)}">View names</button></td><td>${escapeHtml(g.headName || "—")}</td><td>${g.photo ? `<button type="button" class="mini-button" data-photo-attendance="${escapeHtml(g.id)}">View photo</button>` : "No photo"}</td><td>${currentRole === "admin" ? `<button type="button" class="mini-button delete" data-delete-attendance="${escapeHtml(g.id)}">Delete</button>` : "View only"}</td></tr>`).join("");
  $("emptyAttendance").classList.toggle("show", list.length === 0);
  body.parentElement.parentElement.style.display = list.length ? "" : "none";
}
function clearAttendanceForm() {
  attendanceSelected = new Set(); attendanceSignatures = {}; headSignature = "";
  $("attendanceDate").value = new Date().toLocaleDateString("en-CA");
  $("attendanceShift").value = "Morning"; $("attendanceStart").value = ""; $("attendanceEnd").value = "";
  $("attendanceHeadName").value = ""; $("attendanceStudentSearch").value = ""; $("attendancePhoto").value = "";
  $("attendancePhotoPreview").innerHTML = ""; $("attendancePhotoPreview").dataset.photo = ""; $("headSignatureStatus").textContent = "Not signed";
  renderAttendanceStudentList(); renderAttendanceSignatures(); attendanceMessage("", "");
}
function openSignature(key, title) {
  pendingSignatureKey = key;
  $("signatureTitle").textContent = title;
  $("signatureDescription").textContent = "Sign inside the box using a mouse, touchpad, stylus, or finger.";
  $("signatureModal").hidden = false;
  clearSignatureCanvas();
}
function clearSignatureCanvas() {
  signatureHasInk = false;
  const canvas = $("signatureCanvas"), ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#15264b"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
}
function compressPhoto(file) {
  return new Promise((resolve,reject) => {
    if (!file) return resolve("");
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not open the selected photo."));
      img.onload = () => {
        const scale = Math.min(1, 700 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width*scale)); canvas.height = Math.max(1, Math.round(img.height*scale));
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.42));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function showProfile(name) {
  const ownRecords = studentRecords(name).slice().sort((a,b)=>b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  const groups = attendanceGroups.filter(g=>g.students.some(s=>s.name===name)).sort((a,b)=>b.date.localeCompare(a.date));
  $("profileTitle").textContent = name;
  $("profileContent").innerHTML = `<div class="profile-stats"><div><strong>${formatDuration(totalMinutes(name))}</strong><small>Total recorded time</small></div><div><strong>${ownRecords.length}</strong><small>Time entries</small></div><div><strong>${groups.length}</strong><small>Duty logs</small></div></div>
    <h3>Duty attendance history</h3>
    ${groups.length ? groups.map(g=>{const person=g.students.find(s=>s.name===name);return `<div class="profile-duty"><div><strong>${escapeHtml(g.date)} · ${escapeHtml(g.shift)} shift</strong><p>${escapeHtml(formatTime(g.start))}–${escapeHtml(formatTime(g.end))} · ${formatDuration(durationMinutes(g.start,g.end))}</p><small>Logged by: ${escapeHtml(g.headName || "—")} · Student signature: ${person.signature ? "Captured" : "Not available"}</small></div>${person.signature ? `<img class="signature-thumb" src="${person.signature}" alt="Student signature">` : ""}${g.photo ? `<button class="mini-button" data-profile-photo="${escapeHtml(g.id)}">View group photo</button>` : ""}</div>`}).join("") : '<p class="muted">No duty attendance recorded for this student.</p>'}
    <h3>Time-entry history</h3>
    ${ownRecords.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>${ownRecords.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(formatTime(r.start))}</td><td>${escapeHtml(formatTime(r.end))}</td><td>${formatDuration(r.minutes)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No time entries recorded.</p>'}`;
  $("profileModal").hidden = false;
}
function showPhoto(groupId) {
  const g = attendanceGroups.find(x=>x.id===groupId);
  if (!g || !g.photo) return;
  const w = window.open();
  if (w) { w.document.write(`<title>Duty group photo</title><img style="max-width:100%;height:auto" src="${g.photo}" alt="Duty group photo">`); w.document.close(); }
  else alert("Your browser blocked the photo pop-up. Please allow pop-ups for this local page.");
}
function exportAttendance() {
  const rows = [["Date","Shift","Start time","End time","Student name","Student signature captured","Head name","Head signature captured","Group photo attached"]];
  attendanceGroups.forEach(g=>g.students.forEach(s=>rows.push([g.date,g.shift,formatTime(g.start),formatTime(g.end),s.name,s.signature?"Yes":"No",g.headName||"",g.headSignature?"Yes":"No",g.photo?"Yes":"No"])));
  downloadCsv("Section_201_Attendance.csv", rows);
}
$("attendanceStudentSearch").addEventListener("input", renderAttendanceStudentList);
$("attendanceStudentList").addEventListener("change", e => {
  const cb = e.target.closest("[data-attendance-student]"); if (!cb) return;
  const name = cb.dataset.attendanceStudent;
  if (cb.checked) attendanceSelected.add(name);
  else { attendanceSelected.delete(name); delete attendanceSignatures[name]; }
  renderAttendanceSignatures();
});
$("attendanceSignatureList").addEventListener("click", e => {
  const b=e.target.closest("[data-sign-student]"); if(b) openSignature("student:"+b.dataset.signStudent, "Signature: "+b.dataset.signStudent);
});
$("signHeadBtn").addEventListener("click", () => {
  if (!$("attendanceHeadName").value.trim()) return attendanceMessage("Enter the head's name before capturing the signature.", "error");
  openSignature("head", "Head signature: "+$("attendanceHeadName").value.trim());
});
$("closeSignature").addEventListener("click", () => $("signatureModal").hidden = true);
$("clearSignature").addEventListener("click", clearSignatureCanvas);
const sigCanvas=$("signatureCanvas"); let drawing=false, signatureHasInk=false;
function signaturePoint(e) { const r=sigCanvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*sigCanvas.width/r.width,y:(e.clientY-r.top)*sigCanvas.height/r.height}; }
sigCanvas.addEventListener("pointerdown", e=>{drawing=true; signatureHasInk=true; sigCanvas.setPointerCapture(e.pointerId); const p=signaturePoint(e); const c=sigCanvas.getContext("2d"); c.beginPath(); c.moveTo(p.x,p.y);});
sigCanvas.addEventListener("pointermove", e=>{if(!drawing)return; const p=signaturePoint(e); const c=sigCanvas.getContext("2d"); c.lineTo(p.x,p.y); c.stroke();});
["pointerup","pointercancel","lostpointercapture"].forEach(ev=>sigCanvas.addEventListener(ev,()=>drawing=false));
$("saveSignature").addEventListener("click", () => {
  if (!signatureHasInk) { attendanceMessage("Please draw a signature before using it.", "error"); return; }
  const compact=document.createElement("canvas");
  compact.width=350; compact.height=110;
  compact.getContext("2d").drawImage(sigCanvas,0,0,350,110);
  const data=compact.toDataURL("image/jpeg",0.5);
  if (pendingSignatureKey==="head") { headSignature=data; $("headSignatureStatus").textContent="Head signature captured"; }
  else { attendanceSignatures[pendingSignatureKey.slice(8)]=data; renderAttendanceSignatures(); }
  $("signatureModal").hidden=true; signatureHasInk=false; attendanceMessage("", "");
});
$("attendancePhoto").addEventListener("change", async () => {
  const host=$("attendancePhotoPreview"); host.innerHTML="";
  const file=$("attendancePhoto").files[0]; if(!file)return;
  try { const data=await compressPhoto(file); const img=document.createElement("img"); img.src=data; img.alt="Selected group photo preview"; host.appendChild(img); host.dataset.photo=data; }
  catch(err) { attendanceMessage(err.message,"error"); $("attendancePhoto").value=""; }
});
$("saveAttendance").addEventListener("click", async () => {
  if(currentRole!=="admin") return;
  const date=$("attendanceDate").value, start=$("attendanceStart").value, end=$("attendanceEnd").value;
  const headName=$("attendanceHeadName").value.trim(), names=[...attendanceSelected];
  if(!date||!start||!end) return attendanceMessage("Enter the duty date, start time, and end time.","error");
  if(start===end) return attendanceMessage("Start and end time cannot be the same.","error");
  if(!names.length) return attendanceMessage("Select at least one student who was on duty.","error");
  const missing=names.filter(n=>!attendanceSignatures[n]);
  if(missing.length) return attendanceMessage("Capture a signature for every selected student. Missing: "+missing.join(", "),"error");
  if(!headName||!headSignature) return attendanceMessage("Enter the head's name and capture the head's signature.","error");
  const mins=durationMinutes(start,end), id=`att-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const photo=$("attendancePhotoPreview").dataset.photo || "";
  const group={id,date,shift:$("attendanceShift").value,start,end,overnight:end<start,headName,headSignature,photo,students:names.map(name=>({name,signature:attendanceSignatures[name]})),createdAt:Date.now()};
  const oldRecords=records.slice(), oldGroups=attendanceGroups.slice();
  attendanceGroups.push(group);
  names.forEach(student=>records.push({id:`${id}-${STUDENTS.indexOf(student)}`,student,start,end,date,minutes:mins,overnight:end<start,createdAt:Date.now(),attendanceGroupId:id,shift:group.shift}));
  let recordsSaved=saveRecords(), groupsSaved=saveAttendanceGroups();
  let photoSaved=Boolean(group.photo);
  if (!recordsSaved || !groupsSaved) {
    // Retry with the group photo omitted; large images are the most common localStorage quota cause.
    attendanceGroups=attendanceGroups.map(g=>g.id===id ? {...g,photo:""} : g);
    group.photo="";
    recordsSaved=saveRecords(); groupsSaved=saveAttendanceGroups(); photoSaved=false;
  }
  if (!recordsSaved || !groupsSaved) {
    records=oldRecords; attendanceGroups=oldGroups;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); localStorage.setItem("section201-attendance-groups-v1", JSON.stringify(attendanceGroups)); } catch {}
    renderAll(); return attendanceMessage("Browser storage is still full, so this attendance was not saved. First download your existing roster, sessions, violations, and attendance CSV backups. Then remove old records/photos or reopen the tracker in a browser with available storage and try again.","error");
  }
  renderAll();
  clearAttendanceForm();
  attendanceMessage(`Saved ${names.length} student(s) for ${date}, ${group.shift.toLowerCase()} shift. ${formatDuration(mins)} was added to each student's total.${photoSaved ? "" : " The browser was low on storage, so the group photo was not saved; please use a smaller photo and attach it again."}`,"success");
});
$("clearAttendance").addEventListener("click", clearAttendanceForm);
$("downloadAttendance").addEventListener("click", exportAttendance);
$("attendanceBody").addEventListener("click", e=>{
  const view=e.target.closest("[data-view-attendance]");
  if(view){const g=attendanceGroups.find(x=>x.id===view.dataset.viewAttendance);if(g)alert(`Students on duty — ${g.date} (${g.shift})\n\n${g.students.map(s=>s.name+(s.signature?" ✓ signed":"")).join("\n")}\n\nHead: ${g.headName}\nHead signature: ${g.headSignature?"Captured":"Not captured"}`);return;}
  const photo=e.target.closest("[data-photo-attendance]"); if(photo){showPhoto(photo.dataset.photoAttendance);return;}
  const del=e.target.closest("[data-delete-attendance]"); if(del && currentRole==="admin"){
    const g=attendanceGroups.find(x=>x.id===del.dataset.deleteAttendance); if(!g)return;
    if(confirm(`Delete the ${g.date} ${g.shift.toLowerCase()} attendance log and its generated time entries?`)){
      attendanceGroups=attendanceGroups.filter(x=>x.id!==g.id); records=records.filter(r=>r.attendanceGroupId!==g.id); saveAttendanceGroups();saveRecords();renderAll();
    }
  }
});
$("rosterBody").addEventListener("click", e=>{
  const b=e.target.closest("[data-profile]"); if(b) showProfile(b.dataset.profile);
});
$("closeProfile").addEventListener("click", ()=>$("profileModal").hidden=true);
$("profileContent").addEventListener("click", e=>{const b=e.target.closest("[data-profile-photo]");if(b)showPhoto(b.dataset.profilePhoto);});

renderAll();
