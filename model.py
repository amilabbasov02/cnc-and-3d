# -*- coding: utf-8 -*-
"""FEEDRATE maliyyə modeli — ortaq mənbə (Excel + Pitch eyni rəqəmləri işlədir).
Gəlir 3 axın: (1) İstehsal marketplace marjası, (2) Abunə SaaS, (3) Dizayn komissiya."""

# ---- FƏRZİYYƏLƏR (Premium launch — ən yüksək səviyyədə start) ----
A = {
 "vis1": 4000,        # başlanğıc aylıq ziyarətçi (güclü launch)
 "vis_g": 0.11,       # ziyarətçi aylıq artım
 "order_conv": 0.018, # sifariş konversiya (% ziyarətçi)
 "aov": 170,          # orta sifariş dəyəri $ (orta bazar — həcm yüksək)
 "take": 0.20,        # istehsal marjası (take-rate) — yalnız monetizasiya olunan sifarişə
 "monetized_share": 0.70,  # marketplace+overflow payı (qalan 30% = pulsuz birbaşa link, gəlirsiz)
 "ops_per_order": 5,  # sifariş başına əməliyyat/keyfiyyət xərci $
 "orders_per_supplier": 8,  # bir aktiv supplier-in aylıq orta sifarişi
 "sup_bonus": 100,    # birdəfəlik supplier aktivləşmə bonusu (10 keyfiyyətli iş ≥$150)
 "free_rate": 0.20,   # pulsuz qeydiyyat (% ziyarətçi)
 "paid_conv": 0.035,  # ödənişli konversiya (% yeni pulsuz)
 "churn": 0.05,       # aylıq churn (ödənişli)
 "arpu": 26,          # blended ARPU $/ay
 "dgmv1": 800,        # dizayn GMV ay1 $
 "dgmv_g": 0.13,      # dizayn GMV artım
 "dcomm": 0.08,       # dizayn komissiya
 "stripe": 0.029,     # ödəniş faizi (tam həcm üzərində)
 "tax": 0.25,         # maaş üzərinə vergi/SSF
 "host_base": 400,    # hosting baza $/ay (yüksək etibarlılıq)
 "host_10k": 60,      # hosting / 10K ziyarətçi $
 "sw_head": 120,      # software/alət hər nəfər $/ay (premium alətlər)
 "mkt_pct": 0.25,     # marketinq % gəlir (aqressiv böyümə)
 "mkt_min": 4000,     # marketinq min $/ay (güclü launch kampaniyası)
 "admin": 1200,       # inzibati/ofis/hüquq baza $/ay
 "capital": 1500000,  # seed — funding need ~$1.23M + bufer (sənin $1.5M hədəfin)
 "launch_month": 3,   # 2 ay intensiv build (ay 1-2), launch ay 3 — gəlir buradan
}

