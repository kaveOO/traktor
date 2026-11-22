# TRAKTOR: Blender render briefs

For: anyone rendering TRAKTOR imagery in Blender 4.2+ / 5.x (Cycles first, EEVEE where noted).
Brand source: `.opencode/skills/traktor-brand/SKILL.md`. Facts and claims: `.opencode/skills/traktor-pitch/SKILL.md`.

**Product in one line:** a wooden board (zastawka) in a steel frame, placed in an existing field drainage ditch. Two states: **TRZYMAJ** (board in, water held high) and **OTWÓRZ** (board lifted, water released before a storm).

> **Brand rule on imagery.** Final images must be **our own renders or our own LiDAR data**. No stock and no AI-generated images in the deck, the site or the poster. The "AI image prompt" lines below are for concept frames only: use them to agree on framing, then throw them away.
>
> **Honesty labels.** A procedural terrain is an illustration. Caption it `Wizualizacja` in the layout. If you used real GUGiK data, use the source line `Dane: GUGiK NMT 1 m / LiDAR ALS`. Anything showing demo sites gets `(dane demonstracyjne)`. Time-compressed water animations get `czas przyspieszony`.

---

## 0. Deck map (where each render goes)

| # | Slide (eyebrow in `web/src/components/slides/slides.tsx`) | Shots used |
|---|---|---|
| 01 | TRAKTOR (title) | S01 cover |
| 02 | Problem | S06 drought |
| 03 | Pomysł | S02 section, S03 board macro, S04 flip |
| 04 | Jak to działa | S02 section |
| 05 | Odmowa | S07 aerial map |
| 06 | Demo | S09 field sign |
| 07 | Przełączenie | S04 flip, S05 storm, S06 drought |
| 08 | Dane i uczciwość | S01 (real ALS variant), S07 |
| 09 | Efekt | S08 tractor |
| 10 | Droga i prośba | S08b dirt track, S10 poster crop |

Website: S01 is the landing/map hero (video plus a still poster frame). Social: 1080×1350 crops of S01, S03 and S05.

---

## 1. Colour table (hex → linear RGB)

Blender's **Hex** field in the colour picker is gamma-corrected sRGB, so you can type the hex directly there. The **RGB** sliders, Python and the `default_value` of colour sockets are **linear**, so use the values below.

| Token | Hex | Linear R, G, B | Render use |
|---|---|---|---|
| forest | `#1F3A22` | 0.0137, 0.0423, 0.0160 | LiDAR background, sign plate, fade colour |
| cream | `#F3ECDD` | 0.8963, 0.8388, 0.7231 | field points, section ground, sign text |
| cream-deep | `#EFE6D3` | 0.8632, 0.7913, 0.6514 | section soil fill |
| agri | `#4F7A3A` | 0.0782, 0.1946, 0.0423 | accepted site pin, board points (accent) |
| soil | `#6B4A2E` | 0.1470, 0.0685, 0.0273 | bank points, bank soil |
| sky | `#A9BFCF` | 0.3968, 0.5210, 0.6240 | world colour, overcast |
| water | `#3B7FA3` | 0.0437, 0.2122, 0.3663 | water points, OTWÓRZ, ditch lines |
| terra | `#B5573B` | 0.4621, 0.0953, 0.0437 | **rejected site only.** Never decoration |
| elev-1 | `#2F5F73` | 0.0284, 0.1144, 0.1714 | map: lowest band; photoreal murky water |
| elev-2 / birch green | `#8FA86A` | 0.2747, 0.3916, 0.1441 | map band 2; **birch canopy points** |
| elev-3 | `#C9BF86` | 0.5841, 0.5210, 0.2384 | map band 3; dry stubble |
| elev-4 | `#B98D5F` | 0.4851, 0.2664, 0.1144 | map band 4; dry cracked soil |
| elev-5 | `#EFE6D3` | 0.8632, 0.7913, 0.6514 | map: highest band |

These are for renders only, **not UI tokens**: birch bark `#E7E1D4` (0.7991, 0.7529, 0.6584), galvanised steel `#8B8F93` (0.2582, 0.2747, 0.2918), tractor graphite `#3A3F44` (0.0423, 0.0497, 0.0578) and wet wood `#5A3E28` (0.1022, 0.0482, 0.0212).

**Two looks, two colour pipelines:**
- **Graphic look** (point clouds, section, map): flat **Emission strength 1.0**, View Transform **Standard**, Look **None**. With these settings, the pixel colour equals the hex exactly. Emission here only means flat colour, not glow: there is no bloom.
- **Photo look** (S03, S05, S06, S08, S09): Principled BSDF, View Transform **AgX**, Look **None** (or "Medium Low Contrast"), then saturation ×0.85–0.90 in the compositor.

Colour ratio on any frame: cream 50 · forest 25 · greens + soil 15 · water + terracotta 10.

---

## 2. Reusable scene setup

### 2.1 Units and the ditch profile
- Scene > Units: **Metric**, Unit Scale 1.0, Length in metres. Z is up. The ditch runs along **Y** and the water flows toward **+Y**. The board sits at **y = 0**.
- Profile (typical Kujawy field ditch, near Bydgoszcz):

| Parameter | Value | Note |
|---|---|---|
| Depth | 1.40 m (range 1.2–1.6) | field edge to bed |
| Bed width | 0.70 m (range 0.5–0.9) | |
| Bank slope | 1:1.5 | 1.5 m horizontal per 1 m vertical |
| Top width | 0.70 + 2·1.5·1.40 = **4.90 m** | |
| Bed grade | 0.1 % | 16 cm drop over 160 m |
| Board | 3 planks × 0.15 m = **0.45 m** high, 40 mm thick, 0.96 m long | larch or oak |
| Steel frame | 2 galvanised posts 60×100 mm, 0.90 m clear opening, top beam at bed + 1.75 m | lifting spindle on the beam |
| Wing walls | 10 mm steel sheet each side, buried into banks | they seal the section |
| Water, TRZYMAJ | 0.44 m above bed at the board, 1 cm under the crest, level surface upstream | backwater tapers upstream |
| Water, OTWÓRZ | 0.12 m base flow, follows the bed grade | |
| Board lift | +0.70 m | |

- Surroundings: flat arable land, ±6 cm undulation. A dirt track parallel to the ditch 8–12 m away. One birch row (trees 9–13 m tall, 6 m spacing) 15–18 m from the ditch. Horizon is flat, with no hills.

### 2.2 Option A: real terrain (GUGiK NMT 1 m GeoTIFF via BlenderGIS)
1. Install BlenderGIS (github.com/domlysz/BlenderGIS, download the zip). Go to Edit > Preferences > Add-ons > ⌄ > *Install from Disk* and enable it.
2. In the BlenderGIS add-on preferences, add the CRS **EPSG:2180** (PUWG 1992). NMT heights are PL-EVRF2007-NH.
3. Get the NMT sheet for your area from geoportal.gov.pl (data download, NMT 1 m). If it is in `.asc` format, convert it:
   `gdal_translate -a_srs EPSG:2180 sheet.asc sheet.tif`
