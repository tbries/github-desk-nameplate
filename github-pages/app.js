/* =========================================================================
 * SETTINGS — edit these to change the available colors and grid.
 * Each color needs: label (shown in the picker), color (any CSS color),
 * and key (single lowercase letter used as a desktop shortcut).
 * ========================================================================= */
const CONFIG = {
  rows: 7,
  cols: 52,
  defaultPlateColor: "#000000",
  defaultLogoColor: "#ffffff",
  colors: [
    { label: "Pink", color: "#F55A74", key: "i" },
    { label: "Red", color: "#C12E1F", key: "r" },
    { label: "Orange", color: "#FF9016", key: "o" },
    { label: "Yellow", color: "#F4EE2A", key: "y" },
    { label: "Bright Green", color: "#BECF00", key: "t" },
    { label: "Grass Green", color: "#61C680", key: "g" },
    { label: "Bambu Green", color: "#00AE42", key: "a" },
    { label: "Mistletoe Green", color: "#3F8E43", key: "m" },
    { label: "Cobalt Blue", color: "#0056B8", key: "c" },
    { label: "Blue", color: "#0A2989", key: "b" },
    { label: "Purple", color: "#5E43B7", key: "p" },
    { label: "Indigo Purple", color: "#482960", key: "d" },
    { label: "White", color: "#FFFFFF", key: "w" },
    { label: "Black", color: "#000000", key: "k" },
  ],
};
/* ===================== end of settings =================================== */

const STORAGE_KEY = "nameplate-planner-v2";
// "#" uses the selected color; letters use the palette's shortcut colors.
const SHAPES = Object.freeze({
  heart: [
    ".##.##.",
    "#######",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    "...#...",
  ],
  mona: [
    "...#....#...",
    "..#.####.#..",
    "..#......#..",
    "###.#..#.###",
    "..#..##..#..",
    "###......###",
    "...######...",
  ],
  "copilot-cli": [
    "...ppp...",
    ".ccccccc.",
    ".c..c..c.",
    "pccc.cccp",
    "pp.a.a.pp",
    ".p.....p.",
    "..ppppp..",
  ],
  duckie: [
    "...yy..",
    "..yyyy.",
    "..yyky.",
    "yyyyyoo",
    "yyyyyy.",
    ".yyyyy.",
    "..yyy..",
  ],
});

// Measurements are ratios of one cell so the nameplate keeps its proportions
// as the editor is resized or zoomed.
const NAMEPLATE_LAYOUT = Object.freeze({
  gapRatio: 0.2,
  paddingRatio: 1.1,
  plateRadiusRatio: 0.8,
  cellRadiusRatio: 0.2,
  maxFittedCell: 28,
});

// Mobile zoom: multiplies the auto-fitted dot size so the nameplate can be made
// taller (larger dots), at the cost of earlier horizontal scrolling.
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.25;
const HISTORY_LIMIT = 100;
const DEFAULT_MOBILE_ZOOMS = {
  portrait: 2.00,
  landscape: 1.00,
};
const MOBILE_ZOOM_QUERY =
  "(max-width: 640px), (hover: none) and (pointer: coarse)";

function isMobileZoomMode() {
  return window.matchMedia(MOBILE_ZOOM_QUERY).matches;
}

function zoomOrientation() {
  return window.matchMedia("(orientation: portrait)").matches
    ? "portrait"
    : "landscape";
}

function validZoom(value, fallback) {
  return Number.isFinite(value)
    ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value))
    : fallback;
}

const { rows, cols, colors } = CONFIG;

function getNameplateMetrics(cell, { showLogo = true } = {}) {
  const gap = cell * NAMEPLATE_LAYOUT.gapRatio;
  const padding = cell * NAMEPLATE_LAYOUT.paddingRatio;
  const gridHeight = rows * cell + (rows - 1) * gap;
  const gridWidth = cols * cell + (cols - 1) * gap;
  const logoSize = gridHeight;
  return {
    cell,
    gap,
    padding,
    gridHeight,
    gridWidth,
    logoSize,
    width:
      padding * (showLogo ? 3 : 2) + (showLogo ? logoSize : 0) + gridWidth,
    height: padding * 2 + gridHeight,
    plateRadius: cell * NAMEPLATE_LAYOUT.plateRadiusRatio,
    cellRadius: cell * NAMEPLATE_LAYOUT.cellRadiusRatio,
  };
}

