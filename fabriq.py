# -*- coding: utf-8 -*-
"""VERTEXA — 2-fazalı model.
FAZA 1 (seed ~$920K): FEEDRATE + QUOTEFLOW, 12 nəfər, breakeven ~ay 20.
FAZA 2 (öz gəliri ilə): FORMCHECK + CONFIGFLOW — 2 məhsul özünü sübut edəndən sonra."""
import model as FR

MONTHS = 48
START_YEAR, START_MONTH = 2026, 7
def month_label(m):
    yy = START_YEAR + (START_MONTH-1+m-1)//12
    mm = (START_MONTH-1+m-1)%12 + 1
    return f"{yy}-{mm:02d}"

A = {
 "tax": 0.25, "stripe": 0.029,
 "host_base": 500, "host_per_prod": 250, "sw_head": 130,
 "mkt_pct": 0.22, "mkt_min": 10000,        # hər canlı məhsula $10K reklam floor
 "admin": 1500,
 "travel_early": 12000, "travel_base": 4000, "travel_early_months": 6,
 "capital": 1000000,                       # FAZA 1 seed (~$1M) — yalnız ilk 2 məhsul, bufer ilə
}

# FAZA 1: QUOTEFLOW (ay 5). FAZA 2: FORMCHECK (ay 24), CONFIGFLOW (ay 30) — öz gəliri ilə
PRODUCTS = {
 "QUOTEFLOW": dict(launch=5,  adds0=7,  adds_g=0.075, churn=0.04, arpu=140),
 "FORMCHECK": dict(launch=24, adds0=18, adds_g=0.075, churn=0.06, arpu=39),
 "CONFIGFLOW":dict(launch=30, adds0=12, adds_g=0.075, churn=0.05, arpu=89),
}

# (rol, başlama ayı, aylıq brüt $, ağır_kit, qrup)
ROLES = [
 # === FAZA 1 — 12 nəfər (FEEDRATE + QUOTEFLOW) ===
 ("CEO / Təsisçi (marketinq)", 1, 2000, False, "Şirkət"),
 ("CTO / Təsisçi (+frontend)", 1, 2000, True, "Nüvə"),
 ("HR / İşə qəbul", 1, 1500, False, "Şirkət"),
 ("Frontend developer", 1, 2200, True, "FEEDRATE"),
 ("Backend developer #1", 1, 2500, True, "FEEDRATE"),
 ("Backend developer #2", 1, 2500, True, "FEEDRATE"),
 ("Senior CAD developer #1", 1, 3000, True, "Nüvə"),
 ("Senior CAD developer #2", 1, 3000, True, "Nüvə"),
 ("UI/UX dizayner", 1, 2000, False, "Nüvə"),
 ("QA / Tester (+CAD/dizayn test)", 1, 1500, True, "Nüvə"),
 ("Operations / Supplier Manager", 1, 1500, False, "FEEDRATE"),
 ("Reklamveren (media buyer)", 2, 1800, False, "Şirkət"),
 # === FAZA 2 — mövcud komanda məhsul 3-4-ü qurur (nüvə ~70% təkrar); yalnız +2 dəstək ===
 ("Müştəri dəstəyi #1", 12, 1300, False, "Şirkət"),
 ("Müştəri dəstəyi #2", 24, 1300, False, "Şirkət"),
]

def headcount(m): return sum(1 for _,sm,*_ in ROLES if m >= sm)
def gross(m):     return sum(s for _,sm,s,*_ in ROLES if m >= sm)
def equipment(m): return sum((2200 if h else 1300) for (_,sm,s,h,g) in ROLES if sm == m)
def live_products(m):
    n = 1 if m >= FR.A["launch_month"] else 0
    for p in PRODUCTS.values():
        if m >= p["launch"]: n += 1
    return n

def compute(months=MONTHS, capital=None):
    cap = A["capital"] if capital is None else capital
    fr_rows,_ = FR.compute(months=months)
    saas_cust = {k: 0.0 for k in PRODUCTS}
    rows = []; cum = cap; trough = cap
    for m in range(1, months+1):
        prod_rev = {}
        fr = fr_rows[m-1]
        prod_rev["FEEDRATE"] = fr["rev"]
        fr_processed = fr["mgmv_mon"] + fr["sub"] + fr["dgmv"]
        saas_processed = 0.0
        for name, p in PRODUCTS.items():
            if m < p["launch"]:
                prod_rev[name] = 0.0; continue
            since = m - p["launch"]
            adds = p["adds0"] * ((1+p["adds_g"])**since)
            saas_cust[name] = saas_cust[name]*(1-p["churn"]) + adds
            r = saas_cust[name]*p["arpu"]
            prod_rev[name] = r; saas_processed += r
        total_rev = sum(prod_rev.values())
        sal = gross(m)*(1+A["tax"])
        host = A["host_base"] + live_products(m)*A["host_per_prod"] + fr["vis"]/10000*60
        sw = headcount(m)*A["sw_head"]
        mkt = max(A["mkt_min"]*live_products(m), total_rev*A["mkt_pct"])
        ops = fr["ops"]; sup_bonus = fr["sup_bonus"]
        eq = equipment(m)
        admin = A["admin"] + (300 if m>=13 else 0) + (400 if m>=25 else 0)
        stripe = (fr_processed + saas_processed)*A["stripe"]
        travel = A["travel_early"] if m <= A["travel_early_months"] else A["travel_base"]
        cost = sal+host+sw+mkt+ops+sup_bonus+eq+admin+stripe+travel
        net = total_rev - cost; cum += net; trough = min(trough, cum)
        rows.append(dict(m=m, label=month_label(m), prod=dict(prod_rev), rev=total_rev,
            head=headcount(m), live=live_products(m), sal=sal, host=host, sw=sw, mkt=mkt,
            ops=ops, sup_bonus=sup_bonus, travel=travel, eq=eq, admin=admin, stripe=stripe,
            cost=cost, net=net, cum=cum))
    return rows, dict(capital=cap, trough=trough)

if __name__ == "__main__":
    import io, sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    rows,_ = compute()
    r0,_ = compute(capital=0)
    need = min(x['cum'] for x in r0)
    be = next((x['m'] for x in rows if x['net']>0), None)
    print(f"Funding need: ${need:,.0f} | raise: ${round(-need*1.25,-4):,.0f} | breakeven ay {be}")
    print(f"min kassa (${A['capital']:,}): ${min(x['cum'] for x in rows):,.0f}")
    for m in (1,5,12,18,20,24,30,36,48):
        x=rows[m-1]
        print(f"Ay {m:>2}: canlı {x['live']} | gəlir ${x['rev']:>9,.0f} | NET ${x['net']:>9,.0f} | kassa ${x['cum']:>9,.0f} | komanda {x['head']}")
    print(f"48 ARR: ${rows[47]['rev']*12:,.0f} | 48 NET: ${rows[47]['net']:,.0f}/ay")
