const today = "2026-05-25";

const controls = [
  {
    id: "mode",
    title: "Color",
    prompt: "How should people read your current state?",
    grammar: "color",
    axes: [
      {
        key: "discover",
        label: "Open",
        short: "blue",
        color: "#5FA8FF",
        desc: "Still discovering. Route adjacent examples, people, and context.",
      },
      {
        key: "ship",
        label: "Shipping",
        short: "green",
        color: "#6EE7B7",
        desc: "Actively moving something forward. Route specific blockers and useful proof.",
      },
      {
        key: "help",
        label: "Available",
        short: "amber",
        color: "#FFB454",
        desc: "Available to help others. Route review, pairing, and lightweight asks.",
      },
    ],
  },
  {
    id: "craft",
    title: "Shape",
    prompt: "What kind of contribution should people expect?",
    grammar: "shape",
    axes: [
      {
        key: "engineering",
        label: "Engineering",
        short: "triangle",
        color: "#F7F1EC",
        shape: "triangle",
        desc: "Systems, implementation, architecture, reliability, protocol work.",
      },
      {
        key: "design",
        label: "Design",
        short: "circle",
        color: "#F7F1EC",
        shape: "circle",
        desc: "UX, demos, product surface, information design, visual systems.",
      },
      {
        key: "strategy",
        label: "Strategy",
        short: "diamond",
        color: "#F7F1EC",
        shape: "diamond",
        desc: "Positioning, sequencing, product direction, partner fit, next move.",
      },
      {
        key: "research",
        label: "Research",
        short: "hex",
        color: "#F7F1EC",
        shape: "hex",
        desc: "Assumptions, experiments, mechanism design, paper lineage, proof pressure.",
      },
    ],
  },
  {
    id: "interaction",
    title: "Line",
    prompt: "What kind of interaction are you open to?",
    grammar: "line",
    axes: [
      {
        key: "solo",
        label: "Independent",
        short: "dashed",
        color: "#F7F1EC",
        shape: "dash",
        dash: "10 8",
        desc: "Heads-down or self-directed. Route only high-fit asks and clear blockers.",
      },
      {
        key: "pair",
        label: "Pair",
        short: "solid",
        color: "#F7F1EC",
        shape: "solid",
        dash: "",
        desc: "Live or async pairing with a narrow task and a visible exit condition.",
      },
      {
        key: "review",
        label: "Review",
        short: "dotted",
        color: "#F7F1EC",
        shape: "dot",
        dash: "2 8",
        desc: "Send artifacts for critique: architecture, UX, pitch, assumptions.",
      },
      {
        key: "route",
        label: "Route",
        short: "rail",
        color: "#F7F1EC",
        shape: "rail",
        dash: "14 5 2 5",
        desc: "High-context introductions and lightweight connective tissue.",
      },
    ],
  },
];

const demoState = {
  mode: { discover: 22, ship: 62, help: 16 },
  craft: { engineering: 58, design: 16, strategy: 14, research: 12 },
  interaction: { solo: 55, pair: 10, review: 25, route: 10 },
};

const balancedValues = () => Object.fromEntries(
  controls.map((control) => {
    const base = Math.floor(100 / control.axes.length);
    const remainder = 100 - base * control.axes.length;
    return [
      control.id,
      Object.fromEntries(control.axes.map((axis, index) => [axis.key, base + (index < remainder ? 1 : 0)])),
    ];
  })
);

const emptyValues = () => Object.fromEntries(
  controls.map((control) => [
    control.id,
    Object.fromEntries(control.axes.map((axis) => [axis.key, 0])),
  ])
);

const state = {
  values: balancedValues(),
  active: null,
  hovered: null,
  revealed: false,
  copied: false,
  personId: "your-handle",
  visibility: "cohort-public",
  lineLength: 1,
  pathMode: "both",
  spaceScale: 1,
};

const app = document.querySelector("#app");
let renderQueued = false;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sum(controlId) {
  return Object.values(state.values[controlId]).reduce((total, value) => total + value, 0);
}

function remaining(controlId) {
  return 100 - sum(controlId);
}

function slugify(value) {
  return String(value || "your-handle")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "your-handle";
}

function controlById(id) {
  return controls.find((control) => control.id === id);
}

function axisByKey(control, key) {
  return control.axes.find((axis) => axis.key === key);
}