function setNameplateCellSize(plate, cell) {
  const cellKey = cell.toFixed(4);
  if (plate.dataset.nameplateCell === cellKey) return null;
  plate.dataset.nameplateCell = cellKey;
  const metrics = getNameplateMetrics(cell, {
    showLogo: !plate.classList.contains("nameplate-no-logo"),
  });
  plate.style.setProperty("--nameplate-cell", `${metrics.cell}px`);
  plate.style.setProperty("--nameplate-gap", `${metrics.gap}px`);
  plate.style.setProperty("--nameplate-pad", `${metrics.padding}px`);
  plate.style.setProperty("--nameplate-logo-size", `${metrics.logoSize}px`);
  plate.style.setProperty("--nameplate-grid-width", `${metrics.gridWidth}px`);
  plate.style.setProperty("--nameplate-grid-height", `${metrics.gridHeight}px`);
  plate.style.setProperty("--nameplate-width", `${metrics.width}px`);
  plate.style.setProperty("--nameplate-height", `${metrics.height}px`);
  plate.style.setProperty("--nameplate-radius", `${metrics.plateRadius}px`);
  plate.style.setProperty("--nameplate-cell-radius", `${metrics.cellRadius}px`);
  plate.style.setProperty(
    "--nameplate-line",
    `${metrics.cell * 0.05}px`
  );
  plate.style.setProperty(
    "--nameplate-highlight-inner",
    `${metrics.cell * 0.1}px`
  );
  plate.style.setProperty(
    "--nameplate-highlight-outer",
    `${metrics.cell * 0.2}px`
  );
  return metrics;
}

function emptyCellColor(plateColor) {
  return luminance(plateColor) < 0.3
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.28)";
}

function setNameplateColors(plate, plateColor, logoColor) {
  plate.style.setProperty("--nameplate-plate-color", plateColor);
  plate.style.setProperty("--nameplate-logo-color", logoColor);
  plate.style.setProperty("--nameplate-empty-color", emptyCellColor(plateColor));
}

function gridValueAt(grid, row, column) {
  return Array.isArray(grid[row])
    ? grid[row][column]
    : grid[row * cols + column];
}

function createNameplate({
  grid,
  palette,
  plateColor = CONFIG.defaultPlateColor,
  logoColor = CONFIG.defaultLogoColor,
  interactive = false,
  showEmptyCells = true,
  showLogo = true,
  showShadow = true,
  showCellDepth = true,
  decorative = false,
  onCellClick = null,
} = {}) {
  const plate = document.createElement("div");
  plate.className = "nameplate";
  plate.classList.toggle("nameplate-no-logo", !showLogo);
  plate.classList.toggle("nameplate-no-shadow", !showShadow);
  plate.classList.toggle("nameplate-hide-empty", !showEmptyCells);
  plate.classList.toggle("nameplate-flat-cells", !showCellDepth);
  if (decorative) plate.setAttribute("aria-hidden", "true");
  setNameplateCellSize(plate, 20);
  setNameplateColors(plate, plateColor, logoColor);

  if (showLogo) {
    const logo = document.createElement("div");
    logo.className = "nameplate-logo";
    if (!decorative) {
      logo.setAttribute("role", "img");
      logo.setAttribute("aria-label", "GitHub logo");
    }
    plate.appendChild(logo);
  }

  const gridArea = document.createElement("div");
  gridArea.className = "nameplate-grid-area";

  const gridElement = document.createElement("div");
  gridElement.className = "nameplate-grid";
  const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let column = 0; column < cols; column++) {
    for (let row = 0; row < rows; row++) {
      const value = gridValueAt(grid, row, column);
      const cell = document.createElement(interactive ? "button" : "span");
      cell.className = "nameplate-cell";
      if (interactive) {
        cell.type = "button";
        cell.tabIndex = -1;
        cell.dataset.r = String(row);
        cell.dataset.c = String(column);
        cell.setAttribute(
          "aria-label",
          `Row ${row + 1}, column ${column + 1}`
        );
        cell.addEventListener("click", () => onCellClick?.(row, column, cell));
      } else {
        cell.setAttribute("aria-hidden", "true");
      }
      if (value !== null && palette[value]) {
        cell.classList.add("filled");
        cell.style.background = palette[value];
      }
      cells[row][column] = cell;
      gridElement.appendChild(cell);
    }
  }
  gridArea.appendChild(gridElement);
  plate.appendChild(gridArea);

  return { plate, grid: gridElement, cells };
}

