# TRAKTOR: parallax hero with a tractor (Blender brief)

For: whoever renders the landing hero in Blender 4.2+ / 5.x. Companion to `docs/blender/prompts.md` (colour table, ditch profile, file rules). Brand: `.opencode/skills/traktor-brand/SKILL.md`.
Shot ID: **S11 parallax hero**. Front-end owner: landing lane (`web/src/components/landing/**`).

> **Brand rules that apply here.** Final assets are **our own Blender renders**. AI prompts (§10) are for concept frames only. Documentary realism or LiDAR points ("points, never surfaces"). Tractor: generic, **no logos, no livery, no manufacturer colours, not a cartoon**. Motion "like a camera": slow, ease-in-out, scale ≤ 1.12, never spin, flash, bounce or glow. Caption the hero `Wizualizacja` (procedural terrain). The headline is HTML, never baked into the render.

---

## 0. Sightline check (read before framing)

The ditch is 1.40 m deep and TRZYMAJ water sits 0.96 m below the field. From eye height (1.6 m), the water's far edge is always **≥ 16–18° below eye level**, and the near bank hides it entirely once the camera is more than about 8 m from the ditch axis (limit: `D ≤ 3.6·h + 2.45`).
- A 2.4:1 frame at **50 mm** is only 17.1° tall, and at **85 mm** only 10.1°. Neither can show the water and the horizon in the same frame.
- **35 mm** (24.2° tall) can, with the camera **7.0 m from the ditch axis** (4.55 m behind the near bank lip), tilted 7° down. The horizon then sits about 21 % from the top (a high horizon). The held water reads as a thin strip that reflects the sky, about 80–90 px tall at 1600 px. That is honest: from the field you only see a glint of water.
- That means the **ditch has to be the nearest landmark**, with the track and the tractor behind it. If the track were in front, the ditch would be 25 m or more away and you would see the frame beam but no water.
- Mow the near bank lip (grass ≤ 5 cm). Taller grass there hides the water strip.
- The 50 mm lens works in **portrait** (mobile, §4). The 85 mm tractor look belongs to S08 (`prompts.md`), not to this hero.

Scene axes follow `prompts.md`: the ditch runs along Y, water flows toward +Y and the board is at y = 0. The camera stands on the +X side looking toward −X, so frame-right is +Y. Water flows left → right, and the tractor drives right.

---

## 1. Layer plan

| Layer | Content | Depth from camera | Scroll factor | Notes |
|---|---|---|---|---|
| **L1_sky** | sky gradient, horizon haze `#C9CFD2` → sky `#A9BFCF` | ∞ | 0.10 | Can ship as a CSS gradient (0 KB) |
| **L2_treeline** | far field (x −130…−620), birch row at 250 m (9–13 m tall), forest edge at 600 m | 140–600 m | 0.25 | Thin band on the horizon |
| **L3_field** | arable field with crop rows (sugar beet, 45 cm rows running away from camera), ±6 cm undulation | 19–137 m | 0.45 | Back edge hidden under L2 |
| **L4_track** | grass verge, dirt track with two tyre ruts and 3–4 puddles | 10.5–19 m | 0.70 | Excludes the tractor |
| **L5_tractor** | tractor + its contact shadow (shadow catcher) | ≈ 17 m | 0.70 + drive | Separate sprite (or a short sequence, §8) |
| **L6_ditch** | both banks, bed, TRZYMAJ water upstream / low water downstream, board + steel frame + wing walls + spindle | 4.5–10.5 m | 1.00 | The product hero; board at frame centre |
| **L7_fore** | grass tufts (0.35–0.85 m) at the near lip, outer 15–20 % of the frame on each side | 3.8–4.5 m | 1.20 | Frames the shot; never covers the board |

- The factors are art-directed. Physically, parallax ∝ 1/distance: with the ditch as 1.0, the track would be 0.41, the field 0.2 and the trees 0.03. The table compresses that range so the far layers still move a little. Keep the order, and keep the tractor on the same factor as its track.
- **Exports per layer:** RGBA, straight alpha. The canvas has **+10 % horizontal overscan** (5 % each side), so the files are 4224×1600 ("3840"), 2112×800 ("1920") and mobile 1312×1600 ("1080": 1080 + 2×116 px). The width in the file name is the visible width.
- **Preview:** `traktor_parallax_composite_3840.png` (all layers in one view layer, opaque). It is also the static image for reduced motion and the LCP poster.

## 2. Rendering the layers in Blender

1. **One collection per layer** (`L1_sky` … `L7_fore`) under `TRK_parallax`. The camera and sun sit in the scene collection, so every view layer sees them.
2. **One view layer per layer** (`VL_L1_sky` … `VL_L7_fore`, plus `VL_composite`). In each one, untick (exclude) every other layer collection. The world still lights everything, and `Film > Transparent` hides only the background.
3. **Same camera, same frame, same settings** for every view layer. Only `film_transparent` changes: off for L1 and the composite, on for the rest. It is a scene setting, so the render loop in §8 toggles it per layer.
4. **The tractor's shadow belongs to the tractor.** A copy of the track mesh with `Object > Visibility > Shadow Catcher` lives in `L5_tractor_catcher`, which is included only in `VL_L5_tractor`. When the sprite moves on the web, its shadow moves with it. Shadow catchers are Cycles-only.
5. **Bleed, so parallax never shows a gap.** Each ground strip extends 2–10 m toward the camera, under the next nearer layer, and that bleed zone sits 3 cm lower so it doesn't z-fight in the composite. Nearer layers end exactly at their nominal far edge. Put every cut on a natural line: far bank top, track verge, field-to-tree base.
6. **Overscan:** `resolution_x = 3840 × 1.10 = 4224` and `sensor_width = 36 × 1.10 = 39.6 mm`, with the focal length unchanged. The centre 3840 px is then exactly the 35 mm frame. Maximum web travel at factor 1.2 is 5 % of the width.
7. **Clean edges (no halos):**
   - Save PNG 16-bit RGBA. Blender PNGs are straight alpha.
   - Filter width 1.5 px.
   - Keep DOF subtle (f/8). Motion blur stays off on stills.
   - Resize only in premultiplied-aware tools (libvips/sharp, ImageMagick).
   - Don't matte layers against a colour, and don't "defringe".
   - Alternative to excluding: set the nearer collections to `Indirect Only` (Cycles) if you want their bounce light or reflections on a farther layer. Never use it for anything that moves.
