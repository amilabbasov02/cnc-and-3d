# -*- coding: utf-8 -*-
"""KAYZEN portfeli — tək şirkət, paylaşılan nüvə, ardıcıl 4 məhsul, axan komanda.
P1 FEEDRATE (marketplace) · P2 QUOTEFLOW (embed quote SaaS) ·
P3 FORMCHECK (DFM SaaS) · P4 CONFIGFLOW (e-commerce konfiqurator)."""
import model as FR  # FEEDRATE gəlir axını üçün

MONTHS = 48
START_YEAR, START_MONTH = 2026, 7

def month_label(m):
    yy = START_YEAR + (START_MONTH-1+m-1)//12
    mm = (START_MONTH-1+m-1)%12 + 1
    return f"{yy}-{mm:02d}"

# ---- Ümumi fərziyyələr ----
A = {
 "tax": 0.25,
 "stripe": 0.029,
 "host_base": 600,       # 4 məhsul üçün infra bazası
 "host_per_prod": 250,   # hər canlı məhsul üçün əlavə
 "sw_head": 130,
 "mkt_pct": 0.22,        # ümumi gəlirin %-i marketinqə
 "mkt_min": 6000,        # 4 GTM üçün güclü baza
 "admin": 1500,
 "capital": 1800000,     # portfel seed (funding need ~$1.36M + bufer, front-loaded build)
}

# ---- Məhsul gəlir modelləri ----
# P1 FEEDRATE: model.py-dan gəlir axını (launch ay6)
# P2-P4: SaaS rampası — adds (aylıq yeni müştəri) artır, churn, ARPU
# FEEDRATE launch ay 3 (2 ay build) → digər məhsullar da müvafiq olaraq tez çıxır
PRODUCTS = {
 "QUOTEFLOW": dict(launch=9,  adds0=7,  adds_g=0.075, churn=0.04, arpu=140),
 "FORMCHECK": dict(launch=16, adds0=18, adds_g=0.075, churn=0.06, arpu=39),
 "CONFIGFLOW":dict(launch=24, adds0=12, adds_g=0.075, churn=0.05, arpu=89),
}

# ---- Tək (paylaşılan) komanda — 4 məhsulu axın ilə idarə edir ----
# (rol, başlama ayı, aylıq brüt $, ağır_kit, məhsul/qrup)
ROLES = [
 # === FEEDRATE 2 AYLIQ İNTENSİV BUILD (ay 1-2), 18 nəfər front-loaded ===
 ("CEO / Təsisçi", 1, 2000, False, "Şirkət"),
 ("CTO / Baş arxitekt (paylaşılan nüvə)", 1, 4000, True, "Nüvə"),
 ("HR / İşə qəbul", 1, 1500, False, "Şirkət"),
 ("Senior CAD developer #1", 1, 3000, True, "Nüvə"),
 ("Senior CAD developer #2", 1, 3000, True, "FEEDRATE"),
 ("Frontend developer #1", 1, 2200, True, "FEEDRATE"),
 ("Backend developer #1", 1, 2500, True, "FEEDRATE"),
 ("UI/UX dizayner #1", 1, 2000, False, "Nüvə"),
 ("DevOps / İnfra", 1, 2500, True, "Nüvə"),
 ("Frontend developer #2", 2, 2200, True, "FEEDRATE"),
 ("Backend developer #2", 2, 2500, True, "FEEDRATE"),
 ("UI/UX dizayner #2", 2, 2000, False, "FEEDRATE"),
 ("QA / Tester #1", 2, 1500, False, "Nüvə"),
 ("QA / Tester #2", 2, 1500, False, "Nüvə"),
 ("CAD / Geometriya QA", 2, 2000, True, "Nüvə"),
 ("Dizayn QA / Reviewer", 2, 1800, False, "Nüvə"),
 ("Operations / Supplier Manager", 2, 1500, False, "FEEDRATE"),
 ("Marketinq / Launch", 2, 2000, False, "Şirkət"),
 # === Launch sonrası miqyas + digər məhsullar ===
 ("3D / CAD kontent mütəxəssisi", 6, 1500, True, "FEEDRATE"),
 ("Financist / CFO", 6, 1500, False, "Şirkət"),
 # P2 QUOTEFLOW (launch ay 9)
 ("Product lead / FS dev (QUOTEFLOW)", 6, 2800, True, "QUOTEFLOW"),
 ("Frontend developer (QUOTEFLOW)", 8, 2200, True, "QUOTEFLOW"),
 ("Growth / marketinq (QUOTEFLOW)", 9, 1800, False, "QUOTEFLOW"),
 ("Sales / BizDev", 9, 2500, False, "Şirkət"),
 ("Müştəri dəstəyi", 12, 1300, False, "Şirkət"),
 # P3 FORMCHECK (launch ay 16)
 ("FS dev (FORMCHECK / CAD analiz)", 13, 2800, True, "FORMCHECK"),
 ("Growth / kontent (FORMCHECK)", 15, 1700, False, "FORMCHECK"),
 ("Müştəri dəstəyi #2", 18, 1300, False, "Şirkət"),
 # P4 CONFIGFLOW (launch ay 24)
 ("FS dev (CONFIGFLOW)", 21, 2800, True, "CONFIGFLOW"),
 ("Frontend developer (CONFIGFLOW)", 23, 2200, True, "CONFIGFLOW"),
 ("Growth / marketinq (CONFIGFLOW)", 24, 1800, False, "CONFIGFLOW"),
 # miqyas
 ("Sales / BizDev #2", 28, 2500, False, "Şirkət"),
 ("DevOps / SRE #2", 34, 2500, True, "Nüvə"),
 ("Müştəri dəstəyi #3", 40, 1300, False, "Şirkət"),
 ("Data / analitika mühəndisi", 42, 2400, True, "Nüvə"),
]