# ---- KOMANDA (rol, başlama ayı, aylıq brüt $, məsuliyyət, tip, ağır_kit) ----
# 2 AYLIQ İNTENSİV BUILD: 18 nəfər front-loaded (ay 1-2), launch ay 3, sonra miqyas
ROLES = [
 # --- Ay 1: nüvə + HR ---
 ("CEO / Təsisçi", 1, 2000, "Strategiya, investor, supplier, koordinasiya, blokerləri açır", "Tam", False),
 ("CTO / Baş arxitekt", 1, 4000, "Arxitektura, ən çətin nüvə, kod review, texniki qərarlar", "Tam", True),
 ("HR / İşə qəbul", 1, 1500, "18 nəfəri tez işə götürmək, müsahibə, onboarding, müqavilələr", "Tam", False),
 ("Senior CAD developer #1", 1, 3000, "Brauzer CAD (Three.js+CSG): boolean, extrude, export, qiymət geometriyası", "Tam", True),
 ("Senior CAD developer #2", 1, 3000, "CAD redaktor: undo/redo, transform, performans, primitivlər", "Tam", True),
 ("Frontend developer #1", 1, 2200, "UI shell, qaleriya, redaktor interfeysi", "Tam", True),
 ("Backend developer #1", 1, 2500, "Auth, DB, qiymət API, limit/anti-abuse", "Tam", True),
 ("UI/UX dizayner #1", 1, 2000, "Dizayn sistemi, core məhsul axınları", "Tam", False),
 ("DevOps / İnfra", 1, 2500, "CI/CD, mühitlər, deploy, monitorinq, təhlükəsizlik", "Tam", True),
 # --- Ay 2: komandanı tamamla ---
 ("Frontend developer #2", 2, 2200, "Sifariş/checkout, dashboard, supplier paneli", "Tam", True),
 ("Backend developer #2", 2, 2500, "Stripe + escrow/payout, supplier marşrutlaşdırma", "Tam", True),
 ("UI/UX dizayner #2", 2, 2000, "Marketplace/supplier UX, cilalama", "Tam", False),
 ("QA / Tester #1", 2, 1500, "Funksional + regresiya test, cross-browser, bug triage", "Tam", False),
 ("QA / Tester #2", 2, 1500, "Funksional test, mobil, buraxılış nəzarəti", "Tam", False),
 ("CAD / Geometriya QA", 2, 2000, "Boolean/mesh/export düzgünlüyü, ölçü dəqiqliyi (CAD-ı yoxlayır)", "Tam", True),
 ("Dizayn QA / Reviewer", 2, 1800, "UI dizayn uyğunluğu, vizual ardıcıllıq, design sign-off", "Tam", False),
 ("Operations / Supplier Manager", 2, 1500, "Supplier cəlb/yoxlama, launch günü supply hazır", "Tam", False),
 ("Marketinq / Launch", 2, 2000, "Landing, brend, reklam, launch kampaniyası", "Tam", False),
 # --- Launch sonrası miqyas ---
 ("3D / CAD kontent mütəxəssisi", 6, 1500, "Model kitabxanası, lisenziya, parametrik şablon", "Tam", True),
 ("Financist / CFO", 6, 1500, "Büdcə, cash-flow, vergi/SSF, payout uzlaşma", "Tam", False),
 ("Sales / BizDev", 9, 2500, "Business/API satışı, B2B, iri supplier partnyorluq", "Tam", False),
 ("Müştəri dəstəyi", 12, 1300, "Dəstək, onboarding, sifariş/marketplace mübahisələri", "Tam", False),
 ("Müştəri dəstəyi #2", 22, 1300, "Artan həcm üçün dəstək, çoxdilli, SLA", "Tam", False),
 ("Developer #8 (FS)", 30, 2500, "Yeni funksiyalar, API genişlənmə, miqyas", "Tam", True),
]

START_YEAR, START_MONTH = 2026, 7

def month_label(m):
    yy = START_YEAR + (START_MONTH - 1 + m - 1)//12
    mm = (START_MONTH - 1 + m - 1)%12 + 1
    return f"{yy}-{mm:02d}"

def headcount(m): return sum(1 for _,sm,*_ in ROLES if m >= sm)
def gross(m):     return sum(s for _,sm,s,*_ in ROLES if m >= sm)
def equipment(m):
    e = 0
    for (_,sm,s,_,_,heavy) in ROLES:
        if sm == m:
            e += 2200 if heavy else 1300  # premium iş stansiyaları
    return e