8. **Combined check:** run `magick L1.png L2.png … L7.png -background none -flatten check.png`. It must match the composite render apart from the hidden bleed.

## 3. Alternative: one camera move rendered as a scroll-scrubbed sequence

- **Move:** the camera trucks sideways +0.8 m along Y over 10 s (250 frames at 25 fps), linear because the scroll supplies the easing. The ditch shifts about 11 % of the frame width and the trees about 0.5 %. There is no rotation and no zoom.
- **Tractor:** it drives from y −12 m (just entering on the left) at 7 km/h, travels 19.4 m and ends at about 3/4 of the frame width.
- **Frames:** render 250 frames, ship every second one (**125 frames**) on desktop and every fourth (63) on mobile. 120–180 frames is the useful range; below about 90 frames the scrubbing steps visibly.
- **Weight:**
  - At 1920×800, an AVIF q≈50 frame is about 70–110 KB and a WebP q75 frame about 120–180 KB. 125 frames therefore come to **9–14 MB AVIF / 15–22 MB WebP**.
  - At 1280×533, it is about 35–50 KB per frame, so about 5 MB.
  - An all-intra H.264 file (`-g 1`), scrubbed through `currentTime`, is about 4–6 MB, but it is jerky on iOS.
- **Pros:** true parallax and occlusion, the wheels turn, the tractor really drives, and you build no layer bleed.
- **Cons:** it is 5–15× over the 1.5 MB budget, decoding is heavy on phones, it can't adapt to any aspect ratio, and the first frame waits for the network.
- **Recommendation:** use the layered parallax for the landing hero. Keep the sequence for a deck slide or a muted video further down the page (encode as in `prompts.md` §6).

## 4. Camera

| | Hero (desktop, layers) | Mobile (portrait) | Sequence |
|---|---|---|---|
| Lens / sensor | 35 mm, 36 mm horizontal fit (39.6 mm with overscan) | 50 mm, 36 mm **vertical** fit | 35 mm, 36 mm |
| Position | x = 7.0, y = 0, z = 1.6 m | same | y −0.4 → +0.4 m over f1–250 |
| Rotation (XYZ) | (83°, 0°, 90°), i.e. 7° down, looking −X | (87.8°, 0°, 90°), 2.2° down | as hero |
| Horizon | ~79 % from the bottom | ~55 % from the bottom | as hero |
| DOF | f/8, focus on `TRACTOR_root` (17 m); everything from about 2.5 m on is acceptably sharp | f/8 | f/8 |
| Resolution | 4224×1600 (4K) / 2112×800 | 1312×1600 | 1920×800, no overscan |
| Tractor pose (rear axle y) | −6.0 (left third) | −3.0 | −12 → +7.4 |

- There is no roll and no Dutch angle. Camera height is eye height, 1.6 m.
- The mobile hero is its **own render**, not a crop, because a 1080 px slice of the desktop frame would keep the thin water strip. Fallback: centre a 1312 px crop on the board.

## 5. Scene build

- **Terrain:** flat Kujawy arable land with ±6 cm noise (scale 0.04/m) and no hills. Split it into ground strips per layer (§2.5).
  - Field: dry-stubble base `#C9BF86` with a soil `#6B4A2E` Noise mix (10–20 %).
  - Verges: birch green `#8FA86A` grass, 15–30 cm, scattered with GN.
- **Crop rows (GN):** make a points mesh, one point every 0.22 m along rows 0.45 m apart (sugar beet, typical for Kujawy) running away from the camera. Then *Instance on Points* with:
  - a beet rosette, or a cereal tuft for a cereal variant;
  - *Random Value* scale 0.7–1.3 and rotation Z 0–2π;
  - ±3 cm position jitter.
  
  Only the first 30 m carry instances. Beyond that, a stripe texture (Wave, bands along X) on the field material carries the rows. For a crop-on-curves variant, draw one curve, run *Curve to Points (length 0.22)*, then use an array of rows (*Instance on Points* of the curve, offset 0.45 m).
- **Birch line:**
  - Options: Sapling Tree Gen (Blender 4.2+: *Extensions > Sapling Tree Gen*), a CC0 birch from Poly Haven, or the placeholders (cylinders + icospheres).
  - Bark `#E7E1D4` with dark lenticel bands (Wave texture), crowns `#8FA86A`.
  - Spacing 6 m ± 0.6, height 9–13 m.
  - Mist: start 60 m, depth 600 m, blended toward `#C9CFD2` at a factor of about 0.35, so the trees sit back.
- **Ditch:** the `prompts.md` profile (depth 1.40 m, bed 0.70 m, banks 1:1.5, top width 4.90 m). Banks are soil `#6B4A2E` with sparse dry grass. The 0.1 % bed grade is skipped (14 cm over 140 m is invisible here).
- **Board and frame:** 3 larch planks of 0.15 × 0.04 × 0.96 m, wet wood `#5A3E28` below the waterline. Two galvanised posts (60×100 mm, `#8B8F93`), with the top beam at bed + 1.75 m, a spindle and a handwheel. 10 mm steel wing walls go into the banks.
- **Water (TRZYMAJ):**
  - Upstream (left of the board): a level plane 0.44 m above the bed, 1 cm under the crest.
  - Downstream: 0.12 m base flow.
  - Material: murky `#2F5F73`, roughness 0.06, IOR 1.333, static Noise bump 0.02, no caustics. The water is still.