function axisAngle(index, count) {
  return -Math.PI / 2 + index * Math.PI * 2 / count;
}

function measureSpace() {
  const width = window.innerWidth || 1280;
  const height = window.innerHeight || 800;
  const perceived = (width / 1440) * 0.72 + (height / 880) * 0.28;
  state.spaceScale = clamp(perceived, 0.94, 1.18);
}

function geometryScale() {
  return clamp(state.spaceScale * state.lineLength, 0.76, 1.34);
}

function radii() {
  const scale = geometryScale();
  return {
    min: 12,
    max: clamp(112 * scale, 94, 146),
  };
}

function setAxisValue(controlId, key, requestedValue, options = {}) {
  const values = { ...state.values[controlId] };
  let next = clamp(Math.round(requestedValue));
  const others = Object.keys(values).filter((item) => item !== key);
  const otherTotal = others.reduce((total, item) => total + values[item], 0);

  if (next + otherTotal > 100) {
    const excess = next + otherTotal - 100;
    if (otherTotal > 0) {
      let remainingExcess = excess;
      for (const item of others) {
        const reduction = Math.min(values[item], Math.round(excess * (values[item] / otherTotal)));
        values[item] -= reduction;
        remainingExcess -= reduction;
      }
      while (remainingExcess > 0) {
        const donor = others.find((item) => values[item] > 0);
        if (!donor) break;
        values[donor] -= 1;
        remainingExcess -= 1;
      }
    } else {
      next = 100;
    }
  }

  values[key] = next;
  const overflow = Object.values(values).reduce((total, value) => total + value, 0) - 100;
  if (overflow > 0) values[key] = Math.max(0, values[key] - overflow);

  state.values[controlId] = values;
  state.revealed = false;
  if (options.immediate) render();
  else scheduleRender();
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function point(index, count, value, minRadius = radii().min, maxRadius = radii().max) {
  const angle = axisAngle(index, count);
  const radius = minRadius + (maxRadius - minRadius) * (value / 100);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    angle,
    radius,
  };
}

function valueFromPointer(event, controlId, key) {
  const svg = document.querySelector(`svg[data-control="${controlId}"]`);
  const control = controlById(controlId);
  const index = control.axes.findIndex((axis) => axis.key === key);
  const angle = axisAngle(index, control.axes.length);
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 380 - 190;
  const y = ((event.clientY - rect.top) / rect.height) * 340 - 170;
  const projection = x * Math.cos(angle) + y * Math.sin(angle);
  const currentRadii = radii();
  return clamp(((projection - currentRadii.min) / (currentRadii.max - currentRadii.min)) * 100);
}

function activeAxes(controlId) {
  const control = controlById(controlId);
  return control.axes
    .map((axis) => ({ ...axis, value: state.values[controlId][axis.key] }))
    .filter((axis) => axis.value > 0)
    .sort((a, b) => b.value - a.value);
}

function dominant(controlId) {
  return activeAxes(controlId)[0] || null;
}

function dominantOrFallback(controlId) {
  return dominant(controlId) || { ...controlById(controlId).axes[0], value: 0 };
}

function completion() {
  return Math.round((controls.reduce((total, control) => total + sum(control.id), 0) / 300) * 100);
}

function isComplete() {
  return controls.every((control) => sum(control.id) === 100);
}

function semanticName() {
  if (completion() === 0) return "unformed mark";
  return `${dominantOrFallback("mode").short} ${dominantOrFallback("craft").short} ${dominantOrFallback("interaction").short} line`;
}

function summarySentence() {
  if (completion() === 0) {
    return "Pull a point outward. The final mark will resolve into a color, a shape, and a line behavior.";
  }
  const mode = dominantOrFallback("mode");
  const craft = dominantOrFallback("craft");
  const interaction = dominantOrFallback("interaction");
  return `${mode.label} energy, ${craft.label.toLowerCase()} contribution, ${interaction.label.toLowerCase()} interaction. In shorthand: ${semanticName()}.`;
}

