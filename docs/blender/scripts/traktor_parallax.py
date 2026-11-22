# traktor_parallax.py  (Blender 5.3, EEVEE)  - TESTED headless on Blender 5.3 / Intel Iris Xe
#
# Builds the S11 parallax hero scene from docs/blender/parallax-traktor.md with placeholder
# geometry and flat procedural materials, then renders 7 transparent layers + 1 opaque composite.
#
# Run (from repo root):
#   & "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --factory-startup `
#       -P docs/blender/scripts/traktor_parallax.py -- --quality low
#
# Args (after the "--"):
#   --quality low|mid|high   low = 1600x900 visible, 16 TAA samples, no DOF/raytracing (default)
#                            mid = 1920x1080, 32 samples; high = 3840x2160, 64 samples + raytracing + DOF
#   --out <dir>              output folder (default: web/public/landing next to this repo)
#   --only a,b,...           render only these layers, e.g. --only composite,tractor
#   --format webp|png        output format (default webp, q 80)
#   --set desktop|mobile     mobile = 800x1200 portrait framing (own camera)
#   --save <file.blend>      also save the built scene
#
# Brand rules: no text in renders, no glow/bloom/flare, generic graphite tractor (no logos/livery).
import bpy, math, random, sys, os, time
from mathutils import Vector, Matrix, noise

# ---------------------------------------------------------------- args
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) else default
    return default
QUALITY = arg("--quality", "low")
FMT = arg("--format", "webp").lower()
SET = arg("--set", "desktop")
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.abspath(arg("--out", os.path.join(REPO, "web", "public", "landing")))
ONLY = [s.strip() for s in arg("--only", "").split(",") if s.strip()]
SAVE = arg("--save")
os.makedirs(OUT, exist_ok=True)

Q = {
    "draft": dict(w=800, h=450, samples=8, rt=False, dof=False, shadow=0.25),
    "low":  dict(w=1600, h=900,  samples=16, rt=False, dof=False, shadow=0.5),
    "mid":  dict(w=1920, h=1080, samples=32, rt=False, dof=False, shadow=1.0),
    "high": dict(w=3840, h=2160, samples=64, rt=True,  dof=True,  shadow=1.0),
}[QUALITY]
if SET == "mobile":
    Q = dict(Q, w=Q["w"] // 2, h=round(Q["w"] // 2 * 1.5))

# ---------------------------------------------------------------- scene constants (metres)
DEPTH, BED, SLOPE = 1.40, 0.70, 1.5
TOP = BED / 2 + SLOPE * DEPTH                   # 2.45 m half top width
H_HOLD, H_DOWN = 0.44, 0.12                     # TRZYMAJ upstream, base flow downstream
TRACK_X, BIRCH_X, FOREST_X = -10.0, -250.0, -600.0
CAM_X, CAM_Y, CAM_Z = 5.6, 2.6, 2.3             # slightly raised eye so board + held water read
TILT, YAW, LENS = 16.0, -25.0, 28.0              # YAW: oblique, from downstream, so the board's dry face shows
TRACTOR_Y = -2.0                                 # rear axle; tractor sits right of frame centre, drives +Y
OVERSCAN = 1.10                                  # +10 % width for horizontal parallax travel
random.seed(11)

sc = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

def lin(h):
    h = h.lstrip("#"); o = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        o.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*o, 1.0)

def sock(coll, name, typ=None):
    for s in coll:
        if s.name == name and getattr(s, "enabled", True) and (typ is None or s.type == typ):
            return s
    for s in coll:
        if s.name == name:
            return s
    raise KeyError(name)

# ---------------------------------------------------------------- collections
def coll(name, parent):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in parent.children:
        parent.children.link(c)
    return c
ROOT = coll("TRK_parallax", sc.collection)
LAYERS = [("sky", "L1_sky"), ("trees", "L2_treeline"), ("field", "L3_field"), ("track", "L4_track"),
          ("tractor", "L5_tractor"), ("ditch", "L6_ditch"), ("foreground", "L7_fore")]