function fitNameplateToWidth(plate, width, zoom = 1, maxCell = Infinity) {
  if (!width || width <= 0) return null;
  const widthUnits = getNameplateMetrics(1, {
    showLogo: !plate.classList.contains("nameplate-no-logo"),
  }).width;
  const cell = Math.min(maxCell, width / widthUnits) * zoom;
  return setNameplateCellSize(plate, Math.max(1, cell));
}

const state = {
  // grid[r][c] = color index (0..n-1) or null for empty
  grid: Array.from({ length: rows }, () => Array(cols).fill(null)),
  active: 0,
  plateColor: CONFIG.defaultPlateColor,
  logoColor: CONFIG.defaultLogoColor,
  highlight: null, // { row, col } or null
  lastModified: null, // { row, col } — arrow nav starts here
  arrowStart: null, // { row, col } — set on Escape; overrides arrow-nav start
  zoom: isMobileZoomMode() ? DEFAULT_MOBILE_ZOOMS[zoomOrientation()] : 1,
  zooms: { ...DEFAULT_MOBILE_ZOOMS },
  textValue: "",
  textSize: "regular", // letter width for the write-a-word tool
  textAlign: "left",
};

// DOM references
const el = {
  nameplateHost: document.getElementById("nameplate-host"),
  plate: null,
  grid: null,
  palette: document.getElementById("palette"),
  stage: document.getElementById("stage"),
  plateTheme: document.getElementById("plate-theme"),
  clearAll: document.getElementById("clear-all"),
  shiftLeft: document.getElementById("shift-left"),
  shiftRight: document.getElementById("shift-right"),
  undo: document.getElementById("undo"),
  redo: document.getElementById("redo"),
  zoomIn: document.getElementById("zoom-in"),
  zoomOut: document.getElementById("zoom-out"),
  zoomLabel: document.getElementById("zoom-label"),
  textInput: document.getElementById("text-input"),
};

const cellEls = []; // cellEls[r][c] -> button element
const undoStack = [];
const redoStack = [];

/* --------------------------------------------------------------------- */
/* Build UI                                                              */
/* --------------------------------------------------------------------- */
function buildGrid() {
  cellEls.length = 0;
  const rendered = createNameplate({
    grid: state.grid,
    palette: colors.map((color) => color.color),
    plateColor: state.plateColor,
    logoColor: state.logoColor,
    interactive: true,
    onCellClick(row, column, cell) {
      toggleCell(row, column, state.active);
      cell.blur();
    },
  });
  el.nameplateHost.replaceChildren(rendered.plate);
  el.plate = rendered.plate;
  el.grid = rendered.grid;
  for (const row of rendered.cells) cellEls.push(row);
  enableMouseDragPainting();
}

function buildPalette() {
  el.palette.innerHTML = "";
  colors.forEach((color, i) => {
    const wrap = document.createElement("span");
    wrap.className = "swatch-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.dataset.index = String(i);
    btn.style.background = color.color;
    btn.style.color = textColorFor(color.color);
    const shortcut = color.key ? ` (${color.key})` : "";
    btn.dataset.tip = `${color.label}${shortcut}`;
    btn.setAttribute("aria-pressed", String(i === state.active));
    btn.setAttribute(
      "aria-label",
      color.key ? `${color.label}, shortcut ${color.key}` : color.label
    );
    btn.innerHTML = `<span class="count" data-count="${i}">0</span>`;
    btn.addEventListener("click", () => setActive(i));
    wrap.appendChild(btn);
    el.palette.appendChild(wrap);
  });
}