function pathTrail() {
  if (completion() === 0) {
    return [{ type: "start", label: "drag outward", value: 0 }];
  }
  const nodes = [
    { type: "color", label: dominantOrFallback("mode").short, value: dominantOrFallback("mode").value || 0 },
    { type: "shape", label: dominantOrFallback("craft").short, value: dominantOrFallback("craft").value || 0 },
    { type: "line", label: dominantOrFallback("interaction").short, value: dominantOrFallback("interaction").value || 0 },
    ...activeAxes("mode").slice(1, 3).map((axis) => ({ type: "color tint", label: axis.short, value: axis.value })),
    ...activeAxes("craft").slice(1, 3).map((axis) => ({ type: "shape echo", label: axis.short, value: axis.value })),
  ];
  return nodes.filter((node) => node.value > 0);
}

function snapshot() {
  return {
    schema_version: 1,
    updated_at: today,
    person: slugify(state.personId),
    visibility: state.visibility,
    source: "self-declared-demo-one",
    completion: completion(),
    mode_color: { ...state.values.mode },
    contribution_shape: { ...state.values.craft },
    interaction_line: { ...state.values.interaction },
    semantic_mark: {
      name: semanticName(),
      color: dominantOrFallback("mode").short,
      color_hex: dominantOrFallback("mode").color,
      shape: dominantOrFallback("craft").short,
      line: dominantOrFallback("interaction").short,
    },
    path_trail: pathTrail(),
    line_length: Number(state.lineLength.toFixed(2)),
    path_mode: state.pathMode,
    routing_sentence: summarySentence(),
  };
}

function shapePoints(shape, x, y, size) {
  if (shape === "triangle") {
    return `${x},${y - size / 2} ${x + size / 2},${y + size / 2} ${x - size / 2},${y + size / 2}`;
  }
  if (shape === "diamond") {
    return `${x},${y - size / 2} ${x + size / 2},${y} ${x},${y + size / 2} ${x - size / 2},${y}`;
  }
  const sides = shape === "pentagon" ? 5 : 6;
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
    return `${(x + Math.cos(angle) * size / 2).toFixed(1)},${(y + Math.sin(angle) * size / 2).toFixed(1)}`;
  }).join(" ");
}

function shapeMarkup(shape, x, y, size, attrs = "") {
  x = Number(x);
  y = Number(y);
  if (shape === "circle") return `<circle ${attrs} cx="${x}" cy="${y}" r="${size / 2}"></circle>`;
  if (shape === "square") return `<rect ${attrs} x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="4"></rect>`;
  if (shape === "dash" || shape === "solid" || shape === "dot" || shape === "rail") {
    const dash = shape === "dash" ? "10 6" : shape === "dot" ? "1 7" : shape === "rail" ? "12 4 2 4" : "";
    return `<line ${attrs} x1="${x - size / 2}" y1="${y}" x2="${x + size / 2}" y2="${y}" stroke-dasharray="${dash}"></line>`;
  }
  return `<polygon ${attrs} points="${shapePoints(shape, x, y, size)}"></polygon>`;
}

