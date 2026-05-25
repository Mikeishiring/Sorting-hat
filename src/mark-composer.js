const today = "2026-05-25";

const stages = [
  {
    id: "color",
    eyebrow: "pass 1",
    title: "color read",
    question: "How should the cohort read you?",
    help: "Start in the center and pull outward. The first ring sets fill color only.",
    options: [
      option("open", "Open", "blue", { x: 0, y: -104 }, { color: "#64A7FF", note: "Open-ended, still forming, useful for exploration." }),
      option("shipping", "Shipping", "green", { x: 104, y: 52 }, { color: "#55D88A", note: "Actively moving work forward." }),
      option("available", "Available", "amber", { x: 0, y: 104 }, { color: "#F4B860", note: "Available to help, review, or route." }),
      option("focused", "Focused", "violet", { x: -104, y: 0 }, { color: "#A78BFA", note: "Protecting depth or narrowing surface area." }),
    ],
  },
  {
    id: "shape",
    eyebrow: "pass 2",
    title: "shape role",
    question: "What kind of contribution should people expect?",
    help: "The second ring sets geometry only.",
    options: [
      option("engineering", "Engineering", "triangle", { x: 0, y: -112 }, { shape: "triangle", note: "Systems, infra, implementation." }),
      option("design", "Design", "circle", { x: 112, y: 0 }, { shape: "circle", note: "UX, demos, visual language." }),
      option("strategy", "Strategy", "diamond", { x: 0, y: 112 }, { shape: "diamond", note: "Positioning, sequencing, product direction." }),
      option("research", "Research", "hex", { x: -112, y: 0 }, { shape: "hex", note: "Assumptions, experiments, proof pressure." }),
      option("ops", "Ops", "square", { x: -112, y: 0 }, { shape: "square", note: "Coordination, stewardship, cadence, community surface." }),
      option("gtm", "GTM", "pentagon", { x: -112, y: 0 }, { shape: "pentagon", note: "Users, partners, narrative, market proof." }),
    ],
  },
  {
    id: "texture",
    eyebrow: "pass 3",
    title: "surface mode",
    question: "How should people approach you?",
    help: "The outer ring sets the interior surface only.",
    options: [
      option("direct", "Direct", "solid", { x: 0, y: -112 }, { texture: "solid", note: "Direct asks are welcome." }),
      option("pair", "Pair", "hatch", { x: 112, y: 0 }, { texture: "hatch", note: "Open to paired work." }),
      option("review", "Review", "dots", { x: 0, y: 112 }, { texture: "dots", note: "Open to critique and checks." }),
      option("route", "Route", "split", { x: -112, y: 0 }, { texture: "split", note: "Open to intros and context." }),
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
  profileStatus: "loading",
  profilePeople: [],
  profilePerson: "",
};
let renderQueued = false;

const app = document.querySelector("#app");
const viewBox = {
  x: -250,
  y: -190,
  width: 500,
  height: 380,
};
const layerRadii = {
  color: 66,
  shape: 120,
  texture: 174,
};
const layerLabels = {
  color: "color",
  shape: "shape",
  texture: "surface",
};

function option(id, label, value, point, extra = {}) {
  return { id, label, value, point, ...extra };
}

function activeStage() {
  return stages[state.stage];
}

function selected(stageId) {
  const stage = stages.find((item) => item.id === stageId);
  return stage?.options.find((item) => item.id === state.selections[stageId]) || null;
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

function isComplete() {
  return stages.every((stage) => selected(stage.id));
}

function currentProfile() {
  return state.profilePeople.find((person) => person.id === state.profilePerson) || state.profilePeople[0] || null;
}

function profileSuggestion(profile = currentProfile()) {
  if (!profile) return null;
  const haystack = [
    profile.role,
    profile.domain,
    profile.now,
    profile.weekly_intention,
    profile.availability_pref,
    ...(profile.skill_areas || []),
    ...(profile.skills || []),
    ...(profile.offering || []),
    ...(profile.seeking || []),
    ...(profile.contribute_interests || []),
  ].join(" ").toLowerCase();
  const has = (...terms) => terms.some((term) => haystack.includes(term));
  const color = has("heads-down", "focus", "protect") ? "focused"
    : has("ship", "prototype", "unblock", "implementation") ? "shipping"
      : has("review", "help", "office", "routing", "intro") ? "available"
        : "open";
  const shape = has("design", "ux", "interface", "surface") ? "design"
    : has("engineering", "tee", "infra", "protocol", "runtime", "implementation") ? "engineering"
      : has("research", "mechanism", "proof", "experiment") ? "research"
        : has("strategy", "product", "positioning", "scope") ? "strategy"
          : has("ops", "community", "coordination", "steward") ? "ops"
            : has("gtm", "bd", "users", "partners", "market") ? "gtm"
              : "engineering";
  const texture = has("pair", "live block", "live pair") ? "pair"
    : has("review", "critique", "pr", "architecture") ? "review"
      : has("intro", "route", "office hours", "community") ? "route"
        : "direct";
  return { color, shape, texture };
}

function combinedRoutingSentence(profile = currentProfile()) {
  const parts = markParts();
  if (!profile || !isComplete()) return "";
  const evidence = [
    profile.weekly_intention,
    profile.availability_pref,
    (profile.contribute_interests || []).slice(0, 2).join(", "),
  ].filter(Boolean).join("; ");
  return `Use the ${parts.name} mark with ${profile.name || profile.id}'s profile evidence: ${evidence}.`;
}

function slugify(value) {
  return String(value || "your-handle").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-handle";
}

function localPoint(event, svg) {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x,
    y: ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y,
  };
}

function hitOption(point, stage = activeStage()) {
  return stage.options.find((item) => {
    const target = optionPoint(stage, item);
    return Math.hypot(point.x - target.x, point.y - target.y) < 34;
  }) || null;
}

function hitAnyLayer(point, maxStageIndex = stages.length - 1) {
  let nearest = null;
  stages.forEach((stage, stageIndex) => {
    if (stageIndex > maxStageIndex) return;
    stage.options.forEach((item) => {
      const target = optionPoint(stage, item);
      const distance = Math.hypot(point.x - target.x, point.y - target.y);
      if (distance < 34 && (!nearest || distance < nearest.distance)) {
        nearest = { stage, stageIndex, item, distance };
      }
    });
  });
  return nearest;
}

function snapshot() {
  const parts = markParts();
  const profile = currentProfile();
  const suggestion = profileSuggestion(profile);
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
    profile_context: profile ? {
      source: "data/profile-context.json",
      matched_person: profile.id,
      source_status: state.profileStatus,
      evidence_fields: {
        now: profile.now || "",
        weekly_intention: profile.weekly_intention || "",
        availability_pref: profile.availability_pref || "",
        contribute_interests: profile.contribute_interests || [],
        skill_areas: profile.skill_areas || [],
        offering: profile.offering || [],
        seeking: profile.seeking || [],
      },
      suggested_mark: suggestion,
      combined_routing_sentence: combinedRoutingSentence(profile),
    } : null,
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
          <h1>One mark, three layers</h1>
          <p>${stage.question} ${stage.help}</p>
        </div>
        ${renderInstrument()}
      </section>

      <aside class="readout">
        <span class="kicker">live mark</span>
        <h2>${snap.routing_mark.name}</h2>
        ${renderFinalMark("large")}
        <p>${sentence()}</p>
        <div class="property-list">${stages.map(renderProperty).join("")}</div>
        ${renderProfileCombine(snap)}
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

function renderProfileCombine(snap) {
  const profile = currentProfile();
  const suggestion = profileSuggestion(profile);
  const locked = !isComplete();
  return `
    <section class="profile-combine" data-locked="${locked}">
      <div>
        <span class="kicker">profile context</span>
        <p>${locked ? "Complete the three visual layers, then combine the mark with profile evidence." : "Combine the visual mark with cohort profile fields at reveal."}</p>
      </div>
      <label>
        <span class="field-label">source person</span>
        <select data-field="profilePerson" ${state.profilePeople.length ? "" : "disabled"}>
          ${state.profilePeople.length ? state.profilePeople.map((person) => `<option value="${person.id}" ${person.id === (profile?.id || "") ? "selected" : ""}>${person.name || person.id}</option>`).join("") : `<option>${state.profileStatus}</option>`}
        </select>
      </label>
      ${profile ? `<div class="profile-evidence">
        <strong>${escapeHtml(profile.weekly_intention || profile.now || "profile evidence pending")}</strong>
        <span>${escapeHtml([profile.availability_pref, (profile.contribute_interests || []).slice(0, 2).join(", ")].filter(Boolean).join(" / "))}</span>
      </div>` : ""}
      ${suggestion ? `<div class="profile-suggestion">
        <span>${suggestion.color}</span><span>${suggestion.shape}</span><span>${suggestion.texture}</span>
      </div>` : ""}
      <button class="btn" data-action="apply-profile" ${profile ? "" : "disabled"}>Seed from profile</button>
      ${isComplete() && profile ? `<p class="combined-sentence">${escapeHtml(snap.profile_context.combined_routing_sentence)}</p>` : ""}
    </section>
  `;
}

function renderInstrument() {
  const parts = markParts();
  const hasMark = !!(parts.color || parts.shape || parts.texture);
  return `
    <svg class="instrument" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" role="application" aria-label="Three layer profile mark composer">
      <defs>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="rgba(0,0,0,0.38)"></feDropShadow>
        </filter>
      </defs>
      <g class="mesh">${meshLines()}</g>
      <g class="axis-guides">${axisGuides()}</g>
      ${stages.map(renderLayerRing).join("")}
      ${renderCommittedTrail()}
      ${state.drag ? renderDragProbe() : ""}
      <g class="source">
        ${renderFinalMark("small")}
        <circle class="source-hit" cx="0" cy="0" r="30"></circle>
        ${hasMark ? "" : `<text x="0" y="4" text-anchor="middle">${state.drag ? "drag" : "hold"}</text>`}
      </g>
      ${stages.map(renderLayerOptions).join("")}
    </svg>
  `;
}

function renderLayerRing(stage, index) {
  const active = stage.id === activeStage().id;
  const filled = !!selected(stage.id) || !!state.drag?.path?.[stage.id];
  return `
    <g class="layer-ring" data-layer="${stage.id}" data-active="${active}" data-filled="${filled}">
      <circle cx="0" cy="0" r="${layerRadii[stage.id]}"></circle>
      <text x="${-layerRadii[stage.id] - 9}" y="${-layerRadii[stage.id] - 6}" text-anchor="end">${index + 1} ${layerLabels[stage.id]}</text>
    </g>
  `;
}

function renderLayerOptions(stage) {
  return stage.options.map((item) => renderOption(stage, item)).join("");
}

function renderOption(stage, item) {
  const stageIndex = stages.indexOf(stage);
  const active = state.hover?.stageId === stage.id && state.hover?.id === item.id;
  const previewed = state.drag?.path?.[stage.id] === item.id;
  const committed = selected(stage.id)?.id === item.id;
  const current = stage.id === activeStage().id;
  const available = stageIndex <= state.stage || committed || previewed;
  const { x, y } = optionPoint(stage, item);
  const label = optionLabelPoint(stage, x, y, layerRadii[stage.id]);
  return `
    <g class="option" data-option="${item.id}" data-layer="${stage.id}" data-current="${current}" data-active="${active}" data-preview="${previewed}" data-committed="${committed}" data-available="${available}" transform="translate(${x} ${y})">
      <circle class="option-hit" cx="0" cy="0" r="34"></circle>
      ${optionGraphic(stage, item, current || committed || previewed ? 34 : 26)}
      <title>${item.label}: ${item.note}</title>
    </g>
    <text class="option-label" data-current="${current}" data-preview="${previewed}" data-committed="${committed}" data-available="${available}" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${item.label}</text>
  `;
}

function optionPoint(stage, item) {
  const index = stage.options.findIndex((option) => option.id === item.id);
  const count = stage.options.length;
  const angle = optionAngle(stage, item);
  const radius = layerRadii[stage.id];
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function optionAngle(stage, item) {
  const index = stage.options.findIndex((option) => option.id === item.id);
  if (stage.id === "shape") {
    const degrees = {
      engineering: -90,
      design: 0,
      strategy: 55,
      research: 115,
      ops: 180,
      gtm: -145,
    };
    return (degrees[item.id] ?? 0) * Math.PI / 180;
  }
  return -Math.PI / 2 + index * Math.PI * 2 / stage.options.length;
}

function angleDelta(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function nearestByAngle(stage, point) {
  const angle = Math.atan2(point.y, point.x);
  return stage.options.reduce((nearest, item) => {
    const distance = angleDelta(angle, optionAngle(stage, item));
    return !nearest || distance < nearest.distance ? { item, distance } : nearest;
  }, null)?.item || null;
}

function optionLabelPoint(stage, x, y, radius) {
  const labelOffsets = {
    color: -18,
    shape: 21,
    texture: 29,
  };
  const distance = radius + labelOffsets[stage.id];
  const angle = Math.atan2(y, x);
  const labelX = Math.cos(angle) * distance;
  const labelY = Math.sin(angle) * distance + 3;
  const anchor = labelX > 16 ? "start" : labelX < -16 ? "end" : "middle";
  return { x: labelX, y: labelY, anchor };
}

function optionGraphic(stage, item, size) {
  if (stage.id === "color") return `<circle class="color-node" cx="0" cy="0" r="${size / 2}" style="--node-color:${item.color}"></circle>`;
  if (stage.id === "shape") return shapeMarkup(item.shape, 0, 0, size, `class="shape-node"`);
  return `<g class="texture-node texture-${item.texture}">${textureSwatch(item.texture, size)}</g>`;
}

function renderCommittedTrail() {
  const points = stages.map((stage) => {
    const choice = stage.options.find((item) => item.id === state.drag?.path?.[stage.id]) || selected(stage.id);
    return choice ? optionPoint(stage, choice) : null;
  }).filter(Boolean);
  if (!points.length) return "";
  return `
    <g class="trail">
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5"></circle>`).join("")}
    </g>
  `;
}

function axisGuides() {
  const outer = layerRadii.texture;
  const gaps = [
    [layerRadii.color + 26, layerRadii.shape - 24],
    [layerRadii.shape + 26, layerRadii.texture - 24],
  ];
  return [0, 1, 2, 3].flatMap((index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 2;
    return gaps.map(([inner, outerGap]) => {
      const x1 = Math.cos(angle) * inner;
      const y1 = Math.sin(angle) * inner;
      const x2 = Math.cos(angle) * outerGap;
      const y2 = Math.sin(angle) * outerGap;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>`;
    });
  }).join("") + [0, 1, 2, 3].map((index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 2;
    const x = Math.cos(angle) * outer;
    const y = Math.sin(angle) * outer;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"></circle>`;
  }).join("");
}

