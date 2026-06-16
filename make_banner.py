# -*- coding: utf-8 -*-
"""FEEDRATE — 300x250 animasiyalı reklam banneri (.gif)."""
from PIL import Image, ImageDraw, ImageFont

W, H = 300, 250
INK   = (13, 14, 16)
SURF  = (26, 29, 33)
AMBER = (255, 179, 0)
TEXT  = (236, 234, 229)
DIM   = (154, 158, 164)
GREEN = (87, 201, 138)

def F(path, size): return ImageFont.truetype(f"C:/Windows/Fonts/{path}", size)
fb = lambda s: F("arialbd.ttf", s)
fr = lambda s: F("arial.ttf", s)

def center(d, cx, y, text, font, fill):
    bb = d.textbbox((0,0), text, font=font)
    d.text((cx-(bb[2]-bb[0])/2, y), text, font=font, fill=fill)

def base():
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    # incə grid hissi — kənar çərçivə
    d.rectangle([0,0,W-1,H-1], outline=(43,47,53))
    # sol amber zolaq
    d.rectangle([0,0,5,H], fill=AMBER)
    # LOGO üst
    d.rectangle([18,18,40,40], fill=AMBER)          # amber kvadrat mark
    d.text((46,18), "FEEDRATE", font=fb(20), fill=TEXT)
    d.text((47,40), "CNC & 3D-ÇAP", font=fr(10), fill=DIM)
    return img, d

def cta(d, scale=1.0, glow=False):
    # aşağı amber düymə
    cx = W//2
    bw, bh = int(200*scale), 42
    x0, y0 = cx-bw//2, 196
    col = (255,200,40) if glow else AMBER
    d.rectangle([x0,y0,x0+bw,y0+bh], fill=col)
    center(d, cx, y0+11, "PULSUZ QİYMƏT AL →", fb(15), INK)

scenes = [
    ("Faylını yüklə",       "STL · STEP · OBJ",        TEXT),
    ("10 saniyəyə qiymət",  "material · ölçü · emal",  AMBER),
    ("Sifariş + çatdırılma","supplier şəbəkəsi",       TEXT),
    ("Hamısı bir platformada","CNC · frezeleme · 3D",  GREEN),
]

frames, durations = [], []
for i,(big, sub, col) in enumerate(scenes):
    # hər səhnə üçün 3 kadr (CTA pulse hissi)
    for k in range(3):
        img, d = base()
        # orta mesaj
        center(d, W//2, 92,  big, fb(22), col)
        center(d, W//2, 128, sub, fr(13), DIM)
        # incə ayırıcı xətt
        d.rectangle([40,160,W-40,161], fill=(43,47,53))
        # CTA pulse
        cta(d, glow=(k==1))
        frames.append(img)
        durations.append(700 if k==1 else 350)

frames[0].save("FEEDRATE-banner-300x250.gif", save_all=True,
               append_images=frames[1:], duration=durations, loop=0, disposal=2, optimize=True)
print("OK banner saved:", len(frames), "kadr")
