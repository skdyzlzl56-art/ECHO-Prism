"""Stage 1 music: 'Lamp Corridor' (field/explore, warm and gentle) and 'Guardian Gate' (boss, heavy rock-orchestral).
Outputs: Stage1_Field / Stage1_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
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


# ---------------- Field: Lamp Corridor (C major, 84 BPM, 8 bars) ----------------
BPM, BARS = 84, 8
CH = {"C": ("C2", "C3 G3 C4 E4", "C4 E4 G4"), "G": ("G2", "G3 D4 G4 B4", "B3 D4 G4"),
      "Am": ("A2", "A3 E4 A4 C5", "A3 C4 E4"), "F": ("F2", "F3 C4 F4 A4", "A3 C4 F4")}
PROG = "C G Am F C G F G".split()
MEL = [
    [("E5", 1), ("G5", .5), ("E5", .5), ("D5", 1), ("C5", 1)], [("D5", 1), ("B4", 1), ("G4", 2)],
    [("C5", 1), ("E5", 1), ("A5", 1), ("G5", 1)], [("A5", 1.5), ("G5", .5), ("F5", 1), ("C5", 1)],
    [("E5", 1), ("G5", .5), ("E5", .5), ("D5", 1), ("C5", 1)], [("B4", 1), ("D5", 1), ("G5", 2)],
    [("A5", 1), ("G5", 1), ("F5", 1), ("E5", 1)], [("D5", 2), ("B4", 1), ("D5", 1)],
]
mel, gtr, pad, bas = mk(4)
mel.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        mel.insert(off, note.Note(p, quarterLength=q))
        off += q
    root, arp, tri = CH[c]
    tones = arp.split()
    for k, i in enumerate([0, 1, 2, 3, 2, 3, 2, 1]):
        gtr.insert(t0 + k * .5, note.Note(tones[i], quarterLength=.6))
    pad.insert(t0, chord.Chord(tri.split(), quarterLength=4.0))
    bas.insert(t0, note.Note(root, quarterLength=1.8))
    bas.insert(t0 + 2, note.Note(root, quarterLength=1.8))
render("Stage1_Field", BPM, BARS, [(mel, 10, 82), (gtr, 24, 60), (pad, 89, 40), (bas, 32, 70)], (0.7, 0.5))

# ---------------- Boss: Guardian Gate (D minor, 150 BPM, 16 bars) ----------------
BPM, BARS = 150, 16
PROG = "Dm Dm Bb C Dm Dm Bb A Gm Gm Bb C Dm F Gm A".split()
ROOT = {"Dm": "D", "Bb": "B-", "C": "C", "A": "A", "Gm": "G", "F": "F"}
TRI = {"Dm": "D4 F4 A4", "Bb": "B-3 D4 F4", "C": "C4 E4 G4", "A": "A3 C#4 E4", "Gm": "G3 B-3 D4", "F": "F3 A3 C4"}
CHOIR = {"Dm": "D5 F5 A5", "Bb": "B-4 D5 F5", "C": "C5 E5 G5", "A": "A4 C#5 E5", "Gm": "G4 B-4 D5", "F": "F4 A4 C5"}
MEL = [
    [("D5", 1), ("D5", .5), ("F5", .5), ("A5", 1), ("G5", .5), ("F5", .5)], [("E5", 1), ("D5", 1), ("A4", 2)],
    [("D5", 1), ("F5", 1), ("B-5", 1), ("A5", 1)], [("G5", 1.5), ("E5", .5), ("C5", 2)],
    [("D5", 1), ("D5", .5), ("F5", .5), ("A5", 1), ("G5", .5), ("F5", .5)], [("F5", 1), ("E5", 1), ("D5", 2)],
    [("B-5", 1), ("A5", 1), ("F5", 1), ("D5", 1)], [("E5", 1), ("A5", 1), ("C#6", 2)],
    [("G5", 1), ("B-5", 1), ("D6", 2)], [("C6", 1), ("B-5", 1), ("G5", 2)],
    [("F5", 1), ("B-5", 1), ("D6", 1), ("C6", 1)], [("E6", 2), ("D6", 1), ("C6", 1)],
    [("D6", 1), ("A5", 1), ("F5", 1), ("A5", 1)], [("C6", 1), ("A5", 1), ("F5", 2)],
    [("B-5", 1), ("A5", 1), ("G5", 1), ("F5", 1)], [("E5", 1), ("F5", .5), ("E5", .5), ("C#5", 1), ("E5", 1)],
]
lead, gtr, bas, strg, choir, taiko, drm = mk(7)
lead.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        lead.insert(off, note.Note(p, quarterLength=q * .95))
        off += q
    r = ROOT[c]
    r3 = pitch.Pitch(r + "3")
    f3 = r3.transpose("P5")
    for k in range(8):                                   # palm-muted power chords + driving bass
        gtr.insert(t0 + k * .5, note.Note(r3.nameWithOctave, quarterLength=.45))
        gtr.insert(t0 + k * .5, note.Note(f3.nameWithOctave, quarterLength=.45))
        bas.insert(t0 + k * .5, note.Note(r + "2", quarterLength=.45))
    strg.insert(t0, chord.Chord(TRI[c].split(), quarterLength=4.0))
    if b >= 8:                                           # chorus lift: choir joins
        choir.insert(t0, chord.Chord(CHOIR[c].split(), quarterLength=4.0))
    for o in (0, 2):
        taiko.insert(t0 + o, note.Note("D3", quarterLength=.5))
    for k in range(8):
        drm.insert(t0 + k * .5, note.Note(42, quarterLength=.25))
    for o in (0, 1.5, 2, 3.5):
        drm.insert(t0 + o, note.Note(36, quarterLength=.25))
    for o in (1, 3):
        drm.insert(t0 + o, note.Note(38, quarterLength=.25))
    if b % 8 == 0:
        drm.insert(t0, note.Note(49, quarterLength=1))
    if b % 4 == 3:                                       # fill
        for j, n in enumerate((38, 50, 47, 45)):
            drm.insert(t0 + 3 + j * .25, note.Note(n, quarterLength=.25))
render("Stage1_Boss", BPM, BARS, [(lead, 61, 100), (gtr, 30, 85), (bas, 34, 95), (strg, 48, 55), (choir, 52, 50), (taiko, 116, 100), (drm, "drum", 100)], (0.4, 0.3))