def headcount(m): return sum(1 for _,sm,*_ in ROLES if m >= sm)
def gross(m):     return sum(s for _,sm,s,*_ in ROLES if m >= sm)
def equipment(m):
    return sum((2200 if heavy else 1300) for (_,sm,s,heavy,g) in ROLES if sm == m)
def live_products(m):
    n = 1 if m >= FR.A["launch_month"] else 0
    for p in PRODUCTS.values():
        if m >= p["launch"]: n += 1
    return n

def compute(months=MONTHS, capital=None):
    cap = A["capital"] if capital is None else capital
    fr_rows,_ = FR.compute(months=months)  # FEEDRATE
    # SaaS rampaları
    saas_cust = {k: 0.0 for k in PRODUCTS}
    rows = []
    cum = cap; trough = cap
    for m in range(1, months+1):
        prod_rev = {}
        # P1 FEEDRATE
        fr = fr_rows[m-1]
        prod_rev["FEEDRATE"] = fr["rev"]
        fr_processed = fr["mgmv_mon"] + fr["sub"] + fr["dgmv"]  # yalnız monetizasiya olunan GMV
        # P2-P4 SaaS
        saas_processed = 0.0
        for name, p in PRODUCTS.items():
            if m < p["launch"]:
                prod_rev[name] = 0.0; continue
            since = m - p["launch"]  # 0-based
            adds = p["adds0"] * ((1+p["adds_g"])**since)
            saas_cust[name] = saas_cust[name]*(1-p["churn"]) + adds
            r = saas_cust[name]*p["arpu"]
            prod_rev[name] = r
            saas_processed += r
        total_rev = sum(prod_rev.values())
        # xərclər (tək şirkət)
        sal = gross(m)*(1+A["tax"])
        host = A["host_base"] + live_products(m)*A["host_per_prod"] + fr["vis"]/10000*60
        sw = headcount(m)*A["sw_head"]
        mkt = max(A["mkt_min"], total_rev*A["mkt_pct"])
        ops = fr["ops"]  # FEEDRATE sifariş ops (model.py-dan)
        sup_bonus = fr["sup_bonus"]  # FEEDRATE supplier aktivləşmə bonusu
        eq = equipment(m)
        admin = A["admin"] + (400 if m>=13 else 0) + (400 if m>=25 else 0)
        stripe = (fr_processed + saas_processed)*A["stripe"]
        cost = sal+host+sw+mkt+ops+sup_bonus+eq+admin+stripe
        net = total_rev - cost
        cum += net; trough = min(trough, cum)
        rows.append(dict(m=m, label=month_label(m), prod=dict(prod_rev),
            rev=total_rev, head=headcount(m), live=live_products(m),
            sal=sal, host=host, sw=sw, mkt=mkt, ops=ops, eq=eq, admin=admin,
            stripe=stripe, sup_bonus=sup_bonus, cost=cost, net=net, cum=cum,
            fr_vis=fr["vis"], fr_orders=fr["orders"]))
    return rows, dict(capital=cap, trough=trough)

if __name__ == "__main__":
    import io, sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    rows,_ = compute()
    print(f"{'Ay':>3} {'FEEDRATE':>9} {'QUOTEFL':>8} {'FORMCHK':>8} {'CONFIG':>8} {'CƏMİ':>9} {'XƏRC':>9} {'NET':>9} {'KASSA':>10} {'kmd':>4}")
    for m in (1,6,12,18,20,24,28,36,42,48):
        r=rows[m-1]; p=r['prod']
        print(f"{m:>3} {p['FEEDRATE']:>9.0f} {p['QUOTEFLOW']:>8.0f} {p['FORMCHECK']:>8.0f} {p['CONFIGFLOW']:>8.0f} "
              f"{r['rev']:>9.0f} {r['cost']:>9.0f} {r['net']:>9.0f} {r['cum']:>10.0f} {r['head']:>4}")
    yr={1:[0,0,0],2:[0,0,0],3:[0,0,0],4:[0,0,0]}
    for r in rows:
        g=1 if r['m']<=12 else 2 if r['m']<=24 else 3 if r['m']<=36 else 4
        yr[g][0]+=r['rev']; yr[g][1]+=r['cost']; yr[g][2]+=r['net']
    print()
    for g in (1,2,3,4): print(f"İl {g}: gəlir {yr[g][0]:>10.0f}  xərc {yr[g][1]:>10.0f}  NET {yr[g][2]:>10.0f}")
    rows0,_=compute(capital=0); mc=min(r['cum'] for r in rows0)
    print(f"\nfunding need (kapitalsız dib): {mc:,.0f}")
    print(f"48 ay aylıq gəlir: {rows[47]['rev']:,.0f}  → ARR {rows[47]['rev']*12:,.0f}")
    print(f"48 ay komanda: {rows[47]['head']}  (4 ayrı şirkət ~{4*18}=72 olardı)")