// Relative brightness (0–1) of a hex color.
function luminance(hex) {
  const c = hex.replace("#", "");
  const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Pick black or white text for readable contrast on a hex background.
function textColorFor(hex) {
  return luminance(hex) > 0.6 ? "#1f2328" : "#ffffff";
}

/* --------------------------------------------------------------------- */
/* State updates                                                         */
/* --------------------------------------------------------------------- */
function setActive(i) {
  state.active = i;
  document.querySelectorAll(".swatch").forEach((s) => {
    s.setAttribute("aria-pressed", String(Number(s.dataset.index) === i));
  });
  save();
}

function toggleCell(r, c, index) {
  // Toggle: painting a cell that already has this color clears it.
  const changed = setCellValue(
    r,
    c,
    state.grid[r][c] === index ? null : index
  );
  if (!changed) return;
  updateCounts();
  save();
  recordHistory();
}

function setCellValue(r, c, value) {
  if (state.grid[r][c] === value) return false;
  state.grid[r][c] = value;
  state.lastModified = { row: r, col: c };
  state.arrowStart = null; // a fresh edit resets the arrow-nav start point
  paintCell(r, c);
  return true;
}

function gridCellFromPoint(clientX, clientY) {
  const rect = el.grid.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

  const styles = getComputedStyle(el.grid);
  const cell = parseFloat(styles.getPropertyValue("--nameplate-cell"));
  const gap = parseFloat(styles.getPropertyValue("--nameplate-gap"));
  const step = cell + gap;
  const row = Math.max(0, Math.min(rows - 1, Math.round((y - cell / 2) / step)));
  const col = Math.max(0, Math.min(cols - 1, Math.round((x - cell / 2) / step)));
  return { row, col };
}

function cellsBetween(from, to) {
  const cells = [];
  let x = from.col;
  let y = from.row;
  const dx = Math.abs(to.col - x);
  const sx = x < to.col ? 1 : -1;
  const dy = -Math.abs(to.row - y);
  const sy = y < to.row ? 1 : -1;
  let error = dx + dy;

  while (true) {
    cells.push({ row: y, col: x });
    if (x === to.col && y === to.row) break;
    const doubledError = error * 2;
    if (doubledError >= dy) {
      error += dy;
      x += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y += sy;
    }
  }
  return cells;
}

function enableMouseDragPainting() {
  let drag = null;
  let suppressClick = false;

  function paintDragTo(cell) {
    if (!drag || !cell) return;
    const from = drag.last || drag.start;
    if (cell.row === from.row && cell.col === from.col) return;
    drag.didDrag = true;
    for (const location of cellsBetween(from, cell)) {
      const key = `${location.row}:${location.col}`;
      if (drag.painted.has(key)) continue;
      drag.painted.add(key);
      drag.changed =
        setCellValue(location.row, location.col, drag.value) || drag.changed;
    }
    drag.last = cell;
  }

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.didDrag) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
      if (drag.changed) {
        updateCounts();
        save();
        recordHistory();
      }
    }
    if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
      drag.captureTarget.releasePointerCapture(event.pointerId);
    }
    drag = null;
  }

  el.grid.addEventListener("pointerdown", (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }
    const start = gridCellFromPoint(event.clientX, event.clientY);
    if (!start) return;
    clearHighlight();
    drag = {
      pointerId: event.pointerId,
      captureTarget: event.target,
      start,
      last: null,
      value:
        state.grid[start.row][start.col] === state.active ? null : state.active,
      painted: new Set(),
      changed: false,
      didDrag: false,
    };
    drag.captureTarget.setPointerCapture(event.pointerId);
  });

  el.grid.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!(event.buttons & 1)) {
      finishDrag(event);
      return;
    }
    paintDragTo(gridCellFromPoint(event.clientX, event.clientY));
    if (drag?.didDrag) event.preventDefault();
  });

  el.grid.addEventListener("pointerup", (event) => {
    paintDragTo(gridCellFromPoint(event.clientX, event.clientY));
    finishDrag(event);
  });
  el.grid.addEventListener("pointercancel", finishDrag);
  el.grid.addEventListener(
    "click",
    (event) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    },
    true
  );
}

function paintCell(r, c) {
  const btn = cellEls[r][c];
  const v = state.grid[r][c];
  if (v === null) {
    btn.classList.remove("filled");
    btn.style.background = "";
  } else {
    btn.classList.add("filled");
    btn.style.background = colors[v].color;
  }
  btn.classList.toggle(
    "highlight",
    !!state.highlight && state.highlight.row === r && state.highlight.col === c
  );
}

function repaintAll() {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) paintCell(r, c);
}

function updateCounts() {
  const counts = Array(colors.length).fill(0);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = state.grid[r][c];
      if (v !== null) counts[v]++;
    }
  document.querySelectorAll(".count").forEach((n) => {
    n.textContent = String(counts[Number(n.dataset.count)]);
  });
  return counts;
}

