// Contrast Checker – a small Figma plugin that checks WCAG text contrast.
// It looks at every text layer in the selection (or the whole page if nothing
// is selected), finds the solid background behind it, and reports the ratio.

// ---------- Pure helpers (also used by the tests) ----------

function channel(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Relative luminance of an {r,g,b} colour with values from 0 to 1.
function luminance(color) {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Mix a semi-transparent foreground over an opaque background.
function blend(fg, bg, alpha) {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

// WCAG 2.x: "large text" is at least 24px, or at least 18.66px and bold.
function isLargeText(fontSize, fontWeight) {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
}

function requiredRatio(fontSize, fontWeight) {
  return isLargeText(fontSize, fontWeight) ? 3 : 4.5;
}

function toHex(color) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return ("#" + h(color.r) + h(color.g) + h(color.b)).toUpperCase();
}

if (typeof module !== "undefined") {
  module.exports = { luminance, contrastRatio, blend, isLargeText, requiredRatio, toHex };
}

// ---------- Figma plugin code ----------

if (typeof figma !== "undefined") {
  figma.showUI(__html__, { width: 360, height: 520, themeColors: true });

  const WHITE = { r: 1, g: 1, b: 1 };

  function topSolidPaint(paints) {
    if (!Array.isArray(paints)) return null;
    for (let i = paints.length - 1; i >= 0; i--) {
      const p = paints[i];
      if (p.visible === false) continue;
      if (p.type === "SOLID") return p;
      return { unsupported: p.type }; // image or gradient on top
    }
    return null;
  }

  // Walk up the layer tree to find the first solid background behind a node.
  function findBackground(node) {
    let parent = node.parent;
    while (parent && parent.type !== "PAGE" && parent.type !== "DOCUMENT") {
      if ("fills" in parent && parent.fills !== figma.mixed) {
        const p = topSolidPaint(parent.fills);
        if (p && p.unsupported) return { manual: "background is " + p.unsupported.toLowerCase() };
        if (p) {
          const a = (p.opacity === undefined ? 1 : p.opacity) * ("opacity" in parent ? parent.opacity : 1);
          if (a >= 0.99) return { color: p.color };
          if (a > 0) {
            const below = findBackground(parent);
            if (below.manual) return below;
            return { color: blend(p.color, below.color, a) };
          }
        }
      }
      parent = parent.parent;
    }
    // Nothing found: use the page background, or white.
    const page = figma.currentPage;
    const bg = page.backgrounds && topSolidPaint(page.backgrounds);
    return { color: bg && !bg.unsupported ? bg.color : WHITE };
  }

  async function collectTextNodes() {
    const roots = figma.currentPage.selection.length
      ? figma.currentPage.selection
      : [figma.currentPage];
    const out = [];
    for (const root of roots) {
      if (root.type === "TEXT") out.push(root);
      if ("findAllWithCriteria" in root) {
        out.push(...root.findAllWithCriteria({ types: ["TEXT"] }));
      }
    }
    return out.filter((n) => n.visible);
  }

  async function check() {
    const nodes = await collectTextNodes();
    const results = [];
    for (const node of nodes) {
      const bg = findBackground(node);
      const segments = node.getStyledTextSegments(["fills", "fontSize", "fontWeight"]);
      for (const seg of segments) {
        const paint = topSolidPaint(seg.fills);
        const base = {
          id: node.id,
          layer: node.name,
          text: seg.characters.trim().slice(0, 40),
          fontSize: seg.fontSize,
        };
        if (!paint || paint.unsupported || bg.manual) {
          results.push(Object.assign(base, {
            status: "manual",
            note: bg.manual || "text uses an image or gradient",
          }));
          continue;
        }
        const alpha = (paint.opacity === undefined ? 1 : paint.opacity) * node.opacity;
        const fg = alpha < 1 ? blend(paint.color, bg.color, alpha) : paint.color;
        const ratio = contrastRatio(fg, bg.color);
        const needed = requiredRatio(seg.fontSize, seg.fontWeight);
        results.push(Object.assign(base, {
          status: ratio >= needed ? "pass" : "fail",
          ratio: Math.round(ratio * 100) / 100,
          needed,
          fg: toHex(fg),
          bg: toHex(bg.color),
        }));
      }
    }
    const order = { fail: 0, manual: 1, pass: 2 };
    results.sort((a, b) => order[a.status] - order[b.status]);
    figma.ui.postMessage({
      type: "results",
      scope: figma.currentPage.selection.length ? "selection" : "page",
      results,
    });
  }

  figma.ui.onmessage = async (msg) => {
    if (msg.type === "check") await check();
    if (msg.type === "select") {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (node) {
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
      }
    }
  };

  check();
}
