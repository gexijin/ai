// Shared runtime for workshop slide decks: navigation, scaling, fullscreen.
(() => {
  const deck = document.getElementById("deck");
  const slides = [...deck.querySelectorAll(".slide")];
  slides.forEach((s, i) => { s.dataset.num = i + 1; });

  // arrowheads for connectors
  document.body.insertAdjacentHTML("afterbegin",
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#ffffff"/></marker>' +
    '<marker id="arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#ffc000"/></marker></defs></svg>');
  document.body.insertAdjacentHTML("beforeend",
    '<div id="deck-help">← → or click to move · F fullscreen · Ctrl/Cmd+P save as PDF</div>');

  let cur = Math.max(0, Math.min(slides.length - 1, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  // Inside an .arcs element, draw a curved arrow from the .ctx words to the .next word.
  // Positions come from the rendered text, so this runs whenever a slide is shown.
  const drawArcs = (slide) => {
    const k = deck.getBoundingClientRect().width / 1600;
    slide.querySelectorAll(".arcs").forEach((box) => {
      box.querySelector(":scope > svg.arc")?.remove();
      let ctx = [...box.querySelectorAll(".ctx")].flatMap((e) => [...e.getClientRects()]);
      const nxt = box.querySelector(".next")?.getBoundingClientRect();
      if (!ctx.length || !nxt) return;
      const o0 = box.getBoundingClientRect();
      const probs = box.querySelector(".probs");
      if (probs) probs.style.left = Math.max(0, Math.min((nxt.left - o0.left) / k - 20, box.offsetWidth - probs.offsetWidth)) + "px";
      // when the context wraps, start the arrow from its part on the predicted word's line
      const sameLine = ctx.filter((r) => Math.abs(r.bottom - nxt.bottom) < 5 * k);
      if (sameLine.length) ctx = sameLine;
      const o = box.getBoundingClientRect();
      const left = Math.min(...ctx.map((r) => r.left)), right = Math.max(...ctx.map((r) => r.right));
      const bottom = Math.max(...ctx.map((r) => r.bottom));
      const x1 = ((left + right) / 2 - o.left) / k, y1 = (bottom - o.top) / k + 6;
      const x2 = ((nxt.left + nxt.right) / 2 - o.left) / k, y2 = (nxt.bottom - o.top) / k + 6;
      const dip = Math.max(y1, y2) + 70;
      box.insertAdjacentHTML("beforeend",
        `<svg class="arc" style="position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none">` +
        `<path d="M${x1},${y1} C${x1},${dip} ${x2},${dip} ${x2},${y2 + 8}" fill="none" stroke="var(--accent)" stroke-width="5" marker-end="url(#arrow-accent)"/></svg>`);
    });
  };
  const show = () => {
    slides.forEach((s, i) => s.classList.toggle("active", i === cur));
    history.replaceState(null, "", "#" + (cur + 1));
    drawArcs(slides[cur]);
  };
  // Elements with class "step" appear one per click, like PowerPoint's click animations.
  const steps = (i) => [...slides[i].querySelectorAll(".step")];
  const move = (d) => {
    const st = steps(cur);
    if (d > 0) {
      const next = st.find((e) => !e.classList.contains("shown"));
      if (next) return next.classList.add("shown");
    } else {
      const last = st.filter((e) => e.classList.contains("shown")).pop();
      if (last) return last.classList.remove("shown");
    }
    const to = Math.max(0, Math.min(slides.length - 1, cur + d));
    if (to === cur) return;
    cur = to;
    // arriving backward shows the finished slide; arriving forward starts it fresh
    steps(cur).forEach((e) => e.classList.toggle("shown", d < 0));
    show();
  };
  const fit = () => {
    const k = Math.min(innerWidth / 1600, innerHeight / 900);
    deck.style.transform = `translate(-50%, -50%) scale(${k})`;
  };

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); move(1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { cur = 0; show(); }
    else if (e.key === "End") { cur = slides.length - 1; show(); }
    else if (e.key === "f" || e.key === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });

  // click or tap: right two-thirds forward, left third back
  deck.addEventListener("click", (e) => move(e.clientX < innerWidth / 3 ? -1 : 1));
  let touchX = null;
  deck.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) { e.preventDefault(); move(dx < 0 ? 1 : -1); }
    touchX = null;
  });

  addEventListener("resize", () => { fit(); drawArcs(slides[cur]); });
  document.fonts?.ready.then(() => drawArcs(slides[cur]));
  // print shows every slide, so draw all arcs first
  addEventListener("beforeprint", () => {
    deck.style.transform = "none";
    slides.forEach((s) => { const d = s.style.display; s.style.display = "block"; drawArcs(s); s.style.display = d; });
    fit();
  });
  addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (n >= 1 && n <= slides.length && n - 1 !== cur) { cur = n - 1; show(); }
  });
  fit();
  show();
})();