function applyColors() {
  setNameplateColors(el.plate, state.plateColor, state.logoColor);
  const whitePlate = luminance(state.plateColor) < 0.3;
  el.plateTheme.style.backgroundColor = whitePlate ? "#ffffff" : "#000000";
  el.plateTheme.style.color = whitePlate ? "#000000" : "#ffffff";
  el.plateTheme.title = whitePlate
    ? "Switch to white plate with black logo"
    : "Switch to black plate with white logo";
  el.plateTheme.setAttribute(
    "aria-label",
    `Swap plate & logo colors: ${el.plateTheme.title}`
  );
}

// Size the dots so the whole plate fits the available width. Mobile starts with
// a complete overview; the zoom controls can then enlarge it for precise edits.
function fitPlate() {
  const sp = getComputedStyle(el.stage);
  const stagePadX =
    (parseFloat(sp.paddingLeft) || 0) + (parseFloat(sp.paddingRight) || 0);
  const avail = el.stage.clientWidth - stagePadX;
  fitNameplateToWidth(
    el.plate,
    avail,
    state.zoom,
    NAMEPLATE_LAYOUT.maxFittedCell
  );
  el.stage.style.height = "";
}

// Change the mobile zoom and re-fit. The − button can't go below the natural
// fit (1×); the + button grows the dots up to ZOOM_MAX.
function setZoom(z, remember = true) {
  state.zoom = validZoom(z, state.zoom);
  if (remember && isMobileZoomMode()) {
    state.zooms[zoomOrientation()] = state.zoom;
    save();
  }
  fitPlate();
  if (el.zoomLabel)
    el.zoomLabel.textContent = Math.round(state.zoom * 100) + "%";
  if (el.zoomOut) el.zoomOut.disabled = state.zoom <= ZOOM_MIN + 1e-9;
  if (el.zoomIn) el.zoomIn.disabled = state.zoom >= ZOOM_MAX - 1e-9;
}

/* --------------------------------------------------------------------- */
/* Keyboard (desktop)                                                    */
/* --------------------------------------------------------------------- */
function moveHighlight(dr, dc) {
  const prev = state.highlight ? { ...state.highlight } : null;
  let row, col;
  if (state.highlight) {
    row = Math.min(rows - 1, Math.max(0, state.highlight.row + dr));
    col = Math.min(cols - 1, Math.max(0, state.highlight.col + dc));
  } else {
    // Begin navigation at the cell cleared with Escape, else the last modified
    // cell, else the origin.
    const start = state.arrowStart || state.lastModified || { row: 0, col: 0 };
    row = start.row;
    col = start.col;
  }
  state.highlight = { row, col };
  state.arrowStart = { row, col }; // remember cursor for resuming after clear
  if (prev) paintCell(prev.row, prev.col);
  paintCell(row, col);
  // Keep keyboard focus on the stage so Space/Enter target the grid.
  el.stage.focus({ preventScroll: true });
  cellEls[row][col].scrollIntoView({ block: "nearest", inline: "nearest" });
}

function clearHighlight() {
  if (!state.highlight) return;
  const { row, col } = state.highlight;
  state.highlight = null;
  paintCell(row, col);
}

