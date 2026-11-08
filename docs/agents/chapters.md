# Chapters, music, and implementer checklist

## Add a chapter
Copy `webgame/stage6/` as the template (newest, has every rule). Each `webgame/stageN/` holds `battles.js` (BATTLES only: index.html makes each one an ACTS scene of the same name; party spread from the previous chapter's `PARTYn`), `story.js` (lines appended to SCRIPT), optional `scenes.js`, and `stageN.test.js` (speakers/bgm/fx/theme/act exist, line count 130–180). Then:
- Add every file as a `<script>` in `webgame/index.html`. `webgame/cross.test.js` fails if one is missing.
- New battle rules are options on the battle config, read in `webgame/battle/sim.js`. Configs without the option must behave as before.

## Tests
Run `npm test` (all `*.test.js`). `node --test <directory>` does not work on Node 24.
- Put a feature's tests in its own new `*.test.js` (e.g. `webgame/battle/<feature>.test.js`); appending to the end of `sim.test.js` makes every parallel ticket conflict.
- `webgame/battle.smoke.test.js` runs the real `battle.js` frame loop on stubs. A view change that needs a new global (a DOM helper, a constant) adds it to the stub list there.
- `webgame/hygiene.test.js` fails on leftover conflict markers and on stale key text.

## Merging
- Run `git diff --check` and `npm test` before committing a merge; commit only when both are green. After resolving a conflict in a test file, check each test still has its closing `});`.
- Start the next implementer only after the integration branch is green, so its base holds every merged ticket.
- Right before reporting, an implementer re-reads the integration branch tip and merges it again; a tip that moved after an earlier "clean merge" is the usual source of conflicts.
- Shared registration lists (`let` state and the exported names in `webgame/battle/sim.js`) take one entry per line, so parallel tickets add lines instead of editing the same one.

## Keys
Key names appear in several places: `webgame/dialogue.js` (`KEYS`), `webgame/menu.js` (`fixKeys`, `keyLabel`), `battle.js` hints, story text (`script.js`, `stageN/story.js`, `stageN/scenes.js`). When a key changes, grep for its old name in all of them.

## Music
Generator scripts: `music/stageN_music.py`, notes in `music/README.md`. `music/tools/` is git-ignored: in a worktree, copy it from the main checkout before generating. Loops go to `webgame/audio/bgm_<key>.ogg`. Judging how a track sounds is the user's job.

## Implementer checklist
- Call the `tdd` skill. Done means: the report quotes the failing test output from before the change, then the passing run.
- Worktrees may lack `.scratch/`; read specs and tickets from the main checkout path.
- Display effects (flash, banner, sprites in `webgame/battle.js`) cannot be tested headless: list them in the report as unverified in a browser.

## Seeing it run
Display effects are checkable: serve `webgame/` (`npx http-server webgame` or any static server), open `index.html` with the `chrome-devtools` MCP (`navigate_page`, `take_screenshot`), and start a battle from the stage menu. Report what the screenshot shows; list only what you could not open as unverified.

## Coding standards
Judgement rules for review: `CODING_STANDARDS.md`.
