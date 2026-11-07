extends Control
# Port of ../webgame (index.html + portraits.js). Everything is drawn/built in code, no assets.

const Data := preload("res://data.gd")
const W := 960.0
const H := 540.0
const CHAR_SEC := 0.045
const RATE := 22050
const SHARD := [105.0, 40.0, 88.0, 30.0, 112.0, 45.0, 78.0, 36.0, 100.0]

# fx table: shout text, flash, shake, wait (sec) before typing starts. Sounds in play_fx().
const FX := {
	"alert":  {"shout": "경고!", "flash": true, "shake": true, "wait": 0.8},
	"title":  {"shout": "ECHO PRISM", "flash": true, "wait": 1.6},
	"shake":  {"shake": true, "wait": 0.5},
	"impact": {"flash": true, "wait": 0.4},
}

# animation state
var ph := 0.0          # animation phase (ms), advances faster while talking
var time_ms := 0.0
var pulse := 0.0       # 1 on each blip, decays
var talk := 0.0        # smoothed "is speaking"
var kick := 0.0        # emotion hit
var shake_amt := 0.0
var cur := {}          # current speaker
var stars: Array = []

# dialogue state
var started := false
var busy := false
var typing := false
var idx := -1
var full := ""
var pos := 0
var acc := 0.0

# nodes
var name_label: Label
var text_label: Label
var next_label: Label
var flash: ColorRect
var shout: Label
var start_layer: ColorRect
var players: Array = []
var player_i := 0


func _ready() -> void:
	randomize()
	var sf := SystemFont.new()
	sf.font_names = PackedStringArray(["Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", "NanumGothic"])
	var th := Theme.new()
	th.default_font = sf
	th.default_font_size = 24
	theme = th
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	for i in 90:
		stars.append({"x": randf() * W, "y": randf() * H, "v": 0.1 + randf() * 0.4, "p": randf() * 7.0})
	for i in 8:
		var p := AudioStreamPlayer.new()
		add_child(p)
		players.append(p)
	_build_ui()


func _build_ui() -> void:
	# dialogue box
	var box := Panel.new()
	box.position = Vector2(0, 400); box.size = Vector2(W, 140)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0.12, 0.88)
	sb.border_width_top = 4; sb.border_color = Color.WHITE
	box.add_theme_stylebox_override("panel", sb)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(box)

	text_label = Label.new()
	text_label.position = Vector2(32, 418); text_label.size = Vector2(896, 110)
	text_label.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	text_label.add_theme_font_size_override("font_size", 24)
	text_label.visible_characters = 0
	text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(text_label)

	name_label = Label.new()
	name_label.position = Vector2(24, 380)
	var nb := StyleBoxFlat.new()
	nb.bg_color = Color("#2a5b8c")
	nb.set_border_width_all(3); nb.border_color = Color.WHITE
	nb.content_margin_left = 18; nb.content_margin_right = 18
	name_label.add_theme_stylebox_override("normal", nb)
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.hide()
	name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(name_label)

	next_label = Label.new()
	next_label.text = "▼"
	next_label.position = Vector2(910, 500)
	next_label.hide()
	next_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(next_label)

	flash = ColorRect.new()
	flash.color = Color(1, 1, 1, 0); flash.size = Vector2(W, H)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(flash)

	shout = Label.new()
	shout.position = Vector2(0, 190); shout.size = Vector2(W, 140)
	shout.pivot_offset = Vector2(W / 2, 70)
	shout.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	shout.add_theme_font_size_override("font_size", 96)
	shout.add_theme_color_override("font_color", Color.WHITE)
	shout.add_theme_color_override("font_outline_color", Color("#cc0000"))
	shout.add_theme_constant_override("outline_size", 10)
	shout.hide()
	shout.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shout)

	start_layer = ColorRect.new()
	start_layer.color = Color(0, 0, 0, 0.65); start_layer.size = Vector2(W, H)
	start_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var title := Label.new()
	title.text = "ECHO PRISM"
	title.position = Vector2(0, 170); title.size = Vector2(W, 100)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 72)
	title.add_theme_color_override("font_shadow_color", Color("#4fc3ff"))
	title.add_theme_constant_override("shadow_outline_size", 12)
	start_layer.add_child(title)
	var prompt := Label.new()
	prompt.name = "Prompt"
	prompt.text = "클릭하여 시작"
	prompt.position = Vector2(0, 290); prompt.size = Vector2(W, 40)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	start_layer.add_child(prompt)
	add_child(start_layer)


# ---------- input / dialogue flow ----------

func _input(e: InputEvent) -> void:
	var click: bool = e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT
	if click or e.is_action_pressed("ui_accept"):
		advance()