4. GIS menu > Import > **Georeferenced raster**:
   - Mode: *DEM as displacement texture* (fast, good for heroes) or *DEM raw data build* (real vertices, needed for point distribution and the map).
   - CRS: EPSG:2180.
5. Crop to about 300×800 m along one ditch. Keep the vertical scale at **1.0**. If you exaggerate, cap it at ×1.5 and caption it.
6. Pick the ditch line from BDOT10k (layer `OT_SWRM_L`, ditches) with *GIS > Import > Shapefile* as edges or curves. You will use it in S07.

### 2.3 Option B: real LiDAR points (GUGiK ALS LAZ → Blender)
This is the most "on brand" option: points are our data, not surfaces.
1. Crop and export to CSV with PDAL (`pipeline.json`):
   ```json
   [
     "ditch_sheet.laz",
     { "type": "filters.crop", "bounds": "([xmin, xmax], [ymin, ymax])" },
     { "type": "writers.text", "format": "csv",
       "order": "X,Y,Z,Classification", "keep_unspecified": "false",
       "filename": "ditch_points.csv" }
   ]
   ```
   `pdal pipeline pipeline.json`
2. In Blender, run this loader. It shifts the data to a local origin, because EPSG:2180 coordinates are about 10⁵–10⁶ m and float32 would jitter at that size.
   ```python
   import bpy, csv
   PATH = r"C:\path\to\ditch_points.csv"
   with open(PATH, newline="") as f:
       r = csv.reader(f); next(r)
       rows = [(float(a), float(b), float(c), int(float(d))) for a, b, c, d in r]
   ox = sum(p[0] for p in rows) / len(rows)
   oy = sum(p[1] for p in rows) / len(rows)
   oz = min(p[2] for p in rows)
   me = bpy.data.meshes.new("TRK_als")
   me.vertices.add(len(rows))
   me.vertices.foreach_set("co", [v for p in rows for v in (p[0]-ox, p[1]-oy, p[2]-oz)])
   a = me.attributes.new("class", "INT", "POINT")
   a.data.foreach_set("value", [p[3] for p in rows])
   ob = bpy.data.objects.new("TRK_als", me)
   bpy.context.scene.collection.objects.link(ob)
   ob["origin_epsg2180"] = (ox, oy, oz)
   ```
3. Add a GN modifier with this chain: **Mesh to Points** → colour by `class` (ASPRS codes):
   - 2 ground: cream, or soil when `Z < Z_field − 0.25` (that marks the banks).
   - 3/4/5 vegetation: birch green. Trunks (Z below the canopy) use birch bark.
   - 9 water: water blue.
   - 6 buildings: drop them.
   
   Build it with *Named Attribute (int "class")* → *Compare (Equal)* nodes → *Switch (Color)* → *Store Named Attribute "lidar_col"*. Then add *Set Point Radius 0.03–0.05 m* (ALS has 4–12 pts/m²) and *Set Material `TRK_Point`* (§3.2).
4. Expect gaps over water. Laser returns over water are sparse, and that is honest. Only add synthetic water points (from the water plane in §3) if the frame is captioned `Wizualizacja`.

### 2.4 Option C: procedural field + ditch
This is the default for quick work. Run the script in §3.1.

---

## 3. Start in 1 minute: bpy scripts

### 3.1 `traktor_scene.py`: ditch, board, frame, water, cameras, sun, OTWÓRZ animation
Open the Scripting tab, click New, paste the script and press Run. It is written for the 4.2+ API but has not been run here yet, so check the System Console the first time. Default keyframe interpolation (Bezier, Auto Clamped) gives an ease-in-out with no overshoot.

