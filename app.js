// AM2S Board A Sim (Prototype)
// Features: 3 leads (brown/blue/green), snap-to-terminals, green clip/lock, isolator live/dead, MFT function/ports, Ze test gating.

const ui = {
  canvas: document.getElementById("board"),
  hint: document.getElementById("hint"),

  isolator: document.getElementById("isolator"),
  liveBadge: document.getElementById("liveBadge"),

  mftFunction: document.getElementById("mftFunction"),
  mftPorts: document.getElementById("mftPorts"),

  btnTest: document.getElementById("btnTest"),
  btnReset: document.getElementById("btnReset"),
  btnUnclip: document.getElementById("btnUnclip"),

  reading: document.getElementById("reading"),
  status: document.getElementById("status"),

  brownPos: document.getElementById("brownPos"),
  bluePos: document.getElementById("bluePos"),
  greenPos: document.getElementById("greenPos")
};

const ctx = ui.canvas.getContext("2d");

const state = {
  board: null,
  terminals: [],
  snapRadius: 42,
  isolatorOn: false,

  leads: {
    brown: { x: 230, y: 170, color: "#8b5a2b", terminalId: null },
    blue:  { x: 330, y: 170, color: "#2f6bff", terminalId: null },
    green: { x: 850, y: 170, color: "#2ecc71", terminalId: null, clipped: false }
  },

  drag: { active: false, leadKey: null, offsetX: 0, offsetY: 0 },

  scenario: { zeBase: 0.21 } // normal scenario
};

// ---------- Utilities ----------
function setHint(text) {
  ui.hint.textContent = text;
}

function setStatus(text) {
  ui.status.textContent = text;
}

function setReading(text) {
  ui.reading.textContent = text;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx*dx + dy*dy);
}

function getCanvasPoint(evt) {
  const rect = ui.canvas.getBoundingClientRect();
  const clientX = evt.clientX ?? (evt.touches?.[0]?.clientX);
  const clientY = evt.clientY ?? (evt.touches?.[0]?.clientY);
  const x = (clientX - rect.left) * (ui.canvas.width / rect.width);
  const y = (clientY - rect.top)  * (ui.canvas.height / rect.height);
  return { x, y };
}

