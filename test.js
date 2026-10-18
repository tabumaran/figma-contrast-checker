// Run with: node test.js
const assert = require("assert");
const { contrastRatio, blend, requiredRatio, toHex } = require("./code.js");

const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const near = (a, b) => Math.abs(a - b) < 0.01;

// Known values
assert(near(contrastRatio(hex("#000000"), hex("#FFFFFF")), 21), "black on white is 21:1");
assert(near(contrastRatio(hex("#FFFFFF"), hex("#FFFFFF")), 1), "same colour is 1:1");
assert(near(contrastRatio(hex("#777777"), hex("#FFFFFF")), 4.48), "#777 on white is about 4.48:1");

// Nordly design system pairs
assert(near(contrastRatio(hex("#FFFFFF"), hex("#C4372B")), 5.35), "white on brand");
assert(near(contrastRatio(hex("#DCDDE1"), hex("#FFFFFF")), 1.36), "light border fails 3:1");

// Thresholds
assert.strictEqual(requiredRatio(16, 400), 4.5);
assert.strictEqual(requiredRatio(24, 400), 3);
assert.strictEqual(requiredRatio(19, 700), 3);
assert.strictEqual(requiredRatio(19, 400), 4.5);

// Transparency: 50% black over white is mid grey
assert.strictEqual(toHex(blend(hex("#000000"), hex("#FFFFFF"), 0.5)), "#808080");

console.log("All tests passed");
