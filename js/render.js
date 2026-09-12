// Canvas-based, pan/zoom matrix renderer. Kept independent of the search
// logic: it just draws a grid of characters plus a set of highlighted
// "lines" (the user's term, and any lexicon words found in the grid).

function readThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name) => cs.getPropertyValue(name).trim();
  return {
    bg: get("--bg"),
    text: get("--text"),
    textDim: get("--text-dim"),
    border: get("--border"),
    term: get("--danger"),
    torah: get("--torah"),
    rabbinic: get("--rabbinic"),
    modern: get("--modern"),
  };
}

const CATEGORY_COLOR_KEY = { torah: "torah", rabbinic: "rabbinic", modern: "modern" };

export class MatrixView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onHover = opts.onHover || (() => {});
    this.baseCellSize = 30;
    this.zoom = 1;
    this.panX = 20;
    this.panY = 20;
    this.matrix = null;
    this.foundWords = [];
    this.categoryVisibility = { torah: true, rabbinic: true, modern: true };
    this.isolatedIndex = -1; // index into foundWords, or -1 for "show all"
    this.dragging = false;
    this.dragStart = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas.parentElement);
    this._resize();

    canvas.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    window.addEventListener("pointermove", (e) => this._onPointerMove(e));
    window.addEventListener("pointerup", () => this._onPointerUp());
    canvas.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
    canvas.addEventListener("mousemove", (e) => this._onHoverMove(e));
    canvas.addEventListener("mouseleave", () => this.onHover(null));
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.draw();
  }

  setData(matrix, foundWords) {
    this.matrix = matrix;
    this.foundWords = foundWords;
    this.isolatedIndex = -1;
    this.resetView();
  }

  setCategoryVisibility(vis) {
    this.categoryVisibility = vis;
    this.draw();
  }

  setIsolated(index) {
    this.isolatedIndex = index;
    this.draw();
  }

  resetView() {
    if (!this.matrix) return;
    this.zoom = 1;
    const gridW = this.matrix.cols * this.baseCellSize;
    const gridH = this.matrix.rows * this.baseCellSize;
    // Center the grid in the viewport either way: positive padding when it
    // fits, negative pan (scrolled to the middle) when it's larger --
    // which conveniently centers on the term's column by construction.
    this.panX = (this.cssWidth - gridW) / 2;
    this.panY = (this.cssHeight - gridH) / 2;
    this.draw();
  }

  zoomBy(factor, centerPx) {
    if (!this.matrix) return;
    const cx = centerPx ? centerPx.x : this.cssWidth / 2;
    const cy = centerPx ? centerPx.y : this.cssHeight / 2;
    const oldZoom = this.zoom;
    const newZoom = Math.min(4, Math.max(0.15, oldZoom * factor));
    // Keep the point under the cursor fixed while zooming.
    this.panX = cx - ((cx - this.panX) / oldZoom) * newZoom;
    this.panY = cy - ((cy - this.panY) / oldZoom) * newZoom;
    this.zoom = newZoom;
    this.draw();
  }

  focusOnCells(cells) {
    if (!cells.length || !this.matrix) return;
    const cellSize = this.baseCellSize * this.zoom;
    const rs = cells.map((c) => c.r), cs = cells.map((c) => c.c);
    const midR = (Math.min(...rs) + Math.max(...rs)) / 2;
    const midC = (Math.min(...cs) + Math.max(...cs)) / 2;
    this.panX = this.cssWidth / 2 - (midC + 0.5) * cellSize;
    this.panY = this.cssHeight / 2 - (midR + 0.5) * cellSize;
    this.draw();
  }

  _onPointerDown(e) {
    this.dragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY };
    this.canvas.parentElement.classList.add("dragging");
  }
  _onPointerMove(e) {
    if (!this.dragging) return;
    this.panX = this.dragStart.panX + (e.clientX - this.dragStart.x);
    this.panY = this.dragStart.panY + (e.clientY - this.dragStart.y);
    this.draw();
  }
  _onPointerUp() {
    this.dragging = false;
    this.canvas.parentElement.classList.remove("dragging");
  }
  _onWheel(e) {
    if (!this.matrix) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.zoomBy(e.deltaY < 0 ? 1.1 : 0.9, center);
  }
  _onHoverMove(e) {
    if (!this.matrix || this.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const cellSize = this.baseCellSize * this.zoom;
    const c = Math.floor((px - this.panX) / cellSize);
    const r = Math.floor((py - this.panY) / cellSize);
    if (r < 0 || r >= this.matrix.rows || c < 0 || c >= this.matrix.cols || !this.matrix.valid[r][c]) {
      this.onHover(null);
      return;
    }
    this.onHover({
      idx: this.matrix.cellIndex[r][c],
      letter: this.matrix.grid[r][c],
      screenX: rect.left + this.panX + (c + 0.5) * cellSize,
      screenY: rect.top + this.panY + r * cellSize,
    });
  }

  draw() {
    const ctx = this.ctx;
    const colors = readThemeColors();
    ctx.save();
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    if (!this.matrix) { ctx.restore(); return; }

    const { rows, cols, grid, valid } = this.matrix;
    const cellSize = this.baseCellSize * this.zoom;
    const fontSize = Math.max(6, cellSize * 0.52);

    const c0 = Math.max(0, Math.floor(-this.panX / cellSize));
    const c1 = Math.min(cols - 1, Math.ceil((this.cssWidth - this.panX) / cellSize));
    const r0 = Math.max(0, Math.floor(-this.panY / cellSize));
    const r1 = Math.min(rows - 1, Math.ceil((this.cssHeight - this.panY) / cellSize));

    // Grid lines (only when cells are large enough to be worth it)
    if (cellSize > 8) {
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = c0; c <= c1 + 1; c++) {
        const x = Math.round(this.panX + c * cellSize) + 0.5;
        ctx.moveTo(x, this.panY + r0 * cellSize);
        ctx.lineTo(x, this.panY + (r1 + 1) * cellSize);
      }
      for (let r = r0; r <= r1 + 1; r++) {
        const y = Math.round(this.panY + r * cellSize) + 0.5;
        ctx.moveTo(this.panX + c0 * cellSize, y);
        ctx.lineTo(this.panX + (c1 + 1) * cellSize, y);
      }
      ctx.stroke();
    }

    // Letters
    ctx.font = `500 ${fontSize}px "Arial Hebrew", "Noto Sans Hebrew", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colors.text;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!valid[r][c]) continue;
        const x = this.panX + (c + 0.5) * cellSize;
        const y = this.panY + (r + 0.5) * cellSize;
        ctx.fillText(grid[r][c], x, y);
      }
    }

    this._drawFoundWords(ctx, colors, cellSize);
    this._drawTermLine(ctx, colors, cellSize);

    ctx.restore();
  }

  _cellCenter(r, c, cellSize) {
    return { x: this.panX + (c + 0.5) * cellSize, y: this.panY + (r + 0.5) * cellSize };
  }

  _drawFoundWords(ctx, colors, cellSize) {
    this.foundWords.forEach((entry, i) => {
      const visible = entry.category.some((cat) => this.categoryVisibility[cat]);
      if (!visible) return;
      const isolating = this.isolatedIndex !== -1;
      if (isolating && this.isolatedIndex !== i) return;

      const colorKey = CATEGORY_COLOR_KEY[entry.category[0]] || "torah";
      const color = colors[colorKey];
      const first = this._cellCenter(entry.cells[0].r, entry.cells[0].c, cellSize);
      const last = this._cellCenter(entry.cells[entry.cells.length - 1].r, entry.cells[entry.cells.length - 1].c, cellSize);

      ctx.strokeStyle = color;
      ctx.lineWidth = isolating ? 3.5 : 2;
      ctx.globalAlpha = isolating ? 0.95 : 0.55;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  _drawTermLine(ctx, colors, cellSize) {
    const cells = this.matrix.termCells;
    if (!cells || !cells.length) return;
    const first = this._cellCenter(cells[0].r, cells[0].c, cellSize);
    const last = this._cellCenter(cells[cells.length - 1].r, cells[cells.length - 1].c, cellSize);
    ctx.strokeStyle = colors.term;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Direction arrowhead at the last letter of the term.
    if (cells.length > 1) {
      const prev = this._cellCenter(cells[cells.length - 2].r, cells[cells.length - 2].c, cellSize);
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const size = Math.max(6, cellSize * 0.22);
      ctx.fillStyle = colors.term;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - size * Math.cos(angle - 0.4), last.y - size * Math.sin(angle - 0.4));
      ctx.lineTo(last.x - size * Math.cos(angle + 0.4), last.y - size * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }
  }
}