function render() {
  measureSpace();
  const snap = snapshot();
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div>
          <div class="brand-kicker">Demo One</div>
          <h1 class="brand-title">Pull a mark into shape.</h1>
        </div>
      </div>
      <div class="top-actions demo-controls">
        <label class="range-control">
          <span>Spread</span>
          <input type="range" min="70" max="125" value="${Math.round(state.lineLength * 100)}" data-field="lineLength" />
        </label>
        <label class="select-control">
          <span>View</span>
          <select data-field="pathMode">
            ${[
              ["both", "Mark + path"],
              ["shape", "Mark only"],
              ["text", "Path only"],
            ].map(([value, label]) => `<option value="${value}" ${state.pathMode === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <button class="ghost-button" type="button" data-action="seed">${icon("spark")} Example</button>
        <button class="ghost-button" type="button" data-action="reset">${icon("rotate-ccw")} Balance</button>
        <button class="ghost-button quiet-action" type="button" data-action="clear">Clear</button>
        <button class="primary-button" type="button" data-action="reveal" ${isComplete() ? "" : "disabled"}>
          ${icon("eye")} ${state.revealed ? "Mark revealed" : "Reveal mark"}
        </button>
      </div>
    </header>

    <section class="demo-grid" aria-label="Three semantic controls">
      ${controls.map(renderControl).join("")}
    </section>

    <section class="reveal-panel ${state.revealed ? "is-revealed" : ""}" aria-label="Semantic mark reveal">
      <div class="reveal-main">
        <div class="reveal-head">
          <div>
            <div class="micro-label">Semantic mark</div>
            <h2>${snap.semantic_mark.name}</h2>
          </div>
          <div class="completion-badge" data-complete="${isComplete()}">
            <span>${snap.completion}%</span>
            <small>${300 - controls.reduce((total, control) => total + sum(control.id), 0)} points left</small>
          </div>
        </div>
        <div class="reveal-stage" data-mode="${state.pathMode}">
          ${state.pathMode !== "text" ? renderSemanticMark(snap) : ""}
          ${state.pathMode !== "shape" ? renderPathTrail(snap) : ""}
        </div>
      </div>
      <aside class="readout-panel">
        <div class="micro-label">What the mark means</div>
        <p class="readout-sentence">${snap.routing_sentence}</p>
        ${renderHoverInsight()}
        <div class="form-grid">
          <label>
            <span class="field-label">person id</span>
            <input class="text-input" value="${escapeAttr(state.personId)}" data-field="personId" />
          </label>
          <label>
            <span class="field-label">visibility</span>
            <select class="select-input" data-field="visibility">
              ${["cohort-public", "organizer-only", "public"].map((item) => `<option value="${item}" ${item === state.visibility ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="output-actions">
          <button class="primary-button" type="button" data-action="copy">${icon("copy")} Copy JSON</button>
          <button class="ghost-button" type="button" data-action="copy-markdown">${icon("copy")} Copy markdown</button>
        </div>
        <details class="data-drawer">
          <summary>Schema preview</summary>
          <pre class="json-preview">${escapeHtml(JSON.stringify(snap, null, 2))}</pre>
        </details>
      </aside>
    </section>
    ${state.copied ? `<div class="toast" role="status">${state.copied}</div>` : ""}
  `;
  wireEvents();
}

function renderControl(control) {
  const total = sum(control.id);
  const activeDominant = dominant(control.id);
  const controlColor = activeDominant?.color || "#F7F1EC";
  return `
    <article class="control-card grammar-${control.grammar} ${total === 0 ? "is-empty" : ""}" style="--control-color:${controlColor}; --control-rgb:${hexToRgb(controlColor)}">
      <header class="control-head">
        <div>
          <div class="micro-label">${control.title}</div>
          <h2>${control.prompt}</h2>
        </div>
        <div class="budget-meter" aria-label="${control.title} allocation">
          <strong>${total}</strong>
          <span>/100</span>
        </div>
      </header>
      <div class="control-body">
        ${renderRadialAllocator(control)}
        ${renderActiveStack(control)}
      </div>
      <footer class="control-foot">
        <span>${remaining(control.id)} unallocated</span>
        ${renderAllocationStrip(control)}
      </footer>
    </article>
  `;
}

function renderRadialAllocator(control) {
  const currentRadii = radii();
  const values = state.values[control.id];
  const points = control.axes.map((axis, index) => point(index, control.axes.length, values[axis.key], currentRadii.min, currentRadii.max));
  const meshId = `mesh-${control.id}`;
  const activeDominant = dominant(control.id);
  const visualColor = control.grammar === "color" ? activeDominant?.color || "#F7F1EC" : "#F7F1EC";
  return `
    <svg class="allocator grammar-${control.grammar}" data-control="${control.id}" viewBox="-190 -170 380 340" role="img" aria-label="${control.title} radial selector">
      <defs>
        <radialGradient id="glow-${control.id}">
          <stop offset="0%" stop-color="#F7F1EC" stop-opacity="0.16"></stop>
          <stop offset="50%" stop-color="${visualColor}" stop-opacity="${control.grammar === "color" ? "0.26" : "0.13"}"></stop>
          <stop offset="100%" stop-color="${visualColor}" stop-opacity="0"></stop>
        </radialGradient>
        <clipPath id="${meshId}">
          <circle cx="0" cy="0" r="${(currentRadii.max + 20).toFixed(1)}"></circle>
        </clipPath>
      </defs>
      <circle class="allocator-glow" cx="0" cy="0" r="${32 + sum(control.id) * 0.66 * geometryScale()}" fill="url(#glow-${control.id})"></circle>
      <g class="phase-mesh phase-mesh-a" clip-path="url(#${meshId})">${renderMeshLines(currentRadii.max + 14, 28)}</g>
      <g class="phase-mesh phase-mesh-b" clip-path="url(#${meshId})">${renderMeshLines(currentRadii.max + 14, 44)}</g>
      <circle class="grid-ring" cx="0" cy="0" r="${(currentRadii.max * 0.36).toFixed(1)}"></circle>
      <circle class="grid-ring" cx="0" cy="0" r="${(currentRadii.max * 0.68).toFixed(1)}"></circle>
      <circle class="grid-ring" cx="0" cy="0" r="${currentRadii.max.toFixed(1)}"></circle>
      ${control.grammar === "color" && sum(control.id) > 0 ? `<polygon class="color-radar" points="${points.map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ")}"></polygon>` : ""}
      ${control.grammar === "shape" && sum(control.id) > 0 ? renderShapeMix(control, currentRadii) : ""}
      ${control.axes.map((axis, index) => {
        const outer = point(index, control.axes.length, 100, currentRadii.min, currentRadii.max);
        const handle = points[index];
        const active = state.hovered?.controlId === control.id && state.hovered?.key === axis.key;
        return `
          <line class="axis-spoke ${active ? "is-hot" : ""}" x1="0" y1="0" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}"></line>
          <text class="axis-label" x="${(outer.x * 1.17).toFixed(1)}" y="${(outer.y * 1.17).toFixed(1)}" text-anchor="${outer.x < -8 ? "end" : outer.x > 8 ? "start" : "middle"}">${axis.label}</text>
          <g class="axis-handle ${active ? "is-hot" : ""}" tabindex="0" role="slider"
            aria-label="${axis.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${values[axis.key]}"
            data-control="${control.id}" data-key="${axis.key}">
            <title>${axis.desc}</title>
            <line class="value-spoke" style="--axis-color:${axis.color}" x1="0" y1="0" x2="${handle.x.toFixed(1)}" y2="${handle.y.toFixed(1)}"></line>
            ${renderHandleMark(control, axis, handle.x, handle.y, values[axis.key])}
            ${values[axis.key] > 0 ? `<text class="handle-value" x="${handle.x.toFixed(1)}" y="${(handle.y + 28).toFixed(1)}" text-anchor="middle">${values[axis.key]}</text>` : ""}
          </g>
        `;
      }).join("")}
      <circle class="center-pin" cx="0" cy="0" r="5"></circle>
      ${sum(control.id) === 0 ? `<text class="center-hint" x="0" y="24" text-anchor="middle">drag outward</text>` : ""}
    </svg>
  `;
}

function renderHandleMark(control, axis, x, y, value) {
  const maxSize = control.grammar === "shape" ? 58 : control.grammar === "color" ? 46 : 34;
  const growth = control.grammar === "shape" ? 0.46 : control.grammar === "color" ? 0.32 : 0.2;
  const size = clamp(12 + value * growth, 12, maxSize);
  if (control.grammar === "color") {
    return `
      <circle class="handle-shape handle-color" style="--axis-color:${axis.color}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size / 2).toFixed(1)}"></circle>
      <circle class="handle-aura" style="--axis-color:${axis.color}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.86).toFixed(1)}"></circle>
    `;
  }
  if (control.grammar === "line") {
    return `
      <circle class="handle-shape handle-line-dot" style="--axis-color:${axis.color}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size / 2.9).toFixed(1)}"></circle>
      <line class="handle-line-preview preview-${axis.shape}" x1="${(x - size * 0.54).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + size * 0.54).toFixed(1)}" y2="${y.toFixed(1)}"></line>
    `;
  }
  return shapeMarkup(axis.shape, x.toFixed(1), y.toFixed(1), size, `class="handle-shape handle-neutral" style="--axis-color:${axis.color}"`);
}

function renderShapeMix(control, currentRadii) {
  const values = state.values[control.id];
  return `
    <g class="shape-mix" aria-hidden="true">
      ${control.axes.map((axis, index) => {
        const value = values[axis.key];
        if (value <= 0) return "";
        const mixPoint = point(index, control.axes.length, value * 0.5, 0, currentRadii.max * 0.7);
        const size = clamp(28 + value * 0.76, 30, 84);
        return shapeMarkup(axis.shape, mixPoint.x.toFixed(1), mixPoint.y.toFixed(1), size, `class="mix-shape shape-${axis.shape}" style="--mix-alpha:${clamp(0.16 + value / 180, 0.18, 0.62)}"`);
      }).join("")}
    </g>
  `;
}

function renderActiveStack(control) {
  const active = control.axes.map((axis) => ({ ...axis, value: state.values[control.id][axis.key] }));
  return `
    <div class="active-stack option-stack" data-empty="${active.every((axis) => axis.value === 0)}">
      ${active.map((axis) => `
        <button class="axis-row" type="button" data-action="nudge" data-control="${control.id}" data-key="${axis.key}"
          data-hover-control="${control.id}" data-hover-key="${axis.key}" data-active="${axis.value > 0}" style="--axis-color:${axis.color}; --axis-value:${axis.value}%">
          ${renderAxisToken(control, axis)}
          <span class="axis-copy">
            <strong>${axis.label}</strong>
          </span>
          <span class="axis-bar" aria-hidden="true"><span></span></span>
          <span class="axis-number">${axis.value}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderAllocationStrip(control) {
  const values = state.values[control.id];
  const total = sum(control.id);
  return `
    <div class="budget-track allocation-strip" aria-hidden="true">
      ${control.axes.map((axis) => {
        const value = values[axis.key];
        const color = control.grammar === "color" ? axis.color : "rgba(247, 241, 236, 0.74)";
        return `<span class="allocation-segment" style="width:${value}%; --segment-color:${color}"></span>`;
      }).join("")}
      ${total < 100 ? `<span class="allocation-segment is-empty" style="width:${100 - total}%"></span>` : ""}
    </div>
  `;
}

function renderAxisToken(control, axis) {
  if (control.grammar === "color") {
    return `<span class="axis-token color-token" style="--axis-color:${axis.color}"></span>`;
  }
  if (control.grammar === "line") {
    return `<span class="axis-token line-token shape-${axis.shape}" style="--axis-color:${axis.color}"></span>`;
  }
  return `<span class="axis-token neutral-token shape-${axis.shape}" style="--axis-color:${axis.color}"></span>`;
}

function renderSemanticMark(snap) {
  const mode = dominantOrFallback("mode");
  const craft = dominantOrFallback("craft");
  const interaction = dominantOrFallback("interaction");
  const secondary = [...activeAxes("mode").slice(1, 3), ...activeAxes("craft").slice(1, 3)];
  const size = 150 * geometryScale();
  const clipId = "semantic-clip";
  return `
    <svg class="semantic-svg" viewBox="-230 -170 460 340" role="img" aria-label="${snap.semantic_mark.name}">
      <defs>
        <filter id="markGlow">
          <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
          <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
        </filter>
        <clipPath id="${clipId}">
          ${shapeMarkup(craft.shape, 0, 0, size, "")}
        </clipPath>
      </defs>
      <g class="semantic-field">
        <line class="semantic-guide" x1="${-172 * geometryScale()}" y1="${96 * geometryScale()}" x2="${172 * geometryScale()}" y2="${-96 * geometryScale()}"></line>
        <line class="semantic-guide ghost" x1="${-150 * geometryScale()}" y1="${-72 * geometryScale()}" x2="${150 * geometryScale()}" y2="${72 * geometryScale()}"></line>
        ${secondary.map((axis, index) => `
          <circle class="semantic-echo" cx="${-120 + index * 80}" cy="${118 - index * 18}" r="${Math.max(8, axis.value / 2)}" style="--echo:${axis.color}"></circle>
        `).join("")}
        ${shapeMarkup(craft.shape, 0, 0, size, `class="semantic-mark" style="--mark-color:${mode.color}; --mark-line:${interaction.dash || "none"}"`)}
        <g class="mark-pattern pattern-${interaction.shape}" clip-path="url(#${clipId})">
          ${renderMarkPattern(interaction, size)}
        </g>
        <circle class="semantic-core" cx="0" cy="0" r="7"></circle>
      </g>
    </svg>
  `;
}

function renderMarkPattern(interaction, size) {
  const extent = size * 0.72;
  if (interaction.shape === "solid") {
    return `<line x1="${-extent}" y1="0" x2="${extent}" y2="0"></line>`;
  }
  if (interaction.shape === "dot") {
    return Array.from({ length: 18 }, (_, index) => {
      const x = -extent + index * (extent * 2 / 17);
      const y = Math.sin(index * 1.15) * size * 0.16;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.018).toFixed(1)}"></circle>`;
    }).join("");
  }
  if (interaction.shape === "rail") {
    return `
      <line class="rail-main" x1="${-extent}" y1="${-size * 0.18}" x2="${extent}" y2="${size * 0.18}"></line>
      <line class="rail-tie" x1="${-extent}" y1="${size * 0.18}" x2="${extent}" y2="${-size * 0.18}"></line>
    `;
  }
  return Array.from({ length: 9 }, (_, index) => {
    const offset = -size * 0.46 + index * (size * 0.115);
    return `<line x1="${(-extent).toFixed(1)}" y1="${(offset + size * 0.34).toFixed(1)}" x2="${extent.toFixed(1)}" y2="${(offset - size * 0.34).toFixed(1)}"></line>`;
  }).join("");
}

function renderMeshLines(radius, step) {
  const lines = [];
  for (let value = -radius; value <= radius; value += step) {
    lines.push(`<line x1="${(-radius).toFixed(1)}" y1="${value.toFixed(1)}" x2="${radius.toFixed(1)}" y2="${value.toFixed(1)}"></line>`);
    lines.push(`<line x1="${value.toFixed(1)}" y1="${(-radius).toFixed(1)}" x2="${value.toFixed(1)}" y2="${radius.toFixed(1)}"></line>`);
  }
  return lines.join("");
}

function renderPathTrail(snap) {
  return `
    <div class="path-trail" aria-label="Text path trail">
      <div class="micro-label">Path text</div>
      <div class="trail-line">
        ${snap.path_trail.map((node, index) => `
          <span class="trail-node">
            <strong>${node.type}</strong>
            <span>${node.label} ${node.value}</span>
          </span>
          ${index < snap.path_trail.length - 1 ? `<span class="trail-separator">▸</span>` : ""}
        `).join("")}
      </div>
    </div>
  `;
}

function renderHoverInsight() {
  if (!state.hovered) {
    return `
      <div class="hover-insight">
        <div class="micro-label">Guide</div>
        <p>Drag from the center. Each control has 100 points; the farthest pull becomes the visible color, shape, or line.</p>
      </div>
    `;
  }
  const control = controlById(state.hovered.controlId);
  const axis = axisByKey(control, state.hovered.key);
  return `
    <div class="hover-insight is-active" style="--axis-color:${axis.color}">
      <div class="micro-label">${control.title}</div>
      <h3>${axis.label}</h3>
      <p>${axis.desc}</p>
    </div>
  `;
}

function wireEvents() {
  app.querySelectorAll("[data-action]").forEach((item) => item.addEventListener("click", onAction));
  app.querySelectorAll("[data-field]").forEach((item) => {
    item.addEventListener("input", onField);
    item.addEventListener("change", onField);
  });
  app.querySelectorAll("[data-hover-control]").forEach((item) => {
    item.addEventListener("pointerenter", () => setHover(item.dataset.hoverControl, item.dataset.hoverKey));
    item.addEventListener("focus", () => setHover(item.dataset.hoverControl, item.dataset.hoverKey));
    item.addEventListener("pointerleave", clearHover);
    item.addEventListener("blur", clearHover);
  });
  app.querySelectorAll(".axis-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", onHandleDown);
    handle.addEventListener("pointerenter", () => setHover(handle.dataset.control, handle.dataset.key));
    handle.addEventListener("focus", () => setHover(handle.dataset.control, handle.dataset.key));
    handle.addEventListener("pointerleave", clearHover);
    handle.addEventListener("blur", clearHover);
    handle.addEventListener("keydown", onHandleKey);
  });
}

