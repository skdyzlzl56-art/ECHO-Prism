"""Title music: 'Echo Prism' (D major, 76 BPM, 16 bars). Output: Title -> .mid, _loop.ogg, _preview.mp3."""
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




BPM, BARS = 76, 16
PROG = "D A Bm G D A Bm G Bm G D A G A D D".split()
ARP = {"D": "D3 A3 D4 F#4", "A": "A2 E3 A3 C#4", "Bm": "B2 F#3 B3 D4", "G": "G2 D3 G3 B3"}
ROOT = {"D": "D2", "A": "A1", "Bm": "B1", "G": "G1"}
MEL = [[("F#5", 1), ("A5", 1), ("D6", 2)], [("C#6", 1.5), ("A5", .5), ("E5", 2)], [("D5", 1), ("F#5", 1), ("B5", 2)], [("A5", 1.5), ("G5", .5), ("D5", 2)],
       [("F#5", 1), ("A5", 1), ("D6", 1), ("E6", 1)], [("F#6", 2), ("E6", 1), ("C#6", 1)], [("D6", 1.5), ("B5", .5), ("F#5", 2)], [("G5", 1), ("A5", 1), ("B5", 2)],
       [("B5", 2), ("D6", 2)], [("D6", 1.5), ("B5", .5), ("G5", 2)], [("A5", 2), ("F#5", 2)], [("E5", 1), ("A5", 1), ("C#6", 2)],
       [("B5", 1), ("D6", 1), ("G6", 2)], [("E6", 2), ("C#6", 1), ("A5", 1)], [("D6", 3), ("F#5", 1)], [("D6", 4)]]
mel, echo, harp, pad, bas = mk(5)
mel.insert(0, tempo.MetronomeMark(number=BPM))
for b, c in enumerate(PROG):
    t0 = b * 4.0
    off = t0
    for p, q in MEL[b]:
        mel.insert(off, note.Note(p, quarterLength=q * .95))
        echo.insert(off + 1.0, note.Note(pitch.Pitch(p).transpose(12).nameWithOctave, quarterLength=.5))   # prism echo, one beat later
        off += q
    tones = ARP[c].split()
    for k, i in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
        harp.insert(t0 + k * .5, note.Note(tones[i], quarterLength=.9))
    pad.insert(t0, chord.Chord(tones[:3], quarterLength=4))
    bas.insert(t0, note.Note(ROOT[c], quarterLength=3.8))
render("Title", BPM, BARS, [(mel, 10, 85), (echo, 9, 38), (harp, 46, 58), (pad, 48, 45), (bas, 42, 65)], (0.85, 0.5))
