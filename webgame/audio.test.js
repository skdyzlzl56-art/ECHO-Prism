// audio.js through its interface only: a fake AudioContext that records gains, a fake fetch and <audio>. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createAudio } = require("./audio.js");

function rig({ vol = { bgm: .5, sfx: .7 }, failFetch = false } = {}) {
  const r = { made: 0, fetched: [], targets: [], buses: [], audios: [], started: 0, vol };
  const makeCtx = () => {
    r.made++;
    const dest = {}, ctx = { destination: dest, currentTime: 0, sampleRate: 100, decodeAudioData: async b => b };
    const gain = () => { const g = { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime: v => r.targets.push(v) }, connect(x) { if (x === dest) r.buses.push(g); return x; } }; return g; };
    const src = () => ({ connect: x => x, start() { r.started++; }, stop() {} });
    Object.assign(ctx, {
      createGain: gain,
      createOscillator: () => ({ frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: x => x, start() {}, stop() {} }),
      createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: src,
    });
    return ctx;
  };
  const audio = createAudio({
    volume: k => r.vol[k], makeCtx, later: () => {},
    fetchBuf: async n => { r.fetched.push(n); if (failFetch) throw new Error("file://"); return n; },
    makeAudio: n => { const a = { n, volume: 1, play: async () => {}, pause() {} }; r.audios.push(a); return a; },
  });
  return { audio, r };
}

test("before the first gesture sounds do nothing and no context is made; unlock makes exactly one", () => {
  const { audio, r } = rig(); audio.sweep(1, 2, .1); audio.noise(.1); audio.blip(300);
  assert.equal(r.made, 0); assert.equal(audio.unlocked, false);
  audio.unlock(); audio.unlock(); assert.equal(r.made, 1); assert.equal(audio.unlocked, true);
});

test("music asked for before the gesture starts on unlock", async () => {
  const { audio, r } = rig(); await audio.bgm.play("title"); assert.deepEqual(r.fetched, []);
  audio.unlock(); await new Promise(res => setImmediate(res)); assert.deepEqual(r.fetched, ["title"]); assert.equal(r.started, 1);
});

test("silent fight: hush, then layers bring back attacks (1), music (2), everything (4); the 'shot' bus follows sfx and stays finite", async () => {
  const { audio, r } = rig(); audio.unlock();
  audio.sweep(1, 2, .1); audio.sfxBus("shot"); audio.sweep(1, 2, .1); audio.sfxBus("sfx"); await audio.bgm.play("battle");
  const [sfx, shot, bgm] = r.buses; assert.equal(r.buses.length, 3);
  const vols = () => [shot, sfx, bgm].map(b => b.gain.value);
  assert.deepEqual(vols(), [.7, .7, .5]);
  audio.hush(true); assert.deepEqual(vols(), [0, 0, 0]);
  audio.hushLayer(1); assert.deepEqual(vols(), [.7, 0, 0]);
  audio.hushLayer(2); assert.deepEqual(vols(), [.7, 0, .5]);
  audio.hushLayer(4); assert.deepEqual(vols(), [.7, .7, .5]);
  audio.hush(false); assert.deepEqual(vols(), [.7, .7, .5]); assert.ok(vols().every(Number.isFinite));   // the end of the final fight once froze here
  assert.equal(audio.hushed, false); assert.equal(audio.layer, 0);
});

test("the volume menu applies to playing buses at once", () => {
  const { audio, r } = rig(); audio.unlock(); audio.sweep(1, 2, .1);
  r.vol.sfx = .2; audio.syncVolumes(); assert.equal(r.buses[0].gain.value, .2);
});

test("every track plays at .2 except the intro (.18); a battle can swallow music with bgm.vol", async () => {
  const { audio, r } = rig(); audio.unlock();
  await audio.bgm.play("s4_field"); await audio.bgm.play("intro"); await audio.bgm.play("s6_boss");
  assert.deepEqual(r.targets.filter(v => v > 0), [.2, .18, .2]);   // the old track's fade-out goes to 0
  audio.bgm.vol(.5); assert.equal(r.targets.at(-1), .1);
});

test("when WebAudio cannot load the file (file://) the <audio> fallback plays, at the menu volume, and follows hush", async () => {
  const { audio, r } = rig({ failFetch: true }); audio.unlock(); await audio.bgm.play("s1_field");
  assert.equal(r.audios.length, 1); assert.ok(Math.abs(r.audios[0].volume - .1) < 1e-9);   // .2 * bgm .5
  audio.hush(true); assert.equal(r.audios[0].volume, 0);
  audio.hushLayer(2); assert.ok(Math.abs(r.audios[0].volume - .1) < 1e-9);
});

test("asking for a second track while the first is loading plays only the second", async () => {
  const { audio, r } = rig(); audio.unlock();
  const a = audio.bgm.play("s1_field"), b = audio.bgm.play("s2_field"); await Promise.all([a, b]);
  assert.equal(r.started, 1);
});