C = {n: coll(n, ROOT) for _, n in LAYERS}
C_BLOB = coll("L5_tractor_blob", ROOT)            # contact shadow, only in the tractor layer

def put(o, c):
    for uc in list(o.users_collection):
        uc.objects.unlink(o)
    c.objects.link(o)
    return o

# ---------------------------------------------------------------- materials
HAZE = lin("#C9CFD2")

def _haze(nt, color_out):
    """Aerial perspective: mix toward horizon haze with camera distance (cheap mist)."""
    N, L = nt.nodes, nt.links
    cam = N.new("ShaderNodeCameraData")
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 40.0, 700.0
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.0, 0.55
    L.new(cam.outputs["View Distance"], mr.inputs["Value"])
    mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
    L.new(mr.outputs["Result"], mx.inputs[0])
    L.new(color_out, sock(mx.inputs, "A", "RGBA"))
    sock(mx.inputs, "B", "RGBA").default_value = HAZE
    return sock(mx.outputs, "Result", "RGBA")

def mat(name, hexc, rough=0.85, metal=0.0, color_fn=None):
    """color_fn(nt) -> colour socket; default flat hex with light noise."""
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links
    b = N.get("Principled BSDF")
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if color_fn:
        col = color_fn(nt)
    else:
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
        mx.inputs[0].default_value = 0.0
        L.new(nz.outputs["Fac"], mx.inputs[0])
        c0 = lin(hexc); c1 = tuple(min(1, v * 0.82) for v in c0[:3]) + (1.0,)
        sock(mx.inputs, "A", "RGBA").default_value = c1
        sock(mx.inputs, "B", "RGBA").default_value = c0
        col = sock(mx.outputs, "Result", "RGBA")
    L.new(_haze(nt, col), b.inputs["Base Color"])
    m.diffuse_color = lin(hexc)
    return m

def _obj_xyz(nt):
    N = nt.nodes
    tc = N.new("ShaderNodeTexCoord"); sp = N.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sp.inputs[0])
    return sp

def _rgb_mix(nt, fac, a, b):
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    if isinstance(fac, float): mx.inputs[0].default_value = fac
    else: nt.links.new(fac, mx.inputs[0])
    for s, v in (("A", a), ("B", b)):
        if isinstance(v, tuple): sock(mx.inputs, s, "RGBA").default_value = v
        else: nt.links.new(v, sock(mx.inputs, s, "RGBA"))
    return sock(mx.outputs, "Result", "RGBA")

def _band(nt, value, lo, hi, inv=False):
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = lo, hi
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = (1.0, 0.0) if inv else (0.0, 1.0)
    nt.links.new(value, mr.inputs["Value"])
    return mr.outputs["Result"]

def _abs_off(nt, value, off):
    a = nt.nodes.new("ShaderNodeMath"); a.operation = "ADD"; a.inputs[1].default_value = -off
    nt.links.new(value, a.inputs[0])
    b = nt.nodes.new("ShaderNodeMath"); b.operation = "ABSOLUTE"
    nt.links.new(a.outputs[0], b.inputs[0])
    return b.outputs[0]

def _noise(nt, scale, detail=2.0):
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    tc = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    return nz.outputs["Fac"]

def field_color(nt):
    """Sugar-beet rows (0.45 m, along X = away from camera) on dry soil; rows fade out with distance."""
    N, L = nt.nodes, nt.links
    soil = _rgb_mix(nt, _noise(nt, 0.08, 3), lin("#B3A274"), lin("#8C6E4B"))
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Y"
    wv.inputs["Scale"].default_value = 0.698     # period 0.45 m
    tc = N.new("ShaderNodeTexCoord"); L.new(tc.outputs["Object"], wv.inputs["Vector"])
    rows = _band(nt, wv.outputs["Fac"], 0.45, 0.75)
    cam = N.new("ShaderNodeCameraData")
    fade = _band(nt, cam.outputs["View Distance"], 18.0, 42.0, inv=True)
    m = N.new("ShaderNodeMath"); m.operation = "MULTIPLY"
    L.new(rows, m.inputs[0]); L.new(fade, m.inputs[1])
    far = _rgb_mix(nt, 0.55, soil, lin("#5E7A3E"))   # rows blended at distance
    base = _rgb_mix(nt, fade, far, soil)
    leaf = _rgb_mix(nt, _noise(nt, 1.5), lin("#4F7A3A"), lin("#5F8A44"))
    return _rgb_mix(nt, m.outputs[0], base, leaf)

