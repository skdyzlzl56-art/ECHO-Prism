"""Intro theme 'Dream Hall' - dreamy, ethereal space where you meet a god-like voice.
D lydian, 60 BPM, 8 bars, no drums, heavy reverb, seamless loop.
Outputs: Intro_Dream.mid, Intro_Dream_loop.ogg, Intro_Dream_preview.mp3 (2 loops)."""
import glob, subprocess
from pathlib import Path
import numpy as np
from mido import MidiFile, Message
from pydub import AudioSegment
from music21 import stream, note, chord, tempo

HERE = Path(__file__).parent
FS = glob.glob(str(HERE / "tools/fluidsynth/*/bin/fluidsynth.exe"))[0]
SF2 = str(HERE / "tools/GeneralUser-GS.sf2")
BPM, BARS = 60, 8
# per bar: root, choir voicing, harp arpeggio (8 eighths)
D = ("D2", "A3 C#4 F#4 A4", "D3 A3 C#4 F#4 A4 F#4 C#4 A3")
G = ("G2", "D4 F#4 B4 C#5", "G3 D4 F#4 B4 C#5 B4 F#4 D4")
Bm = ("B2", "D4 F#4 A4 C#5", "B3 F#4 A4 D5 C#5 D5 A4 F#4")
A = ("A2", "E4 A4 B4 C#5", "A3 E4 B4 C#5 E5 C#5 B4 E4")
Em = ("E2", "G4 B4 D5 F#5", "E3 B3 G4 B4 D5 B4 G4 B3")
PROG = [D, G, Bm, A, D, Em, G, A]
MEL = [  # celesta, sparse, floating (G# = lydian colour over D)
    [("A5", 2), ("F#5", 1), ("E5", 1)], [("D6", 2), ("B5", 1), ("A5", 1)],
    [("F#5", 3), ("D5", 1)], [("E5", 2), ("C#5", 1), ("E5", 1)],
    [("A5", 1), ("G#5", 1), ("F#5", 2)], [("B5", 2), ("G5", 1), ("F#5", 1)],
    [("D6", 3), ("B5", 1)], [("C#6", 2), ("B5", 1), ("A5", 1)],
]
names = "melody harp choir shimmer drone bell".split()
P = {n: stream.Part() for n in names}
P["melody"].insert(0, tempo.MetronomeMark(number=BPM))
for b, (root, voicing, arp) in enumerate(PROG):
    t0 = b * 4.0
    vs = voicing.split()
    off = t0
    for p, q in MEL[b]:
        P["melody"].insert(off, note.Note(p, quarterLength=q))
        off += q
    for k, p in enumerate(arp.split()):
        P["harp"].insert(t0 + k * .5, note.Note(p, quarterLength=1.5))
    P["choir"].insert(t0, chord.Chord(vs, quarterLength=4.0))
    P["shimmer"].insert(t0, chord.Chord([p.replace("4", "5").replace("3", "4") for p in vs[:3]], quarterLength=4.0))
    P["drone"].insert(t0, note.Note(root, quarterLength=4.0))
    if b % 4 == 0:
        P["bell"].insert(t0, note.Note("D5", quarterLength=4.0))
# (part, GM program, velocity): celesta, harp, choir aahs, pad sweep, warm pad, tubular bells
CFG = [("melody", 8, 78), ("harp", 46, 55), ("choir", 52, 55), ("shimmer", 95, 35), ("drone", 89, 60), ("bell", 14, 45)]
s = stream.Score()
for n, _, _ in CFG:
    s.insert(0, P[n])
mp = HERE / "Intro_Dream.mid"
s.write("midi", fp=str(mp))
mid = MidiFile(str(mp))
tracks = [t for t in mid.tracks if any(m.type == "note_on" for m in t)]
assert len(tracks) == len(CFG)
for c, (t, (_, prog, vel)) in enumerate(zip(tracks, CFG)):
    for m in t:
        if hasattr(m, "channel"):
            m.channel = c
        if m.type == "note_on" and m.velocity > 0:
            m.velocity = vel
    pos = next((j for j, m in enumerate(t) if not m.is_meta), len(t))
    t.insert(pos, Message("program_change", program=prog, channel=c, time=0))
mid.save(str(mp))

raw = HERE / "_raw.wav"
subprocess.run([FS, "-ni", "-F", str(raw), "-r", "44100",
                "-o", "synth.reverb.room-size=0.95", "-o", "synth.reverb.damp=0.25",
                "-o", "synth.reverb.width=1", "-o", "synth.reverb.level=0.9",
                SF2, str(mp)], check=True, capture_output=True)
a = AudioSegment.from_wav(str(raw))
raw.unlink()
x = np.array(a.get_array_of_samples(), dtype=np.float32).reshape(-1, a.channels)
n = int(round(BARS * 4 * 60 / BPM * a.frame_rate))     # exact loop length; fold the reverb tail onto the start
loop = x[:n].copy()
tail = x[n:]
k = min(len(tail), n)
loop[:k] += tail[:k]
loop *= 0.89 * 32767 / max(np.abs(loop).max(), 1)
seg = AudioSegment(loop.astype(np.int16).tobytes(), frame_rate=a.frame_rate, sample_width=2, channels=a.channels)
seg.export(str(HERE / "Intro_Dream_loop.ogg"), format="ogg", codec="libvorbis", parameters=["-q:a", "6"])
(seg * 2).export(str(HERE / "Intro_Dream_preview.mp3"), format="mp3", bitrate="192k")
print(f"loop {len(seg)/1000:.1f}s, tail {len(tail)/a.frame_rate:.1f}s")
