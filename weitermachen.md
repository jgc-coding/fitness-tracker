# Weitermachen — Stand 2026-11-14 (v2.16.0)

## Stand
- **Diese Sitzung (14.11.): v2.16.0** — Fragen/Auftrag Gabriel:
  (1) Wird ohne "Workout beenden" gespeichert? JA: jeder Satz ist ab
  "Speichern" in IndexedDB und Cloud. Cloud-Stand 14.11.: 43 von 131
  Trainings nie beendet, ihre Saetze alle da. Fund dabei: V17 (alte
  Sperrbildschirm-Meldung), gleich mit erledigt. In den Commits 5e1159b
  und 719fb82 heisst er noch V16 — die Nummer war seit v2.11.0 vergeben.
  (2) Zyklus von user1 staerker einbauen. Gabriels Wahl: Zyklustag ganz
  oben im Training, beim Start errechnet eingetragen, "nichts tun =
  Bestaetigung", Tipp korrigiert, neu "Tag 1 — neuer Zyklus"; History
  Variante X (eigene Zeile "Zyklustag"), dazu Uebungsverlauf und
  Tages-Detail. Errechnete Werte blass mit "≈", nie nachtraeglich
  gespeichert. Regeln in der CLAUDE.md.
  Echte Daten: user1 hatte in 9 von 41 Trainings einen Zyklustag, zuletzt
  02.11. Tag 9 (14.11. = Tag 21).
- **Live:** Actions-Lauf 43636595300 gruen, Live-Seite liefert 2.16.0 aus
  (SettingsView-Chunk geprueft), master `719fb82` = origin, Tag `v2.16.0`.
- **Geprueft:** Gate gruen (18 Befehle, `zyklustag-test` jetzt 50 Faelle).
  Headless-Chrome gegen den Produktions-Build, frische `*.localhost`,
  360 px: 29 neue Pruefungen gruen (Stempel 21, Tag 1, Entfernen -> blass,
  Bestaetigen, Neuladen, Einstieg mittendrin, History-Zeile 9/≈13/≈17,
  Punkt nur bei Notiz, Tages-Detail, Rad startet beim errechneten Tag,
  Verlauf samt Ablesezeile, andere Person ohne Zyklus, Version 2.16.0).
  Dazu der v2.15-Test (58 Pruefungen) als Regression gruen. Nicht
  geprueft: echtes Handy, Sperrbildschirm (V17 nur am Geraet testbar),
  Sync zwischen zwei Handys.