def compute(assum=None, months=36):
    a = dict(A);
    if assum: a.update(assum)
    rows = []
    launch = a["launch_month"]
    paid = 0.0; cum = a["capital"]; trough = a["capital"]
    vis = 0.0; dgmv = 0.0; live = 0; sup_prev = 0.0  # sup_prev: indiyədək aktivləşmiş supplier
    for m in range(1, months+1):
        if m < launch:
            vis = 0.0; orders = 0.0; mgmv = 0.0; mrev = 0.0
            mgmv_mon = 0.0; mgmv_free = 0.0; mon_orders = 0.0
            nf = 0.0; sub = 0.0; dgmv = 0.0; dcom = 0.0; rev = 0.0
        else:
            live += 1
            vis = a["vis1"] if live == 1 else vis*(1 + a["vis_g"])
            orders = vis * a["order_conv"]
            mgmv = orders * a["aov"]                 # ümumi platforma GMV
            mgmv_mon = mgmv * a["monetized_share"]   # marketplace + overflow (faiz alınan)
            mgmv_free = mgmv - mgmv_mon              # birbaşa link (pulsuz keçid, gəlirsiz)
            mon_orders = orders * a["monetized_share"]
            mrev = mgmv_mon * a["take"]
            nf = vis * a["free_rate"]
            paid = paid*(1-a["churn"]) + nf*a["paid_conv"]
            sub = paid * a["arpu"]
            dgmv = a["dgmv1"] if live == 1 else dgmv*(1 + a["dgmv_g"])
            dcom = dgmv * a["dcomm"]
            rev = mrev + sub + dcom

        sal = gross(m) * (1 + a["tax"])
        host = a["host_base"] + vis/10000*a["host_10k"]
        sw = headcount(m) * a["sw_head"]
        mkt = max(a["mkt_min"], rev*a["mkt_pct"])
        ops = mon_orders * a["ops_per_order"]
        eq = equipment(m)
        admin = a["admin"] + (300 if m >= 13 else 0) + (400 if m >= 25 else 0)
        stripe = (mgmv_mon + sub + dgmv) * a["stripe"]
        # birdəfəlik supplier aktivləşmə bonusu (yalnız supplier bazası artdıqca)
        sup_base = mon_orders / a["orders_per_supplier"] if mon_orders > 0 else 0.0
        new_sup = max(0.0, sup_base - sup_prev); sup_prev += new_sup
        sup_bonus = new_sup * a["sup_bonus"]
        cost = sal + host + sw + mkt + ops + eq + admin + stripe + sup_bonus
        net = rev - cost
        cum += net
        trough = min(trough, cum)
        rows.append(dict(m=m, label=month_label(m), vis=vis, orders=orders, mgmv=mgmv,
            mgmv_mon=mgmv_mon, mgmv_free=mgmv_free, mon_orders=mon_orders,
            mrev=mrev, paid=paid, sub=sub, dgmv=dgmv, dcom=dcom, rev=rev, head=headcount(m),
            sal=sal, host=host, sw=sw, mkt=mkt, ops=ops, eq=eq, admin=admin, stripe=stripe,
            sup_bonus=sup_bonus, suppliers=sup_prev, cost=cost, net=net, cum=cum))
    # funding need = deepest trough below 0 (kapitalsız), buffer 15%
    funding_need = max(0, -(trough - a["capital"]))  # trough without capital injection
    return rows, dict(a=a, funding_need=funding_need, trough=trough)

if __name__ == "__main__":
    import io, sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    rows, meta = compute(months=48)
    for m in (1,6,12,18,24,30,36,42,48):
        r = rows[m-1]
        print(f"Ay {r['m']:>2} | ziyarət {r['vis']:>7.0f} | sifariş {r['orders']:>5.0f} "
              f"| gəlir {r['rev']:>8.0f} | xərc {r['cost']:>8.0f} | NET {r['net']:>8.0f} | kassa {r['cum']:>9.0f} | komanda {r['head']}")
    y = {1:[0,0,0],2:[0,0,0],3:[0,0,0],4:[0,0,0]}
    for r in rows:
        k = 1 if r['m']<=12 else 2 if r['m']<=24 else 3 if r['m']<=36 else 4
        y[k][0]+=r['rev']; y[k][1]+=r['cost']; y[k][2]+=r['net']
    print()
    for k in (1,2,3,4): print(f"İl {k}: gəlir {y[k][0]:>9.0f}  xərc {y[k][1]:>9.0f}  NET {y[k][2]:>9.0f}")
    # trough without capital
    rows0,_ = compute({"capital":0}, months=48)
    mincum = min(r['cum'] for r in rows0)
    print(f"\nKapitalsız ən dərin kassa (funding need): {mincum:,.0f}")
    print(f"18 ay ARR (gəlir×12 əsasında): {rows[17]['rev']*12:,.0f}")
    print(f"36 ay ARR: {rows[35]['rev']*12:,.0f}")