def track_color(nt):
    """Grass verge with a 3.2 m dirt track centred on TRACK_X, darker wet ruts."""
    sp = _obj_xyz(nt)
    d = _abs_off(nt, sp.outputs["X"], TRACK_X)
    dirt_mask = _band(nt, d, 1.45, 1.75, inv=True)
    grass = _rgb_mix(nt, _noise(nt, 0.6, 4), lin("#7E9A5C"), lin("#9AAF72"))
    dirt = _rgb_mix(nt, _noise(nt, 1.2, 4), lin("#8A7254"), lin("#A58C6C"))
    r1 = _band(nt, _abs_off(nt, sp.outputs["X"], TRACK_X - 0.95), 0.08, 0.25, inv=True)
    r2 = _band(nt, _abs_off(nt, sp.outputs["X"], TRACK_X + 0.95), 0.08, 0.25, inv=True)
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    nt.links.new(r1, mx.inputs[0]); nt.links.new(r2, mx.inputs[1])
    dirt = _rgb_mix(nt, mx.outputs[0], dirt, lin("#6A5440"))
    crown = _band(nt, _abs_off(nt, sp.outputs["X"], TRACK_X), 0.35, 0.55, inv=True)
    dirt = _rgb_mix(nt, crown, dirt, lin("#8A9E62"))
    return _rgb_mix(nt, dirt_mask, grass, dirt)

def ditch_color(nt):
    """Soil banks inside the ditch, mown green verge on the near/far tops."""
    sp = _obj_xyz(nt)
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
    nt.links.new(sp.outputs["X"], ab.inputs[0])
    inside = _band(nt, ab.outputs[0], TOP - 0.25, TOP + 0.05, inv=True)
    grass = _rgb_mix(nt, _noise(nt, 0.8, 4), lin("#6F8C50"), lin("#A2B47A"))
    bank = _rgb_mix(nt, _noise(nt, 2.0, 4), lin("#5C3F27"), lin("#7A5735"))
    wet = _band(nt, sp.outputs["Z"], -DEPTH + H_HOLD - 0.05, -DEPTH + H_HOLD + 0.10, inv=True)
    bank = _rgb_mix(nt, wet, bank, lin("#3E2B1C"))
    return _rgb_mix(nt, inside, grass, bank)

M = dict(
    far=mat("TRK_far_field", "#B9AE7A"),
    field=mat("TRK_field", "#C9BF86", color_fn=field_color),
    track=mat("TRK_track", "#9C8466", 0.9, color_fn=track_color),
    ditch=mat("TRK_ditch", "#6B4A2E", 0.9, color_fn=ditch_color),
    water=mat("TRK_water", "#2F5F73", 0.08),
    wood=mat("TRK_wood", "#6E4E32", 0.75), steel=mat("TRK_steel", "#8B8F93", 0.45, 1.0),
    body=mat("TRK_body", "#3A3F44", 0.5), trim=mat("TRK_trim", "#2A2D31", 0.6),
    glass=mat("TRK_glass", "#1C2428", 0.12), tyre=mat("TRK_tyre", "#1E1E1E", 0.9),
    rim=mat("TRK_rim", "#5B5F52", 0.6), mud=mat("TRK_mud", "#6B4A2E", 0.95),
    bark=mat("TRK_bark", "#E7E1D4", 0.8), birch=mat("TRK_birch", "#8FA86A", 0.8),
    forest=mat("TRK_forest", "#2E4A30", 0.9), verge=mat("TRK_verge", "#8FA86A", 0.8),
    verge2=mat("TRK_verge2", "#A9B27A", 0.8),
)
M["water"].node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.333

