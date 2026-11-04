"""Create original, reusable street props with Blender; no external textures or models."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "public" / "models" / "street_furniture.glb"
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, metal=0.0, rough=0.72, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


stone = material("warm_school_stone", (0.67, 0.61, 0.51))
trim = material("deep_green_trim", (0.10, 0.28, 0.22), metal=0.18)
metal = material("painted_graphite_metal", (0.18, 0.26, 0.29), metal=0.55, rough=0.38)
gold = material("warm_metal_detail", (0.78, 0.52, 0.20), metal=0.35)
glass = material("warm_lamp_diffuser", (1.0, 0.91, 0.62), emission=1.5)
granite = material("school_wave_granite", (0.25, 0.28, 0.28))
tile = material("school_wall_tile", (0.87, 0.84, 0.75))
burgundy = material("school_gate_stone", (0.34, 0.25, 0.23))


def root(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def box(name, location, dimensions, mat, parent, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("soft_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    obj.parent = parent
    return obj


def cylinder(name, location, radius, depth, mat, parent, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def rod(name, start, end, radius, mat, parent):
    start, end = Vector(start), Vector(end)
    direction = end - start
    obj = cylinder(name, (start + end) / 2, radius, direction.length, mat, parent)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


lamp = root("StreetLamp")
cylinder("lamp_base", (0, 0, 0.12), 0.24, 0.24, metal, lamp, 16)
cylinder("lamp_pole", (0, 0, 2.7), 0.082, 5.35, metal, lamp, 16)
cylinder("lamp_ring_low", (0, 0, 1.0), 0.105, 0.07, gold, lamp, 16)
cylinder("lamp_ring_high", (0, 0, 4.9), 0.105, 0.07, gold, lamp, 16)
rod("lamp_curved_neck", (0, 0, 5.25), (0.35, 0, 5.55), 0.082, metal, lamp)
rod("lamp_arm", (0.35, 0, 5.55), (1.42, 0, 5.55), 0.072, metal, lamp)
box("lamp_head", (1.42, 0, 5.40), (0.64, 0.38, 0.25), metal, lamp, 0.06)
box("lamp_diffuser", (1.42, 0, 5.245), (0.52, 0.30, 0.045), glass, lamp, 0.02)
box("lamp_cap", (1.42, 0, 5.56), (0.7, 0.42, 0.07), trim, lamp, 0.02)

main_gate = root("MainSlidingGate")
for sign in (-1, 1):
    x = sign * 2.9
    box(f"main_post_{sign}", (x, 0, 1.22), (0.36, 0.42, 2.44), burgundy, main_gate, 0.025)
    box(f"main_post_cap_{sign}", (x, 0, 2.46), (0.48, 0.54, 0.12), tile, main_gate, 0.02)
    # The real entrance has a sliding metal gate; model the leaves parked open.
    wing_x = sign * 3.78
    box(f"main_open_leaf_rail_{sign}", (wing_x, 0, 1.85), (1.44, 0.08, 0.09), metal, main_gate)
    box(f"main_open_leaf_base_{sign}", (wing_x, 0, 0.30), (1.44, 0.10, 0.10), metal, main_gate)
    for i in range(7):
        xbar = wing_x - 0.60 + i * 0.20
        box(f"main_slats_{sign}_{i}", (xbar, 0, 1.08), (0.065, 0.065, 1.58), metal, main_gate)

side_gate = root("SideWaveGate")
for sign in (-1, 1):
    x = sign * 2.18
    box(f"side_stone_post_{sign}", (x, 0, 1.05), (0.62, 0.7, 2.1), burgundy, side_gate, 0.025)
    for i in range(6):
        leaf_x = sign * (1.19 + i * 0.15)
        wave_height = 1.75 + 0.45 * math.sin((i / 5) * math.pi)
        rod(f"side_leaf_bar_{sign}_{i}", (leaf_x, -0.04, 0.55), (leaf_x, -0.04, wave_height), 0.034, metal, side_gate)
    points = [(sign * (1.18 + i * 0.13), -0.04, 1.75 + 0.45 * math.sin((i / 6) * math.pi)) for i in range(7)]
    for i in range(len(points) - 1):
        rod(f"side_wave_top_{sign}_{i}", points[i], points[i + 1], 0.055, metal, side_gate)
    box(f"side_leaf_solid_{sign}", (sign * 1.56, -0.04, 0.43), (0.78, 0.09, 0.74), metal, side_gate, 0.025)

wave_wall = root("WaveWall")
for i in range(19):
    x0 = -3.65 + i * (7.3 / 18)
    x1 = -3.65 + (i + 1) * (7.3 / 18)
    z0 = 1.16 + 0.33 * math.sin((x0 + 3.7) * 1.45)
    z1 = 1.16 + 0.33 * math.sin((x1 + 3.7) * 1.45)
    cap_height = (z0 + z1) / 2
    box(f"wave_wall_panel_{i}", ((x0 + x1) / 2, 0, cap_height / 2), (0.42, 0.48, cap_height), granite, wave_wall)
    rod(f"wave_wall_cream_edge_{i}", (x0, -0.27, z0), (x1, -0.27, z1), 0.055, tile, wave_wall)
    rod(f"wave_wall_lower_ribbon_{i}", (x0, -0.27, z0 - 0.32), (x1, -0.27, z1 - 0.32), 0.025, tile, wave_wall)
for i, x in enumerate((-2.25, 1.95)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.37, minor_radius=0.055, location=(x, -0.28, 0.58))
    ring = bpy.context.object
    ring.name = f"wave_wall_roundel_{i}"
    ring.rotation_euler[0] = math.pi / 2
    ring.data.materials.append(tile)
    ring.parent = wave_wall

# glTF converts Blender's Z-up axes to Three.js Y-up. Props are reusable prefabs.
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", export_apply=True)
print(f"CREATED {OUT} ({OUT.stat().st_size} bytes)")
