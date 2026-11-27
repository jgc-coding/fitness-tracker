# Weitermachen — Stand 2026-11-27 (v2.19.0)

## Stand

- **v2.19.0 Hantel-Bildchen vor DB und BB (27.11.2026, live):** Gabriels
  Wahl war Variante B aus `docs/entwuerfe/hantel-bildchen-varianten.html`.
  Je Person schaltbar, Standard an fuer user1 und user3, aus fuer user2.
  Regeln in der CLAUDE.md ("Hantel-Bildchen vor DB/BB"), Aenderungen im
  CHANGELOG.
- Gate gruen (neu: `hantelbild-test` 47 Faelle), Browser-Tests
  `v219-test` 31/31, `v218-test` 39/39, `v2171-test` 54/54, `v216-test`
  und `v215-regress` gruen. Push `b317759`, Tag `v2.19.0`.
- **Rueckkehrpunkte:** `c530592` (vor v2.19.0, nur der Entwurf dazu),
  `32ead4a` (v2.18.0), `27ef73a` (v2.17.1), `d258e58` (v2.17.0),
  `719fb82` (v2.16.0), `c125c34` (v2.15.0), `460ba37` (v2.14.1),
  `d725233` (v2.14.0), `e6e555d` (v2.13.0), `1799e4f` (v2.12.0),
  `8eaa3de` (v2.11.0), `6deda0f` (v2.10.0), `01031c1` (v2.6.0).
  Datenbank-Schema seit v2.x unveraendert (Dexie v4); v2.19.0 nutzt nur
  neue `db.meta`-Schluessel (`hantelBild_<userId>`). Cloud-Sicherungen in
  `privat\`.
- **Worktrees:** `add-bizeps-machine-exercise-8f0f28` und
  `fittrack-workout-save-cycle-3a5977` (beide sauber, gemergt) und ein
  LEERER Ordner `.claude\worktrees\exercise-images-crop-e10a06`
  (gitignoriert, harmlos). Befehle zum Entfernen im save-state-Bericht.

## Stolperfallen (aktuell)
- **`v215-regress.mjs` und `v216-test.mjs` starten KEINEN eigenen Server:**
  vorher `node node_modules/vite/bin/vite.js preview --port 4199 --strictPort`
  starten (lauscht nur auf ::1), sonst Abbruch "Zeitueberschreitung
  .bottom-nav". `v219-test`, `v218-test` und `v2171-test` starten ihren
  eigenen Server.
- **Browser-Tests liegen in `privat\browsertests\`** (gitignoriert, nur im
  Hauptbaum): `v219-test.mjs` (Hantel-Bildchen), `v218-test.mjs`
  (Deload-Wochen), `v2171-test.mjs` (Steigern-Erinnerung), `v216-test.mjs`
  (Zyklus), `v215-regress.mjs`. `v217-test.mjs` ist veraltet (prueft noch
  Puls und Einheiten-Regel). Bricht ein Test bei "[Einstellung]
  Zeitueberschreitung" ab, war es vermutlich ein Wettlauf zwischen Tipp und
  Laden der Einstellungen; einfach erneut laufen lassen.
- **Quick-Log vom Sperrbildschirm** ist im Browser nur nachgestellt
  (IndexedDB-Schreiben plus MessageEvent); der echte Service Worker laeuft
  nur am Handy (Geraetetest-Liste).
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
1. **Handy-Tests v2.10.0 bis v2.16.0 bestanden** (Gabriel 17.11.2026: "alle
   alten Versionen getestet, alles funktioniert"). Kommt doch noch etwas:
   Regeln stehen in der CLAUDE.md, Aenderungen je Version im CHANGELOG,
   Checklisten unter `docs/tests/`.
2. **Hantel-Bildchen nach Gabriels Rueckmeldung nachjustieren:** Groesse und
   Farbe stehen nur in `src/components/shared/UebungsName.vue` (Stil
   `.hantel-bild`), die Regel nur in `src/utils/hantelBild.js`.
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
    Regeln in `docs/laufplan-format.md` Abschnitt 5) — seit v2.12 mit
    Zyklustag (`feedback.cycleDay`) und ungeplanten Laeufen ("Stattdessen: ...").
8. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
9. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
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
- [ ] Handy-Test v2.19.0: docs/tests/v2.19.0-handy.md (Hantel-Bildchen, Groesse am Handy beurteilen) (seit 2026-11-27)
- [ ] Gerätetest v2.17.0: docs/tests/geraetetest-plan-steigern-erinnerung.md durchklicken (seit 2026-11-18)
- [ ] Handy-Test v2.17.1: docs/tests/v2.17.1-handy.md (gestrichelter Ring, drei volle Wochen) (seit 2026-11-22)
- [ ] Je Person die letzte echte Deload-Woche eintragen (Startbildschirm, Zeile antippen, Woche in der Liste antippen), sonst steht dort "Noch keine Deload-Woche eingetragen" (seit 2026-11-22)
- [ ] Handy-Test v2.18.0: docs/tests/v2.18.0-handy.md (Deload-Wochen) (seit 2026-11-22)
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