def blob_mat():
    m = bpy.data.materials.new("TRK_contact_shadow")
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL": N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    tc = N.new("ShaderNodeTexCoord"); gr = N.new("ShaderNodeTexGradient"); gr.gradient_type = "SPHERICAL"
    L.new(tc.outputs["Object"], gr.inputs["Vector"])
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 0.55
    L.new(gr.outputs["Fac"], mul.inputs[0])
    tr = N.new("ShaderNodeBsdfTransparent"); df = N.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    mix = N.new("ShaderNodeMixShader")
    L.new(mul.outputs[0], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(df.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    try: m.surface_render_method = "BLENDED"
    except Exception: pass
    return m

# ---------------------------------------------------------------- ground strips
def strip(name, far, near, c, m, zf, dx, dy, bleed=0.0):
    a, b = far, near + bleed
    hw = max(40.0, (CAM_X - far) * 0.75)
    nx, ny = max(2, round((b - a) / dx) + 1), max(2, round(2 * hw / dy) + 1)
    yc = CAM_Y + (CAM_X - a) * math.tan(math.radians(YAW)) * 0.5   # oblique view: shift strip toward +Y
    xs = [a + (b - a) * i / (nx - 1) for i in range(nx)]
    ys = [yc - hw + 2 * hw * j / (ny - 1) for j in range(ny)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, zf(x, y) - (0.03 if x > near + 1e-6 else 0.0)) for y in ys for x in xs], [],
                   [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i)
                    for j in range(ny - 1) for i in range(nx - 1)])
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); c.objects.link(o)
    return o

und = lambda x, y: 0.06 * noise.noise(Vector((x * 0.04, y * 0.04, 0.0)))
def ditch_z(x, y):
    ax = abs(x)
    if ax <= BED / 2: return -DEPTH
    if ax <= TOP: return -DEPTH + (ax - BED / 2) / SLOPE
    return 0.0
def track_z(x, y):
    ruts = sum(math.exp(-((x - (TRACK_X + s)) / 0.16) ** 2) for s in (-0.95, 0.95))
    return -0.07 * ruts + 0.02 * noise.noise(Vector((x * 0.5, y * 0.5, 1.0)))

strip("L2_far_field", FOREST_X - 20, -130.0, C["L2_treeline"], M["far"], und, 20.0, 20.0, bleed=10.0)
strip("L3_field_ground", -130.0, -12.0, C["L3_field"], M["field"], und, 1.0, 1.0, bleed=3.0)
strip("L4_track_ground", -12.0, -3.5, C["L4_track"], M["track"], track_z, 0.1, 0.5, bleed=2.0)
strip("L6_ditch_ground", -3.5, 7.5, C["L6_ditch"], M["ditch"], ditch_z, 0.05, 0.5)

def quad(name, xc, y0, y1, z, hw, c, m):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(xc - hw, y0, z), (xc + hw, y0, z), (xc + hw, y1, z), (xc - hw, y1, z)], [], [(0, 1, 2, 3)])
    me.materials.append(m); o = bpy.data.objects.new(name, me); c.objects.link(o); return o
quad("water_up_TRZYMAJ", 0, -70, -0.02, -DEPTH + H_HOLD, BED / 2 + SLOPE * H_HOLD + 0.03, C["L6_ditch"], M["water"])
quad("water_down", 0, 0.02, 70, -DEPTH + H_DOWN, BED / 2 + SLOPE * H_DOWN + 0.03, C["L6_ditch"], M["water"])
for i in range(4):                                             # puddles in the ruts
    y = random.uniform(-16, 2)
    quad(f"puddle_{i}", TRACK_X + random.choice((-0.95, 0.95)), y, y + random.uniform(0.8, 2.0),
         -0.04, 0.13, C["L4_track"], M["water"])

