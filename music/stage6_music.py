"""Stage 6 music: 'Prism Core' (field, reprises motifs of stages 1/2/4/5) and 'Last Name' (boss, resolves into D minor = Stage 1 boss key).
Outputs: Stage6_Field / Stage6_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
import glob, subprocess
from pathlib import Path
import numpy as np
from mido import MidiFile, Message
from pydub import AudioSegment
from music21 import stream, note, chord, tempo, pitch

HERE = Path(__file__).parent
FS = glob.glob(str(HERE / "tools/fluidsynth/*/bin/fluidsynth.exe"))[0]
SF2 = str(HERE / "tools/GeneralUser-GS.sf2")


def render(name, bpm, bars, cfg, reverb, beats=4):
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
    n = int(round(bars * beats * 60 / bpm * a.frame_rate))
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



# ---------------- Field: Prism Core (A minor, 72 BPM, 8 bars) ----------------
# motifs: S1 lamp (E5 G5 E5 D5 C5), S4 clock tick (E5/A5), S2 bell (E6 .. C6 B5 A5), S5 cello (A4 F4 A4 D5)
BPM, BARS = 72, 8
PROG = "Am Am F F C Dm E Am".split()
ARP = {"Am": "A3 E4 A4 C5", "F": "F3 C4 F4 A4", "C": "C3 G3 C4 E4", "Dm": "D3 A3 D4 F4", "E": "E3 B3 E4 G#4"}
ROOT = {"Am": "A1", "F": "F1", "C": "C2", "Dm": "D2", "E": "E2"}
MEL = [[("E5", 1), ("G5", .5), ("E5", .5), ("D5", 1), ("C5", 1)], [("E5", 2), (None, 2)],                       # S1 lamp
       [("A4", 2), ("F4", 1), ("A4", 1)], [("D5", 3), (None, 1)],                                              # S5 cello
       [("E6", 1.5), (None, .5), ("C6", 1), ("B5", 1)], [("A5", 2), ("D5", 2)],                                # S2 bell
       [("E5", 1), ("A5", 1), ("E5", 1), ("G#5", 1)], [("A5", 4)]]                                              # S4 tick
mel, harp, pad, bas, tick = mk(5)
mel.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        if p:
            mel.insert(off, note.Note(p, quarterLength=q * .95))
        off += q
    tones = ARP[c].split()
    for k, i in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
        harp.insert(t0 + k * .5, note.Note(tones[i], quarterLength=.9))
    pad.insert(t0, chord.Chord(tones[:3], quarterLength=4))
    bas.insert(t0, note.Note(ROOT[c], quarterLength=3.8))
    for k in range(4):                                    # faint clock
        tick.insert(t0 + k, note.Note("E6" if k % 2 == 0 else "A5", quarterLength=.1))
render("Stage6_Field", BPM, BARS, [(mel, 10, 80), (harp, 46, 60), (pad, 52, 45), (bas, 42, 65), (tick, 115, 35)], (0.85, 0.5))

# ---------------- Boss: Last Name (150 BPM, 16 bars): E minor -> resolves to D minor (Stage 1 boss key) ----------------
BPM, BARS = 150, 16
PROG = "Em Em C D Em Em C B Am Am F A Gm Bb A Dm".split()
ROOT = {"Em": "E", "C": "C", "D": "D", "B": "B", "Am": "A", "F": "F", "A": "A", "Gm": "G", "Bb": "B-", "Dm": "D"}
TRI = {"Em": "E3 G3 B3", "C": "C3 E3 G3", "D": "D3 F#3 A3", "B": "B2 D#3 F#3", "Am": "A2 C3 E3", "F": "F3 A3 C4", "A": "A2 C#3 E3",
       "Gm": "G3 B-3 D4", "Bb": "B-3 D4 F4", "Dm": "D3 F3 A3"}
HIGH = {"Em": "E5 G5 B5", "C": "C5 E5 G5", "D": "D5 F#5 A5", "B": "B4 D#5 F#5", "Am": "A4 C5 E5", "F": "F4 A4 C5", "A": "A4 C#5 E5",
        "Gm": "G4 B-4 D5", "Bb": "B-4 D5 F5", "Dm": "D5 F5 A5"}
MEL = [  # S4 boss opening, S1 boss motif (D5 D5 F5 A5 G5 F5) returns for the last four bars
    [("B4", 1), ("E5", 1), ("G5", 2)], [("F#5", 2), ("E5", 2)], [("G5", 1), ("E5", 1), ("C5", 2)], [("A5", 2), ("F#5", 2)],
    [("B4", 1), ("E5", 1), ("G5", 2)], [("F#5", 2), ("E5", 2)], [("G5", 1), ("C6", 1), ("E6", 2)], [("D#6", 2), ("B5", 2)],
    [("A4", 1), ("C5", 1), ("E5", 2)], [("E5", 2), ("C5", 2)], [("F5", 1), ("A5", 1), ("C6", 2)], [("E6", 2), ("C#6", 2)],
    [("G5", 1), ("B-5", 1), ("D6", 2)], [("D6", 1), ("B-5", 1), ("F5", 2)],
    [("E5", 1), ("A5", 1), ("C#6", 1), ("E6", 1)], [("D5", 1), ("D5", .5), ("F5", .5), ("A5", 1), ("G5", .5), ("F5", .5)],
]
lead, strg, gtr, bas, choir, taiko, drm = mk(7)
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
    for k in range(8):
        gtr.insert(t0 + k * .5, note.Note(r3.nameWithOctave, quarterLength=.45))
        gtr.insert(t0 + k * .5, note.Note(f3.nameWithOctave, quarterLength=.45))
        bas.insert(t0 + k * .5, note.Note(r + "2", quarterLength=.45))
    strg.insert(t0, chord.Chord(TRI[c].split(), quarterLength=4))
    if b >= 8:
        choir.insert(t0, chord.Chord(HIGH[c].split(), quarterLength=4))
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
render("Stage6_Boss", BPM, BARS, [(lead, 61, 95), (strg, 48, 60), (gtr, 30, 80), (bas, 34, 90), (choir, 52, 60), (taiko, 116, 100), (drm, "drum", 90)], (0.7, 0.4))
