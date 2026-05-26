"""
Generate a realistic CNC test part (mounting bracket) as STEP + STL.

Part: 100 x 60 x 20 mm aluminium block with
  - a central blind pocket (60 x 30, 10 mm deep)
  - four Ø8 mm through-holes near the corners

Built with gmsh's OpenCASCADE kernel, so the STEP is a valid B-rep solid
that CNC instant-quote sites (Xometry, Hubs, Geomiq, Fictiv...) accept.
"""
import os
import gmsh

OUT = os.path.dirname(os.path.abspath(__file__))

gmsh.initialize()
gmsh.model.add("bracket")
occ = gmsh.model.occ

# Base block: 100 x 60 x 20 mm
base = occ.addBox(0, 0, 0, 100, 60, 20)

# Central blind pocket: 60 x 30 footprint, 10 mm deep, open at the top (z=20)
pocket = occ.addBox(20, 15, 10, 60, 30, 10)

# Four Ø8 through-holes (radius 4), inset 12 mm from the edges
holes = []
for x, y in [(12, 12), (88, 12), (12, 48), (88, 48)]:
    cyl = occ.addCylinder(x, y, -1, 0, 0, 22, 4.0)
    holes.append((3, cyl))

# Subtract pocket + holes from the base
occ.cut([(3, base)], [(3, pocket)] + holes)
occ.synchronize()

step_path = os.path.join(OUT, "test-part-bracket.step")
gmsh.write(step_path)
print("STEP written:", step_path)

# Surface mesh, then export STL as a fallback format
gmsh.option.setNumber("Mesh.MeshSizeMax", 4)
gmsh.option.setNumber("Mesh.MeshSizeMin", 1)
gmsh.model.mesh.generate(2)
stl_path = os.path.join(OUT, "test-part-bracket.stl")
gmsh.write(stl_path)
print("STL written:", stl_path)

gmsh.finalize()