# ---------------------------------------------------------------- board + steel frame
def box(name, size, loc, m, c, parent=None, bevel=0.0):
    sx, sy, sz = (s / 2 for s in size)
    v = [(x * sx, y * sy, z * sz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.materials.append(m)
    o = bpy.data.objects.new(name, me); c.objects.link(o)
    if parent: o.parent = parent
    o.location = loc
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 2
    return o

def cyl(name, r, depth, loc, m, c, verts=24, axis=None, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth)
    o = put(bpy.context.object, c); o.name = name
    if axis: o.data.transform(Matrix.Rotation(math.pi / 2, 4, axis))
    o.data.materials.append(m)
    if parent: o.parent = parent
    o.location = loc
    return o

B, L6 = -DEPTH, C["L6_ditch"]
# the board runs across the ditch (along X), planks stacked; ditch runs along Y
for i in range(3):
    box(f"board_plank_{i}", (0.96 + 2 * SLOPE * (i * 0.15 + 0.15), 0.05, 0.146),
        (0, 0, B + 0.075 + i * 0.15), M["wood"], L6, bevel=0.006)
for s in (-1, 1):
    box(f"frame_post_{s}", (0.10, 0.06, 2.05), (s * 0.95, 0, B - 0.30 + 1.025 + 0.2), M["steel"], L6)
    box(f"frame_wing_{s}", (0.45, 0.012, 0.60), (s * 1.22, 0, B + 0.45), M["steel"], L6)
box("frame_beam", (2.10, 0.08, 0.10), (0, 0, B + 1.95), M["steel"], L6)
box("frame_spindle", (0.03, 0.03, 0.30), (0, 0, B + 2.13), M["steel"], L6)
cyl("frame_wheel", 0.14, 0.025, (0, 0, B + 2.29), M["steel"], L6, verts=24)

# ---------------------------------------------------------------- placeholder tractor (generic, no logos)
L5 = C["L5_tractor"]
root = bpy.data.objects.new("TRACTOR_root", None); L5.objects.link(root)
root.location = (TRACK_X, TRACTOR_Y, 0)
R_REAR, R_FRONT = 0.90, 0.55
box("tr_chassis", (0.70, 3.40, 0.40), (0, 1.30, 0.80), M["trim"], L5, root)
box("tr_hood", (0.92, 2.30, 0.90), (0, 2.25, 1.32), M["body"], L5, root, bevel=0.05)
box("tr_grille", (0.80, 0.04, 0.70), (0, 3.41, 1.27), M["trim"], L5, root)
box("tr_cab_glass", (1.24, 1.44, 1.30), (0, -0.05, 2.20), M["glass"], L5, root)
for sx in (-1, 1):
    for sy in (-1, 1):
        box(f"tr_pillar_{sx}_{sy}", (0.07, 0.07, 1.34), (sx * 0.64, -0.05 + sy * 0.74, 2.20), M["body"], L5, root)
box("tr_cab_base", (1.30, 1.50, 0.18), (0, -0.05, 1.50), M["body"], L5, root)
box("tr_roof", (1.50, 1.80, 0.10), (0, -0.05, 2.90), M["body"], L5, root, bevel=0.03)
for s in (-1, 1):
    box(f"tr_fender_{s}", (0.62, 1.90, 0.06), (s * 0.95, -0.05, 1.86), M["body"], L5, root)
    box(f"tr_step_{s}", (0.25, 0.30, 0.04), (s * 0.70, 0.75, 0.75), M["trim"], L5, root)
cyl("tr_exhaust", 0.05, 1.0, (0.32, 2.95, 2.10), M["trim"], L5, verts=12, parent=root)
for s in (-1, 1):
    cyl(f"tr_rear_{s}", R_REAR, 0.55, (s * 0.95, 0.0, R_REAR), M["tyre"], L5, verts=40, axis="Y", parent=root)
    cyl(f"tr_rear_rim_{s}", 0.52, 0.56, (s * 0.95, 0.0, R_REAR), M["rim"], L5, verts=24, axis="Y", parent=root)
    cyl(f"tr_front_{s}", R_FRONT, 0.35, (s * 0.85, 2.70, R_FRONT), M["tyre"], L5, verts=32, axis="Y", parent=root)
    cyl(f"tr_front_rim_{s}", 0.30, 0.36, (s * 0.85, 2.70, R_FRONT), M["rim"], L5, verts=20, axis="Y", parent=root)
# contact shadow blob (tractor layer only)
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(TRACK_X + 0.05, TRACTOR_Y + 1.3, 0.02))
blob = put(bpy.context.object, C_BLOB); blob.name = "tr_contact_shadow"
blob.scale = (1.9, 3.4, 1.0); blob.data.materials.append(blob_mat())

# ---------------------------------------------------------------- birch row, forest edge, tufts
def tree(i, x, y, h, cl):
    t = cyl(f"birch_trunk_{i:03d}", 0.18, h * 0.62, (x, y, h * 0.31), M["bark"], cl, verts=6)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(x, y, h * 0.70))
    k = put(bpy.context.object, cl); k.name = f"birch_crown_{i:03d}"; k.data.materials.append(M["birch"])
    k.scale = (random.uniform(1.8, 2.6), random.uniform(1.8, 2.6), h * 0.30)
