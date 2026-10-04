# Weitermachen — Stand 2026-10-04 (v2.10.0)

## Stand
- **Diese Sitzung (04.10.): v2.10.0.** Zwei Auftraege von Gabriel:
  1. **Uebungswechsel immer fuer alle zusammen.** Zu zweit wechselte ein Wisch
     nur eine Person, die andere blieb unbemerkt auf der alten Uebung. Jetzt
     wechseln Wisch (egal wo auf der Karte) und Wechsel-Knopf alle aktiven
     Personen gemeinsam; eine Wechsel-Zeile je Karte, allein rechts neben dem
     Wert. Der Stern ist der Standard des Plan-Platzes fuer alle (gold).
     Regeln in `utils/uebungsRing.js` (`gemeinsamWeiter`, `kartenStandard`,
     `startMitStandard`, `toggleStandard`), Vertrag `scripts/uebungsring-test.mjs`.
  2. **V15: keine Namen mehr in Code, Doku und Tests.** Anzeigenamen kommen aus
     `db.meta` (`userName_user1..3`); `constants.js` traegt nur "Person n".
     Die drei Namen-Datensaetze habe ich am 04.10. in der Cloud angelegt (nur
     anlegen, nichts ueberschrieben; Nachkontrolle per REST bestaetigt). Der
     auth store laedt Namen neu, sobald der Sync `meta` bringt.
- **Echte Sterne in der Cloud (Stand 04.10.):** je ein Einzel-Stern von user3
  (Push) und user2 (Legs, Pull) auf einer Alternative, dazu einer von user3
  auf einer Pull-Basis. Sie gelten jetzt fuer die ganze Karte (bevorzugter
  Nutzer zuerst, dann die uebrigen aktiven, dann alle).
- **Geprueft:** Gate gruen (14 Befehle; Ring-Vertrag mit 26 neuen Faellen).
  Headless-Chrome gegen den Produktions-Build, frische `*.localhost`-Adresse,
  360 px, Testdaten per Backup-Import: 35 Pruefungen gruen (Namen vor/nach
  Import, Wisch auf jedem Personen-Bereich zu zweit und zu dritt, Karte
  bleibt beim Wisch dieselbe und die Schiebe-Animation laeuft, Knopf,
  Stern fuer alle, Start mit Standard, Layout allein, Altbestand mit
  Abweichung, gespeicherter Log ohne Abweichung, keine Konsolenfehler).
  Fotos angesehen. Wisch per echten Touch-Ereignissen des DevTools-Protokolls,
  nicht am Handy.
- **Rueckkehr:** vor dieser Sitzung `e9c2a67` (v2.9.2 + Doku). Gleiches
  Datenbank-Schema; die Namen-Datensaetze in der Cloud stoeren alte Versionen
  nicht (sie lasen sie schon immer).
- **Aus frueheren Sitzungen:** Rueckkehrpunkte `01031c1` (v2.6.0),
  `be06855` (v2.7.1), `5ab01dc` (v2.8.1), `2eae34a` (v2.9.0). Cloud-Sicherungen
  der Uebungs- und Log-Korrekturen liegen in `privat\`. impeccable auf 4.3.1
  (Claude-Skills-Commit `d45f982`, nicht gepusht); `PRODUCT.md` steht noch im
  Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Headless-Chrome aus Claude heraus:** Profilordner NICHT unter AppData
  (die App-Kapsel virtualisiert ihn, IndexedDB scheitert mit "backing store"),
  ohne `--incognito`. Erprobt: `C:\Users\chime\fittrack-testprofil-<zeit>`,
  danach loeschen. Testskript lag im Scratchpad dieser Sitzung.
- **Derselbe Trainingstag am selben Tag erneut gestartet** uebernimmt den Stand
  seines Logs (gewollt) — Starttests brauchen einen Tag ohne heutigen Log.
- **Ein Handy, das offline ein altes Geraet haelt,** koennte es beim
  naechsten Satz zurueckschreiben. Pruefen mit `uebungen-cloud.mjs`; falls
  noetig `uebungen-korrigieren.mjs --gruppe geraete` erneut (Trockenlauf
  zuerst).
- **Beinplan nach dem Tausch:** Platz 3 = Leg Extension, Platz 7 = Leg Curl
  (so wurde trainiert). Umsortieren nur auf Gabriels Wunsch.
- **Rollback auf v1.8.1 nur mit Hotfix:** ein Handy auf Schema v4 wirft mit der
  unveraenderten v1.8.1 einen Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`.
- **Browser-Pane:** ausgeblendet steht `requestAnimationFrame` still; besser
  Headless (CLAUDE.md).
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop`);
  **UserSelectModal uebernimmt nur ueber Bestaetigen** — beibehalten.

## Naechste Schritte (Claude)
1. **Meldet Gabriel Probleme aus v2.10.0** (Checkliste
   `docs/tests/v2.10.0-handy.md`): Wechsel in `wechsleKarte`/`onCardTouchEnd`
   (`TrackingView.vue`), Regeln zuerst im Ring-Vertrag. Zeigt ein Handy
   "Person 1": Sync angemeldet? `meta/userName_*` per REST pruefen.
2. **V15-Rest (Git-Historie)** nur nach Gabriels Entscheidung, siehe
   `verbesserungen.md`.
3. **Fruehere Versionen:** v2.9 1RM in `utils/verlauf.js`; v2.8.1
   `utils/trainingGeraet.js`; v2.8 `UebungsVerlauf.vue`; v2.7
   `StartNutzerwahl.vue`, `resetActiveUsers`; v2.4 Tastatur `Modal.vue`,
   Saetze `scripts/saetze-test.mjs`; Quick-Log `buildNotificationQuickLog`,
   `public/sw-custom.js`; v2.5 `PlanningView.vue`; v2.6 Bilder nach
   `docs/uebungsbilder-chatgpt.md`. Neue Uebungen: zuerst `uebungen-cloud.mjs`.
4. **Weitere Bilder nur auf Zuruf** (Kandidaten: Kurzhantel- und
   Schraegbank-Kurzhantel-Druecken); Herunterladen nur mit Gabriels Ja.
5. **Vorgaben nachrechnen, sobald echte Laeufe da sind:** Ablauf in
   `docs/laufplan-vorgaben.md` Abschnitt 5; Garmin-Abgleich zuerst in
   `scripts/runmatch-test.mjs`.
6. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
7. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
8. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
   ausdruecklicher Freigabe.

## Offen
- **Im intervals.icu-Konto von user2 liegt noch keine Aktivitaet** (seit
  19.07.); erster echter Garmin-Test mit einem Plan-Lauf.
- **Der erste Lauf von user1 ist der eigentliche Test der Garmin-Anbindung**
  — das Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.).
- **Erster Deploy nach dem 19.10.2026** laeuft auf Ubuntu 26
  (`ubuntu-latest`): Actions-Lauf dann ansehen; bricht er, `runs-on` in
  `.github/workflows/deploy.yml` voruebergehend auf `ubuntu-24.04` setzen.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**, **I8**,
  **I9** — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **v2.10.0 am Handy testen** (seit 2026-10-04): beide Handys neu starten,
  Checkliste `docs/tests/v2.10.0-handy.md`.
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit
  2026-10-04), V15-Rest in `verbesserungen.md`.
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  Noch vier (Stand 02.10.). Ignoriert liegt darin nur `.claude/` und
  nachbaubares `dist/` bzw. `node_modules/`. Je Zeile ein Worktree (PowerShell):
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fittrack-fortsetzung-ef2a20"`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"`