function renderDragProbe() {
  const x = state.drag.x.toFixed(1);
  const y = state.drag.y.toFixed(1);
  return `
    <g class="drag-probe" transform="translate(${x} ${y})">
      <circle r="7"></circle>
      <circle r="15"></circle>
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
  if (size === "small") return renderInlineMark(parts, shape, color, markSize, clipId, scale);
  if (!parts.color && !parts.shape && !parts.texture) {
    return `<svg class="mark ${size}" viewBox="-60 -60 120 120"><circle class="placeholder" cx="0" cy="0" r="${38 * scale}"></circle></svg>`;
  }
  return `
    <svg class="mark ${size}" viewBox="-60 -60 120 120" aria-label="Profile mark">
      <defs><clipPath id="${clipId}">${shapeMarkup(shape, 0, 0, markSize, "")}</clipPath></defs>
      ${shapeMarkup(shape, 0, 0, markSize, `class="mark-fill" style="--mark-color:${color}"`)}
      ${parts.shape && parts.texture ? `<g class="mark-texture texture-${parts.texture.texture}" clip-path="url(#${clipId})">${textureFill(parts.texture.texture, scale)}</g>` : ""}
      ${parts.shape ? shapeMarkup(shape, 0, 0, markSize, `class="mark-outline"`) : ""}
      <circle class="mark-core" cx="0" cy="0" r="${6 * scale}"></circle>
    </svg>
  `;
}

function renderInlineMark(parts, shape, color, markSize, clipId, scale) {
  if (!parts.color && !parts.shape && !parts.texture) {
    return `<g class="mark-inline small"><circle class="placeholder" cx="0" cy="0" r="${38 * scale}"></circle></g>`;
  }
  return `
    <g class="mark-inline small" aria-label="Profile mark">
      <defs><clipPath id="${clipId}">${shapeMarkup(shape, 0, 0, markSize, "")}</clipPath></defs>
      ${shapeMarkup(shape, 0, 0, markSize, `class="mark-fill" style="--mark-color:${color}"`)}
      ${parts.shape && parts.texture ? `<g class="mark-texture texture-${parts.texture.texture}" clip-path="url(#${clipId})">${textureFill(parts.texture.texture, scale)}</g>` : ""}
      ${parts.shape ? shapeMarkup(shape, 0, 0, markSize, `class="mark-outline"`) : ""}
      <circle class="mark-core" cx="0" cy="0" r="${6 * scale}"></circle>
    </g>
  `;
}

function swatchFor(stage, item) {
  if (stage.id === "color") return `<span class="mini color" style="--node-color:${item.color}"></span>`;
  if (stage.id === "shape") return `<span class="mini shape shape-${item.shape}"></span>`;
  return `<span class="mini texture texture-${item.texture}"></span>`;
}

function shapeMarkup(shape, x, y, size, attrs = "") {
  if (shape === "circle") return `<circle ${attrs} cx="${x}" cy="${y}" r="${size / 2}"></circle>`;
  if (shape === "square") return `<rect ${attrs} x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="${size * 0.08}"></rect>`;
  if (shape === "triangle") return `<polygon ${attrs} points="${x},${y - size / 2} ${x + size / 2},${y + size / 2} ${x - size / 2},${y + size / 2}"></polygon>`;
  if (shape === "diamond") return `<polygon ${attrs} points="${x},${y - size / 2} ${x + size / 2},${y} ${x},${y + size / 2} ${x - size / 2},${y}"></polygon>`;
  const sides = shape === "pentagon" ? 5 : 6;
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
    return `${(x + Math.cos(angle) * size / 2).toFixed(1)},${(y + Math.sin(angle) * size / 2).toFixed(1)}`;
  }).join(" ");
  return `<polygon ${attrs} points="${points}"></polygon>`;
}

function textureSwatch(type, size) {
  const half = size / 2;
  if (type === "hatch") return `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="6"></rect>${[-13, -3, 7, 17].map((x) => `<line x1="${x - 8}" y1="${half - 3}" x2="${x + 8}" y2="${-half + 3}"></line>`).join("")}`;
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

function meshLines() {
  const lines = [];
  for (let value = -240; value <= 240; value += 24) {
    lines.push(`<line x1="-232" y1="${value}" x2="232" y2="${value}"></line>`);
    lines.push(`<line x1="${value}" y1="-176" x2="${value}" y2="176"></line>`);
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
  if (Math.hypot(point.x, point.y) > 42) {
    const hit = hitAnyLayer(point, state.stage);
    if (hit) {
      state.selections[hit.stage.id] = hit.item.id;
      const nextUnset = stages.findIndex((stage) => !state.selections[stage.id]);
      state.stage = nextUnset === -1 ? hit.stageIndex : nextUnset;
      state.hover = null;
      render();
    } else {
      updateHover(point);
      renderHoverOnly();
    }
    return;
  }
  state.drag = { x: point.x, y: point.y, path: {} };
  state.hover = null;
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
  state.drag.x = point.x;
  state.drag.y = point.y;
  updateDragPath(point);
  queueRender();
}

function onPointerUp() {
  if (state.drag?.path) {
    Object.entries(state.drag.path).forEach(([stageId, optionId]) => {
      state.selections[stageId] = optionId;
    });
  } else if (state.hover) {
    state.selections[state.hover.stageId] = state.hover.id;
  }
  const nextUnset = stages.findIndex((stage) => !state.selections[stage.id]);
  state.stage = nextUnset === -1 ? stages.length - 1 : nextUnset;
  state.drag = null;
  state.hover = null;
  render();
}

function updateHover(point) {
  const hit = hitAnyLayer(point, state.stage);
  state.hover = hit ? { stageId: hit.stage.id, id: hit.item.id } : null;
  if (hit) state.stage = hit.stageIndex;
}

function updateDragPath(point) {
  const radius = Math.hypot(point.x, point.y);
  let latest = null;
  stages.forEach((stage, stageIndex) => {
    if (radius < layerRadii[stage.id] - 18) return;
    const item = nearestByAngle(stage, point);
    state.drag.path[stage.id] = item.id;
    latest = { stage, stageIndex, item };
  });
  state.hover = latest ? { stageId: latest.stage.id, id: latest.item.id } : null;
  if (latest) state.stage = latest.stageIndex;
}

function renderHoverOnly() {
  app.querySelectorAll(".option").forEach((item) => {
    item.dataset.active = String(state.hover?.stageId === item.dataset.layer && state.hover?.id === item.dataset.option);
  });
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  window.requestAnimationFrame(() => {
    renderQueued = false;
    render();
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
  if (action === "apply-profile") {
    const suggestion = profileSuggestion();
    if (suggestion) {
      state.selections = { ...suggestion };
      const profile = currentProfile();
      if (profile) state.personId = profile.id;
      state.stage = stages.length - 1;
      state.drag = null;
      state.hover = null;
      render();
    }
    return;
  }
  if (action === "copy") copyText(JSON.stringify(snapshot(), null, 2));
}

function onField(event) {
  state[event.currentTarget.dataset.field] = event.currentTarget.value;
  if (event.currentTarget.dataset.field === "profilePerson") render();
  else {
    const pre = app.querySelector(".schema pre");
    if (pre) pre.textContent = JSON.stringify(snapshot(), null, 2);
  }
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
loadProfileContext();

async function loadProfileContext() {
  try {
    const response = await fetch("data/profile-context.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.profilePeople = Array.isArray(data.people) ? data.people : [];
    state.profilePerson = state.profilePeople[0]?.id || "";
    state.profileStatus = state.profilePeople.length ? "loaded" : "empty";
  } catch {
    state.profilePeople = [];
    state.profilePerson = "";
    state.profileStatus = "unavailable";
  }
  render();
}