function setHover(controlId, key) {
  state.hovered = { controlId, key };
  renderHoverOnly();
}

function clearHover() {
  state.hovered = null;
  renderHoverOnly();
}

function renderHoverOnly() {
  const insight = app.querySelector(".hover-insight");
  if (!insight) return;
  const next = document.createElement("div");
  next.innerHTML = renderHoverInsight();
  insight.replaceWith(next.firstElementChild);
  app.querySelectorAll(".axis-row, .axis-handle, .axis-spoke").forEach((item) => item.classList.remove("is-hot"));
  if (state.hovered) {
    app.querySelectorAll(`[data-control="${state.hovered.controlId}"][data-key="${state.hovered.key}"], [data-hover-control="${state.hovered.controlId}"][data-hover-key="${state.hovered.key}"]`).forEach((item) => item.classList.add("is-hot"));
  }
}

function onHandleDown(event) {
  const handle = event.currentTarget;
  state.active = { controlId: handle.dataset.control, key: handle.dataset.key };
  setHover(handle.dataset.control, handle.dataset.key);
  handle.setPointerCapture(event.pointerId);
  setAxisValue(state.active.controlId, state.active.key, valueFromPointer(event, state.active.controlId, state.active.key), { immediate: true });
}

function onHandleKey(event) {
  const controlId = event.currentTarget.dataset.control;
  const key = event.currentTarget.dataset.key;
  const step = event.shiftKey ? 10 : 5;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") {
    event.preventDefault();
    setAxisValue(controlId, key, state.values[controlId][key] + step);
  }
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
    event.preventDefault();
    setAxisValue(controlId, key, state.values[controlId][key] - step);
  }
}