function onKeyDown(e) {
  const modifier = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const editable =
    e.target instanceof HTMLElement &&
    (e.target.isContentEditable ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA");
  if (modifier && !e.altKey && !editable) {
    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (key === "y" && !e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
  }

  if (e.target.tagName === "INPUT") return;
  // Never override browser/OS shortcuts (e.g. Ctrl+R to refresh).
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const moves = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  if (moves[e.key]) {
    e.preventDefault();
    moveHighlight(moves[e.key][0], moves[e.key][1]);
    return;
  }

  // Tab cycles the active color (Shift+Tab goes back).
  if (e.key === "Tab") {
    e.preventDefault();
    const n = colors.length;
    setActive((state.active + (e.shiftKey ? -1 : 1) + n) % n);
    return;
  }

  // Escape hides the arrow-navigation highlight; arrowStart already holds its
  // location so the next arrow press resumes from there.
  if (e.key === "Escape") {
    clearHighlight();
    return;
  }

  // Space / Enter apply or unapply the active color on the highlighted cell.
  if (e.key === " " || e.key === "Enter") {
    if (e.target.tagName === "BUTTON") return; // let real buttons activate
    if (state.highlight) {
      e.preventDefault();
      const { row, col } = state.highlight;
      toggleCell(row, col, state.active);
    }
    return;
  }

  if ((e.key === "Backspace" || e.key === "Delete") && state.highlight) {
    e.preventDefault();
    const { row, col } = state.highlight;
    state.grid[row][col] = null;
    state.lastModified = { row, col };
    paintCell(row, col);
    updateCounts();
    save();
    recordHistory();
    return;
  }

  const idx = colors.findIndex((c) => c.key === e.key.toLowerCase());
  if (idx !== -1 && state.highlight) {
    e.preventDefault();
    setActive(idx);
    const { row, col } = state.highlight;
    toggleCell(row, col, idx); // same-color key clears (toggle)
  } else if (idx !== -1) {
    setActive(idx);
  }
}

/* --------------------------------------------------------------------- */
/* Persistence                                                           */
/* --------------------------------------------------------------------- */
// Store one nullable color index per cell.
function encodeGrid() {
  const encoded = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      encoded.push(state.grid[r][c]);
    }
  return encoded;
}

function decodeGrid(g, colorCount = colors.length) {
  if (Array.isArray(g) && g.length === rows * cols) {
    return g.map((value) =>
      value === null ||
        (Number.isInteger(value) && value >= 0 && value < colorCount)
        ? value
        : null
    );
  }
  if (typeof g !== "string" || g.length !== rows * cols) return null;
  return [...g].map((ch) => {
    const value = ch === "." ? null : parseInt(ch, 36);
    return value !== null && value < colorCount ? value : null;
  });
}

function applyGridString(g) {
  const decoded = decodeGrid(g);
  if (!decoded) return;
  let k = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      state.grid[r][c] = decoded[k++];
    }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        g: encodeGrid(),
        active: state.active,
        plate: state.plateColor,
        logo: state.logoColor,
        text: state.textValue,
        textSize: state.textSize,
        textAlign: state.textAlign,
        zooms: state.zooms,
      })
    );
  } catch (_) {
    /* storage unavailable — ignore */
  }
}

function load() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {
    data = null;
  }
  if (!data) return;

  applyGridString(data.g);
  if (typeof data.active === "number" && data.active < colors.length)
    state.active = data.active;
  if (typeof data.plate === "string") state.plateColor = data.plate;
  if (typeof data.logo === "string") state.logoColor = data.logo;
  if (typeof data.text === "string") state.textValue = data.text;
  if (data.zooms && typeof data.zooms === "object") {
    state.zooms.portrait = validZoom(
      data.zooms.portrait,
      DEFAULT_MOBILE_ZOOMS.portrait
    );
    state.zooms.landscape = validZoom(
      data.zooms.landscape,
      DEFAULT_MOBILE_ZOOMS.landscape
    );
  }
  if (isMobileZoomMode()) state.zoom = state.zooms[zoomOrientation()];
  const legacySizes = { small: "narrow", medium: "regular", large: "wide" };
  const textSize = legacySizes[data.textSize] || data.textSize;
  if (window.NameplateFont && window.NameplateFont.SIZES[textSize])
    state.textSize = textSize;
  if (["left", "center", "right"].includes(data.textAlign))
    state.textAlign = data.textAlign;
}

/* --------------------------------------------------------------------- */
/* Undo / redo                                                           */
/* --------------------------------------------------------------------- */
function captureHistoryState() {
  return {
    grid: state.grid.map((row) => [...row]),
    plateColor: state.plateColor,
    logoColor: state.logoColor,
  };
}

function historyStateKey(snapshot) {
  return JSON.stringify(snapshot);
}

function updateHistoryButtons() {
  el.undo.disabled = undoStack.length <= 1;
  el.redo.disabled = redoStack.length === 0;
}

function recordHistory() {
  const snapshot = captureHistoryState();
  const previous = undoStack[undoStack.length - 1];
  if (previous && historyStateKey(previous) === historyStateKey(snapshot)) {
    updateHistoryButtons();
    return;
  }
  undoStack.push(snapshot);
  if (undoStack.length > HISTORY_LIMIT + 1) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
}