TY = math.tan(math.radians(YAW))
def yspan(x, step):
    d = CAM_X - x; c = CAM_Y + d * TY; hw = d * 0.85
    return range(int(c - hw), int(c + hw), step)
y = None
for i, y in enumerate(yspan(BIRCH_X, 6)):
    if random.random() < 0.12: continue                # gaps in the row
    tree(i, BIRCH_X + random.uniform(-1.5, 1.5), y + random.uniform(-1.5, 1.5), random.uniform(9, 13), C["L2_treeline"])
for i, y in enumerate(yspan(FOREST_X, 12)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(FOREST_X, y, 6))
    f = put(bpy.context.object, C["L2_treeline"]); f.scale = (12, random.uniform(8, 12), random.uniform(9, 14))
    f.data.materials.append(M["forest"])
# foreground tufts at the near lip, outer ~20 % of the frame each side (never over the board)
FWD = Vector((-math.cos(math.radians(YAW)), math.sin(math.radians(YAW)), 0))
RIGHT = Vector((FWD.y, -FWD.x, 0))
for k in range(260):
    side = -1 if k % 2 else 1
    h = random.uniform(0.30, 0.85)
    d = random.uniform(3.6, 5.2) if side < 0 else random.uniform(1.9, 2.6)
    lat = side * random.uniform(0.66, 1.08) * d * 18.0 / LENS   # frame half-width / depth
    p = Vector((CAM_X, CAM_Y, 0)) + FWD * d + RIGHT * lat
    if p.x < TOP + 0.15: continue                         # never inside the ditch
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.02, radius2=0.0, depth=h, location=(p.x, p.y, h / 2 - 0.02))
    g = put(bpy.context.object, C["L7_fore"])
    g.data.materials.append(M["verge"] if k % 3 else M["verge2"])
    g.rotation_euler = (random.uniform(-.35, .35), random.uniform(-.35, .35), 0)

# ---------------------------------------------------------------- camera, sun, world
cd = bpy.data.cameras.new("CAM_hero"); cd.lens = LENS; cd.clip_end = 3000
cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36.0 * OVERSCAN
cd.dof.use_dof = Q["dof"]; cd.dof.aperture_fstop = 8.0; cd.dof.focus_distance = 17.0
cam = bpy.data.objects.new("CAM_hero", cd); sc.collection.objects.link(cam)
cam.location = (CAM_X, CAM_Y, CAM_Z)
cam.rotation_euler = (math.radians(90 - TILT), 0, math.radians(90 - YAW))
if SET == "mobile":
    cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36.0; cd.lens = 30.0
    cam.rotation_euler = (math.radians(90 - 14.0), 0, math.radians(90 - YAW + 6))
sc.camera = cam