- **Rueckkehrpunkte:** `c125c34` (vor dieser Sitzung, v2.15.0), `460ba37`
  (v2.14.1), `d725233` (v2.14.0), `e6e555d` (v2.13.0), `1799e4f`
  (v2.12.0), `8eaa3de` (v2.11.0), `6deda0f` (v2.10.0), `01031c1` (v2.6.0).
  Datenbank-Schema seit v2.x unveraendert (Dexie v4); v2.16.0 nutzt nur das
  bestehende Feld `cycleDays`. Cloud-Sicherungen in `privat\`.
- **Worktrees:** `add-bizeps-machine-exercise-8f0f28` (sauber, gemergt),
  `fittrack-workout-save-cycle-3a5977` (diese Sitzung, gemergt) und ein
  LEERER Ordner `.claude\worktrees\exercise-images-crop-e10a06`
  (gitignoriert, harmlos). Befehle zum Entfernen im save-state-Bericht.

## Stolperfallen (aktuell)
- **Testskripte dieser Sitzung** im Scratchpad
  `%LOCALAPPDATA%\Temp\claude\1ddd39689e7a6ade\0bbf9704-e5c8-49fc-ab23-ed82d29a3963\scratchpad\`:
  `v216-test.mjs` (Zyklus), `v215-regress.mjs` (v2.15-Test auf Port 4199),
  `cdp.mjs`, `zyklus-stand.mjs` (nur lesend: offene Trainings und
  Zyklustage in der Cloud zaehlen, Aufruf aus dem Hauptbaum).
- **Vue entfernt den Leerraum zwischen Spans:** `textContent` der
  Zyklus-Zeile liest "Zyklustag 21ändern". Im Test die Kinder einzeln lesen.
- **Browser-Test mit zwei Personen:** Beim App-Start ohne eigenes Training
  setzt `resetActiveUsers` die Besetzung auf den Standard-Nutzer zurueck —
  localStorage vorab setzen reicht nicht. Im Test die zweite Person per
  Farbkreis (`.start-nutzer-kreis`, title = Name) dazunehmen.
- **Headless-Chrome aus Claude heraus:** Profilordner NICHT unter AppData
  (die App-Kapsel virtualisiert ihn, IndexedDB scheitert mit "backing
  store"). Erprobt: `C:\Users\chime\fittrack-testprofil-<zeit>`, danach
  loeschen. Navigation per `__vue_app__...$router.push`. Jedes "Fenster zu"
  als Pruefung werten — ein still offenes Blatt verdeckte sonst zwei Fehler.
  Testserver: launch.json "Vite Preview (eigener Port 4199)".
- **ChatGPT-Konto steht auf dem Gratis-Tarif** (09.10., vorher Plus): drei
  Bilder am Stueck gingen durch, danach Werbung fuer Plus.
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
0. **Bestellt 17.11.2026, Umsetzung ab 18.11.: Steigern-Erinnerung (v2.17.0).**
   Plan `docs/plan-steigern-erinnerung.md`, Symbol-Entwuerfe
   `docs/entwuerfe/steigern-symbol-varianten.html`. NICHT starten, bevor
   Gabriel die sechs offenen Fragen im Plan beantwortet hat (Symbol-Wahl,
   Zaehlweise, je Uebung oder Gruppe, Bereich je Person, mehrere Saetze).
   Noch nichts umgesetzt, nichts an der Cloud gelesen.
1. **Meldet Gabriel Probleme aus v2.16.0** (Checkliste
   `docs/tests/v2.16.0-handy.md`): Regeln zuerst in
   `scripts/zyklustag-test.mjs` (`zyklusTageFuerDaten`,
   `brauchtZyklusStempel`, `zyklusStempel`); Store `zyklusPatch` in
   `stores/workout.js`; Oberflaeche `TrackingView.vue` (`.zyklus-zeile`,
   `zyklusErrechnet`, `saveNeuerZyklus`), `HistoryView.vue`
   (`zyklusZeile`, `logCycleErrechnet`), `UebungsVerlauf.vue`
   (`ladeZyklus`); V17 in `public/sw-custom.js` (`istVeraltet`) und
   `App.vue`. Bewusst NICHT gebaut (moegliche Wuensche): Zyklusphasen als
   Farbflaechen im Diagramm, Auswertung nach Zyklustag, Zyklustag auf der
   Trainingskarte, Bestaetigen ausserhalb eines Trainings.
2. **Meldet Gabriel Probleme aus v2.15.0** (Checkliste
   `docs/tests/v2.15.0-handy.md`): Regeln zuerst in `scripts/saetze-test.mjs`
   (`auslassenAb`, `wirksamAusgelassen`, `satzStand`) bzw.
   `scripts/auswertung-test.mjs`; Oberflaeche in `TrackingView.vue`
   (`lasseAus`, `oeffneWieder`, `.picker-aktionen`),
   `components/history/AuswertungsAnsicht.vue`, `VerlaufMini.vue`.
   Moegliche Wuensche danach: ein gemeinsames Prozent-Diagramm fuer
   hoechstens 8 Uebungen, Auslassen auch fuer Personen mit einem Satz.
3. **Meldet Gabriel Probleme aus v2.14.0** (Checkliste
   `docs/tests/v2.14.0-handy.md`): Regeln zuerst in
   `scripts/gewicht-pro-seite-test.mjs` bzw. `saetze-test.mjs`
   (`rueckgaengigSchritt`), Oberflaeche in `TrackingView.vue`
   (`zeigeRueckgaengig`, `macheRueckgaengig`, Raeder in `.wheels-row`).
   Hat user1 nach dem 16.10. noch auf einer alten Version pro Seite
   eingetragen: nur diese Saetze mit `--bis` UND `--ohne` gezielt umrechnen,
   nie blind erneut. Rueckweg: `--zurueck --jetzt`.
4. **Meldet Gabriel Probleme aus v2.13.0** (Checkliste
   `docs/tests/v2.13.0-handy.md`): Fehlt die Uebung, mit `uebungen-cloud.mjs`
   den Cloud-Bestand lesen (doppelt? fehlt?). Stoert der doppelte Fuss: ein
   vierter Auftrag im Chat "Create Fitness Illustration" ("keep START, make
   the base frame in END identical"), neu messen, `neu-17`, Vertrag zuerst.
5. **Meldet Gabriel Probleme aus v2.12.0** (Checkliste
   `docs/tests/v2.12.0-handy.md`): Regeln zuerst in
   `scripts/laufeintrag-test.mjs` bzw. `zyklustag-test.mjs`, Oberflaeche in
   `RunSpontanForm.vue`, `ZyklusTagFeld.vue`, `RunSessionSheet.vue`.
6. **Meldet Gabriel Probleme aus v2.11.0** (Checkliste
   `docs/tests/v2.11.0-handy.md`): Ziehen in `onTagZiehStart`/`onTagBewegung`
   (`PlanningView.vue`), Regeln zuerst im Vertrag
   `scripts/planreihenfolge-test.mjs`.
7. **Meldet Gabriel Probleme aus v2.10.0** (Checkliste
   `docs/tests/v2.10.0-handy.md`): Wechsel in `wechsleKarte`/`onCardTouchEnd`
   (`TrackingView.vue`), Regeln zuerst im Ring-Vertrag. Zeigt ein Handy
   "Person 1": Sync angemeldet? `meta/userName_*` per REST pruefen.
8. **V15-Rest (Git-Historie)** nur nach Gabriels Entscheidung, siehe
   `verbesserungen.md`.
9. **Fruehere Versionen:** v2.9 1RM in `utils/verlauf.js`; v2.8.1
   `utils/trainingGeraet.js`; v2.8 `UebungsVerlauf.vue`; v2.7
   `StartNutzerwahl.vue`, `resetActiveUsers`; v2.4 Tastatur `Modal.vue`,
   Saetze `scripts/saetze-test.mjs`; Quick-Log `buildNotificationQuickLog`,
   `public/sw-custom.js`; v2.5 `PlanningView.vue`; v2.6 Bilder nach
   `docs/uebungsbilder-chatgpt.md`. Neue Uebungen: zuerst `uebungen-cloud.mjs`.
10. **Weitere Bilder nur auf Zuruf** (Kandidaten: Kurzhantel- und
    Schraegbank-Kurzhantel-Druecken); Herunterladen nur mit Gabriels Ja.
11. **Vorgaben nachrechnen, sobald echte Laeufe da sind:** Ablauf in
    `docs/laufplan-vorgaben.md` Abschnitt 5; Garmin-Abgleich zuerst in
    `scripts/runmatch-test.mjs`.
12. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
    Regeln in `docs/laufplan-format.md` Abschnitt 5) — seit v2.12 mit
    Zyklustag (`feedback.cycleDay`) und ungeplanten Laeufen ("Stattdessen: ...").
13. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
14. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
    ausdruecklicher Freigabe.

## Offen
- **Im intervals.icu-Konto von user2 liegt noch keine Aktivitaet** (seit
  19.07.); erster echter Garmin-Test mit einem Plan-Lauf.
- **Der erste Lauf von user1 ist der eigentliche Test der Garmin-Anbindung**
  — das Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.). Seit
  v2.12 auch: ein spontaner Lauf, den die Uhr dem geplanten zuordnet, laesst
  sich per "Anders gelaufen" umhaengen (nur im Test mit Testdaten belegt).
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I8**,
  **I9** — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **v2.16.0 auf BEIDE Handys holen und testen** (seit 2026-11-14)
  Beide Handys ganz schliessen und neu oeffnen, unter Settings steht 2.16.0.
  Dann `docs/tests/v2.16.0-handy.md` abhaken (Zyklustag oben im Training,
  Zeile "Zyklustag" in der History, alte Sperrbildschirm-Meldung). Mit
  2.16.0 sind auch alle frueheren Versionen auf dem Handy.
- [ ] **v2.15.0 auf BEIDE Handys holen und testen** (seit 2026-11-12)
  Beide Handys ganz schliessen und neu oeffnen, unter Settings steht 2.15.0.
  Dann `docs/tests/v2.15.0-handy.md` abhaken (Auslassen mit der Person mit
  3 Saetzen, History -> Auswertung). Ein Handy auf alter Version zeigt
  ausgelassene Saetze nur als offen — nichts geht verloren.
- [ ] **v2.14.1 auf BEIDE Handys holen, vor dem naechsten Training von user1** (seit 2026-10-17)
  Beide Handys ganz schliessen und neu oeffnen, unter Settings steht 2.14.1.
  Eine alte Version zeigt die Werte von user1 schon verdoppelt, aber ohne
  "Pro Seite" — dort wuerde wieder pro Seite eingetragen. Danach
  `docs/tests/v2.14.0-handy.md` abhaken.
- [ ] **v2.13.0 aufs Handy holen und testen** (seit 2026-10-09)
  Beide Handys ganz schliessen und neu oeffnen. An EINEM Handy (angemeldet,
  online): Einstellungen -> "Standard-Uebungen laden", dann "Bilder
  automatisch zuordnen". Danach `docs/tests/v2.13.0-handy.md` abhaken.
- [ ] **v2.12.0 am Handy testen** (seit 2026-10-07)
  Beide Handys ganz schliessen und neu oeffnen, dann
  `docs/tests/v2.12.0-handy.md` abhaken. Erst wenn beide 2.12.0 zeigen,
  Rueckmeldungen mit Zyklustag aendern.
- [ ] **v2.10.0 und v2.11.0 am Handy testen** (seit 2026-10-04)
  Beide Handys ganz schliessen und neu oeffnen, dann die Checklisten
  `docs/tests/v2.10.0-handy.md` und `docs/tests/v2.11.0-handy.md` abhaken.
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
