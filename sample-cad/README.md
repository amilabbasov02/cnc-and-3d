# Test CAD part — mounting bracket

A realistic CNC part you can upload to competitor sites to get a quote, then
compare it against our MachQuote demo.

## The part
- **Overall size:** 100 × 60 × 20 mm
- **Features:** one central blind pocket (60 × 30, 10 mm deep) + four Ø8 mm through-holes
- **Suggested material:** Aluminium 6061

## Files
| File | Use it for |
|------|-----------|
| `test-part-bracket.step` | **Upload this first** — STEP is what CNC quoting sites want (most accurate) |
| `test-part-bracket.stl`  | Fallback if a site only accepts mesh/STL |

## Where to upload (instant-quote sites)
1. https://www.xometry.com/ → Instant Quoting Engine
2. https://www.hubs.com/ → Get instant quote
3. https://geomiq.com/ → Instant quote
4. https://www.fictiv.com/ → Get a quote

> Most require a free sign-up before showing the price, and they upcharge for
> a marketplace margin — note the friction; that is exactly the gap our tool fills.

## Compare against MachQuote (http://localhost:3002)
Enter the same part to see our number:
- Material: **Aluminum 6061**
- Length / Width / Height: **100 / 60 / 20**
- Quantity: try **1**, **10**, **50**
- Machining time: **~25** min/part · Setup: **~45** min
- Finishing: e.g. **Anodizing Type II**

Then download our PDF quote and put it next to theirs for your manager.

## Regenerate
```
python make_part.py
```
(requires `pip install gmsh`)