func advance() -> void:
	if not started:
		started = true
		start_layer.queue_free()
	if busy:
		return
	if typing:
		finish()
		return
	if idx >= Data.SCRIPT.size() - 1:      # end of script
		idx = Data.SCRIPT.size()
		text_label.text = "TO BE CONTINUED..."
		text_label.visible_characters = -1
		name_label.hide(); next_label.hide()
		return
	idx += 1
	show_line(idx)


func show_line(i: int) -> void:
	var line: Dictionary = Data.SCRIPT[i]
	cur = Data.SPEAKERS[line["who"]]
	name_label.text = cur["name"]; name_label.reset_size(); name_label.show()
	full = line["text"]; pos = 0; acc = 0.0
	text_label.text = full; text_label.visible_characters = 0
	next_label.hide()
	if line.has("fx") and FX.has(line["fx"]):
		var fx: Dictionary = FX[line["fx"]]
		busy = true
		play_fx(line["fx"], fx)
		await get_tree().create_timer(fx["wait"]).timeout
		busy = false
	typing = true


func tick() -> void:
	pos += 1
	text_label.visible_characters = pos
	var ch := full[pos - 1]
	if ch.strip_edges() != "" and not ch in ".,!?…":     # sound only on spoken chars
		blip(cur["pitch"])
		pulse = 1.0
	if pos >= full.length():
		finish()


func finish() -> void:
	typing = false
	text_label.visible_characters = -1
	next_label.show()


# ---------- effects ----------

func play_fx(key: String, fx: Dictionary) -> void:
	kick = 1.0
	match key:
		"alert":
			play(noise(0.15, 0.4)); play(tone(900, 300, 0.5, "saw", 0.25))
		"title":
			play(tone(200, 800, 1.2, "sine", 0.3)); play(tone(300, 1200, 1.2, "tri", 0.2))
		"shake":
			play(noise(0.35, 0.5)); play(tone(120, 40, 0.4, "sine", 0.5))
		"impact":
			hit()
			get_tree().create_timer(0.18).timeout.connect(hit)
	if fx.get("flash", false):
		flash.color.a = 0.35
		create_tween().tween_property(flash, "color:a", 0.0, 0.35)
	if fx.get("shake", false):
		shake_amt = 12.0
	if fx.has("shout"):
		shout.text = fx["shout"]; shout.show()
		shout.scale = Vector2(2.5, 2.5); shout.modulate.a = 0.0
		var tw := create_tween().set_parallel(true)
		tw.tween_property(shout, "scale", Vector2.ONE, 0.15)
		tw.tween_property(shout, "modulate:a", 1.0, 0.1)
		get_tree().create_timer(fx["wait"]).timeout.connect(shout.hide)


func hit() -> void:
	play(noise(0.08, 0.6)); play(tone(200, 60, 0.2, "sine", 0.6))


# ---------- audio (samples synthesized in code) ----------

func make_wav(s: PackedFloat32Array) -> AudioStreamWAV:
	var d := PackedByteArray()
	d.resize(s.size() * 2)
	for i in s.size():
		d.encode_s16(i * 2, int(clampf(s[i], -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = d
	return w


func tone(f0: float, f1: float, dur: float, kind: String, vol: float) -> AudioStreamWAV:
	var n := int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	var phase := 0.0
	for i in n:
		var fr := float(i) / n
		phase += f0 * pow(f1 / f0, fr) / RATE        # cycles
		var u := fposmod(phase, 1.0)
		var v := 0.0
		match kind:
			"saw": v = 2.0 * u - 1.0
			"square": v = 1.0 if u < 0.5 else -1.0
			"tri": v = 4.0 * absf(u - 0.5) - 1.0
			_: v = sin(TAU * u)
		s[i] = v * vol * pow(0.001 / vol, fr)         # exponential decay
	return make_wav(s)


func noise(dur: float, vol: float) -> AudioStreamWAV:
	var n := int(RATE * dur)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		s[i] = (randf() * 2.0 - 1.0) * (1.0 - float(i) / n) * vol
	return make_wav(s)


func play(w: AudioStreamWAV) -> void:
	var p: AudioStreamPlayer = players[player_i]
	player_i = (player_i + 1) % players.size()
	p.stream = w
	p.play()


func blip(freq: float) -> void:
	play(tone(freq * (1.0 + (randf() - 0.5) * 0.06), freq, 0.06, "square", 0.08))


# ---------- per-frame ----------

func _process(delta: float) -> void:
	var ms := delta * 1000.0
	var f := delta * 60.0                                # decay factors were tuned per 60fps frame
	time_ms += ms
	talk = maxf(talk * pow(0.97, f), pulse)
	var spin: float = cur.get("spin", 1.0)
	ph += minf(ms, 50.0) * (1.0 + 3.0 * talk) * spin    # idle 1x, talking up to 4x
	pulse *= pow(0.85, f)
	kick *= pow(0.93, f)

	if typing:
		acc += delta
		while acc >= CHAR_SEC and typing:
			acc -= CHAR_SEC
			tick()
	if next_label.visible:
		next_label.modulate.a = 0.5 + 0.5 * sin(time_ms / 160.0)
	if is_instance_valid(start_layer):
		start_layer.get_node("Prompt").modulate.a = 0.5 + 0.5 * sin(time_ms / 220.0)

	for s in stars:
		s["y"] = fposmod(s["y"] + s["v"] * f, H)
	shake_amt *= pow(0.9, f)
	position = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * shake_amt if shake_amt > 0.3 else Vector2.ZERO
	queue_redraw()


# ---------- drawing ----------

func _draw() -> void:
	# background gradient + stars
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(W, 0), Vector2(W, H), Vector2(0, H)]),
		PackedColorArray([Color("#1b2a5a"), Color("#1b2a5a"), Color("#0b1026"), Color("#0b1026")]))
	for s in stars:
		var a := 0.4 + 0.4 * sin(time_ms / 500.0 + s["p"])
		draw_rect(Rect2(s["x"], s["y"], 2, 2), Color(0.75, 0.86, 1.0, a))
	if cur.is_empty():
		return
	var j := 14.0 * kick + 5.0 * talk
	var sc := 1.0 + 0.3 * kick
	draw_set_transform(Vector2(W / 2, 240) + Vector2(randf() - 0.5, randf() - 0.5) * j, 0.0, Vector2(sc, sc))
	var col := Color.WHITE if kick > 0.3 else Color(cur["color"])   # emotion hit = white glitch
	match cur["shape"]:
		"orb": shape_orb(col)
		"prism": shape_prism(col)
		"rings": shape_rings(col)
		"bloom": shape_bloom(col)
		"shard": shape_shard(col)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


