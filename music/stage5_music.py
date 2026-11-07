"""Stage 5 music: 'Nameless Stacks' (field, slow cello + harp) and 'Choir of Names' (boss, choral synth orchestra).
Outputs: Stage5_Field / Stage5_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
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



# ---------------- Field: Nameless Stacks (D minor, 60 BPM, 8 bars): slow cello line + harp arpeggios ----------------
BPM, BARS = 60, 8
PROG = "Dm Dm Bb Bb Gm Gm A A".split()
ARP = {"Dm": "D3 F3 A3 D4 A3 F3 D3 A2", "Bb": "Bb2 D3 F3 Bb3 F3 D3 Bb2 F2", "Gm": "G2 Bb2 D3 G3 D3 Bb2 G2 D2", "A": "A2 C#3 E3 A3 E3 C#3 A2 E2"}
ROOT = {"Dm": "D2", "Bb": "Bb1", "Gm": "G1", "A": "A1"}
MEL = [[("A4", 4), ("F4", 2), ("A4", 2)], [("D5", 6), ("C5", 2)], [("D5", 4), ("F5", 2), ("D5", 2)], [("C5", 6), ("Bb4", 2)],
       [("Bb4", 4), ("D5", 2), ("G5", 2)], [("F5", 6), ("D5", 2)], [("E5", 4), ("A4", 2), ("C#5", 2)], [("A4", 8)]]
harp, cel, low, vox = mk(4)
harp.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    for k, p in enumerate(ARP[c].split()):
        harp.insert(t0 + k * .5, note.Note(p, quarterLength=1.5))
    low.insert(t0, note.Note(ROOT[c], quarterLength=4))
    off = t0
    for p, q in MEL[b]:                                   # quarter lengths in eighths -> *.5
        cel.insert(off, note.Note(p, quarterLength=q * .5 * .95))
        off += q * .5
    if b % 2 == 0:
        vox.insert(t0, chord.Chord([ARP[c].split()[0], ARP[c].split()[1], ARP[c].split()[2]], quarterLength=8))
render("Stage5_Field", BPM, BARS, [(harp, 46, 75), (cel, 42, 85), (low, 42, 60), (vox, 52, 40)], (0.85, 0.5))

# ---------------- Boss: Choir of Names (D minor, 120 BPM, 16 bars): choir + synth strings + brass hits + timpani ----------------
BPM, BARS = 120, 16
PROG = "Dm Dm Bb Bb Gm Gm A A Dm Bb Gm A Dm Bb A A".split()
TRI = {"Dm": "D4 F4 A4", "Bb": "Bb3 D4 F4", "Gm": "G3 Bb3 D4", "A": "A3 C#4 E4"}
ROOT = {"Dm": "D2", "Bb": "Bb1", "Gm": "G1", "A": "A1"}
TOP = {"Dm": "D5 F5 A5", "Bb": "Bb4 D5 F5", "Gm": "G4 Bb4 D5", "A": "A4 C#5 E5"}
CH = {"Dm": ["A4", "D5", "F5", "E5"], "Bb": ["F4", "Bb4", "D5", "C5"], "Gm": ["D5", "G5", "Bb5", "A5"], "A": ["E5", "A5", "C#6", "B5"]}
chor, syn, str16, brass, timp, bas = mk(6)
chor.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    chor.insert(t0, chord.Chord(TRI[c].split(), quarterLength=4))                    # choir pad
    for k, p in enumerate(CH[c]):                                                    # rising choral line
        syn.insert(t0 + k, note.Note(p, quarterLength=.95))
    for k in range(8):                                                               # driving synth-string 8ths
        str16.insert(t0 + k * .5, note.Note(ROOT[c].replace("2", "3").replace("1", "2"), quarterLength=.4))
    bas.insert(t0, note.Note(ROOT[c], quarterLength=2))
    bas.insert(t0 + 2, note.Note(ROOT[c], quarterLength=2))
    for o in (0, 1.5, 2, 3):
        timp.insert(t0 + o, note.Note(ROOT[c].replace("1", "2") if "1" in ROOT[c] else ROOT[c], quarterLength=.4))
    if b % 4 == 0 or b >= 12:
        brass.insert(t0, chord.Chord(TOP[c].split(), quarterLength=1.5))
        brass.insert(t0 + 2.5, chord.Chord(TOP[c].split(), quarterLength=1))
render("Stage5_Boss", BPM, BARS, [(chor, 52, 90), (syn, 53, 85), (str16, 50, 70), (brass, 62, 90), (timp, 47, 100), (bas, 38, 90)], (0.8, 0.45))
