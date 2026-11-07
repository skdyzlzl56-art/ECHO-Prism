"""Stage 2 music: 'Silent Garden' (field, sparse/eerie) and 'Silence' (boss, dark orchestral tension).
Outputs: Stage2_Field / Stage2_Boss -> .mid, _loop.ogg, _preview.mp3 (2 loops)."""
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



# ---------------- Field: Silent Garden (A minor, 66 BPM, 8 bars): few notes, lots of air ----------------
BPM, BARS = 66, 8
PROG = "Am Am F F Dm Dm E E".split()
TRI = {"Am": "A3 C4 E4", "F": "F3 A3 C4", "Dm": "D3 F3 A3", "E": "E3 G#3 B3"}
ROOT = {"Am": "A1", "F": "F1", "Dm": "D2", "E": "E2"}
ARP = {"Am": "A4 C5 E5 A5", "F": "F4 A4 C5 F5", "Dm": "D4 F4 A4 D5", "E": "E4 G#4 B4 E5"}
MEL = [  # (pitch or None, beats): bell-like fragments, rests are the point
    [("E6", 1.5), (None, 2.5)], [(None, 2), ("C6", 1), ("B5", 1)], [("A5", 2), (None, 2)], [(None, 1), ("C6", 1.5), ("A5", 1.5)],
    [("F5", 1.5), ("A5", 1), (None, 1.5)], [(None, 2), ("D6", 2)], [("B5", 1), ("G#5", 1), ("E5", 2)], [(None, 4)],
]
mel, harp, pad, bass, choir, fx = mk(6)
mel.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        if p:
            mel.insert(off, note.Note(p, quarterLength=q))
        off += q
    tones = ARP[c].split()
    for k, i in enumerate([0, 2, 1, 3]):
        harp.insert(t0 + k, note.Note(tones[i], quarterLength=1.5))
    pad.insert(t0, chord.Chord(TRI[c].split(), quarterLength=4.0))
    bass.insert(t0, note.Note(ROOT[c], quarterLength=3.9))
    if b % 2 == 0:
        choir.insert(t0, chord.Chord(TRI[c].replace("3", "4").split(), quarterLength=8.0 if False else 4.0))
fx.insert(0, note.Note("E6", quarterLength=8)); fx.insert(16, note.Note("A5", quarterLength=8))
render("Stage2_Field", BPM, BARS, [(mel, 10, 78), (harp, 46, 50), (pad, 89, 38), (bass, 42, 60), (choir, 53, 28), (fx, 98, 30)], (0.9, 0.6))

# ---------------- Boss: Silence (E minor, 144 BPM, 16 bars): ostinato dread, hits that vanish ----------------
BPM, BARS = 144, 16
PROG = "Em Em C D Em Em C B Am Am C D Em C D B".split()
ROOT = {"Em": "E", "C": "C", "D": "D", "B": "B", "Am": "A"}
TRI = {"Em": "E3 G3 B3", "C": "C3 E3 G3", "D": "D3 F#3 A3", "B": "B2 D#3 F#3", "Am": "A2 C3 E3"}
HIGH = {"Em": "E5 G5 B5", "C": "C5 E5 G5", "D": "D5 F#5 A5", "B": "B4 D#5 F#5", "Am": "A4 C5 E5"}
MEL = [
    [("B4", 2), ("E5", 1), ("D5", 1)], [("B4", 4)], [("C5", 2), ("E5", 1), ("G5", 1)], [("F#5", 3), ("E5", 1)],
    [("B4", 2), ("E5", 1), ("G5", 1)], [("F#5", 2), ("E5", 2)], [("E5", 1), ("G5", 1), ("C6", 2)], [("D#5", 2), ("F#5", 1), ("B5", 1)],
    [("A4", 2), ("C5", 1), ("E5", 1)], [("E5", 4)], [("G5", 2), ("E5", 1), ("C5", 1)], [("A5", 2), ("F#5", 2)],
    [("G5", 1), ("B5", 1), ("E6", 2)], [("E6", 2), ("G5", 2)], [("F#5", 1), ("A5", 1), ("D6", 2)], [("D#6", 2), ("B5", 2)],
]
lead, strg, bas, stab, choir, taiko, drm = mk(7)
lead.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        lead.insert(off, note.Note(p, quarterLength=q * .9))
        off += q
    r = ROOT[c]
    for k in range(16):                                  # tremolo-ish 16th ostinato, accent the first of each beat
        strg.insert(t0 + k * .25, note.Note(r + "3", quarterLength=.22))
    for o in (0, 1.5, 2.5):
        bas.insert(t0 + o, note.Note(r + "1", quarterLength=.9))
    if b % 4 == 0:                                       # orchestra hit that swallows the bar
        stab.insert(t0, chord.Chord(TRI[c].split(), quarterLength=.5))
    if b >= 8:
        choir.insert(t0, chord.Chord(HIGH[c].split(), quarterLength=4.0))
    for o in (0, 2.5):
        taiko.insert(t0 + o, note.Note("E2", quarterLength=.5))
    for o in (0, 2.5, 3):
        drm.insert(t0 + o, note.Note(36, quarterLength=.25))
    drm.insert(t0 + 2, note.Note(38, quarterLength=.25))
    for k in range(4):
        drm.insert(t0 + k, note.Note(42, quarterLength=.25))
    if b % 4 == 3:
        for j, n in enumerate((45, 47, 48, 50)):
            drm.insert(t0 + 3 + j * .25, note.Note(n, quarterLength=.25))
render("Stage2_Boss", BPM, BARS, [(lead, 61, 95), (strg, 44, 62), (bas, 38, 92), (stab, 55, 100), (choir, 52, 45), (taiko, 116, 100), (drm, "drum", 92)], (0.6, 0.35))
