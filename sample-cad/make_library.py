# -*- coding: utf-8 -*-
"""Generate detailed parametric CNC parts as STL for the FEEDRATE library."""
import os, math, gmsh

OUT = r"c:\Users\SmartBee\Desktop\machine engineering\cnc-quote-pro\public\models"
os.makedirs(OUT, exist_ok=True)

def start(name):
    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 0)
    gmsh.model.add(name)

def finish(name, size=3.0):
    occ = gmsh.model.occ
    occ.synchronize()
    s = size * 1.7
    gmsh.option.setNumber("Mesh.MeshSizeMax", s)
    gmsh.option.setNumber("Mesh.MeshSizeMin", s * 0.45)
    gmsh.option.setNumber("Mesh.Binary", 1)  # binary STL → ~5x smaller
    gmsh.model.mesh.generate(2)
    path = os.path.join(OUT, name + ".stl")
    gmsh.write(path)
    gmsh.finalize()
    print("wrote", name, round(os.path.getsize(path) / 1024), "KB")

def bolt_circle(occ, n, r, z0, dz, dia):
    holes = []
    for i in range(n):
        a = 2 * math.pi * i / n
        holes.append((3, occ.addCylinder(r * math.cos(a), r * math.sin(a), z0, 0, 0, dz, dia / 2)))
    return holes

# 1) FLANGE — disk + center bore + 6 bolt holes
start("flange"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 14, 50)
bore = occ.addCylinder(0, 0, -1, 0, 0, 16, 20)
occ.cut([(3, base)], [(3, bore)] + bolt_circle(occ, 6, 38, -1, 16, 9))
finish("flange", 2.4)

# 2) L-BRACKET — base + wall + gusset + holes
start("l-bracket"); occ = gmsh.model.occ
b1 = occ.addBox(0, 0, 0, 80, 60, 8)
b2 = occ.addBox(0, 0, 0, 80, 8, 55)
gus = occ.addBox(0, 8, 8, 80, 40, 40)
# cut the gusset into a triangle via a rotated box
cutb = occ.addBox(0, 8, 8, 120, 80, 80)
occ.rotate([(3, cutb)], 0, 8, 8, 1, 0, 0, math.radians(45))
occ.cut([(3, gus)], [(3, cutb)])
part, _ = occ.fuse([(3, b1)], [(3, b2), (3, gus)])
holes = [(3, occ.addCylinder(20, 30, -1, 0, 0, 10, 4.5)), (3, occ.addCylinder(60, 30, -1, 0, 0, 10, 4.5))]
holes += [(3, occ.addCylinder(20, -1, 35, 0, 12, 0, 4.5)), (3, occ.addCylinder(60, -1, 35, 0, 12, 0, 4.5))]
occ.cut(part, holes)
finish("l-bracket", 2.6)

# 3) PLATE — rectangular plate + pocket + holes
start("plate"); occ = gmsh.model.occ
base = occ.addBox(0, 0, 0, 160, 120, 10)
pocket = occ.addBox(40, 35, 5, 80, 50, 6)
holes = [(3, occ.addCylinder(x, y, -1, 0, 0, 12, 5)) for x, y in [(20, 20), (140, 20), (20, 100), (140, 100)]]
occ.cut([(3, base)], [(3, pocket)] + holes)
finish("plate", 3.0)

# 4) SHAFT — stepped shaft
start("shaft"); occ = gmsh.model.occ
s1 = occ.addCylinder(0, 0, 0, 0, 0, 60, 15)
s2 = occ.addCylinder(0, 0, 60, 0, 0, 90, 10)
occ.fuse([(3, s1)], [(3, s2)])
finish("shaft", 2.0)

# 5) PULLEY — rim/hub/rim stack + bore
start("pulley"); occ = gmsh.model.occ
r1 = occ.addCylinder(0, 0, 0, 0, 0, 6, 35)
hub = occ.addCylinder(0, 0, 6, 0, 0, 12, 26)
r2 = occ.addCylinder(0, 0, 18, 0, 0, 6, 35)
part, _ = occ.fuse([(3, r1)], [(3, hub), (3, r2)])
occ.cut(part, [(3, occ.addCylinder(0, 0, -1, 0, 0, 26, 8))])
finish("pulley", 2.2)

# 6) COUPLING — cylinder + bore + radial set-screw holes
start("coupling"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 50, 20)
bore = occ.addCylinder(0, 0, -1, 0, 0, 52, 10)
ss = [(3, occ.addCylinder(0, -25, 12, 0, 30, 0, 2.5)), (3, occ.addCylinder(0, -25, 38, 0, 30, 0, 2.5))]
occ.cut([(3, base)], [(3, bore)] + ss)
finish("coupling", 1.8)

# 7) GEAR-PLATE — disk + bore + bolt circle + scalloped rim
start("gearplate"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 12, 50)
bore = occ.addCylinder(0, 0, -1, 0, 0, 14, 12)
scallops = bolt_circle(occ, 16, 50, -1, 14, 8)       # edge scallops (gear-ish)
bolts = bolt_circle(occ, 6, 34, -1, 14, 7)
occ.cut([(3, base)], [(3, bore)] + scallops + bolts)
finish("gearplate", 2.2)

# 8) ENCLOSURE — box hollowed from the top (open box)
start("enclosure"); occ = gmsh.model.occ
base = occ.addBox(0, 0, 0, 120, 90, 50)
cavity = occ.addBox(8, 8, 8, 104, 74, 50)
occ.cut([(3, base)], [(3, cavity)])
finish("enclosure", 3.2)

# 9) SPACER — round spacer + bore
start("spacer"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 15, 12)
occ.cut([(3, base)], [(3, occ.addCylinder(0, 0, -1, 0, 0, 17, 5))])
finish("spacer", 1.4)

print("DONE")
