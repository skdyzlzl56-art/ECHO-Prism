"""Stage 3 music: 'Faded Gallery' (field, late-night jazz piano) and 'Torn Canvas' (boss, rough string rock).
Outputs: Stage3_Field / Stage3_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
import glob, subprocess
from pathlib import Path
import numpy as np
from mido import MidiFile, Message
from pydub import AudioSegment
from music21 import stream, note, chord, tempo, pitch

HERE = Path(__file__).parent
FS = glob.glob(str(HERE / "tools/fluidsynth/*/bin/fluidsynth.exe"))[0]
SF2 = str(HERE / "tools/GeneralUser-GS.sf2")


def render(name, bpm, bars, cfg, reverb):
    """cfg: [(part, GM program or 'drum', velocity)]. Fixes programs/channels with mido, folds the reverb tail => seamless loop."""
    s = stream.Score()
    for p, _, _ in cfg:
        s.insert(0, p)
    mp = HERE / f"{name}.mid"
    s.write("midi", fp=str(mp))
    mid = MidiFile(str(mp))
    tracks = [t for t in mid.tracks if any(m.type == "note_on" for m in t)]
    assert len(tracks) == len(cfg), (len(tracks), len(cfg))
    ch = 0
    for t, (_, prog, vel) in zip(tracks, cfg):
        drum = prog == "drum"
        c = 9 if drum else ch
        if not drum:
            ch += 1
            if ch == 9:
                ch = 10
        for m in t:
            if hasattr(m, "channel"):
                m.channel = c
            if m.type == "note_on" and m.velocity > 0:
                m.velocity = vel
        if not drum:
            pos = next((j for j, m in enumerate(t) if not m.is_meta), len(t))
            t.insert(pos, Message("program_change", program=prog, channel=c, time=0))
    mid.save(str(mp))
    raw = HERE / "_raw.wav"
    subprocess.run([FS, "-ni", "-F", str(raw), "-r", "44100", "-o", f"synth.reverb.room-size={reverb[0]}",
                    "-o", f"synth.reverb.level={reverb[1]}", SF2, str(mp)], check=True, capture_output=True)
    a = AudioSegment.from_wav(str(raw))
    raw.unlink()
    x = np.array(a.get_array_of_samples(), dtype=np.float32).reshape(-1, a.channels)
    n = int(round(bars * 4 * 60 / bpm * a.frame_rate))
    loop = x[:n].copy()
    tail = x[n:]
    k = min(len(tail), n)
    loop[:k] += tail[:k]
    loop *= 0.89 * 32767 / max(np.abs(loop).max(), 1)
    seg = AudioSegment(loop.astype(np.int16).tobytes(), frame_rate=a.frame_rate, sample_width=2, channels=a.channels)
    seg.export(str(HERE / f"{name}_loop.ogg"), format="ogg", codec="libvorbis", parameters=["-q:a", "6"])
    (seg * 2).export(str(HERE / f"{name}_preview.mp3"), format="mp3", bitrate="192k")
    print(f"{name}: {len(seg)/1000:.1f}s loop")


def mk(n):
    return [stream.Part() for _ in range(n)]



# ---------------- Field: Faded Gallery (D minor, 92 BPM swung, 8 bars): ii-V-i jazz trio + vibes ----------------
BPM, BARS = 92, 8
PROG = "Dm7 G7 Cmaj7 Fmaj7 Bm7b5 E7 Am7 A7".split()
ROOT = {"Dm7": "D2", "G7": "G2", "Cmaj7": "C2", "Fmaj7": "F2", "Bm7b5": "B1", "E7": "E2", "Am7": "A1", "A7": "A1"}
WALK = {"Dm7": "D2 F2 A2 C3", "G7": "G2 B2 D3 F3", "Cmaj7": "C2 E2 G2 B2", "Fmaj7": "F2 A2 C3 E3",
        "Bm7b5": "B1 D2 F2 A2", "E7": "E2 G#2 B2 D3", "Am7": "A1 C2 E2 G2", "A7": "A1 C#2 E2 G2"}
VOICE = {"Dm7": "F3 A3 C4 E4", "G7": "F3 B3 D4 E4", "Cmaj7": "E3 G3 B3 D4", "Fmaj7": "E3 A3 C4 G4",
         "Bm7b5": "D3 F3 A3 C4", "E7": "D3 G#3 B3 F4", "Am7": "E3 G3 C4 B3", "A7": "E3 G3 C#4 B3"}
MEL = [  # piano right hand: (pitch|None, beats), sparse bluesy phrases with space
    [("A4", 1.5), ("C5", .5), ("D5", 1), (None, 1)], [("B4", 1), ("D5", 1), ("F5", 2)], [("E5", 3), (None, 1)], [("C5", 1), ("A4", 1), ("G4", 2)],
    [("F4", 1.5), ("A4", .5), ("C5", 2)], [("B4", 1), ("G#4", 1), ("E4", 2)], [("A4", 2), ("C5", 1), ("E5", 1)], [("C#5", 1), ("E5", 1), ("D5", 2)],
]
SW = 2 / 3                                               # swung eighth: off-beat lands on the 3rd triplet
mel, comp, bass, vib, drm = mk(5)
mel.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        if p:
            mel.insert(off, note.Note(p, quarterLength=q * .95))
        off += q
    for o in (0.0, 1.0 + SW, 2.5 + .0, 3.0 + SW):        # Charleston-ish comping
        if o < 4:
            comp.insert(t0 + o, chord.Chord(VOICE[c].split(), quarterLength=.5))
    for k, p in enumerate(WALK[c].split()):              # walking bass
        bass.insert(t0 + k, note.Note(p, quarterLength=.95))
    vib.insert(t0 + 2, note.Note(VOICE[c].split()[3].replace("4", "5"), quarterLength=2))
    for k in range(4):                                   # ride: 1 2 3 4 + swung skip on 2 and 4
        drm.insert(t0 + k, note.Note(51, quarterLength=.25))
        if k % 2:
            drm.insert(t0 + k + SW, note.Note(51, quarterLength=.25))
    for k in (1, 3):
        drm.insert(t0 + k, note.Note(44, quarterLength=.25))  # hi-hat foot
    drm.insert(t0, note.Note(36, quarterLength=.25))
render("Stage3_Field", BPM, BARS, [(mel, 0, 82), (comp, 0, 56), (bass, 32, 80), (vib, 11, 44), (drm, "drum", 55)], (0.7, 0.4))

# ---------------- Boss: Torn Canvas (C minor, 160 BPM, 16 bars): sawing strings + distorted guitar + driving drums ----------------
BPM, BARS = 160, 16
PROG = "Cm Cm Ab Bb Cm Cm Ab G Fm Fm Ab Bb Cm Ab Bb G".split()
ROOT = {"Cm": "C", "Ab": "G#", "Bb": "A#", "G": "G", "Fm": "F"}
TRI = {"Cm": "C3 D#3 G3", "Ab": "G#2 C3 D#3", "Bb": "A#2 D3 F3", "G": "G2 B2 D3", "Fm": "F2 G#2 C3"}
HIGH = {"Cm": "C5 D#5 G5", "Ab": "G#4 C5 D#5", "Bb": "A#4 D5 F5", "G": "G4 B4 D5", "Fm": "F4 G#4 C5"}
MEL = [
    [("G4", 1), ("C5", 1), ("D#5", 2)], [("D5", 1.5), ("C5", .5), ("G4", 2)], [("C5", 1), ("D#5", 1), ("G5", 2)], [("F5", 2), ("D5", 2)],
    [("G4", 1), ("C5", 1), ("D#5", 1), ("G5", 1)], [("F5", 1), ("D#5", 1), ("D5", 2)], [("C5", 2), ("G#4", 1), ("C5", 1)], [("B4", 2), ("D5", 2)],
    [("F4", 1), ("G#4", 1), ("C5", 2)], [("C5", 1.5), ("G#4", .5), ("F4", 2)], [("G#4", 1), ("C5", 1), ("D#5", 2)], [("D5", 2), ("F5", 2)],
    [("G5", 2), ("D#5", 1), ("C5", 1)], [("C5", 1), ("D#5", 1), ("G#5", 2)], [("A#5", 2), ("F5", 2)], [("G5", 1), ("D5", 1), ("B4", 2)],
]
lead, strg, gtr, bas, hit, drm = mk(6)
lead.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        lead.insert(off, note.Note(p, quarterLength=q * .9))
        off += q
    r = ROOT[c]
    for k in range(16):                                  # biting 16th saw on the root, octave jumps on off-beats for roughness
        strg.insert(t0 + k * .25, note.Note(r + ("4" if k % 4 == 3 else "3"), quarterLength=.2))
    for k in range(8):                                   # palm-muted power-chord chug
        gtr.insert(t0 + k * .5, chord.Chord([r + "2", TRI[c].split()[2]], quarterLength=.4))
    for k in range(8):
        bas.insert(t0 + k * .5, note.Note(r + "1", quarterLength=.45))
    if b % 4 == 0 or b >= 12:
        hit.insert(t0, chord.Chord(HIGH[c].split(), quarterLength=2.0 if b >= 12 else .5))
    for o in (0, 1.5, 2.5):
        drm.insert(t0 + o, note.Note(36, quarterLength=.25))
    for o in (1, 3):
        drm.insert(t0 + o, note.Note(38, quarterLength=.25))
    for k in range(8):
        drm.insert(t0 + k * .5, note.Note(42, quarterLength=.25))
    if b % 4 == 3:
        for j, n in enumerate((45, 47, 48, 50)):
            drm.insert(t0 + 3 + j * .25, note.Note(n, quarterLength=.25))
    if b % 4 == 0:
        drm.insert(t0, note.Note(49, quarterLength=.5))  # crash
render("Stage3_Boss", BPM, BARS, [(lead, 40, 95), (strg, 48, 85), (gtr, 30, 88), (bas, 34, 95), (hit, 55, 95), (drm, "drum", 100)], (0.5, 0.3))