# glow helpers: fake blur with 3 stacked strokes
func gline(a: Vector2, b: Vector2, col: Color, w: float = 3.0) -> void:
	for k in [[4.0, 0.10], [2.2, 0.22], [1.0, 1.0]]:
		var c := col
		c.a = col.a * k[1]
		draw_line(a, b, c, w * k[0], true)


func gpoly(pts: PackedVector2Array, col: Color, w: float = 3.0) -> void:
	for i in pts.size():
		gline(pts[i], pts[(i + 1) % pts.size()], col, w)


func gcircle(center: Vector2, r: float, col: Color, w: float = 3.0) -> void:
	for k in [[4.0, 0.10], [2.2, 0.22], [1.0, 1.0]]:
		var c := col
		c.a = col.a * k[1]
		draw_arc(center, r, 0.0, TAU, 48, c, w * k[0], true)


func glow_disc(r: float, col: Color) -> void:                 # soft radial glow, center brightest
	for i in 14:
		var k := float(i) / 13.0
		var c := col.lerp(Color.WHITE, clampf((k - 0.6) / 0.4, 0.0, 1.0))
		c.a = 0.14
		draw_circle(Vector2.ZERO, r * (1.0 - k * 0.95), c)


func hexagon(r: float, off: Vector2 = Vector2.ZERO) -> PackedVector2Array:
	var p := PackedVector2Array()
	for j in 6:
		p.append(Vector2(cos(j * 1.047 + 0.52), sin(j * 1.047 + 0.52)) * r + off)
	return p


# 부드럽고 신비로움: expanding ripples + glowing orb + satellites
func shape_orb(col: Color) -> void:
	for i in 3:
		var p := fposmod(ph / 1500.0 + i / 3.0, 1.0)
		var c := col; c.a = (1.0 - p) * 0.5
		gcircle(Vector2.ZERO, 40.0 + 110.0 * p, c, 2.0)
	var r := 70.0 + 6.0 * pulse + 5.0 * sin(ph / 150.0)
	glow_disc(r * 1.8, col)
	for i in 3:
		var a := ph / 350.0 + i * 2.09
		var p := Vector2(cos(a) * r * 1.4, sin(a) * r * 0.5)
		draw_circle(p, 12.0, Color(col, 0.3))
		draw_circle(p, 6.0, col)


