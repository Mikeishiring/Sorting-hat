const today = "2026-05-25";

const stages = [
  {
    id: "state",
    eyebrow: "pass 1",
    title: "current state",
    question: "How should the cohort read you this week?",
    mode: "color",
    options: [
      { id: "open", label: "Open", value: "blue", color: "#5FA8FF", desc: "Still forming direction; route context and adjacent examples." },
      { id: "shipping", label: "Shipping", value: "green", color: "#6EE7B7", desc: "Actively moving; route blockers, proof, and specific help." },
      { id: "available", label: "Available", value: "amber", color: "#FFB454", desc: "Can help others; route reviews, intros, and lightweight asks." },
    ],
  },
  {
    id: "craft",
    eyebrow: "pass 2",
    title: "contribution shape",
    question: "What kind of contribution should people expect?",
    mode: "shape",
    options: [
      { id: "engineering", label: "Engineering", value: "triangle", shape: "triangle", desc: "Systems, implementation, reliability, protocol work." },
      { id: "design", label: "Design", value: "circle", shape: "circle", desc: "UX, demos, product surface, visual language." },
      { id: "strategy", label: "Strategy", value: "diamond", shape: "diamond", desc: "Positioning, sequencing, partner fit, next move." },
      { id: "research", label: "Research", value: "hex", shape: "hex", desc: "Assumptions, experiments, mechanism design, proof pressure." },
    ],
  },
  {
    id: "routing",
    eyebrow: "pass 3",
    title: "surface style",
    question: "How should people approach you?",
    mode: "texture",
    options: [
      { id: "direct", label: "Direct", value: "solid", texture: "solid", desc: "Open to direct asks and clear next actions." },
      { id: "pair", label: "Pair", value: "hatch", texture: "hatch", desc: "Open to paired work; pattern reads as parallel motion." },
      { id: "review", label: "Review", value: "dots", texture: "dots", desc: "Open to critique; pattern reads as comments and checks." },
      { id: "route", label: "Route", value: "split", texture: "split", desc: "Open to introductions and routed context." },
    ],
  },
];

const state = {
  stage: 0,
  selections: {},
  drag: null,
  hover: null,
  copied: "",
  personId: "your-handle",
  visibility: "cohort-public",
};

const app = document.querySelector("#app");

const CX = 0;
const CY = 0;
const INNER = 70;
const OUTER = 136;
const LABEL = 162;

function activeStage() {
  return stages[state.stage];
}

function selected(stageId) {
  const stage = stages.find((item) => item.id === stageId);
  return stage?.options.find((option) => option.id === state.selections[stageId]) || null;
}

function complete() {
  return stages.every((stage) => selected(stage.id));
}

function progress() {
  return Math.round(stages.filter((stage) => selected(stage.id)).length / stages.length * 100);
}

function slugify(value) {
  return String(value || "your-handle")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "your-handle";
}

function angleFor(index, count) {
  return -Math.PI / 2 + index * Math.PI * 2 / count;
}

