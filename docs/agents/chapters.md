# Chapters, music, and implementer checklist

## Add a chapter
Copy `webgame/stage6/` as the template (newest, has every rule). Each `webgame/stageN/` holds `battles.js` (BATTLES + ACTS, party spread from the previous chapter's `PARTYn`), `story.js` (lines appended to SCRIPT), optional `scenes.js`, and `stageN.test.js` (speakers/bgm/fx/theme/act exist, line count 130–180). Then:
- Add every file as a `<script>` in `webgame/index.html`. `webgame/cross.test.js` fails if one is missing.
- New battle rules are options on the battle config, read in `webgame/battle/sim.js`. Configs without the option must behave as before.

## Tests
Run `npm test` (all `*.test.js`). `node --test <directory>` does not work on Node 24.

## Music
Generator scripts: `music/stageN_music.py`, notes in `music/README.md`. `music/tools/` is git-ignored: in a worktree, copy it from the main checkout before generating. Loops go to `webgame/audio/bgm_<key>.ogg`. Judging how a track sounds is the user's job.

## Implementer checklist
- Call the `tdd` skill. Done means: the report quotes the failing test output from before the change, then the passing run.
- Worktrees may lack `.scratch/`; read specs and tickets from the main checkout path.
- Display effects (flash, banner, sprites in `webgame/battle.js`) cannot be tested headless: list them in the report as unverified in a browser.