window.addEventListener("pointermove", (event) => {
  if (!state.active) return;
  setAxisValue(state.active.controlId, state.active.key, valueFromPointer(event, state.active.controlId, state.active.key));
});

window.addEventListener("pointerup", () => {
  state.active = null;
});

function onAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "reset") {
    state.values = balancedValues();
    state.revealed = false;
    state.hovered = null;
    render();
    return;
  }
  if (action === "clear") {
    state.values = emptyValues();
    state.revealed = false;
    state.hovered = null;
    render();
    return;
  }
  if (action === "seed") {
    state.values = JSON.parse(JSON.stringify(demoState));
    state.revealed = false;
    render();
    return;
  }
  if (action === "reveal" && isComplete()) {
    state.revealed = true;
    render();
    return;
  }
  if (action === "nudge") {
    const controlId = event.currentTarget.dataset.control;
    const key = event.currentTarget.dataset.key;
    setAxisValue(controlId, key, state.values[controlId][key] + 10, { immediate: true });
    return;
  }
  if (action === "copy") copyText(JSON.stringify(snapshot(), null, 2), "JSON copied.");
  if (action === "copy-markdown") copyText(buildMarkdown(snapshot()), "Markdown copied.");
}

function onField(event) {
  const field = event.currentTarget.dataset.field;
  if (field === "lineLength") {
    state.lineLength = Number(event.currentTarget.value) / 100;
    render();
    return;
  }
  state[field] = event.currentTarget.value;
  if (field === "pathMode") {
    render();
    return;
  }
  const preview = app.querySelector(".json-preview");
  if (preview) preview.textContent = JSON.stringify(snapshot(), null, 2);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    state.copied = message;
    render();
    setTimeout(() => {
      state.copied = false;
      render();
    }, 1400);
  } catch {
    state.copied = "Clipboard unavailable.";
    render();
  }
}