function polar(radius, angle) {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function segmentPath(index, count, inner = INNER, outer = OUTER) {
  const gap = 0.045;
  const start = angleFor(index, count) - Math.PI / count + gap;
  const end = angleFor(index, count) + Math.PI / count - gap;
  const a = polar(outer, start);
  const b = polar(outer, end);
  const c = polar(inner, end);
  const d = polar(inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${outer} ${outer} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} L ${c.x.toFixed(2)} ${c.y.toFixed(2)} A ${inner} ${inner} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)} Z`;
}

function localPoint(event, svg) {
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 440 - 220;
  const y = ((event.clientY - rect.top) / rect.height) * 360 - 180;
  return { x, y };
}

function hitOption(point, stage = activeStage()) {
  const dist = Math.hypot(point.x - CX, point.y - CY);
  if (dist < INNER * 0.5 || dist > OUTER + 24) return null;
  let angle = Math.atan2(point.y, point.x) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  const slice = Math.PI * 2 / stage.options.length;
  const index = Math.round(angle / slice) % stage.options.length;
  return stage.options[index] || null;
}

function optionPoint(stageId, optionId, radius = 116) {
  const stage = stages.find((item) => item.id === stageId);
  const index = stage.options.findIndex((option) => option.id === optionId);
  return polar(radius, angleFor(index, stage.options.length));
}

function snapshot() {
  const stateChoice = selected("state");
  const craftChoice = selected("craft");
  const surfaceChoice = selected("routing");
  const markName = [stateChoice?.value, craftChoice?.value, surfaceChoice?.value].filter(Boolean).join(" ") || "unformed mark";
  return {
    schema_version: 1,
    updated_at: today,
    person: slugify(state.personId),
    visibility: state.visibility,
    source: "sorting-hat-click-drag-routing-demo",
    routing_mark: {
      name: markName,
      state: stateChoice?.id || null,
      contribution: craftChoice?.id || null,
      surface: surfaceChoice?.id || null,
    },
    profile_patch: {
      now: stateChoice ? `${stateChoice.label.toLowerCase()} this week` : "",
      skill_areas: craftChoice ? [craftChoice.id] : [],
      availability_pref: surfaceChoice?.label || "",
      routing_note: sentence(),
    },
  };
}

function sentence() {
  const stateChoice = selected("state");
  const craftChoice = selected("craft");
  const surfaceChoice = selected("routing");
  if (!stateChoice && !craftChoice && !surfaceChoice) return "Drag from the center to a bubble. Each pass adds one property to the mark.";
  return [
    stateChoice ? `${stateChoice.label} state` : "state unresolved",
    craftChoice ? `${craftChoice.label.toLowerCase()} contribution` : "contribution unresolved",
    surfaceChoice ? `${surfaceChoice.label.toLowerCase()} surface` : "surface unresolved",
  ].join(" / ");
}

function render() {
  const stage = activeStage();
  const snap = snapshot();
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/" aria-label="Sorting Hat routing instrument">
        <span class="brand-glyph" aria-hidden="true"></span>
        <span><span class="kicker">Sorting Hat cohort routing</span><strong>click-drag profile mark</strong></span>
      </a>
      <nav class="stage-tabs" aria-label="Routing mark passes">
        ${stages.map((item, index) => `
          <button class="stage-tab" data-action="stage" data-index="${index}" data-active="${index === state.stage}" data-done="${!!selected(item.id)}">
            <span>${item.eyebrow}</span><strong>${item.title}</strong>
          </button>
        `).join("")}
      </nav>
      <button class="reset-top" data-action="reset">Reset</button>
    </header>

    <section class="instrument-layout">
      <aside class="left-rail">
        <div class="rail-copy">
          <span class="kicker">${stage.eyebrow}</span>
          <h1>${stage.question}</h1>
          <p>${stageText(stage)}</p>
        </div>
        <div class="selected-stack">
          ${stages.map(renderPassRow).join("")}
        </div>
      </aside>

      <section class="instrument-shell">
        ${renderInstrument(stage)}
      </section>

      <aside class="readout">
        <div class="readout-head">
          <span class="kicker">live mark</span>
          <strong>${snap.routing_mark.name}</strong>
        </div>
        ${renderFinalGlyph()}
        <p>${sentence()}</p>
        <div class="form-grid">
          <label><span class="field-label">person id</span><input data-field="personId" value="${escapeHtml(state.personId)}" /></label>
          <label><span class="field-label">visibility</span><select data-field="visibility">${["cohort-public", "organizer-only", "public"].map((item) => `<option value="${item}" ${item === state.visibility ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        </div>
        <div class="actions">
          <button class="btn primary" data-action="copy">Copy JSON</button>
          <button class="btn" data-action="reset">Reset</button>
        </div>
        <details class="schema">
          <summary>Schema preview</summary>
          <pre>${escapeHtml(JSON.stringify(snap, null, 2))}</pre>
        </details>
      </aside>
    </section>
    ${state.copied ? `<div class="toast">${state.copied}</div>` : ""}
  `;
  wire();
}

function stageText(stage) {
  if (stage.mode === "color") return "Color only. Hold the center, drag toward a color, release.";
  if (stage.mode === "shape") return "Shape only. Hold the center, drag toward a contribution, release.";
  return "Surface style only. Hold the center, drag toward the texture that should live inside the mark.";
}

function renderPassRow(stage) {
  const choice = selected(stage.id);
  return `
    <button class="pass-row" data-action="stage" data-index="${stages.indexOf(stage)}" data-active="${stage.id === activeStage().id}" data-empty="${!choice}">
      <span class="pass-visual">${choice ? miniVisual(stage, choice) : ""}</span>
      <span><span>${stage.title}</span><strong>${choice?.label || "not set"}</strong></span>
    </button>
  `;
}

function renderInstrument(stage) {
  const choice = selected(stage.id);
  return `
    <svg class="instrument" data-stage="${stage.id}" viewBox="-220 -180 440 360" role="application" aria-label="${stage.question}">
      <defs>
        <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
      </defs>
      <g class="mesh" aria-hidden="true">${meshLines()}</g>
      <circle class="ring-line" cx="0" cy="0" r="${INNER}"></circle>
      <circle class="ring-line outer" cx="0" cy="0" r="${OUTER}"></circle>
      ${stage.options.map((option, index) => renderSegment(stage, option, index)).join("")}
      ${renderCommittedPath()}
      ${state.drag ? `<line class="drag-line" x1="0" y1="0" x2="${state.drag.x.toFixed(1)}" y2="${state.drag.y.toFixed(1)}"></line>` : ""}
      <circle class="center-target" cx="0" cy="0" r="24"></circle>
      <text class="center-label" x="0" y="-2" text-anchor="middle">hold</text>
      <text class="center-label sub" x="0" y="13" text-anchor="middle">drag</text>
    </svg>
  `;
}

function renderSegment(stage, option, index) {
  const active = state.hover?.stageId === stage.id && state.hover?.optionId === option.id;
  const committed = selected(stage.id)?.id === option.id;
  const mid = polar(LABEL, angleFor(index, stage.options.length));
  return `
    <g class="segment ${stage.mode}" data-option="${option.id}" data-active="${active}" data-committed="${committed}" style="--option-color:${option.color || "#F7F1EC"}">
      <path class="segment-hit" d="${segmentPath(index, stage.options.length)}"></path>
      ${stage.mode === "color" ? renderColorSegment(option, index, stage.options.length) : ""}
      ${stage.mode === "shape" ? renderShapeSegment(option, index, stage.options.length) : ""}
      ${stage.mode === "texture" ? renderTextureSegment(option, index, stage.options.length) : ""}
      <text class="segment-label" x="${mid.x.toFixed(1)}" y="${mid.y.toFixed(1)}" text-anchor="${mid.x < -12 ? "end" : mid.x > 12 ? "start" : "middle"}">${option.label}</text>
    </g>
  `;
}

function renderColorSegment(option, index, count) {
  const p = polar(104, angleFor(index, count));
  return `<circle class="color-port" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="18"></circle>`;
}

function renderShapeSegment(option, index, count) {
  const p = polar(104, angleFor(index, count));
  return shapeMarkup(option.shape, p.x, p.y, 38, "class=\"shape-port\"");
}

function renderTextureSegment(option, index, count) {
  const p = polar(104, angleFor(index, count));
  return `<g class="texture-port texture-${option.texture}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">${textureSwatch(option.texture, 38)}</g>`;
}

function renderCommittedPath() {
  const points = stages.map((stage) => {
    const choice = selected(stage.id);
    return choice ? { ...optionPoint(stage.id, choice.id, 92 + stages.indexOf(stage) * 16), stage, choice } : null;
  }).filter(Boolean);
  if (!points.length) return "";
  return `
    <g class="committed-path">
      ${points.map((point, index) => index === 0 ? "" : `<line x1="${points[index - 1].x.toFixed(1)}" y1="${points[index - 1].y.toFixed(1)}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}"></line>`).join("")}
      ${points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5"></circle>`).join("")}
    </g>
  `;
}

function renderFinalGlyph() {
  const colorChoice = selected("state");
  const shapeChoice = selected("craft");
  const surfaceChoice = selected("routing");
  const color = colorChoice?.color || "#F7F1EC";
  const shape = shapeChoice?.shape || "circle";
  const clipShape = shapeMarkup(shape, 0, 0, 94, "");
  return `
    <svg class="final-glyph" viewBox="-120 -94 240 188" aria-label="Routing mark preview">
      <defs>
        <clipPath id="mark-clip">${clipShape}</clipPath>
      </defs>
      ${shapeChoice ? shapeMarkup(shape, 0, 0, 92, `class="final-shape" style="--mark-color:${color}"`) : `<circle class="final-placeholder" cx="0" cy="0" r="45"></circle>`}
      ${shapeChoice && surfaceChoice ? `<g class="final-texture texture-${surfaceChoice.texture}" clip-path="url(#mark-clip)">${textureFill(surfaceChoice.texture)}</g>` : ""}
      ${shapeChoice ? shapeMarkup(shape, 0, 0, 92, `class="final-outline"`) : ""}
      ${colorChoice || shapeChoice || surfaceChoice ? `<circle class="final-core" cx="0" cy="0" r="7"></circle>` : ""}
    </svg>
  `;
}

function textureSwatch(type, size) {
  const half = size / 2;
  if (type === "hatch") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="5"></rect><g>${Array.from({ length: 5 }, (_, index) => `<line x1="${-half + index * 10}" y1="${half}" x2="${-half + 18 + index * 10}" y2="${-half}"></line>`).join("")}</g>`;
  if (type === "dots") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="5"></rect><g>${[-8, 0, 8].flatMap((x) => [-8, 0, 8].map((y) => `<circle cx="${x}" cy="${y}" r="2.2"></circle>`)).join("")}</g>`;
  if (type === "split") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="5"></rect><path d="M ${-half} ${half} L ${half} ${-half}"></path><path d="M ${-half} 2 L 2 ${-half}"></path>`;
  return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="5"></rect>`;
}

function textureFill(type) {
  if (type === "hatch") {
    return Array.from({ length: 13 }, (_, index) => {
      const x = -120 + index * 20;
      return `<line x1="${x}" y1="100" x2="${x + 110}" y2="-100"></line>`;
    }).join("");
  }
  if (type === "dots") {
    return Array.from({ length: 9 }, (_, row) => Array.from({ length: 11 }, (_, column) => {
      const x = -76 + column * 15 + (row % 2 ? 7 : 0);
      const y = -58 + row * 14;
      return `<circle cx="${x}" cy="${y}" r="3"></circle>`;
    }).join("")).join("");
  }
  if (type === "split") {
    return `<rect x="-120" y="-94" width="120" height="188" class="split-a"></rect><rect x="0" y="-94" width="120" height="188" class="split-b"></rect><path d="M -120 60 C -54 12, 16 2, 120 -44"></path>`;
  }
  return `<rect x="-120" y="-94" width="240" height="188"></rect>`;
}

function shapeMarkup(shape, x, y, size, attrs = "") {
  if (shape === "circle") return `<circle ${attrs} cx="${x}" cy="${y}" r="${size / 2}"></circle>`;
  if (shape === "triangle") return `<polygon ${attrs} points="${x},${y - size / 2} ${x + size / 2},${y + size / 2} ${x - size / 2},${y + size / 2}"></polygon>`;
  if (shape === "diamond") return `<polygon ${attrs} points="${x},${y - size / 2} ${x + size / 2},${y} ${x},${y + size / 2} ${x - size / 2},${y}"></polygon>`;
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
    return `${(x + Math.cos(angle) * size / 2).toFixed(1)},${(y + Math.sin(angle) * size / 2).toFixed(1)}`;
  }).join(" ");
  return `<polygon ${attrs} points="${points}"></polygon>`;
}

function miniVisual(stage, option) {
  if (stage.mode === "color") return `<span class="mini color" style="--option-color:${option.color}"></span>`;
  if (stage.mode === "shape") return `<span class="mini shape shape-${option.shape}"></span>`;
  return `<span class="mini texture texture-${option.texture}"></span>`;
}

function meshLines() {
  const lines = [];
  for (let value = -180; value <= 180; value += 24) {
    lines.push(`<line x1="-190" y1="${value}" x2="190" y2="${value}"></line>`);
    lines.push(`<line x1="${value}" y1="-150" x2="${value}" y2="150"></line>`);
  }
  return lines.join("");
}

function wire() {
  app.querySelectorAll("[data-action]").forEach((item) => item.addEventListener("click", onAction));
  app.querySelectorAll("[data-field]").forEach((item) => item.addEventListener("input", onField));
  const svg = app.querySelector(".instrument");
  if (!svg) return;
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerUp);
}

function onPointerDown(event) {
  const svg = event.currentTarget;
  event.preventDefault();
  const point = localPoint(event, svg);
  state.drag = point;
  updateHover(point);
  render();
}

function onPointerMove(event) {
  const svg = event.currentTarget;
  const point = localPoint(event, svg);
  if (state.drag) return;
  updateHover(point);
  renderHoverOnly();
}

function onWindowPointerMove(event) {
  if (!state.drag) return;
  const svg = app.querySelector(".instrument");
  if (!svg) return;
  const point = localPoint(event, svg);
  state.drag = point;
  updateHover(point);
  render();
}

function onPointerUp() {
  if (state.hover) {
    const committedStageId = state.hover.stageId;
    state.selections[committedStageId] = state.hover.optionId;
    advanceAfterCommit(committedStageId);
  }
  state.drag = null;
  state.hover = null;
  render();
}

function advanceAfterCommit(stageId) {
  const committedIndex = stages.findIndex((stage) => stage.id === stageId);
  const nextUnset = stages.findIndex((stage, index) => index > committedIndex && !selected(stage.id));
  if (nextUnset !== -1) {
    state.stage = nextUnset;
  }
}

function updateHover(point) {
  const option = hitOption(point);
  state.hover = option ? { stageId: activeStage().id, optionId: option.id } : null;
}

function renderHoverOnly() {
  app.querySelectorAll(".segment").forEach((item) => {
    item.dataset.active = String(state.hover?.optionId === item.dataset.option);
  });
}

function onAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "stage") {
    state.stage = Number(event.currentTarget.dataset.index);
    state.drag = null;
    state.hover = null;
    render();
  }
  if (action === "reset") {
    state.selections = {};
    state.stage = 0;
    state.drag = null;
    state.hover = null;
    render();
  }
  if (action === "copy") copyText(JSON.stringify(snapshot(), null, 2));
}

function onField(event) {
  state[event.currentTarget.dataset.field] = event.currentTarget.value;
  const pre = app.querySelector(".schema pre");
  if (pre) pre.textContent = JSON.stringify(snapshot(), null, 2);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    state.copied = "JSON copied.";
  } catch {
    state.copied = "Clipboard unavailable.";
  }
  render();
  window.setTimeout(() => {
    state.copied = "";
    render();
  }, 1400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.__sortingHat = { state, stages, snapshot, render };
window.addEventListener("pointermove", onWindowPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
render();