function restoreHistoryState(snapshot) {
  state.grid = snapshot.grid.map((row) => [...row]);
  state.active = Math.min(state.active, colors.length - 1);
  state.plateColor = snapshot.plateColor;
  state.logoColor = snapshot.logoColor;
  state.highlight = null;
  state.lastModified = null;
  state.arrowStart = null;
  buildPalette();
  applyColors();
  repaintAll();
  updateCounts();
  setActive(state.active);
  save();
}

function undo() {
  recordHistory();
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restoreHistoryState(undoStack[undoStack.length - 1]);
  updateHistoryButtons();
}

function redo() {
  const snapshot = redoStack.pop();
  if (!snapshot) return;
  undoStack.push(snapshot);
  restoreHistoryState(snapshot);
  updateHistoryButtons();
}

/* --------------------------------------------------------------------- */
/* Wire up                                                               */
/* --------------------------------------------------------------------- */
function clearAll() {
  if (!state.grid.some((row) => row.some((value) => value !== null))) return;
  if (!confirm("Clear all dots?")) return;
  state.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  state.lastModified = null;
  state.arrowStart = null;
  state.highlight = null;
  repaintAll();
  updateCounts();
  save();
  recordHistory();
}

// Shift every dot by one column. delta = -1 shifts left, +1 shifts right.
// Wraps around the edges so no dots are ever lost and the action is reversible.
function shiftColumns(delta) {
  state.grid = state.grid.map((row) => {
    const next = Array(cols).fill(null);
    for (let c = 0; c < cols; c++) next[c] = row[(c - delta + cols) % cols];
    return next;
  });
  // Keep tracked positions (highlight / arrow-nav anchors) on the same dots.
  const shiftPos = (p) =>
    p ? { row: p.row, col: (p.col + delta + cols) % cols } : p;
  state.highlight = shiftPos(state.highlight);
  state.lastModified = shiftPos(state.lastModified);
  state.arrowStart = shiftPos(state.arrowStart);
  repaintAll();
  updateCounts();
  save();
  recordHistory();
}

function addShape(shapeName) {
  const shape = SHAPES[shapeName];
  if (!shape) return;

  const width = shape[0].length;
  let rightmost = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = cols - 1; c >= 0; c--) {
      if (state.grid[r][c] !== null) {
        rightmost = Math.max(rightmost, c);
        break;
      }
    }
  }

  const start = rightmost < 0 ? 0 : rightmost + 2;
  if (start + width > cols) {
    alert("There is not enough room to add this shape.");
    return;
  }

  const palette = new Map(colors.map((color, index) => [color.key, index]));
  const pattern = shape.map((row) =>
    [...row].map((cell) => {
      if (cell === ".") return null;
      if (cell === "#") return state.active;
      const index = palette.get(cell);
      if (index === undefined) throw new Error(`Unknown shape color: ${cell}`);
      return index;
    })
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < width; c++) {
      if (pattern[r][c] !== null) state.grid[r][start + c] = pattern[r][c];
    }
  }

  state.highlight = null;
  state.lastModified = null;
  state.arrowStart = null;
  repaintAll();
  updateCounts();
  save();
  recordHistory();
}

/* --------------------------------------------------------------------- */
/* Write a word (stamp text as dots)                                     */
/* --------------------------------------------------------------------- */
// Fill the grid with a word rendered in the active color. Letters are included
// until the next one would overflow the 52 columns, then the visible dots are
// aligned within the plate.
function applyText(raw) {
  const F = window.NameplateFont;
  if (!F) return;
  const word = String(raw == null ? "" : raw);
  if (!word) return; // nothing typed — leave the current design alone

  // Writing a word replaces the current dots so the result is predictable.
  state.grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  const textColumns = [];
  for (const ch of word) {
    const glyph = F.charColumns(ch, state.textSize);
    const w = glyph.length;
    if (w === 0) continue; // unsupported character — skip it
    const spacer = textColumns.length ? 1 : 0;
    if (textColumns.length + spacer + w > cols) break;
    if (spacer) textColumns.push(Array(rows).fill(false));
    textColumns.push(...glyph);
  }

  const filledColumns = textColumns
    .map((column, index) => (column.some(Boolean) ? index : -1))
    .filter((index) => index >= 0);
  if (filledColumns.length) {
    const first = filledColumns[0];
    const last = filledColumns[filledColumns.length - 1];
    const visibleWidth = last - first + 1;
    let visibleStart = 0;
    if (state.textAlign === "center")
      visibleStart = Math.floor((cols - visibleWidth) / 2);
    else if (state.textAlign === "right") visibleStart = cols - visibleWidth;
    const offset = visibleStart - first;

    for (let tc = 0; tc < textColumns.length; tc++) {
      const col = textColumns[tc];
      for (let r = 0; r < rows; r++) {
        const target = offset + tc;
        if (col[r] && target >= 0 && target < cols)
          state.grid[r][target] = state.active;
      }
    }
  }

  state.highlight = null;
  state.lastModified = null;
  state.arrowStart = null;
  repaintAll();
  updateCounts();
  save();
  recordHistory();
}