```python
# traktor_scene.py  (Blender 4.2+ / 5.x)
import bpy, math
from mathutils import Vector, noise

# ---------- parameters (metres) ----------
L, W        = 160.0, 80.0     # ditch length (Y), field width (X). Cover shot: L = 400, ROW_STEP = 1.0
ROW_STEP    = 0.5
DEPTH, BED, SLOPE, GRADE = 1.40, 0.70, 1.5, 0.001
PLANK_H, PLANKS = 0.15, 3
CREST       = PLANKS * PLANK_H            # 0.45 m above bed
H_HOLD      = CREST - 0.01                # TRZYMAJ
H_OPEN      = 0.12                        # OTWÓRZ
LIFT        = 0.70
FPS         = 25

def lin(h):
    h = h.lstrip("#"); o = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        o.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*o, 1.0)

def depth_at(y): return DEPTH + GRADE * y            # deeper downstream (+Y)
def bed_z(y):    return -depth_at(y)

def ground_z(x, y):
    d = depth_at(y); top = BED + 2 * SLOPE * d; ax = abs(x)
    if ax <= BED / 2:  return -d
    if ax <= top / 2:  return -d + (ax - BED / 2) / SLOPE
    return 0.06 * noise.noise(Vector((x * 0.04, y * 0.04, 0.0)))

# ---------- housekeeping ----------
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"; sc.unit_settings.scale_length = 1.0
for n in ("Cube", "Light", "Camera"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children: sc.collection.children.link(c)
    return c
C_SCENE, C_BOARD = coll("TRK_scene"), coll("TRK_board")

def move_to(o, c):
    for uc in list(o.users_collection): uc.objects.unlink(o)
    c.objects.link(o)

def principled(name, col, rough=0.8, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = col
    return m

M_WOOD  = principled("TRK_wood",  lin("#6B4A2E"), 0.75)
M_STEEL = principled("TRK_steel", lin("#8B8F93"), 0.45, 1.0)
M_WATER = principled("TRK_water", lin("#2F5F73"), 0.06)
M_WATER.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.333

# terrain material: soil on banks, field colour on flats (by normal Z)
M_GROUND = principled("TRK_ground", lin("#C9BF86"), 0.9)
nt = M_GROUND.node_tree
geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.80; ramp.color_ramp.elements[0].color = lin("#6B4A2E")
ramp.color_ramp.elements[1].position = 0.97; ramp.color_ramp.elements[1].color = lin("#C9BF86")
nt.links.new(geo.outputs["Normal"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])

# ---------- terrain ----------
xs, x = [], -W / 2
while x <= W / 2 + 1e-6:
    xs.append(round(x, 4)); x += 0.05 if abs(x) < 3.2 else 0.5
ys = [-L / 2 + i * ROW_STEP for i in range(int(L / ROW_STEP) + 1)]
nx = len(xs)
verts = [(x, y, ground_z(x, y)) for y in ys for x in xs]
faces = [(j*nx+i, j*nx+i+1, (j+1)*nx+i+1, (j+1)*nx+i)
         for j in range(len(ys) - 1) for i in range(nx - 1)]
me = bpy.data.meshes.new("TRK_terrain"); me.from_pydata(verts, [], faces); me.update()
terrain = bpy.data.objects.new("TRK_terrain", me); C_SCENE.objects.link(terrain)
me.materials.append(M_GROUND)

# ---------- water ----------
def quad(name, y0, y1, z0, z1, hw=3.2):
    m = bpy.data.meshes.new(name)
    m.from_pydata([(-hw, y0, z0), (hw, y0, z0), (hw, y1, z1), (-hw, y1, z1)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new(name, m); C_SCENE.objects.link(o); m.materials.append(M_WATER)
    return o
z_hold = bed_z(0) + H_HOLD
w_up = quad("TRK_water_up", -L / 2, -0.02, z_hold, z_hold)          # basis = TRZYMAJ (level)
w_up.shape_key_add(name="Basis")
sk = w_up.shape_key_add(name="OTWORZ")                               # follows bed grade
for i, v in enumerate(w_up.data.vertices):
    sk.data[i].co.z = bed_z(v.co.y) + H_OPEN
w_dn = quad("TRK_water_down", 0.02, L / 2, bed_z(0.02) + H_OPEN, bed_z(L / 2) + H_OPEN)

# ---------- board + frame ----------
def box(name, sx, sy, sz, loc, mat, c, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    b = o.modifiers.new("bevel", "BEVEL"); b.width = bevel; b.segments = 2
    move_to(o, c); return o

B = bed_z(0)
lift = bpy.data.objects.new("BOARD_LIFT", None); C_BOARD.objects.link(lift)
for i in range(PLANKS):
    p = box(f"board_plank_{i}", 0.96, 0.04, PLANK_H - 0.004,
            (0, 0, B + PLANK_H / 2 + i * PLANK_H), M_WOOD, C_BOARD, 0.003)
    p.parent = lift
POST_H = 2.05                                     # bed-0.30 .. bed+1.75
for s in (-1, 1):
    box(f"frame_post_{'L' if s < 0 else 'R'}", 0.06, 0.10, POST_H,
        (s * 0.50, 0, B - 0.30 + POST_H / 2), M_STEEL, C_BOARD)
    box(f"frame_wing_{'L' if s < 0 else 'R'}", 1.60, 0.01, 1.20,
        (s * 1.33, 0, B + 0.20), M_STEEL, C_BOARD, 0.002)
beam = box("frame_beam", 1.12, 0.10, 0.08, (0, 0, B + 1.79), M_STEEL, C_BOARD)
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.015, depth=0.35, location=(0, 0, B + 2.0))
move_to(bpy.context.object, C_BOARD); bpy.context.object.data.materials.append(M_STEEL)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.12, depth=0.02, location=(0, 0, B + 2.17))
move_to(bpy.context.object, C_BOARD); bpy.context.object.data.materials.append(M_STEEL)
# sign plate (S09): 300 x 200 x 3 mm on the right post, downstream face
plate = box("sign_plate_S-007", 0.30, 0.003, 0.20, (0.50, 0.052, B + 1.45),
            principled("TRK_plate", lin("#1F3A22"), 0.5), C_BOARD, 0.001)

# ---------- cameras ----------
def cam(name, loc, target, lens=35, fstop=None, ortho=None):
    d = bpy.data.cameras.new(name); d.lens = lens; d.sensor_width = 36; d.clip_end = 3000
    if ortho: d.type = "ORTHO"; d.ortho_scale = ortho
    o = bpy.data.objects.new(name, d); C_SCENE.objects.link(o); o.location = loc
    if target is not None:
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        if fstop:
            d.dof.use_dof = True; d.dof.aperture_fstop = fstop
            d.dof.focus_distance = (Vector(target) - Vector(loc)).length
    return o
cam_cover = cam("CAM_cover_35", (2.2, 72.0, 1.35), (0, -60, -0.2), 35)
cam_bank  = cam("CAM_bank_35",  (2.9, 9.0, 1.5),   (0, -1.0, -1.0), 35, 8.0)
cam_board = cam("CAM_board_50", (1.6, 2.4, 0.05),  (0.15, 0, B + CREST), 50, 2.8)
cam_top   = cam("CAM_top_ortho", (0, 0, 300), None, ortho=120)   # straight down, rotation 0
sc.camera = cam_bank

# ---------- light + world ----------
sun_d = bpy.data.lights.new("TRK_sun", "SUN"); sun_d.energy = 3.0
sun_d.color = (1.0, 0.78, 0.55); sun_d.angle = math.radians(1.0)
sun = bpy.data.objects.new("TRK_sun", sun_d); C_SCENE.objects.link(sun)
elev = math.radians(8)                                   # golden hour
sun.rotation_euler = Vector((1.0, 0.3, -math.tan(elev))).to_track_quat("-Z", "Y").to_euler()
world = sc.world or bpy.data.worlds.new("World"); sc.world = world
try: world.use_nodes = True
except Exception: pass
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = lin("#A9BFCF"); bg.inputs["Strength"].default_value = 0.8

# ---------- animation: TRZYMAJ -> OTWÓRZ (25 fps) ----------
sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, 125
lift.location.z = 0.0;  lift.keyframe_insert("location", index=2, frame=26)
lift.location.z = LIFT; lift.keyframe_insert("location", index=2, frame=51)
kb = w_up.data.shape_keys.key_blocks["OTWORZ"]
kb.value = 0.0; kb.keyframe_insert("value", frame=38)
kb.value = 1.0; kb.keyframe_insert("value", frame=78)
# cover push-in: 10 s, board distance 72 -> 66 m  (image scale 1.09, cap 1.12)
cam_cover.keyframe_insert("location", frame=1)
cam_cover.location.y = 66.0; cam_cover.keyframe_insert("location", frame=250)
sc.frame_set(1)

# ---------- render ----------
sc.render.engine = "CYCLES"
sc.cycles.samples = 256; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
try: sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "None"
except Exception: pass
print("TRAKTOR scene ready")
```

To get **TRZYMAJ** at frame 1 and **OTWÓRZ** at frame 125, leave the animation as is. To reverse it (OTWÓRZ → TRZYMAJ), swap the values in the keyframes: board 0.70 → 0 on f26–51, and shape key 1 → 0 on **f52–92**. The board goes down first, then the water rises.

### 3.2 `traktor_lidar_gn.py`: point-cloud look (Geometry Nodes)
Run this after 3.1. It creates birch proxies and a `TRK_lidar` object. Its GN modifier turns terrain, water, trees and board into class-coloured points. It also adds `set_look("lidar" | "photo")`.