function buildMarkdown(snap) {
  return `---
record_id: ${snap.person}-${today}-demo-one
record_type: preference_snapshot
person: ${snap.person}
schema_version: ${snap.schema_version}
updated_at: "${snap.updated_at}"
visibility: ${snap.visibility}
source: ${snap.source}
completion: ${snap.completion}
mode_color:
${yamlMap(snap.mode_color)}
contribution_shape:
${yamlMap(snap.contribution_shape)}
interaction_line:
${yamlMap(snap.interaction_line)}
semantic_mark:
  name: ${yamlScalar(snap.semantic_mark.name)}
  color: ${yamlScalar(snap.semantic_mark.color)}
  shape: ${yamlScalar(snap.semantic_mark.shape)}
  line: ${yamlScalar(snap.semantic_mark.line)}
---

# ${snap.person} demo one semantic mark

${snap.routing_sentence}
`;
}

function yamlMap(obj) {
  return Object.entries(obj).map(([key, value]) => `  ${key}: ${value}`).join("\n");
}

function yamlScalar(value) {
  const text = String(value ?? "");
  if (/^[a-z0-9_-]+$/i.test(text)) return text;
  return JSON.stringify(text);
}

function hexToRgb(hex) {
  const value = String(hex).replace("#", "");
  const num = Number.parseInt(value, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function icon(name) {
  const paths = {
    "rotate-ccw": `<path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 3-5.7"/>`,
    copy: `<rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/>`,
    spark: `<path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/>`,
    eye: `<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>`,
  };
  return `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

render();