// Change the letter size for the write-a-word tool and re-render the current
// word so the change is visible immediately.
function setTextSize(size) {
  if (!window.NameplateFont || !window.NameplateFont.SIZES[size]) return;
  state.textSize = size;
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.size === size));
  });
  save();
  if (el.textInput.value) applyText(el.textInput.value);
}

function setTextAlign(align) {
  if (!["left", "center", "right"].includes(align)) return;
  state.textAlign = align;
  document.querySelectorAll(".align-btn").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.align === align)
    );
  });
  save();
  if (el.textInput.value) applyText(el.textInput.value);
}

let layoutFitFrame = null;

function scheduleLayoutFit() {
  if (layoutFitFrame !== null) return;
  layoutFitFrame = requestAnimationFrame(() => {
    layoutFitFrame = null;
    fitPlate();
  });
}

function init() {
  load();
  buildGrid();
  buildPalette();
  applyColors();
  fitPlate();
  repaintAll();
  updateCounts();
  setActive(state.active);
  recordHistory();

  el.plateTheme.addEventListener("click", () => {
    const whitePlate = luminance(state.plateColor) < 0.3;
    state.plateColor = whitePlate ? "#ffffff" : "#000000";
    state.logoColor = whitePlate ? "#000000" : "#ffffff";
    applyColors();
    save();
    recordHistory();
  });
  el.clearAll.addEventListener("click", clearAll);
  el.shiftLeft.addEventListener("click", () => shiftColumns(-1));
  el.shiftRight.addEventListener("click", () => shiftColumns(1));
  el.undo.addEventListener("click", undo);
  el.redo.addEventListener("click", redo);
  el.zoomIn.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
  el.zoomOut.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
  setZoom(state.zoom, false); // initialize label + button disabled states

  // Write-a-word tool (main screen): apply live, debounced as the user types.
  let textDebounce = null;
  el.textInput.addEventListener("input", () => {
    state.textValue = el.textInput.value;
    save();
    clearTimeout(textDebounce);
    textDebounce = setTimeout(() => applyText(el.textInput.value), 300);
  });
  el.textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(textDebounce);
      applyText(el.textInput.value); // apply immediately on Enter
    }
  });
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.addEventListener("click", () => setTextSize(b.dataset.size));
  });
  setTextSize(state.textSize); // reflect the restored/default size on the buttons
  document.querySelectorAll(".align-btn").forEach((button) => {
    button.addEventListener("click", () => setTextAlign(button.dataset.align));
  });
  setTextAlign(state.textAlign);
  document.querySelectorAll(".shape-btn").forEach((button) => {
    button.addEventListener("click", () => addShape(button.dataset.shape));
  });
  el.textInput.value = state.textValue;
  document.addEventListener("keydown", onKeyDown);
  let mobileZoomMode = isMobileZoomMode();
  let mobileZoomOrientation = zoomOrientation();
  window.addEventListener("resize", () => {
    const nextMobileZoomMode = isMobileZoomMode();
    const nextZoomOrientation = zoomOrientation();
    if (!nextMobileZoomMode) {
      if (mobileZoomMode) setZoom(1, false);
    } else if (
      !mobileZoomMode ||
      nextZoomOrientation !== mobileZoomOrientation
    ) {
      setZoom(state.zooms[nextZoomOrientation], false);
    }
    scheduleLayoutFit();
    mobileZoomMode = nextMobileZoomMode;
    mobileZoomOrientation = nextZoomOrientation;
  });

  // Any click deactivates the arrow-navigation highlight.
  document.addEventListener("click", clearHighlight);
}

init();
