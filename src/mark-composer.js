const today = "2026-05-25";

const stages = [
  {
    id: "color",
    eyebrow: "pass 1",
    title: "read color",
    question: "How should the cohort read you?",
    help: "Drag from the center to one color. This sets the fill only.",
    options: [
      { id: "open", label: "Open", value: "blue", color: "#5FA8FF", point: { x: 0, y: -104 }, note: "Direction is still forming." },
      { id: "shipping", label: "Shipping", value: "green", color: "#6EE7B7", point: { x: 104, y: 52 }, note: "Actively moving and unblocking." },
      { id: "available", label: "Available", value: "amber", color: "#FFB454", point: { x: -104, y: 52 }, note: "Can review, route, or help." },
    ],
  },
  {
    id: "shape",
    eyebrow: "pass 2",
    title: "contribution shape",
    question: "What kind of contribution should people expect?",
    help: "Drag to a geometry. This sets shape only.",
    options: [
      { id: "engineering", label: "Engineering", value: "triangle", shape: "triangle", point: { x: 0, y: -112 }, note: "Systems, infra, implementation." },
      { id: "design", label: "Design", value: "circle", shape: "circle", point: { x: 112, y: 0 }, note: "UX, demos, visual language." },
      { id: "strategy", label: "Strategy", value: "diamond", shape: "diamond", point: { x: 0, y: 112 }, note: "Positioning and sequencing." },
      { id: "research", label: "Research", value: "hex", shape: "hex", point: { x: -112, y: 0 }, note: "Assumptions and proof pressure." },
    ],
  },
  {
    id: "texture",
    eyebrow: "pass 3",
    title: "interior style",
    question: "How should people approach you?",
    help: "Drag to a surface treatment. This lives inside the final shape.",
    options: [
      { id: "direct", label: "Direct", value: "solid", texture: "solid", point: { x: 0, y: -112 }, note: "Direct asks are welcome." },
      { id: "pair", label: "Pair", value: "hatch", texture: "hatch", point: { x: 112, y: 0 }, note: "Open to paired work." },
      { id: "review", label: "Review", value: "dots", texture: "dots", point: { x: 0, y: 112 }, note: "Open to critique and checks." },
      { id: "route", label: "Route", value: "split", texture: "split", point: { x: -112, y: 0 }, note: "Open to intros and context." },
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

function activeStage() {
  return stages[state.stage];
}

function selected(stageId) {
  const stage = stages.find((item) => item.id === stageId);
  return stage?.options.find((option) => option.id === state.selections[stageId]) || null;
}

function selectedCount() {
  return stages.filter((stage) => selected(stage.id)).length;
}

function complete() {
  return selectedCount() === stages.length;
}

function slugify(value) {
  return String(value || "your-handle")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "your-handle";
}

function sourcePoint() {
  const previous = stages.slice(0, state.stage).reverse().find((stage) => selected(stage.id));
  return previous ? selected(previous.id).point : { x: 0, y: 0 };
}

function localPoint(event, svg) {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 360 - 180,
    y: ((event.clientY - rect.top) / rect.height) * 300 - 150,
  };
}

function hitOption(point, stage = activeStage()) {
  return stage.options.find((option) => Math.hypot(point.x - option.point.x, point.y - option.point.y) < 31) || null;
}

function markParts() {
  const color = selected("color");
  const shape = selected("shape");
  const texture = selected("texture");
  return {
    color,
    shape,
    texture,
    name: [color?.value, shape?.value, texture?.value].filter(Boolean).join(" ") || "unformed mark",
  };
}

function snapshot() {
  const parts = markParts();
  return {
    schema_version: 1,
    updated_at: today,
    person: slugify(state.personId),
    visibility: state.visibility,
    source: "sorting-hat-radial-mark-composer",
    routing_mark: {
      name: parts.name,
      color: parts.color?.id || null,
      shape: parts.shape?.id || null,
      texture: parts.texture?.id || null,
    },
    profile_patch: {
      current_state: parts.color?.label || "",
      contribution_signal: parts.shape?.label || "",
      approach_signal: parts.texture?.label || "",
      display_phrase: sentence(),
    },
  };
}

function sentence() {
  const parts = markParts();
  if (!parts.color && !parts.shape && !parts.texture) return "Start at the center and drag to a bubble.";
  return [
    parts.color ? `${parts.color.label} read` : "color unresolved",
    parts.shape ? `${parts.shape.label.toLowerCase()} shape` : "shape unresolved",
    parts.texture ? `${parts.texture.label.toLowerCase()} texture` : "texture unresolved",
  ].join(" / ");
}

function render() {
  const stage = activeStage();
  const snap = snapshot();
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span><span class="kicker">Sorting Hat cohort routing</span><strong>profile mark composer</strong></span>
      </div>
      <nav class="pass-tabs" aria-label="Mark passes">
        ${stages.map((item, index) => `
          <button class="pass-tab" data-action="stage" data-index="${index}" data-active="${index === state.stage}" data-done="${!!selected(item.id)}">
            <span>${item.eyebrow}</span><strong>${item.title}</strong>
          </button>
        `).join("")}
      </nav>
      <button class="btn reset" data-action="reset">Reset</button>
    </header>

    <main class="layout">
      <section class="instrument-panel">
        <div class="stage-copy">
          <span class="kicker">${stage.eyebrow}</span>
          <h1>${stage.question}</h1>
          <p>${stage.help}</p>
        </div>
        ${renderInstrument(stage)}
      </section>

      <aside class="readout">
        <span class="kicker">live mark</span>
        <h2>${snap.routing_mark.name}</h2>
        ${renderFinalMark("large")}
        <p>${sentence()}</p>
        <div class="property-list">${stages.map(renderProperty).join("")}</div>
        <div class="form-grid">
          <label><span class="field-label">person id</span><input data-field="personId" value="${escapeHtml(state.personId)}"></label>
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
    </main>
    ${state.copied ? `<div class="toast">${state.copied}</div>` : ""}
  `;
  wire();
}

function renderProperty(stage) {
  const choice = selected(stage.id);
  return `
    <button class="property" data-action="stage" data-index="${stages.indexOf(stage)}" data-active="${stage.id === activeStage().id}" data-empty="${!choice}">
      <span class="property-swatch">${choice ? swatchFor(stage, choice) : ""}</span>
      <span><small>${stage.title}</small><strong>${choice?.label || "not set"}</strong></span>
    </button>
  `;
}

function renderInstrument(stage) {
  const source = sourcePoint();
  return `
    <svg class="instrument" viewBox="-180 -150 360 300" role="application" aria-label="${stage.question}">
      <defs>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="rgba(0,0,0,0.38)"></feDropShadow>
        </filter>
        ${patternDefs()}
      </defs>
      <g class="mesh">${meshLines()}</g>
      <circle class="ring" cx="0" cy="0" r="56"></circle>
      <circle class="ring outer" cx="0" cy="0" r="122"></circle>
      ${renderCommittedTrail()}
      ${state.drag ? `<line class="drag-line" x1="${source.x}" y1="${source.y}" x2="${state.drag.x.toFixed(1)}" y2="${state.drag.y.toFixed(1)}"></line>` : ""}
      <g class="source" transform="translate(${source.x} ${source.y})">
        ${renderFinalMark("small")}
        <circle class="source-hit" cx="0" cy="0" r="30"></circle>
        <text x="0" y="4" text-anchor="middle">${state.drag ? "drag" : "hold"}</text>
      </g>
      ${stage.options.map((option) => renderOption(stage, option)).join("")}
    </svg>
  `;
}

function renderOption(stage, option) {
  const active = state.hover?.id === option.id;
  const committed = selected(stage.id)?.id === option.id;
  const { x, y } = option.point;
  const anchor = x > 60 ? "start" : x < -60 ? "end" : "middle";
  const labelX = x > 60 ? x + 32 : x < -60 ? x - 32 : x;
  const labelY = y + (Math.abs(x) < 40 ? (y < 0 ? -33 : 40) : 4);
  return `
    <g class="option" data-option="${option.id}" data-active="${active}" data-committed="${committed}" transform="translate(${x} ${y})">
      <circle class="option-hit" cx="0" cy="0" r="34"></circle>
      ${optionGraphic(stage, option, 42)}
      <title>${option.label}: ${option.note}</title>
    </g>
    <text class="option-label" x="${labelX}" y="${labelY}" text-anchor="${anchor}">${option.label}</text>
  `;
}

function optionGraphic(stage, option, size) {
  if (stage.id === "color") return `<circle class="color-node" cx="0" cy="0" r="${size / 2}" style="--node-color:${option.color}"></circle>`;
  if (stage.id === "shape") return shapeMarkup(option.shape, 0, 0, size, `class="shape-node"`);
  return `<g class="texture-node texture-${option.texture}">${textureSwatch(option.texture, size)}</g>`;
}

function renderCommittedTrail() {
  const points = stages.map((stage) => {
    const choice = selected(stage.id);
    return choice ? { ...choice.point, stage, choice } : null;
  }).filter(Boolean);
  if (!points.length) return "";
  return `
    <g class="trail">
      ${points.map((point, index) => index === 0 ? "" : `<line x1="${points[index - 1].x}" y1="${points[index - 1].y}" x2="${point.x}" y2="${point.y}"></line>`).join("")}
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5"></circle>`).join("")}
    </g>
  `;
}

function renderFinalMark(size = "large") {
  const parts = markParts();
  const scale = size === "small" ? 0.46 : 1;
  const shape = parts.shape?.shape || "circle";
  const color = parts.color?.color || "#F1ECE7";
  const markSize = 92 * scale;
  const clipId = `clip-${size}`;
  if (!parts.color && !parts.shape && !parts.texture) {
    return `<svg class="mark ${size}" viewBox="-60 -60 120 120"><circle class="placeholder" cx="0" cy="0" r="${38 * scale}"></circle></svg>`;
  }
  return `
    <svg class="mark ${size}" viewBox="-60 -60 120 120" aria-label="Profile mark">
      <defs><clipPath id="${clipId}">${shapeMarkup(shape, 0, 0, markSize, "")}</clipPath>${patternDefs()}</defs>
      ${shapeMarkup(shape, 0, 0, markSize, `class="mark-fill" style="--mark-color:${color}"`)}
      ${parts.shape && parts.texture ? `<g class="mark-texture texture-${parts.texture.texture}" clip-path="url(#${clipId})">${textureFill(parts.texture.texture, scale)}</g>` : ""}
      ${parts.shape ? shapeMarkup(shape, 0, 0, markSize, `class="mark-outline"`) : ""}
      <circle class="mark-core" cx="0" cy="0" r="${6 * scale}"></circle>
    </svg>
  `;
}

function swatchFor(stage, option) {
  if (stage.id === "color") return `<span class="mini color" style="--node-color:${option.color}"></span>`;
  if (stage.id === "shape") return `<span class="mini shape shape-${option.shape}"></span>`;
  return `<span class="mini texture texture-${option.texture}"></span>`;
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

function textureSwatch(type, size) {
  const half = size / 2;
  if (type === "hatch") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="6"></rect>${Array.from({ length: 6 }, (_, index) => `<line x1="${-half + index * 10}" y1="${half}" x2="${-half + 22 + index * 10}" y2="${-half}"></line>`).join("")}`;
  if (type === "dots") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="6"></rect>${[-9, 0, 9].flatMap((x) => [-9, 0, 9].map((y) => `<circle cx="${x}" cy="${y}" r="2.4"></circle>`)).join("")}`;
  if (type === "split") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="6"></rect><path d="M ${-half} ${half} L ${half} ${-half}"></path><path d="M ${-half} 2 L 2 ${-half}"></path>`;
  return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="6"></rect>`;
}

function textureFill(type, scale = 1) {
  if (type === "hatch") {
    return Array.from({ length: 12 }, (_, index) => {
      const x = -92 + index * 18 * scale;
      return `<line x1="${x}" y1="70" x2="${x + 90 * scale}" y2="-70"></line>`;
    }).join("");
  }
  if (type === "dots") {
    return Array.from({ length: 8 }, (_, row) => Array.from({ length: 9 }, (_, column) => {
      const x = -50 + column * 13 + (row % 2 ? 6 : 0);
      const y = -45 + row * 13;
      return `<circle cx="${x}" cy="${y}" r="${2.8 * scale}"></circle>`;
    }).join("")).join("");
  }
  if (type === "split") return `<rect class="split-a" x="-60" y="-60" width="60" height="120"></rect><rect class="split-b" x="0" y="-60" width="60" height="120"></rect><path d="M -60 36 C -22 8, 18 -4, 60 -31"></path>`;
  return `<rect x="-60" y="-60" width="120" height="120"></rect>`;
}

function patternDefs() {
  return "";
}

function meshLines() {
  const lines = [];
  for (let value = -150; value <= 150; value += 24) {
    lines.push(`<line x1="-168" y1="${value}" x2="168" y2="${value}"></line>`);
    lines.push(`<line x1="${value}" y1="-138" x2="${value}" y2="138"></line>`);
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
    const stageId = activeStage().id;
    state.selections[stageId] = state.hover.id;
    const nextUnset = stages.findIndex((stage, index) => index > state.stage && !selected(stage.id));
    if (nextUnset !== -1) state.stage = nextUnset;
  }
  state.drag = null;
  state.hover = null;
  render();
}

function updateHover(point) {
  state.hover = hitOption(point);
}

function renderHoverOnly() {
  app.querySelectorAll(".option").forEach((item) => {
    item.dataset.active = String(state.hover?.id === item.dataset.option);
  });
}

function onAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "stage") {
    state.stage = Number(event.currentTarget.dataset.index);
    state.drag = null;
    state.hover = null;
    render();
    return;
  }
  if (action === "reset") {
    state.stage = 0;
    state.selections = {};
    state.drag = null;
    state.hover = null;
    render();
    return;
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

window.__markComposer = { state, stages, snapshot, render };
window.addEventListener("pointermove", onWindowPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
render();
