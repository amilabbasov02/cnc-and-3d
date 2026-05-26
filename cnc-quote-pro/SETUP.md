# FEEDRATE — Quraşdırma (Faza 1)

## 1. Supabase layihəsi yarat
1. https://supabase.com → yeni layihə (region: Avropa, məs. Frankfurt).
2. **Project Settings → API** səhifəsindən götür:
   - `Project URL`
   - `anon public` key
   - `service_role` key (GİZLİ)

## 2. `.env.local` doldur
`cnc-quote-pro/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Verilənlər bazası sxemini işə sal
Supabase → **SQL Editor** → `supabase/schema.sql` faylının məzmununu yapışdır → **Run**.
(Profillər, istifadə sayğacları, IP qeydiyyatı, modellər, dizaynlar, marketplace + RLS yaranır.)

## 4. Auth ayarları
Supabase → **Authentication → Sign In / Providers → Email**: "Confirm email" AÇIQ olsun.
**Authentication → URL Configuration**:
- Site URL: `http://localhost:3002` (lokal) və ya canlı domenin.
- Redirect URLs: `http://localhost:3002/auth/callback` (və canlı domen üçün də).

## 5. İşə sal
```
cd cnc-quote-pro
npm run dev
```
Aç: http://localhost:3002

## 6. Özünü admin et (qeydiyyatdan sonra)
Supabase → SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'SƏNİN_EMAILİN';
```
Sonra `/admin` panelinə girişin olacaq.

---

## Memarlıq (məntiqi ayrılmış)
```
src/app/(marketing)/   → açıq sayt: /, /quote, /pricing, /library   [FRONTEND]
src/app/(auth)/        → /login, /signup                            [AUTH]
src/app/(app)/         → /dashboard, /quotes, /editor, /account     [APP — qorunan]
src/app/(admin)/       → /admin                                     [ADMIN — rol qapılı]
src/app/api/*          → signup, quote/check                        [BACKEND]
src/lib/supabase/*     → client / server / admin                    [BACKEND]
src/lib/server/limits  → freemium limit məntiqi                     [BACKEND]
src/proxy.ts           → sessiya + route qorunması                  [BACKEND]
```

## Limit qaydaları (qurulub)
- Anonim: cəmi **1** hesablama → sonra qeydiyyat.
- Hesab: ayda **5** hesablama + **5** yükləmə (plana görə artır).
- **1 IP = 1 hesab** (lokalda söndürülüb ki, test rahat olsun).

## Növbəti fazalar
- Faza 2: 3D model kitabxanası (parametrik).
- Faza 3: Stripe ödəniş + paketlər.
- Faza 4: Brauzer CAD redaktoru (three + three-bvh-csg).
- Faza 5: Dizayn marketplace (Stripe Connect).
