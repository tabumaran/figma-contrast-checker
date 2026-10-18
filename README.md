# Contrast Checker (Figma plugin)

A small Figma plugin that checks **WCAG text contrast** on a selection, or on the whole page if nothing is selected.

For every text layer it:

1. Finds the solid background behind the text (walking up the layer tree, and blending semi-transparent fills).
2. Calculates the contrast ratio between text and background.
3. Compares it with the WCAG AA target: **4.5:1** for normal text, **3:1** for large text (24px+, or 18.66px+ bold).
4. Lists failures first. Click a result to jump to that layer.

Text on images or gradients is marked **Check** so you can review it by hand.

## Why I built it

While building a small design system, a contrast check found that our default input border was only 1.36:1 against white (WCAG needs 3:1). I wanted that check one click away inside Figma, instead of copying hex codes into a website.

## Install (development mode)

1. Download or clone this folder.
2. Open the **Figma desktop app**.
3. Go to **Plugins → Development → Import plugin from manifest…** and pick `manifest.json`.
4. Select a frame and run **Plugins → Development → Contrast Checker**.

## Run the tests

```bash
node test.js
```

## Limitations

- Only checks against the parent layers' fills. A shape placed *behind* the text as a sibling isn't detected yet.
- Images and gradients need a manual check.
- Checks text only, not icons or borders (WCAG 1.4.11 non-text contrast).
- Disabled states are flagged as failures, but WCAG doesn't require contrast for inactive controls. Tested on my design system file: 54 text layers, 46 pass, 8 "fail" — all 8 were disabled buttons and inputs.

## Built with

Plain JavaScript and the Figma Plugin API. Written with help from Claude Code: I described the behaviour and the WCAG rules, then reviewed, tested and adjusted the code.