function nearestTerminal(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const t of state.terminals) {
    const d = dist(x, y, t.x, t.y);
    if (d <= state.snapRadius && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

function isEarthRefTerminal(id) {
  return id === "MET" || (id && id.startsWith("E_BAR"));
}

// ---------- Rendering ----------
function drawBoard() {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);

  // board panel
  ctx.save();
  ctx.fillStyle = "rgba(10,14,20,0.95)";
  roundRect(80, 40, 940, 650, 18, true, false);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(80, 40, 940, 650, 18, false, true);
  ctx.restore();

  // title
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 20px Menlo, ui-monospace, SFMono-Regular";
  ctx.fillText("BOARD A (Prototype)", 420, 78);
  ctx.restore();

  // supply label area
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(150, 505, 360, 95, 14, true, false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 14px system-ui";
  ctx.fillText("SUPPLY", 160, 525);
  ctx.restore();

  // bars label area
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(760, 395, 200, 240, 14, true, false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 14px system-ui";
  ctx.fillText("BARS / MET", 770, 415);
  ctx.restore();

  // terminals
  for (const t of state.terminals) drawTerminal(t);

  // leads (cables optional; keep clean)
  drawLead("brown");
  drawLead("blue");
  drawLead("green");

  // live badge
  ctx.save();
  ctx.font = "800 14px system-ui";
  ctx.fillStyle = state.isolatorOn ? "rgba(255,71,87,0.9)" : "rgba(46,204,113,0.9)";
  ctx.fillText(state.isolatorOn ? "LIVE" : "DEAD", 910, 78);
  ctx.restore();

  // clipped indicator on green
  if (state.leads.green.clipped) {
    ctx.save();
    ctx.fillStyle = "rgba(46,204,113,0.9)";
    ctx.font = "700 12px system-ui";
    ctx.fillText("EARTH CLIPPED", 760, 380);
    ctx.restore();
  }
}

function drawTerminal(t) {
  ctx.save();

  // glow on earth ref terminals to guide user a bit
  if (t.kind === "met" || t.kind === "earthBar") {
    ctx.fillStyle = "rgba(46,204,113,0.08)";
    ctx.beginPath();
    ctx.arc(t.x, t.y, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px Menlo, ui-monospace, SFMono-Regular";
  ctx.textAlign = "center";
  ctx.fillText(t.label, t.x, t.y + 36);

  ctx.restore();
}

function drawLead(key) {
  const lead = state.leads[key];

  ctx.save();
  ctx.fillStyle = lead.color;
  ctx.beginPath();
  ctx.arc(lead.x, lead.y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(lead.x, lead.y, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "800 12px Menlo, ui-monospace, SFMono-Regular";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(key.toUpperCase(), lead.x, lead.y);
  ctx.restore();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function updateLeadLabels() {
  ui.brownPos.textContent = state.leads.brown.terminalId ?? "--";
  ui.bluePos.textContent  = state.leads.blue.terminalId ?? "--";
  ui.greenPos.textContent = state.leads.green.terminalId
    ? `${state.leads.green.terminalId}${state.leads.green.clipped ? " (CLIPPED)" : ""}`
    : (state.leads.green.clipped ? "(CLIPPED?)" : "--");
}

// ---------- Drag handling ----------
function hitLead(x, y) {
  // prioritise top-most feel: check green last or first? we'll do: brown, blue, green
  const order = ["brown", "blue", "green"];
  for (const key of order) {
    const lead = state.leads[key];
    const d = dist(x, y, lead.x, lead.y);
    if (d <= 26) return key;
  }
  return null;
}

function onPointerDown(evt) {
  evt.preventDefault();
  const { x, y } = getCanvasPoint(evt);

  const key = hitLead(x, y);
  if (!key) return;

  // green lead can't move if clipped (unless user unclips)
  if (key === "green" && state.leads.green.clipped) {
    setHint("Green is clipped. Tap 'Unclip Earth' to move it.");
    return;
  }

  state.drag.active = true;
  state.drag.leadKey = key;
  state.drag.offsetX = state.leads[key].x - x;
  state.drag.offsetY = state.leads[key].y - y;
}

function onPointerMove(evt) {
  if (!state.drag.active) return;
  evt.preventDefault();

  const { x, y } = getCanvasPoint(evt);
  const key = state.drag.leadKey;
  const lead = state.leads[key];

  lead.x = clamp(x + state.drag.offsetX, 90, ui.canvas.width - 90);
  lead.y = clamp(y + state.drag.offsetY, 60, ui.canvas.height - 60);

  drawBoard();
}

function onPointerUp(evt) {
  if (!state.drag.active) return;
  evt.preventDefault();

  const key = state.drag.leadKey;
  const lead = state.leads[key];

  // snap
  const t = nearestTerminal(lead.x, lead.y);
  if (t) {
    lead.x = t.x;
    lead.y = t.y;
    lead.terminalId = t.id;

    // auto-clip green if on MET or earth bar
    if (key === "green") {
      lead.clipped = isEarthRefTerminal(t.id);
      if (lead.clipped) {
        setHint("Earth clipped. Move brown/blue to SUP_L and SUP_N, set LOOP/LOOP, make LIVE, then TEST Ze.");
      }
    }
  } else {
    lead.terminalId = null;
    if (key === "green") lead.clipped = false;
  }

  state.drag.active = false;
  state.drag.leadKey = null;

  updateLeadLabels();
  drawBoard();
}

// ---------- Ze logic ----------
function validateZe() {
  if (!state.isolatorOn) return { ok: false, msg: "SUPPLY ISOLATED (turn isolator ON)" };

  if (ui.mftFunction.value !== "loop") return { ok: false, msg: "SET FUNCTION TO LOOP" };
  if (ui.mftPorts.value !== "loop") return { ok: false, msg: "LEADS IN WRONG PORTS (set Ports to LOOP)" };

  const g = state.leads.green;
  if (!g.clipped) return { ok: false, msg: "EARTH NOT CLIPPED" };
  if (!isEarthRefTerminal(g.terminalId)) return { ok: false, msg: "EARTH NOT ON MET/E BAR" };

  if (state.leads.brown.terminalId !== "SUP_L") return { ok: false, msg: "BROWN NOT ON SUPPLY L (SUP_L)" };
  if (state.leads.blue.terminalId !== "SUP_N") return { ok: false, msg: "BLUE NOT ON SUPPLY N (SUP_N)" };

  return { ok: true, msg: "OK" };
}

function zeReading() {
  // small jitter to feel real
  const jitter = (Math.random() * 0.06) - 0.03; // -0.03..+0.03
  const val = Math.max(0.05, state.scenario.zeBase + jitter);
  return `${val.toFixed(2)} Ω`;
}

// ---------- UI wiring ----------
async function init() {
  // load board config
  const res = await fetch("./boardA.json");
  state.board = await res.json();
  state.terminals = state.board.terminals;
  state.snapRadius = state.board.snapRadius || 42;

  // initial hints
  setHint("Drag leads onto terminals. Drag green to MET/E bar to clip. Then do Ze using brown=SUP_L, blue=SUP_N.");
  updateLeadLabels();
  drawBoard();

  // isolator
  ui.isolator.addEventListener("change", () => {
    state.isolatorOn = ui.isolator.checked;
    ui.liveBadge.textContent = state.isolatorOn ? "LIVE" : "DEAD";
    ui.liveBadge.className = `badge ${state.isolatorOn ? "live" : "dead"}`;
    setStatus(state.isolatorOn ? "Supply ON (LIVE)." : "Supply OFF (DEAD).");
    drawBoard();
  });

  // test
  ui.btnTest.addEventListener("click", () => {
    const v = validateZe();
    if (!v.ok) {
      setStatus(`Error: ${v.msg}`);
      setReading("--");
      setHint(v.msg);
      return;
    }
    const reading = zeReading();
    setReading(reading);
    setStatus("Ze recorded.");
    setHint("Nice. Next upgrade: add Zs at circuit points + RCD tests + guided steps.");
  });

  // reset
  ui.btnReset.addEventListener("click", () => {
    setReading("--");
    setStatus("Ready.");
    setHint("Reset done.");
  });

  // unclip
  ui.btnUnclip.addEventListener("click", () => {
    state.leads.green.clipped = false;
    setHint("Earth unclipped. You can move green again.");
    updateLeadLabels();
    drawBoard();
  });

  // canvas pointer events (works for iPhone touch too)
  ui.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  ui.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  ui.canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  ui.canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
}

init().catch((e) => {
  console.error(e);
  setHint("Failed to load boardA.json. Make sure files are hosted together.");
});
