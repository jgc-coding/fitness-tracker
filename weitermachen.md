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
  Dazu der v2.15-Test (58 Pruefungen) als Regression gruen. Am Handy hat
  Gabriel alle Versionen bis 2.16.0 getestet, alles laeuft (17.11.2026).
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
   Plan `docs/plan-steigern-erinnerung.md` (Gabriels Entscheidungen stehen
   drin, Symbol = Variante 1 pulsierender Ring), Symbol-Entwuerfe
   `docs/entwuerfe/steigern-symbol-varianten.html`. Alle Fragen sind
   beantwortet (auch Frage 7: ausgelassene Gruppe zaehlt nicht), der Plan
   kann starten. Erster Schritt ist die Analyse der
   Wdh-Bereiche, deren Tabelle Gabriel freigibt. Noch nichts umgesetzt,
   nichts an der Cloud gelesen.
1. **Handy-Tests v2.10.0 bis v2.16.0 bestanden** (Gabriel 17.11.2026: "alle
   alten Versionen getestet, alles funktioniert"). Kommt doch noch etwas:
   Regeln stehen in der CLAUDE.md, Aenderungen je Version im CHANGELOG,
   Checklisten unter `docs/tests/`.
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
    Regeln in `docs/laufplan-format.md` Abschnitt 5) — seit v2.12 mit
    Zyklustag (`feedback.cycleDay`) und ungeplanten Laeufen ("Stattdessen: ...").
7. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
8. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
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
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
