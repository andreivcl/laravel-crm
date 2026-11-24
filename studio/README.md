# Shorts Studio: 3D zilnic pentru TikTok, Reels și Shorts

Un studio „din cod” care:

1. **randează animații 3D** în format vertical 1080×1920, ca bucle perfecte (ultimul cadru se leagă exact de primul), cu text cinetic peste;
2. **planifică și produce o postare pe zi** (video, copertă și descrieri pentru fiecare platformă);
3. **colectează analitice** de pe YouTube, Instagram și TikTok, calculează ce funcționează și **ajustează automat** planificarea zilelor următoare.

Stack: [Remotion](https://remotion.dev) (video în React) + Three.js / React Three Fiber, scripturi Node 22 (TypeScript rulat nativ), Claude API pentru idei.

---

## Pornire rapidă

```bash
cd studio
npm install
npm run dev                    # Remotion Studio: previzualizare live, editezi props din sidebar
npm run analytics:demo         # date DEMO ca să vezi dashboard-ul (out/dashboard.html)
node scripts/daily.ts          # analytics → plan → randare pentru azi
```

Pe un server fără GPU sau fără acces la remotion.media:

```bash
export REMOTION_GL=swangle                                  # WebGL software
export REMOTION_BROWSER=/cale/catre/chrome-headless-shell   # opțional, browser local
```

## Fluxul zilnic

| Pas | Comandă | Ce face |
|---|---|---|
| 1 | `npm run analytics` | descarcă metricile postărilor publicate, apoi calculează scoruri și insights |
| 2 | `npm run ideas` | (dacă rămân < 3 idei) Claude generează idei noi pe baza nișei, a trendurilor și a datelor |
| 3 | `npm run plan` | alege stilul, paleta și ideea (Thompson sampling) și scrie `content/posts/<data>.json` |
| 4 | `npm run render:post` | scrie `out/<data>/video.mp4`, `cover.png` și `captions.md` |
| 5 | `npm run publish -- --platforms=youtube,tiktok` | urcă video-ul și salvează ID-urile în `data/registry.json` |

`node scripts/daily.ts --publish` rulează toți pașii, în ordine.

> **Sunetele în trend se adaugă nativ, în aplicație.** Postarea manuală cu un sunet în trend aduce de obicei mai mult reach și nu ridică probleme de licență. După postare, înregistrează ID-urile ca să intre în analitice:
> `node scripts/publish.ts 2026-11-24 --link --tiktok=<id> --instagram=<id> --youtube=<id>`

## Cele 3 stiluri 3D

| Stil | Look | Fișier |
|---|---|---|
| `glass` | sticlă irizată cu dispersie, sateliți crom și sticlă, „product shot” | `src/scenes/GlassScene.tsx` |
| `clay` | NPR în stil Spider-Verse: lumină în trepte, halftone, contur de cerneală, squash & stretch | `src/scenes/ClayScene.tsx` |
| `grid` | sculptură cinetică: 121 de piloni conduși de două valuri care interferează, cu o bilă crom care alunecă pe val | `src/scenes/GridScene.tsx` |

Ce le face să arate „de echipă”:

- **Bucle perfecte.** Fiecare mișcare depinde de `unghi = 2π · cadru / durată`, numai cu frecvențe întregi (`src/lib/loop.ts`). Platformele numără reluările ca vizualizări.
- **Lumină de studio generată din paletă.** Panouri colorate sunt „coapte” într-o hartă de mediu PMREM, fără fișiere HDRI.
- **Determinism.** Totul e derivat din `useCurrentFrame()` și dintr-un seed, deci orice cadru se randează identic pe orice worker.
- **Finisaj.** Grain animat și vignetă. Textura „imperfectă” diferențiază munca lucrată de randările AI prea curate.
- **Text cinetic.** Cuvintele intră cu blur → clar, iar hook-ul e lizibil din **cadrul 0**. Combinația Inter Tight + Instrument Serif italic e în trend; un cuvânt marcat cu `*cuvânt*` primește accent în gradient.
- **Safe zones.** Textul stă în afara zonelor acoperite de interfața TikTok/Reels/Shorts (jos ~480px, dreapta ~140px).

Un stil nou se adaugă în trei pași: creezi `src/scenes/XScene.tsx` (primește `palette`, `angle`, `seed`), îl adaugi în `STYLES` din `src/brief.ts` și în switch-ul din `src/DailyShort.tsx`. Planificatorul îl testează automat.

## Filme de 60s+ (TikTok Creator Rewards cere minimum 1 minut)

`src/films/howItsMade.ts` este un film de referință de 66s: „Cum se face o animație 3D din cod, în 5 pași”. Totul e pus pe un grid muzical de 112.5 BPM, la care 1 beat = 16 cadre. Filmul are:
- hook din cadrul 0;
- promisiunea „5 pași” și un chip de progres;
- un rehook la 35s;
- o pauză de liniște înainte de momentul-erou (sticla, la 63% din film);
- un montaj care accelerează;
- un CTA și un final care se leagă de început.

```bash
npm run film:timeline    # exportă timeline.json și verifică planul (0 erori)
npm run film:sound       # coloană sonoră + SFX din același plan, masterizată la −14 LUFS
npm run film:draft       # randare de probă la 50%
npm run qa -- out/films/how-its-made/draft.mp4 --out out/qa --beats out/films/how-its-made/timeline.json --loop
npm run film:master      # master 1080×1920
```

## Montaj automat pentru filmările tale

```bash
npm run edit:autocut -- input.mp4 output.mp4 --reframe=blur --punch=1.08
```

Unealta:
- scoate pauzele (jump cuts) și face zoom 100%/108% alternativ la fiecare tăietură;
- convertește la 9:16;
- normalizează vocea la −14 LUFS;
- scrie `output.cuts.json`, după care poți sincroniza subtitrări sau efecte.

## Skill pentru Claude Code

`.claude/skills/video-editor/` conține metoda de lucru, regulile măsurabile (timpi de citire, ritm, cameră, tranziții, sunet), structura pentru videoclipuri de 60s+, toate metodele de 3D (cod, Blender, AI 3D, AI video) și ghidul de filmare. Orice sesiune Claude Code din acest repo îl încarcă automat când e vorba de video.

## Analitice: ce se măsoară și cum învață

**Credențiale** (variabile de mediu sau secrete GitHub):

| Platformă | Variabile | Ce dă |
|---|---|---|
| YouTube | `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (scopes: `youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`) | vizualizări, like-uri, comentarii, distribuiri, % mediu vizionat |
| Instagram | `IG_ACCESS_TOKEN`, `IG_USER_ID` (cont Business/Creator, Instagram Login) | views, reach, likes, comments, shares, saves, timp mediu de vizionare, **skip rate în primele 3s** |
| TikTok | `TIKTOK_ACCESS_TOKEN` (Display API `video.list`, Content Posting `video.publish`) | views, likes, comments, shares. Retenția apare doar în TikTok Business API sau în aplicație. |

**Scorul unei postări** (în σ; 0 = media contului):
- vizualizări normalizate la 48h (log), z-score pe fiecare platformă: 50–65%;
- engagement ponderat `(like + 2·comment + 3·share + 3·save) / views`: 25–35%;
- retenție (vizionare medie și 1 − skip rate), unde există: 25%.

Postările mai noi de 24h nu intră în calcul. Pentru fiecare atribut (stil, paletă, pilon, tip de hook, durată, zi) se calculează un efect mediu „micșorat” spre 0 când eșantionul e mic. Planificatorul trage aleator din distribuția fiecărui efect (Thompson sampling): repetă ce merge, dar testează în continuare variantele încercate de puține ori. Mai evită să repete stilul de ieri.

Dashboard-ul (`out/dashboard.html`) arată scorul pe postare, efectul fiecărui atribut, recomandările, vizualizările pe platformă și tabelul complet.

> Datele demo sunt marcate `demo: true`. Șterge-le cu `npm run analytics:reset` înainte de a folosi date reale.

## Automatizare

`.github/workflows/daily-short.yml` rulează zilnic la 05:17 UTC: analitice, plan, randare, artefact descărcabil și commit înapoi pentru `content/` și `data/`. Publicarea automată se pornește manual (workflow_dispatch → `publish: true`), după ce ai pus secretele.

## Playbook: cum ajungi la nivel „de top”

**Unelte, pe niveluri:**
- *Din cod (acest repo):* Remotion + Three.js. E imbatabil la volum zilnic, variații și template-uri parametrizate.
- *3D artizanal:* Blender (Geometry Nodes, Cycles/EEVEE, Grease Pencil pentru 2D peste 3D), Cinema 4D + Redshift, Houdini (simulări). Pentru „hero pieces” săptămânale.
- *Editare și compoziție:* DaVinci Resolve (color, Fusion), After Effects, CapCut (sunete și efecte native de TikTok).
- *AI ca asistent, nu ca produs final:* Veo, Kling, Runway, Luma pentru B-roll și explorare; ElevenLabs pentru voce și SFX. Declară conținutul AI unde platforma o cere.

**Principii care fac diferența:**
1. Hook vizibil și înțeles în cadrul 0 și decis în primele 3 secunde (urmărește `reels_skip_rate`).
2. Cele 12 principii ale animației: easing, anticipație, squash & stretch, follow-through, arcuri. Nimic nu pornește sau nu se oprește liniar.
3. Buclă sau „payoff” la final. Retenția > 100% înseamnă reluări.
4. Un singur punct focal pe cadru; textul nu concurează cu obiectul.
5. Serie recognoscibilă: același kicker, aceeași paletă de bază, numerotare (#001…). Oamenii revin pentru serie.
6. Sound design: un „whoosh” pe intrarea textului și un impact pe beat contează enorm. Sunetul în trend se adaugă în aplicație.
7. Testează o singură variabilă odată. Sistemul de analitice o face pentru tine, dar are nevoie de volum (~20–30 de postări pentru semnal real).

**Trenduri (nov. 2026, direcțional):** 3D stilizat/NPR, texturi „handcrafted” și grain, hibrid 2D+3D, kinetic type cu serif italic, bucle hipnotice, materiale sticlă și crom. Pe TikTok, 3D-ul cu personaje și umor (mascote) aduce cele mai multe comentarii. Detalii și surse în `content/trends.md`.

## Limitări

- Randarea software (`swangle`) e lentă. Pe un GPU sau pe Remotion Lambda e de 10–50× mai rapidă.
- API-urile platformelor își schimbă des metricile și permisiunile. TikTok cere audit ca postările prin API să fie publice, iar Instagram cere cont Business/Creator. Codul de publicare și analitice nu a fost rulat pe conturi reale. Testează întâi cu `--dry-run` sau cu privacy privat.
- Fonturile (SIL OFL) sunt incluse în `public/fonts`. Remotion e gratuit pentru echipe de până la 3 persoane; peste, vezi licența.