```python
# traktor_lidar_gn.py  (run after traktor_scene.py)
import bpy, random
sc = bpy.context.scene
USE_INSTANCES = False     # True = icosphere instances (EEVEE fallback; use DENSITY <= 25)
DENSITY, RADIUS = 80.0, 0.02          # pts/m² near the ditch, point radius (m)
FADE_NEAR, FADE_FAR = 20.0, 140.0     # distance fade to forest (m)

def lin(h):
    h = h.lstrip("#"); o = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        o.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*o, 1.0)
COL = dict(field=lin("#F3ECDD"), bank=lin("#6B4A2E"), water=lin("#3B7FA3"),
           canopy=lin("#8FA86A"), trunk=lin("#E7E1D4"), board=lin("#4F7A3A"), bg=lin("#1F3A22"))

def sock(coll, name, typ=None):
    for s in coll:
        if s.name == name and getattr(s, "enabled", True) and (typ is None or s.type == typ):
            return s
    raise KeyError(name)

# --- birch row proxies (hidden; only sampled by GN) ---
trees = bpy.data.collections.get("TRK_birch_proxies") or bpy.data.collections.new("TRK_birch_proxies")
if trees.name not in sc.collection.children: sc.collection.children.link(trees)
if not trees.objects:
    random.seed(7)
    for i, y in enumerate(range(-78, 79, 6)):
        x, h = 16.0 + random.uniform(-0.6, 0.6), random.uniform(9, 13)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=h * 0.6, location=(x, y, h * 0.3))
        t = bpy.context.object; t.name = f"birch_trunk_{i:02d}"
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0,
                                              location=(x, y + random.uniform(-.5, .5), h * 0.68))
        c = bpy.context.object; c.name = f"birch_crown_{i:02d}"
        c.scale = (random.uniform(1.8, 2.6), random.uniform(1.8, 2.6), h * 0.3)
        for o in (t, c):
            for uc in list(o.users_collection): uc.objects.unlink(o)
            trees.objects.link(o); o.visible_camera = False   # stays evaluated for GN

# --- point material: flat colour + distance fade into forest (no glow, no bloom) ---
m = bpy.data.materials.get("TRK_Point") or bpy.data.materials.new("TRK_Point")
try: m.use_nodes = True
except Exception: pass
mt = m.node_tree; mt.nodes.clear()
attr = mt.nodes.new("ShaderNodeAttribute"); attr.attribute_name = "lidar_col"; attr.attribute_type = "GEOMETRY"
camd = mt.nodes.new("ShaderNodeCameraData")
mr = mt.nodes.new("ShaderNodeMapRange")
mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = FADE_NEAR, FADE_FAR
mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.0, 0.9
mix = mt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
em = mt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 1.0
out = mt.nodes.new("ShaderNodeOutputMaterial")
mt.links.new(camd.outputs["View Z Depth"], mr.inputs["Value"])
mt.links.new(mr.outputs["Result"], mix.inputs["Factor"])
mt.links.new(attr.outputs["Color"], sock(mix.inputs, "A", "RGBA"))
sock(mix.inputs, "B", "RGBA").default_value = COL["bg"]
mt.links.new(sock(mix.outputs, "Result", "RGBA"), em.inputs["Color"])
mt.links.new(em.outputs["Emission"], out.inputs["Surface"])

# --- node group ---
old = bpy.data.node_groups.get("TRK_Lidar")
if old: bpy.data.node_groups.remove(old)
ng = bpy.data.node_groups.new("TRK_Lidar", "GeometryNodeTree")
ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
N, Lk = ng.nodes, ng.links
gout = N.new("NodeGroupOutput"); N.new("NodeGroupInput")
join = N.new("GeometryNodeJoinGeometry")

def store(geo_socket, color_socket=None, color=None):
    s = N.new("GeometryNodeStoreNamedAttribute"); s.data_type = "FLOAT_COLOR"; s.domain = "POINT"
    s.inputs["Name"].default_value = "lidar_col"
    Lk.new(geo_socket, s.inputs["Geometry"])
    v = sock(s.inputs, "Value")
    if color_socket: Lk.new(color_socket, v)
    else: v.default_value = color
    Lk.new(s.outputs["Geometry"], join.inputs["Geometry"])

def distribute(geo_socket, density):
    d = N.new("GeometryNodeDistributePointsOnFaces"); d.inputs["Density"].default_value = density
    Lk.new(geo_socket, d.inputs["Mesh"]); return d.outputs["Points"]

def switch(cond_socket, c_false, c_true):
    sw = N.new("GeometryNodeSwitch"); sw.input_type = "RGBA"
    sock(sw.inputs, "False").default_value = c_false; sock(sw.inputs, "True").default_value = c_true
    Lk.new(cond_socket, sw.inputs["Switch"]); return sw.outputs[0]

def obj_geo(name):
    oi = N.new("GeometryNodeObjectInfo"); oi.transform_space = "RELATIVE"
    oi.inputs["Object"].default_value = bpy.data.objects[name]; return oi.outputs["Geometry"]

def col_geo(name):
    ci = N.new("GeometryNodeCollectionInfo"); ci.transform_space = "RELATIVE"
    ci.inputs["Collection"].default_value = bpy.data.collections[name]
    ri = N.new("GeometryNodeRealizeInstances"); Lk.new(ci.outputs[0], ri.inputs["Geometry"])
    return ri.outputs["Geometry"]

pos = N.new("GeometryNodeInputPosition"); sep = N.new("ShaderNodeSeparateXYZ"); Lk.new(pos.outputs[0], sep.inputs[0])
absx = N.new("ShaderNodeMath"); absx.operation = "ABSOLUTE"; Lk.new(sep.outputs["X"], absx.inputs[0])

# terrain: dense near the ditch, thinned with distance; |x| < 2.6 m = bank (soil), else field (cream)
pts = distribute(obj_geo("TRK_terrain"), DENSITY)
thin = N.new("ShaderNodeMapRange"); Lk.new(absx.outputs[0], thin.inputs["Value"])
thin.inputs["From Min"].default_value, thin.inputs["From Max"].default_value = 4.0, 30.0
thin.inputs["To Min"].default_value, thin.inputs["To Max"].default_value = 0.0, 0.7
rnd = N.new("FunctionNodeRandomValue"); rnd.data_type = "BOOLEAN"
Lk.new(thin.outputs["Result"], sock(rnd.inputs, "Probability"))
dele = N.new("GeometryNodeDeleteGeometry"); dele.domain = "POINT"
Lk.new(pts, dele.inputs["Geometry"]); Lk.new(sock(rnd.outputs, "Value", "BOOLEAN"), dele.inputs["Selection"])
is_bank = N.new("FunctionNodeCompare"); is_bank.data_type = "FLOAT"; is_bank.operation = "LESS_THAN"
Lk.new(absx.outputs[0], is_bank.inputs[0]); is_bank.inputs[1].default_value = 2.6
store(dele.outputs["Geometry"], switch(is_bank.outputs[0], COL["field"], COL["bank"]))

# water (follows the shape-key animation, stable per frame)
for w in ("TRK_water_up", "TRK_water_down"):
    store(distribute(obj_geo(w), DENSITY * 1.5), color=COL["water"])
# birches: canopy above 3.2 m, trunks below
is_crown = N.new("FunctionNodeCompare"); is_crown.data_type = "FLOAT"; is_crown.operation = "GREATER_THAN"
Lk.new(sep.outputs["Z"], is_crown.inputs[0]); is_crown.inputs[1].default_value = 3.2
store(distribute(col_geo("TRK_birch_proxies"), 25.0), switch(is_crown.outputs[0], COL["trunk"], COL["canopy"]))
# board + frame as accent points
store(distribute(col_geo("TRK_board"), 2000.0), color=COL["board"])

if USE_INSTANCES:
    ico = N.new("GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = RADIUS
    ico.inputs["Subdivisions"].default_value = 1
    inst = N.new("GeometryNodeInstanceOnPoints"); Lk.new(join.outputs[0], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    real = N.new("GeometryNodeRealizeInstances"); Lk.new(inst.outputs[0], real.inputs["Geometry"])
    last = real.outputs["Geometry"]
else:
    rad = N.new("GeometryNodeSetPointRadius"); rad.inputs["Radius"].default_value = RADIUS
    Lk.new(join.outputs[0], rad.inputs["Points"]); last = rad.outputs["Points"]
setm = N.new("GeometryNodeSetMaterial"); setm.inputs["Material"].default_value = m
Lk.new(last, setm.inputs["Geometry"]); Lk.new(setm.outputs["Geometry"], gout.inputs[0])

me = bpy.data.meshes.get("TRK_lidar") or bpy.data.meshes.new("TRK_lidar")
ob = bpy.data.objects.get("TRK_lidar") or bpy.data.objects.new("TRK_lidar", me)
if ob.name not in sc.collection.objects: sc.collection.objects.link(ob)
mod = ob.modifiers.get("TRK_Lidar") or ob.modifiers.new("TRK_Lidar", "NODES"); mod.node_group = ng

def set_look(look):
    lidar = look == "lidar"
    ob.hide_render = ob.hide_viewport = not lidar
    # camera visibility, not hide_render: hidden objects can drop out of Collection Info
    for c in ("TRK_scene", "TRK_board"):
        for o in bpy.data.collections[c].objects:
            if o.type == "MESH": o.visible_camera = not lidar
    bg = sc.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = COL["bg"] if lidar else lin("#A9BFCF")
    bg.inputs["Strength"].default_value = 1.0 if lidar else 0.8
    sc.view_settings.view_transform = "Standard" if lidar else "AgX"
    sc.cycles.samples = 64 if lidar else 256
set_look("lidar")
```

