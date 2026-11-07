# Coding standards (read during review)

Judgement calls a linter cannot make. Mechanical rules live in `webgame/hygiene.test.js`.

- **One source of truth for tuning tables.** A cooldown, growth or damage table is defined once in `webgame/battle/sim.js`; the view and any ring or HUD *read* it. A copied table drifts when someone tunes the original.
- **Time-based, not frame-based.** Anything that fades, ages or counts down in `battle.js` steps with `dt`. A per-frame decrement runs faster at 144 Hz and slower at 30 Hz.
- **A wipe is total.** Code that clears the bullet field (burst, signature clear, reflect) also clears the rewind history (`hist`, `rev`), or the rewind restores what was cleared.
- **No per-frame allocation in `draw()`.** Hoist closures and constant objects out of the frame loop.
- **Keys in text go through `fixKeys`.** Story and battle text may name only the fire and swap keys (`Z`, `A`); everything else says "대시" or the action.
