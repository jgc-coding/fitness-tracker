# Weitermachen — Stand 2026-11-18 (v2.17.0)

## Stand

- Letzte Abnahme (Autopilot): 18.11.2026, 07:31 Uhr · `docs/plan-steigern-erinnerung.md` · Nachabnahme sauber · Tests: pruefen.txt 18 Vertragstests grün (steigerung-test 114 Fälle) · npm run build grün · v217-test 50/50 grün · v216-test 28/28 grün · v215-regress 57/57 grün
- **v2.17.0 Steigern-Erinnerung** per Autopilot gebaut (P1-P5 am 18.11.
  07:01-07:19, Abnahme fand V18, Reparatur R1, Nachabnahme sauber). Regeln
  in der CLAUDE.md ("Steigern-Erinnerung"), Aenderungen im CHANGELOG.
- **Live (save-state clean, 18.11.):** Gate erneut gruen (19 Befehle),
  master `d258e58` = origin, Actions-Lauf 44251992031 gruen, Live-Seite
  liefert 2.17.0 aus (SettingsView-Chunk geprueft). Git-Tag `v2.17.0`
  auf `d258e58` gesetzt und gepusht (18.11.).
- **Rueckkehrpunkte:** `d258e58` (v2.17.0, vor dem clean-Lauf; nichts
  gemergt), `719fb82` (v2.16.0), `c125c34` (v2.15.0), `460ba37` (v2.14.1),
  `d725233` (v2.14.0), `e6e555d` (v2.13.0), `1799e4f` (v2.12.0), `8eaa3de`
  (v2.11.0), `6deda0f` (v2.10.0), `01031c1` (v2.6.0). Datenbank-Schema seit
  v2.x unveraendert (Dexie v4); v2.17.0 nutzt nur neue `db.meta`-Schluessel
  (`steigernErinnerung_<userId>`, `wdhBereich_<userId>_<exerciseId>`).
  Cloud-Sicherungen in `privat\`.
- **Wdh-Bereich-Startwerte in der Cloud (18.11., 07:39):** 14 Bereiche per
  `wdh-bereiche.mjs --jetzt` geschrieben (Gabriels Freigabe), Nachkontrolle
  bestanden. Sicherung vorher:
  `privat\cloud-sicherung-meta-2026-11-18T07-39-23-795Z.json`.
- **Row-Korrektur in der Cloud (22.11., Gabriels Auftrag):** 18 Saetze von
  user1 (13.10.-16.11.) von "low row" auf "cable row (without chest support)"
  umgehaengt — der gemeinsame Stern stand dort auf Low Row, die Karte startete
  so jede Woche falsch. Stern des Row-Platzes im Pull-Tag jetzt fuer alle auf
  Cable Row. Saetze anderer Personen unberuehrt, Nachkontrolle bestanden.
  Sicherung: `privat\cloud-sicherung-row-umhaengen-2026-11-22T11-27-44-187Z.json`.
- **Worktrees:** `add-bizeps-machine-exercise-8f0f28` und
  `fittrack-workout-save-cycle-3a5977` (beide sauber, gemergt) und ein
  LEERER Ordner `.claude\worktrees\exercise-images-crop-e10a06`
  (gitignoriert, harmlos). Befehle zum Entfernen im save-state-Bericht.

## Stolperfallen (aktuell)
- **Browser-Tests liegen in `privat\browsertests\`** (gitignoriert, nur im
  Hauptbaum): `v217-test.mjs` (Steigern-Erinnerung), `v216-test.mjs`
  (Zyklus), `v215-regress.mjs`. `v217-test` brach zweimal bei
  "[Einstellung] Zeitueberschreitung: Aus aktiv" ab, der naechste Lauf war
  gruen — vermutlich Wettlauf zwischen Tipp und Laden der Einstellungen;
  einfach erneut laufen lassen.
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
- [ ] Gerätetest v2.17.0: docs/tests/geraetetest-plan-steigern-erinnerung.md durchklicken (seit 2026-11-18)
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