- **Dirt track:** 3.2 m wide, dirt `#9C8466`.
  - Two ruts 1.9 m apart (centre to centre), 7 cm deep, with a 16 cm Gaussian profile, and a grass crown in between.
  - In the ruts: 3–4 puddles (water material, roughness 0.03) and wet soil around them (darker by ×0.7, roughness 0.5).
- **Tractor, option A: model it** (placeholder proportions are in the script).
  - Wheels: rear Ø 1.8 m × 0.55 m, front Ø 1.1 m × 0.35 m, wheelbase 2.7 m, rear track 1.9 m.
  - Body: hood 2.6 m long, cab 1.3 m wide, 2.9 m tall overall, about 4.3 m long.
  - Detail: bevel everything (5–10 mm), add bar-tread lugs (array of about 23 per side on the rear tyres) and a step and a mirror on the cab.
  - Glass: dark, roughness 0.1, slight reflection.
- **Tractor, option B: a downloaded model.**
  - Sources: Poly Haven (CC0) or Sketchfab with the filter *Downloadable* + licence **CC0 or CC BY**. **Verify the licence on the model page** and record the author, URL and licence for the credits line (CC BY requires attribution).
  - Delete every decal, badge and plate.
  - Repaint the body graphite `#3A3F44` (or the muted olive-grey `#5B5F52`).
  - Avoid models whose grille or hood silhouette copies a recognisable make. Never use green and yellow, red, blue or orange.
- **Mud and finish:**
  - Mud on the tyres and below 0.8 m: *AO (inverted) × Noise × Position Z < 0.8* mixes in soil `#6B4A2E`, roughness 0.9.
  - Keep it to "a little mud": about 30 % of the tyres and 10 % of the lower body.
  - No exhaust smoke, heat haze, dust trails or headlights.

## 6. Light and look

- **A: golden hour (default).** Sun at 10° elevation (8–12°) from behind the camera's left shoulder (azimuth 35° off the camera axis), strength 3.0, colour (1.0, 0.80, 0.60), angle 1°. World gradient strength 1.0. Long, soft shadows fall away from the camera.
- **B: overcast (calm documentary).** Sun strength 0.3, angle 30°. World horizon `#C9CFD2` → zenith `#A9BFCF`, strength 1.2. Mist toward `#A9BFCF` at a factor of 0.4.
- **Colour management:** View Transform **AgX**, Look **Medium Low Contrast**. Then saturation **×0.85–0.90**: use Hue/Saturation in the compositor, or `magick in.png -modulate 100,88,100 out.png` on the 16-bit masters.
- **Never:** Glare node, bloom, lens flare, vignette, chromatic aberration, emission above 1.0.

| Token | Hex | Linear R, G, B | Use here |
|---|---|---|---|
| forest | `#1F3A22` | 0.0137, 0.0423, 0.0160 | LiDAR background, distant forest base |
| cream | `#F3ECDD` | 0.8963, 0.8388, 0.7231 | LiDAR field points |
| agri | `#4F7A3A` | 0.0782, 0.1946, 0.0423 | crop leaves (mixed), LiDAR board points |
| soil | `#6B4A2E` | 0.1470, 0.0685, 0.0273 | banks, mud, LiDAR bank points |
| sky | `#A9BFCF` | 0.3968, 0.5210, 0.6240 | sky zenith, overcast |
| water | `#3B7FA3` | 0.0437, 0.2122, 0.3663 | LiDAR water points |
| elev-1 | `#2F5F73` | 0.0284, 0.1144, 0.1714 | photoreal murky water |
| birch green | `#8FA86A` | 0.2747, 0.3916, 0.1441 | crowns, verge grass |
| dry stubble | `#C9BF86` | 0.5841, 0.5210, 0.2384 | field base |
| horizon haze* | `#C9CFD2` | 0.5841, 0.6240, 0.6445 | sky horizon, mist |
| track dirt* | `#9C8466` | 0.3324, 0.2307, 0.1329 | dirt track |
| birch bark* | `#E7E1D4` | 0.7991, 0.7529, 0.6584 | trunks |
| steel* | `#8B8F93` | 0.2582, 0.2747, 0.2918 | frame |
| wet wood* | `#5A3E28` | 0.1022, 0.0482, 0.0212 | board below the waterline |
| graphite* | `#3A3F44` | 0.0423, 0.0497, 0.0578 | tractor body (default) |
| olive-grey* | `#5B5F52` | 0.1046, 0.1144, 0.0844 | tractor body (alternative) |
| tyre* | `#1E1E1E` | 0.0130, 0.0130, 0.0130 | tyres |

\* Render-only colours, not UI tokens. Type the hex into Blender's Hex field (it is sRGB). Use the linear values in Python or the RGB sliders.

