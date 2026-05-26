# -*- coding: utf-8 -*-
"""Generate typical 3D-PRINTABLE parametric parts as STL for the library."""
import os, math, gmsh

OUT = r"c:\Users\SmartBee\Desktop\machine engineering\cnc-quote-pro\public\models"
os.makedirs(OUT, exist_ok=True)

def start(name):
    gmsh.initialize(); gmsh.option.setNumber("General.Terminal", 0); gmsh.model.add(name)

def finish(name, size=3.0):
    occ = gmsh.model.occ; occ.synchronize()
    s = size * 1.7
    gmsh.option.setNumber("Mesh.MeshSizeMax", s)
    gmsh.option.setNumber("Mesh.MeshSizeMin", s * 0.45)
    gmsh.option.setNumber("Mesh.Binary", 1)
    gmsh.model.mesh.generate(2)
    p = os.path.join(OUT, name + ".stl"); gmsh.write(p); gmsh.finalize()
    print("wrote", name, round(os.path.getsize(p) / 1024), "KB")

# 1) KNOB — cylinder + bore + grip flutes
start("knob"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 22, 16)
bore = occ.addCylinder(0, 0, -1, 0, 0, 24, 3)
flutes = []
for i in range(10):
    a = 2 * math.pi * i / 10
    flutes.append((3, occ.addCylinder(16 * math.cos(a), 16 * math.sin(a), -1, 0, 0, 24, 2.4)))
occ.cut([(3, base)], [(3, bore)] + flutes)
finish("knob", 1.6)

# 2) WASHER — disk + bore
start("washer"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 4, 13)
occ.cut([(3, base)], [(3, occ.addCylinder(0, 0, -1, 0, 0, 6, 6.5))])
finish("washer", 1.0)

# 3) BUSHING — tube
start("bushing"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 35, 11)
occ.cut([(3, base)], [(3, occ.addCylinder(0, 0, -1, 0, 0, 37, 7))])
finish("bushing", 1.6)

# 4) CAP — open-top cup
start("cap"); occ = gmsh.model.occ
base = occ.addCylinder(0, 0, 0, 0, 0, 30, 22)
cav = occ.addCylinder(0, 0, 3, 0, 0, 30, 19)
occ.cut([(3, base)], [(3, cav)])
finish("cap", 2.0)

# 5) VASE — conical shell
start("vase"); occ = gmsh.model.occ
outer = occ.addCone(0, 0, 0, 0, 0, 70, 26, 18)
inner = occ.addCone(0, 0, 4, 0, 0, 70, 22, 15)
occ.cut([(3, outer)], [(3, inner)])
finish("vase", 2.2)

# 6) HOOK — base plate + peg + tip
start("hook"); occ = gmsh.model.occ
plate = occ.addBox(0, 0, 0, 40, 50, 6)
peg = occ.addCylinder(20, 25, 6, 0, 0, 40, 6)
tip = occ.addCylinder(20, 25, 40, 0, 14, 0, 6)
part, _ = occ.fuse([(3, plate)], [(3, peg), (3, tip)])
holes = [(3, occ.addCylinder(10, 10, -1, 0, 0, 8, 3)), (3, occ.addCylinder(30, 10, -1, 0, 0, 8, 3))]
occ.cut(part, holes)
finish("hook", 2.0)

# 7) STAND — phone stand (base + leaning back + lip)
start("stand"); occ = gmsh.model.occ
base = occ.addBox(0, 0, 0, 90, 70, 8)
back = occ.addBox(0, 58, 0, 90, 8, 80)
occ.rotate([(3, back)], 0, 62, 0, 1, 0, 0, math.radians(18))
lip = occ.addBox(0, 6, 8, 90, 8, 16)
occ.fuse([(3, base)], [(3, back), (3, lip)])
finish("stand", 3.0)

# 8) HANDLE — bar on two posts
start("handle"); occ = gmsh.model.occ
p1 = occ.addBox(0, 0, 0, 16, 24, 30)
p2 = occ.addBox(104, 0, 0, 16, 24, 30)
bar = occ.addCylinder(0, 12, 24, 120, 0, 0, 9)
part, _ = occ.fuse([(3, p1)], [(3, p2), (3, bar)])
holes = [(3, occ.addCylinder(8, 12, -1, 0, 0, 8, 3)), (3, occ.addCylinder(112, 12, -1, 0, 0, 8, 3))]
occ.cut(part, holes)
finish("handle", 2.6)

print("DONE")