# 냉철, 논리적: sharp diamond on a rigid rod swinging like a pendulum with afterimages
func shape_prism(col: Color) -> void:
	var pivot := Vector2(0, -125)
	gcircle(pivot, 6.0, col)
	for k in range(4, -1, -1):
		var ang := (0.45 + 0.25 * talk) * sin((ph - k * 45.0) / 420.0)
		var c := col; c.a = 0.15 if k > 0 else 1.0
		var xf := Transform2D(ang, pivot)
		gline(pivot, xf * Vector2(0, 150), c)
		var d := PackedVector2Array([xf * Vector2(0, 116), xf * Vector2(26, 150), xf * Vector2(0, 212), xf * Vector2(-26, 150)])
		draw_colored_polygon(d, Color(79.0 / 255.0, 195.0 / 255.0, 1.0, 0.2 * c.a))
		gpoly(d, c)
		gline(xf * Vector2(0, 116), xf * Vector2(0, 212), c)
		gline(xf * Vector2(-26, 150), xf * Vector2(26, 150), c)


# 묵직, 과묵: fixed hexagons pulsing outward like a heartbeat, slow sway
func shape_rings(col: Color) -> void:
	var off := Vector2(sin(ph / 900.0) * 8.0, 0)
	for i in 4:
		var p := fposmod(ph / 1800.0 + i / 4.0, 1.0)
		var r := 25.0 + 100.0 * p * (1.0 + 0.08 * pulse)
		var c := col; c.a = minf(1.0, (1.0 - p) * 1.5)
		gpoly(hexagon(r, off), c, 4.0)
	draw_colored_polygon(hexagon(22.0, off), col)


# 여성적, 따뜻함: overlapping circles blooming, breathing, sparkles rising
func shape_bloom(col: Color) -> void:
	for L in 2:
		for k in 6:
			var a := ph / 500.0 * (-1.0 if L == 1 else 1.0) + k * PI / 3.0
			var d := (30.0 if L == 1 else 55.0) + 8.0 * sin(ph / 300.0 + L)
			var r := 30.0 if L == 1 else 42.0
			var ctr := Vector2(cos(a), sin(a)) * d
			if L == 1:
				draw_circle(ctr, r, Color(col, 0.3))
			else:
				gcircle(ctr, r, col)
	var cr := 26.0 + 5.0 * pulse
	for i in 8:
		draw_circle(Vector2.ZERO, cr * (1.0 - i / 8.0), Color(1, 1, 1, 0.18))
	for i in 10:
		var p := fposmod(ph / 2500.0 + i * 0.1, 1.0)
		draw_circle(Vector2(sin(i * 12.9) * 100.0, 120.0 - 240.0 * p), 2.0 + i % 3, Color(col, sin(p * PI)))


# 날카로움, 폭력: slow shard + glitch art (RGB split, horizontal slices jump)
func shard_pts(dx: float) -> PackedVector2Array:
	var p := PackedVector2Array()
	for j in SHARD.size():
		var a := ph / 900.0 + j * TAU / 9.0
		p.append(Vector2(cos(a) * SHARD[j] + dx, sin(a) * SHARD[j]))
	return p


func rnd(n: float) -> float:
	return fposmod(sin(n * 127.1) * 43758.5453, 1.0)


func shape_shard(col: Color) -> void:
	var split := 3.0 + 10.0 * talk
	for g in [[-split, Color(1, 0, 0, 0.6)], [split, Color(0, 1, 1, 0.6)]]:   # RGB split ghosts
		var pts := shard_pts(g[0])
		pts.append(pts[0])
		draw_polyline(pts, g[1], 3.0, true)
	var n := floorf(time_ms / 100.0)
	var thr := 0.45 if talk > 0.1 else 0.85
	var amp := 30.0 if talk > 0.1 else 12.0
	for i in 7:                                          # slice bands, some jump sideways
		var y0 := -112.0 + i * 32.0
		var dx := (rnd(n + i * 3.0) - 0.5) * 2.0 * amp if rnd(n * 7.0 + i) > thr else 0.0
		var pts := shard_pts(dx)
		for e in pts.size():                             # clip each edge to the band
			var a := pts[e]
			var b := pts[(e + 1) % pts.size()]
			var seg := clip_seg(a, b, y0, y0 + 32.0)
			if seg.size() == 2:
				gline(seg[0], seg[1], col)
		var band := PackedVector2Array([Vector2(-160, y0), Vector2(160, y0), Vector2(160, y0 + 32), Vector2(-160, y0 + 32)])
		for poly in Geometry2D.intersect_polygons(pts, band):
			draw_colored_polygon(poly, Color(col, 0.2))


func clip_seg(a: Vector2, b: Vector2, y0: float, y1: float) -> Array:
	var dy := b.y - a.y
	var t0 := 0.0
	var t1 := 1.0
	if absf(dy) < 0.000001:
		if a.y < y0 or a.y > y1:
			return []
	else:
		var ta := (y0 - a.y) / dy
		var tb := (y1 - a.y) / dy
		t0 = maxf(0.0, minf(ta, tb))
		t1 = minf(1.0, maxf(ta, tb))
		if t0 >= t1:
			return []
	return [a.lerp(b, t0), a.lerp(b, t1)]