**LiDAR variant ("data → field"):** render each layer a second time with the §3.2 point look from `prompts.md` (aim the GN `obj_geo` / `col_geo` inputs at this file's layer collections).
- Colours: field cream, banks soil, water blue, birch crowns `#8FA86A` with bark trunks, board points agri.
- Setup: forest background, View **Standard**, emission 1.0, no glow.
- Leave the **tractor out of the point layers**. ALS doesn't capture moving machines, and the tractor arrives with the real field.
- Files: `traktor_parallax_L3_field_lidar_3840.webp` and so on.

## 7. Animation

- **Speed:** 6–8 km/h = 1.67–2.22 m/s = **0.067–0.089 m per frame** at 25 fps. The default is 7 km/h = 1.944 m/s = **0.0778 m/frame**.
- **Wheels:** `rotation_x = −distance / r`. The rear tyre (r 0.90) turns 4.95° per frame (0.34 rev/s) and the front (r 0.55) 8.10° per frame. Both stay below half a lug pitch per frame, so there is no wagon-wheel strobing.
  - The script drives this from the root's world Y (a `TRANSFORMS` driver variable), so any move of the root rotates the wheels correctly.
  - GN alternative: store `distance` on the root and rotate the wheel instances by `distance / radius` around X.
- **Suspension:** the body empty bobs `0.006·sin(0.9 f) + 0.003·sin(2.3 f)` m (≤ 9 mm). The wheels don't bob.
- **Birches:** real assets get a Displace modifier with a Noise texture whose offset is driven by `frame*0.01`, ≤ 2 cm on the crown tips. Placeholders stay static. Layer stills are static anyway.
- **Water:** still (no animated ripples). There is no board movement in this shot.
- **Sequence motion blur:** on, shutter 0.5. Off for stills.

## 8. Render settings, naming and encoding

- **Cycles, GPU** (Preferences > System > CUDA/OptiX/HIP/Metal):
  - Samples: 256 photo (adaptive threshold 0.01), 64 LiDAR.
  - Denoiser: OpenImageDenoise.
  - Filter: 1.5 px.
  - Light paths: default.
  - Rough budget: a 4224×1600 layer takes about 1–3 min on a mid GPU.
- **EEVEE alternative** (`BLENDER_EEVEE_NEXT` in 4.2–4.4, `BLENDER_EEVEE` in 5.x):
  - Settings: shadows high, raytracing on, Film filter 1.5.
  - About 10× faster and fine for L1–L3.
  - Limits: no shadow catcher (render L5 in Cycles), and point clouds need the `USE_INSTANCES` fallback from `prompts.md`.
- **Masters:** `//renders/traktor_parallax_{L#_name}_{3840|1920|1080}.png` (PNG 16-bit RGBA) and `traktor_parallax_composite_3840.png`. Web files keep the same stem:
  - `traktor_parallax_L1_sky_3840.webp`, `traktor_parallax_L6_ditch_1080.avif`
  - LiDAR: `…_L3_field_lidar_3840.avif`
  - Tractor sequence: `traktor_parallax_L5_tractor_3840_f##.avif`
- **Downscale to the "1920" set:** `magick X_3840.png -resize 50% X_1920.png`.
- **Encode:**
  - `avifenc -q 55 --qalpha 80 -s 4 -d 8 in.png out.avif`
  - `cwebp -q 78 -alpha_q 90 -m 6 in8bit.png -o out.webp`
  - For 16-bit masters, first run `magick in.png -depth 8 in8bit.png`.
- **Render loop:** `render_layers("3840")` in the script renders every view layer with the right transparency.

## 9. bpy script: `traktor_parallax.py`

> **UNTESTED.** This was written without Blender, against the 4.2+ API. Run it in a **fresh file** (Scripting > New > Run) and keep *Window > Toggle System Console* open the first time. Re-running duplicates objects. Drivers use simple expressions (`frame`, `sin`), so *Auto Run Python Scripts* isn't needed.

```python
# traktor_parallax.py  (Blender 4.2+ / 5.x)  UNTESTED
import bpy, math, random
from mathutils import Vector, Matrix, noise

DEPTH, BED, SLOPE = 1.40, 0.70, 1.5
TOP = BED / 2 + SLOPE * DEPTH                   # 2.45 m half top width
CREST, H_HOLD, H_DOWN = 0.45, 0.44, 0.12        # TRZYMAJ upstream, base flow downstream
TRACK_X, BIRCH_X, FOREST_X = -10.0, -250.0, -600.0
CAM_X, CAM_Z, TILT = 7.0, 1.6, 7.0
TRACTOR_Y, TRACTOR_Y_MOBILE = -6.0, -3.0
RES_X, RES_Y, OVERSCAN = 3840, 1600, 1.10
FPS, KMH, R_REAR, R_FRONT = 25, 7.0, 0.90, 0.55
V = KMH / 3.6
random.seed(11)
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"; sc.unit_settings.scale_length = 1.0
for n in ("Cube", "Light", "Camera"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

def lin(h):
    h = h.lstrip("#"); o = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        o.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*o, 1.0)

def sock(coll, name, typ=None):
    for s in coll:
        if s.name == name and getattr(s, "enabled", True) and (typ is None or s.type == typ):
            return s
    raise KeyError(name)

def coll(name, parent):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in parent.children: parent.children.link(c)
    return c
ROOT = coll("TRK_parallax", sc.collection)
LAYERS = [("L1_sky", 0.10), ("L2_treeline", 0.25), ("L3_field", 0.45), ("L4_track", 0.70),
          ("L5_tractor", 0.70), ("L6_ditch", 1.00), ("L7_fore", 1.20)]
C = {n: coll(n, ROOT) for n, _ in LAYERS}
for n, f in LAYERS: C[n]["parallax_factor"] = f
C_CATCH = coll("L5_tractor_catcher", ROOT)

def link(o, c):
    for uc in list(o.users_collection): uc.objects.unlink(o)
    c.objects.link(o); return o

def mat(name, hexc, rough=0.85, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = lin(hexc); return m
M = dict(field=mat("TRK_field", "#C9BF86"), verge=mat("TRK_verge", "#8FA86A"), bank=mat("TRK_bank", "#6B4A2E"),
         dirt=mat("TRK_dirt", "#9C8466", 0.9), water=mat("TRK_water", "#2F5F73", 0.06),
         wood=mat("TRK_wood", "#5A3E28", 0.75), steel=mat("TRK_steel", "#8B8F93", 0.45, 1.0),
         body=mat("TRK_body", "#3A3F44", 0.5), tyre=mat("TRK_tyre", "#1E1E1E", 0.9),
         crop=mat("TRK_crop", "#4F7A3A", 0.7), bark=mat("TRK_bark", "#E7E1D4", 0.8),
         birch=mat("TRK_birch", "#8FA86A", 0.8), forest=mat("TRK_forest", "#1F3A22", 0.9))
M["water"].node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.333

# ---------- ground strips: farther layers bleed toward camera, 3 cm lower ----------
def strip(name, far, near, c, m, zf, dx, dy, bleed=0.0):
    a, b = far, near + bleed
    hw = max(70.0, (CAM_X - far) * 0.65)
    nx, ny = round((b - a) / dx) + 1, round(2 * hw / dy) + 1
    xs = [a + (b - a) * i / (nx - 1) for i in range(nx)]
    ys = [-hw + 2 * hw * j / (ny - 1) for j in range(ny)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, zf(x, y) - (0.03 if x > near + 1e-6 else 0.0)) for y in ys for x in xs], [],
                   [(j*nx+i, j*nx+i+1, (j+1)*nx+i+1, (j+1)*nx+i) for j in range(ny-1) for i in range(nx-1)])
    me.materials.append(m); o = bpy.data.objects.new(name, me); c.objects.link(o); return o

und = lambda x, y: 0.06 * noise.noise(Vector((x * 0.04, y * 0.04, 0.0)))
def ditch_z(x, y):
    ax = abs(x)
    if ax <= BED / 2: return -DEPTH
    if ax <= TOP: return -DEPTH + (ax - BED / 2) / SLOPE
    return 0.0
def track_z(x, y):
    ruts = sum(math.exp(-((x - (TRACK_X + s)) / 0.16) ** 2) for s in (-0.95, 0.95))
    return -0.07 * ruts + 0.02 * noise.noise(Vector((x * 0.5, y * 0.5, 1.0)))

strip("L2_far_field", FOREST_X - 20, -130.0, C["L2_treeline"], M["field"], und, 10.0, 10.0, bleed=10.0)
strip("L3_field_ground", -130.0, -12.0, C["L3_field"], M["field"], und, 0.5, 0.5, bleed=3.0)
trk = strip("L4_track_ground", -12.0, -3.5, C["L4_track"], M["dirt"], track_z, 0.08, 0.25, bleed=2.0)
strip("L6_ditch_ground", -3.5, 3.2, C["L6_ditch"], M["bank"], ditch_z, 0.05, 0.5)

def quad(name, xc, y0, y1, z, hw, c):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(xc-hw, y0, z), (xc+hw, y0, z), (xc+hw, y1, z), (xc-hw, y1, z)], [], [(0, 1, 2, 3)])
    me.materials.append(M["water"]); o = bpy.data.objects.new(name, me); c.objects.link(o); return o
quad("water_up_TRZYMAJ", 0, -70, -0.02, -DEPTH + H_HOLD, BED / 2 + SLOPE * H_HOLD + 0.03, C["L6_ditch"])
quad("water_down", 0, 0.02, 70, -DEPTH + H_DOWN, BED / 2 + SLOPE * H_DOWN + 0.03, C["L6_ditch"])
for i in range(4):                                             # puddles in the ruts
    y = random.uniform(-12, 12); quad(f"puddle_{i}", TRACK_X + random.choice((-0.95, 0.95)),
                                      y, y + random.uniform(0.8, 2.0), -0.045, 0.14, C["L4_track"])

# ---------- board + steel frame (dimensions from prompts.md) ----------
def box(name, size, loc, m, c, parent=None):
    sx, sy, sz = (s / 2 for s in size)
    v = [(x * sx, y * sy, z * sz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.materials.append(m)
    o = bpy.data.objects.new(name, me); c.objects.link(o)
    if parent: o.parent = parent
    o.location = loc; return o
B, L6 = -DEPTH, C["L6_ditch"]
for i in range(3):
    box(f"board_plank_{i}", (0.96, 0.04, 0.146), (0, 0, B + 0.075 + i * 0.15), M["wood"], L6)
for s in (-1, 1):
    box(f"frame_post_{s}", (0.06, 0.10, 2.05), (s * 0.50, 0, B - 0.30 + 1.025), M["steel"], L6)
    box(f"frame_wing_{s}", (1.60, 0.01, 1.20), (s * 1.33, 0, B + 0.20), M["steel"], L6)
box("frame_beam", (1.12, 0.10, 0.08), (0, 0, B + 1.79), M["steel"], L6)
box("frame_spindle", (0.03, 0.03, 0.35), (0, 0, B + 2.0), M["steel"], L6)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.12, depth=0.02, location=(0, 0, B + 2.17))
link(bpy.context.object, L6).data.materials.append(M["steel"])

# ---------- placeholder tractor (generic, no logos), drives +Y ----------
L5 = C["L5_tractor"]
root = bpy.data.objects.new("TRACTOR_root", None); L5.objects.link(root); root.location = (TRACK_X, TRACTOR_Y, 0)
d = root.driver_add("location", 1).driver; d.type = "SCRIPTED"
d.expression = f"{TRACTOR_Y} + {V / FPS:.5f} * (frame - 1)"           # constant 7 km/h
body = bpy.data.objects.new("TRACTOR_body", None); L5.objects.link(body); body.parent = root
d = body.driver_add("location", 2).driver; d.type = "SCRIPTED"
d.expression = "0.006*sin(frame*0.9) + 0.003*sin(frame*2.3)"           # bob <= 9 mm
box("tr_chassis", (0.70, 3.40, 0.40), (0, 1.30, 0.80), M["body"], L5, body)
box("tr_hood", (0.90, 2.60, 0.85), (0, 2.05, 1.30), M["body"], L5, body)
box("tr_cab", (1.30, 1.50, 1.45), (0, -0.10, 2.15), M["body"], L5, body)
box("tr_roof", (1.50, 1.70, 0.08), (0, -0.10, 2.91), M["body"], L5, body)
for s in (-1, 1):
    box(f"tr_fender_{s}", (0.60, 1.70, 0.05), (s * 0.95, -0.05, 1.88), M["body"], L5, body)
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.05, depth=1.0)
ex = link(bpy.context.object, L5); ex.parent = body; ex.location = (0.30, 2.90, 2.10)
ex.data.materials.append(M["body"])

def wheel(name, r, w, loc):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=w)
    o = link(bpy.context.object, L5); o.name = name
    o.data.transform(Matrix.Rotation(math.pi / 2, 4, "Y"))           # axle along X
    o.data.materials.append(M["tyre"]); o.parent = root; o.location = loc
    box(name + "_hub_marker", (w + 0.02, 0.2 * r, 0.2 * r), (0, 0, 0.55 * r), M["steel"], L5, o)
    dr = o.driver_add("rotation_euler", 0).driver; dr.type = "SCRIPTED"
    var = dr.variables.new(); var.name = "y"; var.type = "TRANSFORMS"
    t = var.targets[0]; t.id = root; t.transform_type = "LOC_Y"; t.transform_space = "WORLD_SPACE"
    dr.expression = f"-y / {r}"                                        # rolling toward +Y
for s in (-1, 1):
    wheel(f"tr_wheel_rear_{s}", R_REAR, 0.55, (s * 0.95, 0.0, R_REAR))
    wheel(f"tr_wheel_front_{s}", R_FRONT, 0.35, (s * 0.85, 2.70, R_FRONT))
catch = bpy.data.objects.new("L5_track_shadow_catcher", trk.data); C_CATCH.objects.link(catch)
catch.is_shadow_catcher = True

# ---------- crop rows: points + GN instancing ----------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(0, 0, -50))
proto = link(bpy.context.object, C["L3_field"]); proto.name = "TRK_beet_proto"
proto.data.transform(Matrix.Diagonal((0.20, 0.20, 0.14, 1.0))); proto.data.materials.append(M["crop"])
proto.visible_camera = False; proto.visible_shadow = False
pts = []
for j in range(-70, 71):                                               # rows 0.45 m apart
    x = -12.4
    while x > -40.0:
        pts.append((x + random.uniform(-.03, .03), j * 0.45 + random.uniform(-.03, .03), und(x, j * 0.45)))
        x -= 0.22
me = bpy.data.meshes.new("L3_crop_points"); me.from_pydata(pts, [], [])
crops = bpy.data.objects.new("L3_crop_rows", me); C["L3_field"].objects.link(crops)
ng = bpy.data.node_groups.new("TRK_crops", "GeometryNodeTree")
ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
N, Lk = ng.nodes, ng.links
gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
oi = N.new("GeometryNodeObjectInfo"); oi.inputs["Object"].default_value = proto
inst = N.new("GeometryNodeInstanceOnPoints")
rs = N.new("FunctionNodeRandomValue"); rs.data_type = "FLOAT"
sock(rs.inputs, "Min", "VALUE").default_value = 0.7; sock(rs.inputs, "Max", "VALUE").default_value = 1.3
rr = N.new("FunctionNodeRandomValue"); rr.data_type = "FLOAT_VECTOR"
sock(rr.inputs, "Max", "VECTOR").default_value = (0.0, 0.0, 6.283)
sock(rr.inputs, "Min", "VECTOR").default_value = (0.0, 0.0, 0.0)
Lk.new(gi.outputs[0], inst.inputs["Points"]); Lk.new(oi.outputs["Geometry"], inst.inputs["Instance"])
Lk.new(sock(rs.outputs, "Value", "VALUE"), inst.inputs["Scale"])
Lk.new(sock(rr.outputs, "Value", "VECTOR"), inst.inputs["Rotation"])
Lk.new(inst.outputs["Instances"], go.inputs[0])
crops.modifiers.new("TRK_crops", "NODES").node_group = ng

# ---------- birch row, forest edge, foreground tufts (placeholders) ----------
def tree(i, x, y, h, cl):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.16, depth=h * 0.6, location=(x, y, h * 0.3))
    t = link(bpy.context.object, cl); t.name = f"birch_trunk_{i:03d}"; t.data.materials.append(M["bark"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(x, y, h * 0.68))
    k = link(bpy.context.object, cl); k.name = f"birch_crown_{i:03d}"; k.data.materials.append(M["birch"])
    k.scale = (random.uniform(1.8, 2.6), random.uniform(1.8, 2.6), h * 0.3)
hw = int((CAM_X - BIRCH_X) * 0.65)
for i, y in enumerate(range(-hw, hw, 6)):
    tree(i, BIRCH_X + random.uniform(-0.6, 0.6), y, random.uniform(9, 13), C["L2_treeline"])
hw = int((CAM_X - FOREST_X) * 0.65)
for i, y in enumerate(range(-hw, hw, 14)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(FOREST_X, y, 8))
    f = link(bpy.context.object, C["L2_treeline"]); f.scale = (12, random.uniform(9, 13), random.uniform(8, 12))
    f.data.materials.append(M["forest"])
for k in range(90):                                                    # near-lip tufts, frame edges only
    side, h = (-1 if k % 2 else 1), random.uniform(0.35, 0.85)
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.025, radius2=0.0, depth=h,
                                    location=(random.uniform(2.55, 3.2), side * random.uniform(1.4, 2.7), h / 2))
    g = link(bpy.context.object, C["L7_fore"]); g.data.materials.append(M["verge"])
    g.rotation_euler = (random.uniform(-.25, .25), random.uniform(-.25, .25), 0)

# ---------- cameras, sun, world ----------
def make_cam(name, lens, fit, sensor, tilt):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = fit; cd.clip_end = 3000
    if fit == "VERTICAL": cd.sensor_height = sensor
    else: cd.sensor_width = sensor
    cd.dof.use_dof = True; cd.dof.aperture_fstop = 8.0; cd.dof.focus_object = root
    o = bpy.data.objects.new(name, cd); sc.collection.objects.link(o)
    o.location = (CAM_X, 0.0, CAM_Z); o.rotation_euler = (math.radians(90 - tilt), 0, math.radians(90))
    return o
cam = make_cam("CAM_hero_35", 35.0, "HORIZONTAL", 36.0 * OVERSCAN, TILT)
cam_m = make_cam("CAM_mobile_50", 50.0, "VERTICAL", 36.0, 2.2)
sd = bpy.data.lights.new("TRK_sun", "SUN"); sd.energy = 3.0; sd.color = (1.0, 0.80, 0.60)
sd.angle = math.radians(1.0)
sun = bpy.data.objects.new("TRK_sun", sd); sc.collection.objects.link(sun)
e, az = math.radians(10), math.radians(35)                             # behind camera, left shoulder
to_sun = Vector((math.cos(e) * math.cos(az), -math.cos(e) * math.sin(az), math.sin(e)))
sun.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()
w = sc.world or bpy.data.worlds.new("World"); sc.world = w
try: w.use_nodes = True
except Exception: pass
nt = w.node_tree; bg = nt.nodes.get("Background")
tc, sp, cr = nt.nodes.new("ShaderNodeTexCoord"), nt.nodes.new("ShaderNodeSeparateXYZ"), nt.nodes.new("ShaderNodeValToRGB")
cr.color_ramp.elements[0].position, cr.color_ramp.elements[0].color = 0.0, lin("#C9CFD2")
cr.color_ramp.elements[1].position, cr.color_ramp.elements[1].color = 0.35, lin("#A9BFCF")
nt.links.new(tc.outputs["Normal"], sp.inputs[0]); nt.links.new(sp.outputs["Z"], cr.inputs["Fac"])
nt.links.new(cr.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 1.0

# ---------- view layers: one per parallax layer + composite ----------
sc.view_layers[0].name = "VL_composite"
for n, _ in LAYERS:
    if not sc.view_layers.get("VL_" + n): sc.view_layers.new("VL_" + n)
for vl in sc.view_layers:
    own = vl.name[3:]
    for lc in vl.layer_collection.children["TRK_parallax"].children:
        if own == "composite": lc.exclude = lc.name == C_CATCH.name
        else: lc.exclude = not (lc.name == own or (own == "L5_tractor" and lc.name == C_CATCH.name))

# ---------- render settings ----------
sc.render.engine = "CYCLES"
try: sc.cycles.device = "GPU"
except Exception: pass
sc.cycles.samples = 256; sc.cycles.adaptive_threshold = 0.01; sc.cycles.use_denoising = True
try: sc.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
sc.cycles.filter_width = 1.5
sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, 250
im = sc.render.image_settings; im.file_format = "PNG"; im.color_mode = "RGBA"; im.color_depth = "16"
sc.view_settings.view_transform = "AgX"
for look in ("AgX - Medium Low Contrast", "Medium Low Contrast", "None"):
    try: sc.view_settings.look = look; break
    except Exception: pass

def use_camera(kind="hero"):
    hero = kind == "hero"
    sc.camera = cam if hero else cam_m
    sc.render.resolution_x, sc.render.resolution_y = (round(RES_X * OVERSCAN), RES_Y) if hero else (1312, 1600)
    sc.render.resolution_percentage = 100
    ty = TRACTOR_Y if hero else TRACTOR_Y_MOBILE
    root.animation_data.drivers.find("location", index=1).driver.expression = f"{ty} + {V / FPS:.5f} * (frame - 1)"

def render_layers(tag="3840", folder="//renders/"):
    """Render every parallax layer + composite at the current frame. tag: 3840 | 1920 | 1080."""
    for vl in sc.view_layers: vl.use = False
    for n in [n for n, _ in LAYERS] + ["composite"]:
        vl = sc.view_layers["VL_" + n]; vl.use = True
        sc.render.film_transparent = n not in ("L1_sky", "composite")
        sc.render.filepath = f"{folder}traktor_parallax_{n}_{tag}.png"
        bpy.ops.render.render(write_still=True, layer=vl.name)
        vl.use = False
    for vl in sc.view_layers: vl.use = True

def setup_sequence(truck=0.8, start_y=-12.0):
    """Approach B: 10 s linear side truck + tractor crossing, opaque, 1920x800."""
    cam.data.sensor_width = 36.0; sc.camera = cam
    dr = cam.driver_add("location", 1).driver; dr.type = "SCRIPTED"
    dr.expression = f"{-truck / 2} + {truck} * (frame - 1) / {sc.frame_end - 1}"
    root.animation_data.drivers.find("location", index=1).driver.expression = f"{start_y} + {V / FPS:.5f} * (frame - 1)"
    for vl in sc.view_layers: vl.use = vl.name == "VL_composite"
    sc.render.film_transparent = False; sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
    sc.render.resolution_x, sc.render.resolution_y = 1920, 800
    sc.render.filepath = "//renders/traktor_seq_1920x800_25p_####.png"

use_camera("hero"); sc.frame_set(1)
vh = math.degrees(math.atan(7.5 / 35.0))                               # half vertical FOV, 35 mm, 2.4:1
lip = math.degrees(math.atan2(CAM_Z, CAM_X - TOP))
far = math.degrees(math.atan2(CAM_Z + DEPTH - H_HOLD, CAM_X + BED / 2 + SLOPE * H_HOLD))
band = max(0.0, min(lip, TILT + vh) - far) * RES_Y / (2 * vh)
print(f"TRAKTOR parallax ready. Water strip in frame ≈ {band:.0f} px (want ≥ 60).")
# render_layers("3840")   |   use_camera("mobile"); render_layers("1080")   |   setup_sequence()
```

**Quick checks after running:**
- Scrub the timeline: the rear wheels turn about 5° per frame and the hub marker shows it.
- In `VL_L5_tractor`, only the tractor and its shadow should render.
- The printed water-strip value should be about 90 px. If it is below 60, move `CAM_X` toward 6.8 or raise `TILT` by 0.5°.

## 10. Web integration (landing lane)

- **Markup:** one `<section>` with `aspect-ratio: 12/5` (desktop) or `27/40` (mobile, own art set via `<picture>`/`media`), `overflow: hidden` and `contain: paint`. Seven `<img>` layers absolutely positioned at `left: -5%; width: 110%`, plus the composite `<img>` underneath.
  - The headline, CTA and the `Wizualizacja` caption are **HTML** (`.hd`, `Button`, a small caption). Forest text on the sky band passes AA (about 6.4:1). Use a cream 94 % `Card` if the text overlaps the field.
- **Motion:**
  - Compute `p = clamp(-rect.top / rect.height, 0, 1)` in a passive `scroll` + `requestAnimationFrame` loop. CSS `animation-timeline: view()` is an option where supported, with JS as the fallback.
  - Each layer gets `transform: translate3d(${-p * f * 0.05 / 1.2 * heroWidth}px, 0, 0)`, so f = 1.2 uses exactly the 5 % overscan.
  - The tractor gets that plus a drive of `+p * 0.18 * heroWidth`, so it moves right while the scene drifts left.
  - At p = 0 the layers line up exactly with the composite poster. Only animate `transform`, plus `opacity` for the cross-fades. No scale beyond 1.12, no easing springs.
- **Tractor wheels:** the default is a single sprite (translation ≤ 18 % of the width; at 17 m the tyre sliding is barely visible). Upgrade: 16 frames at 1100×600 px rendered over the drive (about 25 KB each), with frame index `round(p * 15)`.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, show the composite only and don't load the layers.
- **Loading:**
  - Composite AVIF = LCP image (`fetchpriority="high"`, explicit width and height).
  - Load the layers after `load` / `requestIdleCallback` with `decoding="async"`, then `await img.decode()` for all of them.
  - Cross-fade composite → layers over 400 ms. If any layer fails, stay on the composite.
  - Serve the "1920" set at 1× and the "3840" set at DPR ≥ 1.5 via `srcset`.
- **Budget** (AVIF, measure after encoding):

| Asset | Desktop 3840 set | Mobile 1080 set |
|---|---|---|
| Composite poster | 220 KB | 110 KB |
| L1 sky | 0 (CSS gradient) | 0 |
| L2 treeline / L3 field | 110 / 330 KB | 50 / 130 KB |
| L4 track / L5 tractor (single) | 220 / 50 KB | 90 / 30 KB |
| L6 ditch / L7 fore | 260 / 80 KB | 110 / 40 KB |
| **Total** | **≈ 1.27 MB** (≤ 1.5 MB) | **≈ 560 KB** (≤ 600 KB) |

- **LiDAR "data → field" (optional):**
  - Cheapest option: the existing `PointCloud` component as the first state (0 KB of images), cross-faded to the layers over scroll 0–0.3.
  - Rendered LiDAR layers are high-frequency and compress poorly (about 150–250 KB each at 1920), so ship them at 1920 only and lazy-load them.
- **WebP fallback:** use `<picture>` with AVIF first. WebP runs about 1.4× the AVIF sizes.

## 11. AI image prompts: CONCEPT REFERENCE ONLY

> Use these to agree on framing and mood, then discard them. **The final assets must be our own Blender renders** (brand rule: no AI or stock imagery in production).

1. **L1 + L2 sky and tree line.** *Wide 2.4:1 documentary photo of a flat Polish farmland horizon near Bydgoszcz: a thin distant row of birch trees and a dark forest edge on the horizon, calm late-golden-hour sky fading from pale grey-blue haze (#C9CFD2) to muted sky blue (#A9BFCF), faint atmospheric haze, no clouds drama, no sun disc, no lens flare, muted natural colours, 35 mm lens.*
2. **L3 field.** *Eye-level 35 mm photo across a flat Kujawy sugar-beet field, neat crop rows running away from the viewer toward a low horizon, dry straw-coloured soil between rows (#C9BF86), slight undulation, low warm side light from the left, muted colours, documentary, no people, no machinery.*
3. **L4 + L5 track and tractor.** *Side-on documentary photo, 35 mm from 17 m away: a plain unbranded dark-graphite farm tractor (large rear wheels, small front wheels, simple cab) driving slowly right along a dirt farm track with two muddy tyre ruts and small puddles, a little mud on the tyres, no logos, no decals, no manufacturer colours (no green-yellow, red, blue or orange), realistic proportions, not a toy or cartoon, late-afternoon light.*
4. **L6 ditch and board.** *Close eye-level view from a mown field edge across a 1.4 m deep trapezoid drainage ditch: a simple galvanised steel frame with three weathered larch boards across the ditch, still murky water held high on the left of the boards and lower on the right, soil-brown grassy banks, calm golden-hour light, documentary, no text, no people.*
5. **L7 foreground.** *Blurred tufts of tall dry-green field grass rising from the bottom left and right corners of a wide frame, the centre left clear, soft natural light, shallow depth of field, muted greens (#8FA86A).*
6. **Full composite.** *Wide 2.4:1 documentary landscape of flat Polish farmland at golden hour, layered in depth: tall grass tufts at the frame edges, a drainage ditch close to the viewer with a wooden board in a steel frame holding still water, a dirt track behind it where an unbranded graphite tractor drives slowly right, sugar-beet rows beyond, a thin birch line and forest on a high horizon, muted grey-blue sky, calm, honest, no logos, no glow, no lens flare, no text.* Optional LiDAR twin: *the same scene as a LiDAR point cloud of tiny dots on a solid dark forest-green background (#1F3A22): cream field points, soil-brown banks, muted blue water, pale green birch crowns, no glow, no grid.*

## 12. Before shipping

- [ ] Every layer comes from the same camera and frame; the flattened layers match the composite.
- [ ] The water strip is visible (≥ 60 px at 1600). TRZYMAJ: held high upstream, low downstream.
- [ ] The tractor is generic: no logo, decal, plate or manufacturer colour. Any CC BY attribution is recorded.
- [ ] No glare, bloom, flare or vignette. AgX Medium Low Contrast, saturation ×0.85–0.90.
- [ ] No text in the renders. The `Wizualizacja` caption is in HTML.
- [ ] Budget: ≤ 1.5 MB desktop, ≤ 600 KB mobile. Reduced motion shows the composite only.
