(() => {
  const CELL = 16;
  const RADIUS = 128;
  const GAP = 24;
  const GLYPHS = ".:-+*";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideHover = window.matchMedia("(hover: hover) and (min-width: 1440px)");

  let canvas = null;
  let ctx = null;
  let pointer = null;

  function canRun() {
    return wideHover.matches && !reducedMotion.matches;
  }

  function hashCell(gx, gy) {
    const h = Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663);
    return Math.abs(h);
  }

  function parseHex(value) {
    const hex = value.trim();
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function contentBounds() {
    const page = document.querySelector(".page");
    const rect = page.getBoundingClientRect();
    const styles = getComputedStyle(page);

    return {
      left: rect.left + parseFloat(styles.paddingLeft) - GAP,
      right: rect.right - parseFloat(styles.paddingRight) + GAP,
    };
  }

  function resize() {
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  function clear() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function paint() {
    if (!ctx || !pointer) {
      clear();
      return;
    }

    clear();

    const bounds = contentBounds();
    const color = parseHex(
      getComputedStyle(document.documentElement).getPropertyValue("--secondary"),
    );
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const minX = Math.floor((pointer.x - RADIUS) / CELL);
    const maxX = Math.ceil((pointer.x + RADIUS) / CELL);
    const minY = Math.floor((pointer.y - RADIUS) / CELL);
    const maxY = Math.ceil((pointer.y + RADIUS) / CELL);

    for (let gx = minX; gx <= maxX; gx += 1) {
      for (let gy = minY; gy <= maxY; gy += 1) {
        const seed = hashCell(gx, gy);
        if (seed % 3 !== 0) continue;

        const x = gx * CELL + CELL / 2;
        const y = gy * CELL + CELL / 2;
        if (x >= bounds.left && x <= bounds.right) continue;

        const dist = Math.hypot(x - pointer.x, y - pointer.y);
        if (dist > RADIUS) continue;

        const falloff = 1 - dist / RADIUS;
        const alpha = falloff * falloff * 0.72;
        if (alpha < 0.04) continue;

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.fillText(GLYPHS[seed % GLYPHS.length], x, y);
      }
    }
  }

  function onPointerMove(event) {
    pointer = { x: event.clientX, y: event.clientY };
    paint();
  }

  function onPointerLeave() {
    pointer = null;
    clear();
  }

  function start() {
    if (canvas || !canRun()) return;

    canvas = document.createElement("canvas");
    canvas.className = "ascii-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    ctx = canvas.getContext("2d");

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("mousemove", onPointerMove);
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
  }

  function stop() {
    if (!canvas) return;

    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", paint);
    window.removeEventListener("mousemove", onPointerMove);
    document.documentElement.removeEventListener("mouseleave", onPointerLeave);
    canvas.remove();
    canvas = null;
    ctx = null;
    pointer = null;
  }

  function sync() {
    if (canRun()) {
      start();
      return;
    }
    stop();
  }

  reducedMotion.addEventListener("change", sync);
  wideHover.addEventListener("change", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }
})();