sd = bpy.data.lights.new("TRK_sun", "SUN"); sd.energy = 3.2; sd.color = (1.0, 0.84, 0.66)
sd.angle = math.radians(1.5)
sun = bpy.data.objects.new("TRK_sun", sd); sc.collection.objects.link(sun)
e, az = math.radians(16), math.radians(40)                    # low sun behind the camera's left shoulder
to_sun = Vector((math.cos(e) * math.cos(az), -math.cos(e) * math.sin(az), math.sin(e)))
sun.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()

w = bpy.data.worlds.new("TRK_world"); sc.world = w
try: w.use_nodes = True
except Exception: pass
nt = w.node_tree; bg = nt.nodes.get("Background")
tc, sp, cr = nt.nodes.new("ShaderNodeTexCoord"), nt.nodes.new("ShaderNodeSeparateXYZ"), nt.nodes.new("ShaderNodeValToRGB")
cr.color_ramp.elements[0].position, cr.color_ramp.elements[0].color = 0.0, lin("#D3D3CC")
cr.color_ramp.elements[1].position, cr.color_ramp.elements[1].color = 0.18, lin("#9DB6C9")
nt.links.new(tc.outputs["Generated"], sp.inputs[0]); nt.links.new(sp.outputs["Z"], cr.inputs["Fac"])
nt.links.new(cr.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.9

# ---------------------------------------------------------------- render settings (EEVEE, cheap)
r = sc.render
r.engine = "BLENDER_EEVEE"
ee = sc.eevee
ee.taa_render_samples = Q["samples"]
for k, v in (("use_raytracing", Q["rt"]), ("use_shadows", True), ("shadow_resolution_scale", Q["shadow"]),
             ("use_fast_gi", False), ("use_taa_reprojection", False)):
    try: setattr(ee, k, v)
    except Exception as ex: print("eevee skip", k, ex)
r.use_motion_blur = False
r.filter_size = 1.5
r.resolution_x = round(Q["w"] * OVERSCAN) if SET == "desktop" else Q["w"]
r.resolution_y = Q["h"]
r.resolution_percentage = 100
for vt in ("AgX", "Filmic", "Standard"):
    try: sc.view_settings.view_transform = vt; break
    except Exception: pass
for look in ("AgX - Medium Low Contrast", "Medium Low Contrast", "None"):
    try: sc.view_settings.look = look; break
    except Exception: pass
print("TRK color:", sc.view_settings.view_transform, "/", sc.view_settings.look)

im = r.image_settings
try: im.media_type = "IMAGE"
except Exception: pass
if FMT == "png":
    im.file_format = "PNG"; im.color_depth = "8"
else:
    im.file_format = "WEBP"; im.quality = 80
im.color_mode = "RGBA"
EXT = ".png" if FMT == "png" else ".webp"

if SAVE:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE))

# ---------------------------------------------------------------- render loop
def show_only(names, blob=False):
    for _, n in LAYERS:
        C[n].hide_render = n not in names
    C_BLOB.hide_render = not blob

JOBS = [(i + 1, key, n) for i, (key, n) in enumerate(LAYERS)] + [(0, "composite", None)]
suffix = "" if SET == "desktop" else "-mobile"
times = []
for idx, key, n in JOBS:
    if ONLY and key not in ONLY:
        continue
    if key == "composite":
        show_only([n2 for _, n2 in LAYERS]); r.film_transparent = False
        name = f"composite{suffix}"
    else:
        show_only([n], blob=(key == "tractor")); r.film_transparent = key != "sky"
        name = f"layer-{idx}-{key}{suffix}"
    if key == "composite":
        im.color_mode = "RGB"
    else:
        im.color_mode = "RGBA"
    r.filepath = os.path.join(OUT, name + EXT)
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t0
    times.append((name, dt))
    print(f"TRK rendered {name}{EXT} in {dt:.1f}s", flush=True)

print("TRK summary:", ", ".join(f"{n} {t:.1f}s" for n, t in times), f"total {sum(t for _, t in times):.1f}s", flush=True)
