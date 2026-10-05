# Weitermachen — Stand 2026-10-05 (v2.11.0)

## Stand
- **Diese Sitzung (05.10.): v2.11.0, live.** Auftrag von Gabriel: die
  Reihenfolge der Trainingstage gut aenderbar machen. Aus drei Skizzen
  (Pfeile / Sortierfenster / Halten klappt zu) waehlte er B wie empfohlen:
  Knopf "Reihenfolge" ueber den Tagen eines Plans, Fenster mit nur den
  Tagesnamen, Ziehen ohne Halten, jedes Loslassen speichert. Startbildschirm
  und "Tag wechseln" zeigen dieselbe Reihenfolge (ausdruecklicher Wunsch).
  Regeln `sortiereTage`, `neueTagesPlaetze`, `naechsterTagesPlatz` in
  `utils/planReihenfolge.js` (Vertrag `scripts/planreihenfolge-test.mjs`),
  Speichern `setzeTagesPlaetze` im plans store, Fenster in `PlanningView.vue`.
  Nebenbei V16 behoben (doppelter Platz nach Loeschen + Neuanlegen).
- **Geprueft:** Gate gruen (14 Befehle, 15 neue Vertragsfaelle).
  Headless-Chrome gegen den Produktions-Build, frische `*.localhost`-Adresse,
  360 px, Testdaten per Backup-Import: 20 Pruefungen gruen (Finger- und
  Mausziehen, sofort in IndexedDB, Startbildschirm vor/nach Neuladen, Woche
  A/B getrennt, neuer Tag am Ende, keine Konsolenfehler). Fotos angesehen.
  Nicht am Handy, kein Abgleich zweier Handys getestet.
- **Rueckkehr:** vor dieser Sitzung `6deda0f` (v2.10.0). Datenbank-Schema
  unveraendert; alte Versionen lesen `dayOrder` genauso.
- **Davor (04.10.): v2.10.0** — Uebungswechsel fuer alle zusammen
  (`utils/uebungsRing.js`), V15 Namen nur noch in `db.meta` (Cloud-Datensaetze
  `meta/userName_user1..3` am 04.10. angelegt). Echte Einzel-Sterne in der
  Cloud gelten seitdem fuer die ganze Karte.
- **Aus frueheren Sitzungen:** Rueckkehrpunkte `e9c2a67` (v2.9.2),
  `2eae34a` (v2.9.0), `5ab01dc` (v2.8.1), `be06855` (v2.7.1), `01031c1`
  (v2.6.0). Cloud-Sicherungen der Uebungs- und Log-Korrekturen liegen in
  `privat\`. impeccable auf 4.3.1 (Claude-Skills-Commit `d45f982`, nicht
  gepusht); `PRODUCT.md` steht noch im Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Headless-Chrome aus Claude heraus:** Profilordner NICHT unter AppData
  (die App-Kapsel virtualisiert ihn, IndexedDB scheitert mit "backing store"),
  ohne `--incognito`. Erprobt: `C:\Users\chime\fittrack-testprofil-<zeit>`,
  danach loeschen. Testdaten per `DOM.setFileInputFiles` auf das Backup-Feld
  in Settings; Navigation per `__vue_app__...$router.push`. Testskripte lagen
  im Scratchpad der Sitzungen (nicht im Repo).
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
  Headless (CLAUDE.md). `preview_start` oeffnet sie auf `localhost` — dort
  keine Testdaten (koennte angemeldet sein).
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop`);
  **UserSelectModal uebernimmt nur ueber Bestaetigen** — beibehalten.

## Naechste Schritte (Claude)
1. **Meldet Gabriel Probleme aus v2.11.0** (Checkliste
   `docs/tests/v2.11.0-handy.md`): Ziehen in `onTagZiehStart`/`onTagBewegung`
   (`PlanningView.vue`), Regeln zuerst im Vertrag
   `scripts/planreihenfolge-test.mjs`.
2. **Meldet Gabriel Probleme aus v2.10.0** (Checkliste
   `docs/tests/v2.10.0-handy.md`): Wechsel in `wechsleKarte`/`onCardTouchEnd`
   (`TrackingView.vue`), Regeln zuerst im Ring-Vertrag. Zeigt ein Handy
   "Person 1": Sync angemeldet? `meta/userName_*` per REST pruefen.
3. **V15-Rest (Git-Historie)** nur nach Gabriels Entscheidung, siehe
   `verbesserungen.md`.
4. **Fruehere Versionen:** v2.9 1RM in `utils/verlauf.js`; v2.8.1
   `utils/trainingGeraet.js`; v2.8 `UebungsVerlauf.vue`; v2.7
   `StartNutzerwahl.vue`, `resetActiveUsers`; v2.4 Tastatur `Modal.vue`,
   Saetze `scripts/saetze-test.mjs`; Quick-Log `buildNotificationQuickLog`,
   `public/sw-custom.js`; v2.5 `PlanningView.vue`; v2.6 Bilder nach
   `docs/uebungsbilder-chatgpt.md`. Neue Uebungen: zuerst `uebungen-cloud.mjs`.
5. **Weitere Bilder nur auf Zuruf** (Kandidaten: Kurzhantel- und
   Schraegbank-Kurzhantel-Druecken); Herunterladen nur mit Gabriels Ja.
6. **Vorgaben nachrechnen, sobald echte Laeufe da sind:** Ablauf in
   `docs/laufplan-vorgaben.md` Abschnitt 5; Garmin-Abgleich zuerst in
   `scripts/runmatch-test.mjs`.
7. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
8. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
9. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
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
- [ ] **v2.10.0 und v2.11.0 am Handy testen** (seit 2026-10-04)
  Beide Handys ganz schliessen und neu oeffnen, dann die Checklisten
  `docs/tests/v2.10.0-handy.md` und `docs/tests/v2.11.0-handy.md` abhaken.
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
- [ ] **Alte Worktrees entfernen**, wenn keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  Noch vier (Stand 05.10.). Ignoriert liegt darin nur `.claude/` und
  nachbaubares `dist/` bzw. `node_modules/`. Je Zeile ein Worktree (PowerShell):
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fittrack-fortsetzung-ef2a20"`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"`
