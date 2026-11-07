"""Stage 4 music: 'Stopped Hours' (field, ticking minimal strings) and 'Odd Gears' (boss, 7/8 electric).
Outputs: Stage4_Field / Stage4_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
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



# ---------------- Field: Stopped Hours (A minor, 100 BPM, 8 bars): pizzicato ticks + sparse sustained strings ----------------
BPM, BARS = 100, 8
PROG = "Am Am F F Dm Dm E E".split()
TRI = {"Am": "A3 C4 E4", "F": "F3 A3 C4", "Dm": "D3 F3 A3", "E": "E3 G#3 B3"}
ROOT = {"Am": "A2", "F": "F2", "Dm": "D2", "E": "E2"}
TICK = {"Am": "E5 A5", "F": "F5 C6", "Dm": "D5 A5", "E": "E5 B5"}
MEL = [[("E5", 2), ("A5", 2)], [("G5", 3), (None, 1)], [("A5", 2), ("C6", 2)], [("B5", 3), (None, 1)],
       [("D6", 2), ("A5", 2)], [("F5", 3), (None, 1)], [("G#5", 2), ("B5", 2)], [("E5", 3), (None, 1)]]
tick, tock, pad, cel, mel = mk(5)
tick.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    hi = TICK[c].split()
    for k in range(8):                                   # clock: every 8th, alternating tick/tock pitch
        tick.insert(t0 + k * .5, note.Note(hi[k % 2], quarterLength=.15))
    for k in (0, 2):
        tock.insert(t0 + k, note.Note(ROOT[c], quarterLength=.3))   # low pizzicato on 1 and 3
    if b % 2 == 0:
        pad.insert(t0, chord.Chord(TRI[c].split(), quarterLength=8))
    cel.insert(t0, note.Note(ROOT[c].replace("2", "1"), quarterLength=4))
    off = t0
    for p, q in MEL[b]:
        if p:
            mel.insert(off, note.Note(p, quarterLength=q * .9))
        off += q
render("Stage4_Field", BPM, BARS, [(tick, 45, 60), (tock, 45, 85), (pad, 48, 55), (cel, 42, 70), (mel, 46, 60)], (0.7, 0.4))

# ---------------- Boss: Odd Gears (E minor, 176 BPM, 16 bars of 7/8): driving electric in a lopsided 2+2+3 ----------------
BPM, BARS, BEATS = 176, 16, 3.5
PROG = "Em Em C D Em Em C B Am Am C D Em C D B".split()
ROOT = {"Em": "E", "C": "C", "D": "D", "B": "B", "Am": "A"}
FIFTH = {"Em": "B2", "C": "G2", "D": "A2", "B": "F#3", "Am": "E3"}
HIGH = {"Em": "E5 G5 B5", "C": "C5 E5 G5", "D": "D5 F#5 A5", "B": "B4 D#5 F#5", "Am": "A4 C5 E5"}
MEL = [  # 7 eighths per bar, in quarter lengths (sum 3.5)
    [("B4", 1), ("E5", 1), ("G5", 1.5)], [("F#5", 1), ("E5", .5), ("B4", 2)], [("G5", 1), ("E5", 1), ("C5", 1.5)], [("A5", 1), ("F#5", 1), ("D5", 1.5)],
    [("B4", .5), ("E5", .5), ("G5", 1), ("B5", 1.5)], [("A5", 1), ("G5", .5), ("E5", 2)], [("G5", 1), ("C6", 1), ("G5", 1.5)], [("F#5", 1), ("D#5", 1), ("B4", 1.5)],
    [("A4", 1), ("C5", 1), ("E5", 1.5)], [("E5", 1), ("C5", .5), ("A4", 2)], [("G5", 1), ("E5", 1), ("C5", 1.5)], [("A5", 1), ("F#5", 1), ("D5", 1.5)],
    [("B5", 1.5), ("G5", 1), ("E5", 1)], [("C6", 1), ("G5", 1), ("E5", 1.5)], [("D6", 1), ("A5", 1), ("F#5", 1.5)], [("D#5", 1), ("F#5", 1), ("B5", 1.5)],
]
lead, strg, gtr, bas, hit, drm = mk(6)
lead.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * BEATS
    off = t0
    for p, q in MEL[b]:
        lead.insert(off, note.Note(p, quarterLength=q * .9))
        off += q
    r = ROOT[c]
    for k in range(7):                                   # staccato saw eighths, accent on the 2+2+3 group starts
        strg.insert(t0 + k * .5, note.Note(r + ("4" if k in (0, 2, 4) else "3"), quarterLength=.4))
    for k in range(7):                                   # palm-muted chug
        gtr.insert(t0 + k * .5, chord.Chord([r + "2", FIFTH[c]], quarterLength=.4))
        bas.insert(t0 + k * .5, note.Note(r + "1", quarterLength=.45))
    if b % 4 == 0 or b >= 12:
        hit.insert(t0, chord.Chord(HIGH[c].split(), quarterLength=1.5))
    for o in (0, 1.5, 2.5):                              # kick on group starts (2+2+3 -> eighths 0,2,4)... plus pickup
        drm.insert(t0 + o, note.Note(36, quarterLength=.25))
    for o in (1, 2):                                     # snare on eighths 2 and 4
        drm.insert(t0 + o, note.Note(38, quarterLength=.25))
    drm.insert(t0 + 3, note.Note(38, quarterLength=.25))
    for k in range(7):
        drm.insert(t0 + k * .5, note.Note(42, quarterLength=.25))
    if b % 4 == 3:
        for j, n in enumerate((45, 47, 48)):
            drm.insert(t0 + 2.25 + j * .25, note.Note(n, quarterLength=.25))
    if b % 4 == 0:
        drm.insert(t0, note.Note(49, quarterLength=.5))
render("Stage4_Boss", BPM, BARS, [(lead, 29, 95), (strg, 48, 80), (gtr, 30, 88), (bas, 34, 95), (hit, 61, 90), (drm, "drum", 100)], (0.5, 0.3), BEATS)