Notes:
- **Cycles** renders point-cloud geometry natively as spheres. That is the fastest and cleanest option. If your **EEVEE** build shows no points, set `USE_INSTANCES = True`.
- Do **not** use *Points to Volume*, volumetric fog or emission above 1.0. They turn points into glowing blobs, which is off-brand.
- With `CAM_top_ortho`, set `FADE_NEAR`/`FADE_FAR` high (e.g. 500/600). An orthographic camera's depth is constant, so the fade would tint everything.

---

## 4. Shot briefs

General settings for every shot:
- 25 fps (24 fps frame numbers are in brackets).
- Cycles, 64 samples for graphic renders and 256–512 for photo renders, OpenImageDenoise on.
- Film: Filter 1.5 px. Motion blur off unless stated.
- Output: PNG 16-bit RGB for stills and PNG sequences for animation; encode to video afterwards (§6).

### S01: Cover hero ("the ditch to the horizon")
- **Use:** deck slide 01, website hero (video + still), slide 08 (real ALS variant), social crop.
- **Size:** still 3840×2160; video 1920×1080, 10 s; social 1080×1350.
- **Build:** run §3.1 with `L = 400`, `ROW_STEP = 1.0`, then §3.2 with `FADE_FAR = 220`. Prefer the real ALS variant (§2.3) for slide 08 and put the source line under it. Water is in the TRZYMAJ state (frame 1). Points only, no surfaces. Board points are agri green, about 70 m from the camera. Composition: the ditch is a vanishing line from lower-right to the centre horizon, the birch row sits on the left third, and the horizon is at 40 % of the frame height. The top 45 % is plain forest `#1F3A22`, which leaves room for headline space.
- **Camera:** `CAM_cover_35` at 35 mm, 1.35 m high, 2.2 m off the ditch axis, pitched about −1°. No DOF: points need to stay crisp.
- **Light:** none needed (emission). World is forest, strength 1.0.
- **Animation:** push-in from f1 to f250 (10 s), dolly y 72 → 66 m. Board image scale is 1.09 (the cap is 1.12). Interpolation: Bezier for the deck; set it to Linear for a web loop, which then ends with a cut to the still, not a rewind. No rotation and no roll.
- **Render:** Standard view transform, 64 samples, motion blur off.
- **Compositing:** none.
- **Files:** `trk_s01-cover_still_3840x2160_v01.png`, `trk_s01-cover_1920x1080_25p_####.png` → `.mp4` / `.webm`, `trk_s01-cover_social_1080x1350_v01.png`.
- **AI concept prompt:** *A LiDAR point cloud of flat Polish farmland at eye level: a straight drainage ditch runs from the lower right to the horizon. Each point is a tiny dot coloured by class: cream field, soil-brown banks, muted blue water, pale green birch crowns in a single tree row on the left. Distant points fade into a solid dark forest-green (#1F3A22) background. No glow, no grid, no sci-fi, calm, documentary, 35 mm lens, wide 16:9.* **Concept only. Ship our render.**

### S02: Cross-section "survey drawing", TRZYMAJ vs OTWÓRZ
- **Use:** slides 03 and 04; pairs with the logo idea (ground line field → bank → bed → bank → field).
- **Size:** 3840×2160, transparent PNG, 2 frames. Optional 1920×1080 animation of 1.6 s.
- **Build:** a separate scene drawn in the XY plane (X across the ditch, Y = height), viewed from the top orthographically. Emission materials only:

```python
# traktor_section.py: flat survey drawing, own scene
import bpy
def lin(h):
    h = h.lstrip("#"); o = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        o.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*o, 1.0)
sc = bpy.data.scenes.new("TRK_section"); bpy.context.window.scene = sc
sc.render.engine = "CYCLES"; sc.cycles.samples = 16
sc.render.resolution_x, sc.render.resolution_y = 3840, 2160
sc.render.film_transparent = True; sc.view_settings.view_transform = "Standard"

def flat(name, hexc):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = lin(hexc)
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs[0], o.inputs[0]); return m

def poly(name, pts, mat, z, closed=False, width=None):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D" if closed else "3D"
    if closed: cu.fill_mode = "BOTH"
    else: cu.bevel_depth = width / 2; cu.bevel_resolution = 0
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts): p.co = (x, y, 0, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu); o.location.z = z; cu.materials.append(mat)
    sc.collection.objects.link(o); return o

D, BW, S = 1.40, 0.70, 1.5
T = BW / 2 + S * D                           # 2.45 m
ground = [(-4.5, 0), (-T, 0), (-BW/2, -D), (BW/2, -D), (T, 0), (4.5, 0)]
poly("soil_fill", ground + [(4.5, -1.9), (-4.5, -1.9)], flat("cream_deep", "#EFE6D3"), 0.00, closed=True)
poly("ground_line", ground, flat("forest", "#1F3A22"), 0.03, width=0.035)

def state(tag, h, board_y0):
    xw = BW / 2 + S * h; yl = -D + h
    objs = [poly(f"water_{tag}", [(-xw, yl), (xw, yl), (BW/2, -D), (-BW/2, -D)],
                 flat(f"water_{tag}", "#3B7FA3"), 0.01, closed=True)]
    for i, x0 in enumerate((-1.6, -1.2, -0.8, -0.4, 0.0, 0.4, 0.8, 1.2)):   # dashed level line
        objs.append(poly(f"level_{tag}_{i}", [(x0, yl + 0.04), (x0 + 0.22, yl + 0.04)],
                         flat(f"lvl_{tag}_{i}", "#3B7FA3"), 0.04, width=0.02))
    objs.append(poly(f"board_{tag}", [(-0.48, board_y0), (0.48, board_y0), (0.48, board_y0 + 0.45),
                     (-0.48, board_y0 + 0.45)], flat(f"board_{tag}", "#6B4A2E"), 0.02, closed=True))
    return objs
trzymaj = state("TRZYMAJ", 0.44, -D)          # board in, water held
otworz  = state("OTWORZ", 0.12, -D + 0.70)    # board lifted, base flow
for x in (-0.50, 0.50):                       # steel frame posts + beam
    poly(f"post_{x}", [(x, -1.7), (x, 0.35)], flat(f"post{x}", "#1F3A22"), 0.05, width=0.03)
poly("beam", [(-0.53, 0.35), (0.53, 0.35)], flat("beam", "#1F3A22"), 0.05, width=0.05)

cd = bpy.data.cameras.new("CAM_section"); cd.type = "ORTHO"; cd.ortho_scale = 10.0
cam = bpy.data.objects.new("CAM_section", cd); cam.location = (0, -0.6, 10); sc.collection.objects.link(cam)
sc.camera = cam

def render_state(tag, path):
    for o in trzymaj: o.hide_render = tag != "TRZYMAJ"
    for o in otworz:  o.hide_render = tag != "OTWORZ"
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
# render_state("TRZYMAJ", r"//trk_s02-section_trzymaj_3840x2160_v01.png")
# render_state("OTWORZ",  r"//trk_s02-section_otworz_3840x2160_v01.png")
```

- **Camera:** orthographic, straight down, ortho scale 10 m. No perspective, no tilt.
- **Light:** none (emission only), transparent film. Place the frame on cream `#F3ECDD` or forest in the layout. On forest, swap the ground-line and post colour to cream.
- **Animation (optional):** convert `water_*` to mesh (Object > Convert > Mesh), add a shape key OTWÓRZ, and key its value 0 → 1 over **f1–40 [f1–38]** (1.6 s, Bezier). Board y moves +0.70 over f1–25 before that.
- **Labels:** **do not bake text.** Set it in the slide (Inter, `.eb` eyebrow style): `POLE · SKARPA · DNO · SKARPA · POLE`, the state tag `TRZYMAJ` / `OTWÓRZ`, and dimensions with decimal commas: `1,4 m`, `0,7 m`, `1:1,5`.
- **Files:** `trk_s02-section_trzymaj_3840x2160_v01.png`, `trk_s02-section_otworz_3840x2160_v01.png`.
- **AI concept prompt:** *Flat technical cross-section of a trapezoid field drainage ditch, like a survey drawing: one thin dark-green ground line steps from field down a 1:1.5 bank to a narrow bed and back up, soil filled in pale cream-beige, a small brown rectangle board standing in the bed, muted blue water filling to a dashed level line. Cream background, no shading, no perspective, no text, minimal, precise.* **Concept only.**

### S03: The board in its steel frame (macro, photo look)
- **Use:** slide 03 (Pomysł), poster, social.
- **Size:** 3840×2160; social 1080×1350 (re-frame, don't crop).
- **Build:** §3.1 at frame 1 (TRZYMAJ, water 1 cm under the crest).
  - **Wood:** larch planks. Add a Wave or Noise texture along X for grain, with bump strength 0.15. The planks are darker and rougher below the waterline: mask with *Geometry > Position Z → Map Range (−0.97 → −0.90)*, mix in wet wood `#5A3E28` and lower roughness to 0.45. Hand-place 2–3 M12 bolt heads per post.
  - **Steel:** galvanised steel `#8B8F93`, metallic 1, roughness 0.35–0.5, broken up with a large Noise. Add faint brown rust streaks only under the bolts, at most 10 % coverage.
  - **Banks:** soil with sparse grass. Use Geometry Nodes scatter or hair on the bank faces and keep the grass 15–30 cm, dry-green.
  - **Water:** murky `#2F5F73`, roughness 0.06, IOR 1.333, small-scale Noise bump 0.02 for ripples. No caustics.
- **Camera:** `CAM_board_50` at 50 mm, standing on the bank top, about 1.6 m from the board, pitched about −30°. f/2.8, focus on the top plank edge. The background bank is soft.
- **Light:** golden hour. Sun elevation 8–12°, side-light from the left, strength 3, warm colour (1.0, 0.78, 0.55), angle 1°. World sky strength 0.8.
- **Render:** Cycles, 512 samples, light paths: Total 12, Glossy 4, Transmission 8. AgX.
- **Compositing:** Hue/Sat/Value with Saturation 0.88. Nothing else.
- **Files:** `trk_s03-board-macro_3840x2160_v01.png`, `trk_s03-board-macro_social_1080x1350_v01.png`.
- **AI concept prompt:** *Documentary photograph, 50 mm, from the grassy bank of a Polish field drainage ditch: three weathered larch boards slotted into a simple galvanised steel frame across the ditch, still brown-green water held just below the top board, low warm side light, soft background bank, shallow depth of field, muted natural colours, no logos, no people, no dramatic sky.* **Concept only.**

### S04: TRZYMAJ ↔ OTWÓRZ animation (water level change)
- **Use:** slide 07 (Przełączenie) and slide 03; it syncs with the state tiles in the UI.
- **Size:** 1920×1080, 5 s (125 f [120 f]). Optional 3840×2160.
- **Build:** §3.1 as is. Render both the photo look and the LiDAR look (`set_look`), then pick one per slide.
- **Keyframes (25 fps [24 fps]), OTWÓRZ version:**

| Frames | Event |
|---|---|
| f1–25 [1–24] | still, TRZYMAJ |
| f26–51 [25–49] | board lifts +0.70 m (1.0 s) |
| f38–78 [37–75] | upstream water drops 0.44 → 0.12 m (**1.6 s**, ease-in-out, no overshoot) |
| f79–125 [76–120] | still, OTWÓRZ |

  TRZYMAJ (reverse) version: board down on f26–51, water rises on **f52–92 [50–88]**.
- **Camera:** `CAM_bank_35`, locked off. Allowed: a slow push-in of 35 → 37 mm over the whole clip (scale 1.06). Nothing else moves.
- **Light:** as S03, or the S05 overcast for the OTWÓRZ version.
- **Render:** motion blur on, shutter 0.5. Photo look 256 samples; LiDAR look 64.
- **Caption in the layout:** `czas przyspieszony`. On site the level changes over hours, not 1.6 s.
- **UI sync:** the deck's state tile switches over 400 ms at frame 26 (1.0 s).
- **Files:** `trk_s04-flip-otworz_1920x1080_25p_####.png`, `trk_s04-flip-trzymaj_1920x1080_25p_####.png` → `.mp4`.
- **AI concept prompt:** *Two documentary frames of the same field drainage ditch with a wooden board in a steel frame: left, board down, water held high and calm; right, board lifted, water low in the narrow bed. Same camera, 35 mm from the bank, natural light, muted colours, no text.* **Concept only.**

### S05: Storm approach (OTWÓRZ)
- **Use:** slide 07 (paired with S06), social.
- **Size:** 3840×2160; social 1080×1350.
- **Build:** §3.1 at frame 125 (board lifted, water low). Make the field darker and damp: lower the ground roughness to 0.6 and multiply the colour by 0.8. Optionally add a few shallow puddles in the tractor ruts.
- **Camera:** `CAM_bank_35` at 35 mm, 1.5 m high. Frame a little more sky (horizon at 55 %). f/8.
- **Light:** flat overcast. Sun strength 0.3 with angle 30° (soft, almost no shadow). World is a gradient: *Texture Coordinate > Normal Z → Color Ramp* from horizon `#C9CFD2` to zenith sky `#A9BFCF`, strength 1.2. Add a Mist pass (start 20 m, depth 300 m) and mix it in the compositor toward `#A9BFCF` at factor 0.5.
- **Never:** lightning, rain streaks, flashes, dark-drama grading.
- **Render:** 256 samples, AgX.
- **Compositing:** Mist mix as above, then Saturation 0.85.
- **Files:** `trk_s05-storm-otworz_3840x2160_v01.png`.
- **AI concept prompt:** *Documentary photo of a flat Polish field drainage ditch under a heavy, even grey-blue overcast sky (#A9BFCF tones): a wooden board lifted high in its steel frame, water low in the ditch bed, damp dark field, birch row soft in the haze, 35 mm lens, calm before a storm, no lightning, no rain streaks, muted colours.* **Concept only.**

### S06: Drought, August (TRZYMAJ)
- **Use:** slide 02 (Problem) and slide 07.
- **Size:** 3840×2160.
- **Build:** §3.1 at frame 1 (water held).
  - **Cracked field:** field colour is dry soil `#B98D5F`. Drive cracks with *Voronoi (Distance to Edge, scale 7/m)*. Through a Color Ramp at 0.00–0.04 they become dark soil `#6B4A2E`, with bump strength 0.4 (or displacement for close foreground).
  - **Crops:** short stubble or yellowed cereal, `#C9BF86`, scattered on the field.
  - The ditch water is calm and reflects the warm sky. The story is in one frame: dry field, held water.
- **Camera:** 35 mm, **0.6 m** above the field at the ditch edge. Cracked soil fills the lower third and the ditch leads away. f/8, focus at 6 m.
- **Light:** golden hour. Sun elevation 6–9°, warm (1.0, 0.72, 0.45), strength 3.5. World `#A9BFCF` at strength 0.6. Light haze from Mist, factor 0.2.
- **Render:** 512 samples, AgX.
- **Compositing:** Saturation 0.88.
- **Files:** `trk_s06-drought-trzymaj_3840x2160_v01.png`.
- **AI concept prompt:** *Low documentary photograph at golden hour in August, flat Polish farmland: cracked dry soil in the foreground, a straight drainage ditch still holding calm water behind a small wooden board, warm low sun, faint haze, birch row in the distance, 35 mm lens, muted natural colours, no people, no lens flare.* **Concept only.**

### S07: Aerial "map" of the ditch network (refusal slide)
- **Use:** slide 05 (Odmowa) and slide 08.
- **Size:** 3840×2160. Optional pins-only layer with a transparent background.
- **Build:**
  - **Terrain:** real NMT (§2.2, raw build) about 2.2×1.2 km, or a procedural plane.
  - **Points:** `Mesh to Points` on the DEM vertices (0.5–1 pts/m²), radius 0.7 m.
  - **Colour by elevation band:** *Position Z → Map Range (z_min..z_max → 0..1) → Color Ramp, Constant interpolation*, 5 stops `#2F5F73 · #8FA86A · #C9BF86 · #B98D5F · #EFE6D3`.
  - **Contours:** `fract(Z / 1.0) < 0.04` → cream `#F3ECDD`, for major contours every 1 m. Flat Kujawy gives few contours, and that is fine.
  - **Ditches:** BDOT10k lines → *Curve to Points (length 0.5 m)*, radius 1.2 m, water blue `#3B7FA3`.
  - **Sites:** take them from the demo data in `web/src/lib/traktor/mock.ts`. `xy` is a local grid at 10 m per unit; northing = −y·10. Export accepted and refused sites to JSON, make one vertex per site with an int attribute `ok`, then *Instance on Points* a flat cylinder (r 12 m, h 0.1 m) at z +50. `ok = 1` is agri `#4F7A3A`, `ok = 0` is terra `#B5573B`. Add a 2 m cream ring around each pin for separation. **Pins are flat dots, not 3D map pins.**
- **Camera:** `CAM_top_ortho`, straight down, rotation (0, 0, 0), ortho scale about 2200 m. **No 3D tilt, no hillshade, no shadows.**
- **Light:** none (emission). Standard view. Set the point fade off (`FADE_NEAR`/`FADE_FAR` > camera height).
- **Layout (not baked):** source line `Źródło: GUGiK NMT 1 m, BDOT10k · (dane demonstracyjne)`. Use the counters from the demo (`1 939 → 112`, real BDOT10k + NMT data west of Bydgoszcz).
- **Files:** `trk_s07-map-sites_3840x2160_v01.png`, `trk_s07-map-pins_3840x2160_alpha_v01.png`.
- **AI concept prompt:** *Top-down orthographic map of flat farmland made of tiny points: calm elevation bands from dark teal through sage green, straw and tan to pale cream, thin cream contour lines, a network of straight drainage ditches in muted blue, a few green dots for safe sites and more terracotta dots for rejected ones. No tilt, no shadows, no glow, clean and map-like.* **Concept only.**

### S08: Tractor working, side-on (+ S08b dirt track with birches)
- **Use:** slide 09 (Efekt); S08b for slide 10.
- **Size:** 3840×2160; social 1080×1350.
- **Build:**
  - **Tractor:** a generic tractor, blocked out or from a CC0 model (check the licence, strip every decal). Proportions: rear wheels Ø 1.8 m, front Ø 1.1 m, wheelbase 2.7 m, cab 1.4 m wide, total height 2.9 m.
  - **Paint:** graphite `#3A3F44` body, black wheels, dark cab glass. **No manufacturer livery or colours:** no green and yellow, red, blue or orange body. No logos, no number plates.
  - **Mud:** a little, on tyres and lower body. Mask with *Ambient Occlusion (inverted) × Noise × Position Z < 0.8 m* and mix in soil `#6B4A2E`, roughness 0.9.
  - **Setting:** the tractor drives a dirt track along the field with a light cultivator or empty. The birch row is 15 m behind and the ditch edge is visible in the foreground.
- **Camera:** **85 mm**, 35–40 m away, 1.4 m high, exactly perpendicular to the track (side-on). f/4 (birches soft). Tractor at 40 % of the frame width, left of centre, heading right.
- **Light:** late afternoon. Sun elevation 15–20° from behind the camera's left shoulder, strength 3. World sky strength 0.8.
- **Animation (optional):** 4 s, tractor at 8 km/h (2.2 m/s) drives through; the camera pans to keep it. Motion blur shutter 0.5, wheels rotating to match the speed.
- **S08b:** the same dirt track **without** the tractor. 35 mm at 1.6 m, the track leads away with the birch row along it. Golden hour.
- **Render:** 256–512 samples, AgX.
- **Compositing:** Saturation 0.85.
- **Files:** `trk_s08-tractor-side_3840x2160_v01.png`, `trk_s08b-track-birches_3840x2160_v01.png`.
- **AI concept prompt:** *Documentary photograph, 85 mm telephoto, side-on view of a plain unbranded dark-grey farm tractor working on a dirt track beside a flat Polish field, a little mud on the tyres, a row of birch trees softly out of focus behind, late-afternoon natural light, muted colours, no logos, no manufacturer colours, no people posing.* **Concept only.**

### S09: Field sign on the board frame
- **Use:** slide 06 (Demo) and the site card / landing detail; it bridges the product and the app's site ID **S-007**.
- **Size:** 1920×1080 and 1080×1350.
- **Build:** the `sign_plate_S-007` object from §3.1: 300×200×3 mm aluminium, powder-coated forest `#1F3A22`, roughness 0.5, 4 corner rivets, mounted on the right post.
  - **Plate content** (cream `#F3ECDD`, Text objects extruded 0.3 mm, or one image texture):
    ```
    ZASTAWKA NR                       ← Inter SemiBold, caps, +14 % tracking, 12 mm
    S-007                             ← Archivo ExtraBold (Condensed), 48 mm
    [ TRZYMAJ ]  [ OTWÓRZ ]           ← two 120×34 mm tiles, Archivo Bold 16 mm
                                        TRZYMAJ: 2 mm cream outline on forest
                                        OTWÓRZ: water #3B7FA3 fill, cream text
    ```
  - Set the text body from Python so the diacritics are correct: `txt.data.body = "OTWÓRZ"`. Load the fonts with `bpy.data.fonts.load(path)` and make sure the font has Ó. If you only have Archivo ExtraBold at normal width, set Text > Shear 0 and scale X to 0.78.
  - If a logo appears, **import the logo artwork as SVG.** Copy the `<svg>` from `web/src/components/brand/Logo.tsx` into a file, then File > Import > SVG, minimum symbol 24 mm. **Never type "TRAKTOR" in a font.**
  - Light weathering: dust in the lower 20 %, one faint water line. The text stays fully legible.
- **Camera:** 50 mm, 1.1 m from the plate, slightly from the left (15°). f/4, focus on "S-007". The board and water are soft below.
- **Light:** S03 golden hour, or flat overcast for a neutral variant.
- **Render:** 256 samples, AgX.
- **Compositing:** Saturation 0.9.
- **Files:** `trk_s09-sign-s007_1920x1080_v01.png`, `trk_s09-sign-s007_social_1080x1350_v01.png`.
- **AI concept prompt:** *Close documentary photograph, 50 mm, of a small dark forest-green metal plate bolted to a galvanised steel post at a field ditch: cream text "ZASTAWKA NR S-007" and two labelled boxes "TRZYMAJ" and "OTWÓRZ", wooden boards and still water softly out of focus below, natural light, slight dust, no other logos.* **Concept only.** AI text rendering is unreliable, so the final plate must be our render.

### S10 (optional): Poster A2
- **Use:** event poster; slide 10 crop.
- **Size:** A2 portrait 420×594 mm at 300 dpi = **4961×7016 px**. With 3 mm bleed: 426×600 mm = **5031×7087 px**.
- **Build:** the S01 LiDAR scene with a vertical camera at 35 mm, 1.2 m high, directly on the ditch axis. The ditch rises from the bottom centre to a vanishing point at 58 % height, with birch rows on both sides. The top 35 % of the poster is clean forest, and the bottom 25 % is clean forest for type.
- **Render:** Standard view, 64 samples, 16-bit PNG. Soft-proof to CMYK in the layout tool; the forest/cream contrast holds.
- **Type (set in layout, not in Blender):**
  - headline `NIECH ZIEMIA ZATRZYMA SWOJĄ WODĘ.` (Archivo ExtraBold condensed, cream);
  - one line `Jedna zastawka. Dwa tryby.`;
  - logo artwork;
  - footer `Let the land hold its water.`;
  - caption `Wizualizacja` or the data source line.
- **Files:** `trk_s10-poster-a2_5031x7087_bleed_v01.png`.
- **AI concept prompt:** *Vertical poster artwork: a point-cloud drainage ditch running straight from the bottom centre to the horizon through flat fields, cream and soil-brown points, pale green birch rows on both sides, everything fading into a solid deep forest-green background, generous empty space top and bottom for typography, calm, precise, no glow.* **Concept only.**

---

## 5. Render checklist (tick before export)

- [ ] **No glow:** no Glare node, no bloom (EEVEE Legacy ≤ 4.1: Bloom unticked), emission ≤ 1.0, no volumetrics on points.
- [ ] **No lens flare,** no chromatic aberration, no Lens Distortion node, no vignette.
- [ ] **No sci-fi:** no grids, scan lines, wireframes, HUD rings or "data streams".
- [ ] **Maps are flat:** orthographic, straight down, no 3D tilt, no hillshade, no shadows. Elevation bands + cream contours + water-blue ditches + agri/terra dots only.
- [ ] **Points, not surfaces,** on every LiDAR shot. Colours by class exactly from §1. Standard view transform on graphic shots.
- [ ] **Terracotta only for rejected sites or warnings.** Never decoration, never on the board.
- [ ] **Reduced saturation** on photo shots (×0.85–0.90). AgX, Look None or Medium Low Contrast.
- [ ] **Documentary feel:** natural light (golden hour or flat overcast), real focal lengths (35 / 50 / 85 mm), eye-level or bank-level camera, no drones at sunset.
- [ ] **Motion "like a camera":** push-ins 8–12 s with image scale ≤ 1.12. Water changes 1.2–2 s, Bezier ease-in-out, no overshoot. Never spin, roll, bounce, flash or orbit.
- [ ] **No brands:** no tractor livery or manufacturer colours, no logos except our imported logo artwork.
- [ ] **Polish in frame,** correct diacritics: `TRZYMAJ`, `OTWÓRZ`, `ZASTAWKA NR S-007`. TRZYMAJ/OTWÓRZ never translated.
- [ ] **Honesty labels** planned in the layout: `Wizualizacja` / data source line / `(dane demonstracyjne)` / `czas przyspieszony`.
- [ ] **No headline text baked into renders** (except the physical sign in S09).
- [ ] File named per §6. Final image is our render, not the AI concept.

---

## 6. File naming and encoding

Pattern: `trk_s{NN}-{slug}[_{variant}]_{W}x{H}[_{fps}p][_alpha]_v{NN}.{ext}`
Examples: `trk_s01-cover_still_3840x2160_v01.png`, `trk_s04-flip-otworz_1920x1080_25p_0001.png`.
Blender output path for sequences: `//renders/trk_s04-flip-otworz_1920x1080_25p_####.png`. Keep renders out of git unless the lead asks; web-ready copies go to the lead.

Encode (H.264 for slides, plus WebM for the site):
```
ffmpeg -framerate 25 -i trk_s01-cover_1920x1080_25p_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart trk_s01-cover_1920x1080_25p_v01.mp4
ffmpeg -framerate 25 -i trk_s01-cover_1920x1080_25p_%04d.png -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -an trk_s01-cover_1920x1080_25p_v01.webm
```
Also export the first or last frame as the web poster still (`_poster.jpg`, quality 85). Videos have no audio track. Respect reduced motion on the site: show the still.
