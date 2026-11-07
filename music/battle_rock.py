"""Heroine battle theme, rock x Japanese (A miyako-bushi flavour: A Bb D E F), seamless 16-bar loop.
Outputs: Battle_Rock_loop.wav/.ogg (seamless) + Battle_Rock_preview.mp3 (3 loops)."""
import glob, os, subprocess
from pathlib import Path
import numpy as np
from mido import MidiFile, Message
from pydub import AudioSegment
from music21 import stream, note, tempo, pitch

HERE = Path(__file__).parent
FS = glob.glob(str(HERE / "tools/fluidsynth/*/bin/fluidsynth.exe"))[0]
SF2 = str(HERE / "tools/GeneralUser-GS.sf2")
BPM, BARS = 170, 16
PROG = "Am F G E Am F G E Dm Bb Am G F Bb E E".split()
ROOT = {"Am": "A", "F": "F", "G": "G", "E": "E", "Dm": "D", "Bb": "B-"}
LEAD = [  # (pitch, ql) per bar, 4 beats each; None = rest
 [("A4",.5),("C5",.5),("E5",1),("D5",.5),("C5",.5),("A4",1)],
 [("F4",.5),("A4",.5),("C5",1),("A4",.5),("C5",.5),("F5",1)],
 [("G4",.5),("B4",.5),("D5",1),("B4",.5),("D5",.5),("G5",1)],
 [("E5",1.5),("D5",.5),("B4",1),("G#4",1)],
 [("A4",.5),("C5",.5),("E5",1),("A5",1.5),("G5",.5)],
 [("F5",1),("E5",.5),("D5",.5),("C5",1),("A4",1)],
 [("B4",.5),("D5",.5),("G5",1),("F5",1),("D5",1)],
 [("E5",.5),("B4",.5),("E5",.5),("G#5",.5),("B5",2)],
 [("D5",1),("F5",1),("A5",1),("F5",1)],
 [("B-4",.5),("D5",.5),("F5",1),("B-5",1),("A5",1)],
 [("A5",1.5),("G5",.5),("E5",1),("C5",1)],
 [("D5",1),("G5",1),("F5",1),("D5",1)],
 [("C5",.5),("F5",.5),("A5",1),("C6",1.5),("A5",.5)],
 [("B-5",1),("A5",.5),("F5",.5),("D5",1),("F5",1)],
 [("E5",.5),("G#5",.5),("B5",1),("G#5",.5),("E5",.5),("B4",1)],
 [("E5",2),(None,1),("B4",.5),("E5",.5)],
]

def P(): 
    p = stream.Part(); return p
lead, shamisen, guitar, bass, taiko, drums = P(), P(), P(), P(), P(), P()
lead.insert(0, tempo.MetronomeMark(number=BPM))
for b in range(BARS):
    t0 = b * 4.0
    off = t0
    for p, q in LEAD[b]:
        if p:
            lead.insert(off, note.Note(p, quarterLength=q * .95))
            shamisen.insert(off, note.Note(p, quarterLength=min(q, .5)))  # plucked: short
        off += q
    r = ROOT[PROG[b]]
    r3 = pitch.Pitch(r + "3"); f3 = r3.transpose("P5")
    b2 = pitch.Pitch(r + "2")
    for k in range(8):  # driving 8ths, palm-mute feel (short), power chord
        o = t0 + k * .5
        guitar.insert(o, note.Note(r3.nameWithOctave, quarterLength=.45))
        guitar.insert(o, note.Note(f3.nameWithOctave, quarterLength=.45))
        bass.insert(o, note.Note(b2.nameWithOctave, quarterLength=.45))
    for o in (t0, t0 + 2):
        taiko.insert(o, note.Note("D3", quarterLength=.5))
    # drums (GM numbers): kick 36, snare 38, hat 42, crash 49, toms 50/47/45
    for k in range(8):
        drums.insert(t0 + k * .5, note.Note(42, quarterLength=.25))
    for o in (0, 1.5, 2, 3.5):
        drums.insert(t0 + o, note.Note(36, quarterLength=.25))
    for o in (1, 3):
        drums.insert(t0 + o, note.Note(38, quarterLength=.25))
    if b % 8 == 0:
        drums.insert(t0, note.Note(49, quarterLength=1))
    if b % 4 == 3:  # fill on last beat
        for j, n in enumerate((38, 38, 50, 47, ) if b % 8 == 3 else (38, 38, 38, 38)):
            pass
        for j, n in enumerate((38, 50, 47, 45)):
            drums.insert(t0 + 3 + j * .25, note.Note(n, quarterLength=.25))
        if b == BARS - 1:
            drums.insert(t0 + 3.5, note.Note(38, quarterLength=.25))

# (part, program or 'drum', velocity)
PARTS = [(lead, 80, 100), (shamisen, 106, 85), (guitar, 30, 85), (bass, 34, 95), (taiko, 116, 105), (drums, "drum", 100)]
s = stream.Score()
for p, _, _ in PARTS: s.insert(0, p)
mp = HERE / "Battle_Rock.mid"
s.write("midi", fp=str(mp))
mid = MidiFile(str(mp))
tracks = [t for t in mid.tracks if any(m.type == "note_on" for m in t)]
assert len(tracks) == len(PARTS)
ch = 0
for t, (_, prog, vel) in zip(tracks, PARTS):
    drum = prog == "drum"; c = 9 if drum else ch; ch += 0 if drum else 1
    if ch == 9 and not drum: ch = 10
    for m in t:
        if hasattr(m, "channel"): m.channel = c
        if m.type == "note_on" and m.velocity > 0: m.velocity = vel
    if not drum:
        pos = next((j for j, m in enumerate(t) if not m.is_meta), len(t))
        t.insert(pos, Message("program_change", program=prog, channel=c, time=0))
mid.save(str(mp))

# render with tail, then fold the tail onto the start => seamless loop
raw = HERE / "_raw.wav"
subprocess.run([FS, "-ni", "-F", str(raw), "-r", "44100", SF2, str(mp)], check=True, capture_output=True)
a = AudioSegment.from_wav(str(raw)); raw.unlink()
sr = a.frame_rate; ch_n = a.channels
x = np.array(a.get_array_of_samples(), dtype=np.float32).reshape(-1, ch_n)
n = int(round(BARS * 4 * 60 / BPM * sr))
loop = x[:n].copy()
tail = x[n:]
loop[:len(tail)] += tail[:n]
peak = np.abs(loop).max(); loop *= 0.89 * 32767 / max(peak, 1)
seg = AudioSegment(loop.astype(np.int16).tobytes(), frame_rate=sr, sample_width=2, channels=ch_n)
seg.export(str(HERE / "Battle_Rock_loop.wav"), format="wav")
seg.export(str(HERE / "Battle_Rock_loop.ogg"), format="ogg", codec="libvorbis", parameters=["-q:a", "6"])
(seg * 3).export(str(HERE / "Battle_Rock_preview.mp3"), format="mp3", bitrate="192k")
print(f"loop {len(seg)/1000:.2f}s tail folded {len(tail)/sr:.2f}s")
