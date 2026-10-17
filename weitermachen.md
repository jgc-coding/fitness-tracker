# Weitermachen — Stand 2026-10-17 (v2.14.1)

## Stand
- **Nachtrag 17.10.: v2.14.1** — Pro Seite und Gesamt drehen beim Ziehen
  live im Verhaeltnis 2:1 mit (Gabriel: "funktioniert alles super", dann
  dieser Wunsch). Headless-Test 43 Pruefungen gruen, darunter Versatz
  mitten im Ziehen und schneller Wisch. Der 40-kg-Satz `mnugry3zavcbnmc`
  ist auf Gabriels Wort geloescht (Merker `setLogs:mnugry3zavcbnmc`,
  Sicherung `privat\cloud-sicherung-satz-mnugry3zavcbnmc-*.json`); ein
  erneuter Umrechnungs-Lauf braucht darum kein `--ohne` mehr.
- **Diese Sitzung (17.10.): v2.14.0, live** (Actions-Lauf 39055268751 gruen,
  Live-Bundle traegt 2.14.0, Tag `v2.14.0` auf `d725233`). Auftrag Gabriel:
  (1) "Rueckgaengig" 5 s nach jedem Speichern (er hatte im Reiter einer
  anderen Person gespeichert); (2) Rad "Pro Seite | Gesamt | Reps" bei
  Langhantel und den Scheiben-Maschinen chest press, incline chest press,
  shoulder press (Merker `proSeite`, Haken im Katalog). Gesamt = Scheiben
  ohne Stange (Gabriels Entscheidung). (3) user1 hatte immer pro Seite
  notiert: 20 Saetze in der Cloud verdoppelt, 3 Maschinen markiert
  (`gewicht-pro-seite-umrechnen.mjs`, Sicherung
  `privat\cloud-sicherung-pro-seite-2026-10-17T17-46-12-256Z.json`, zweiter
  Lauf: "Alles schon erledigt"). Ausgenommen: Bankdruecken 40 kg vom 08.04.
  (`mnugry3zavcbnmc`) — laut Gabriel ein falscher Wert, nie gedrueckt;
  danach auf sein Wort geloescht (siehe Nachtrag oben).
- **Geprueft:** Gate gruen (17 Befehle, neu `gewicht-pro-seite-test.mjs`).
  Headless-Chrome gegen den Produktions-Build, frische `*.localhost`, 360 px,
  Testdaten per Backup-Import: 37 Pruefungen gruen (Raeder gekoppelt,
  29,375 exakt, Rueckgaengig fuer neuen und ueberschriebenen Satz samt
  Tombstone, Leiste ueber der Navigation, Katalog-Haken, keine
  Konsolenfehler). Nicht geprueft: echtes Handy, Sync zwischen zwei Handys.
  Testskript `pro-seite-test.mjs` lag im Scratchpad dieser Sitzung.
- **Vorige Sitzung (08./09.10.): v2.13.0, live** (Actions-Lauf 37887792158
  gruen, Live-Seite liefert 2.13.0 und die drei neuen Bilder, Tag
  `v2.13.0` auf `e6e555d`). Auftrag von Gabriel: neue Uebung "Bizeps
  Machine" (Scheiben-Maschine, zwei Fotos von ihm), Bild per ChatGPT im
  gleichen Stil. Standardliste (Arme, `machine_weight`), Manifest-Key
  `biceps-curl-machine` (Bizeps primaer, Unterarme sekundaer, Aliasse wie
  "Bizeps Maschine"), Quellbild `neu-16.webp`, Vorschau in der Endhaltung.
  Bild-Vertrag zuerst auf 37 erweitert. Die Cloud kannte die Uebung vorher
  nicht (`uebungen-cloud.mjs`, nur lesend).
- **Bild:** ChatGPT in Gabriels Chrome, Chat "Create Fitness Illustration".
  Drei Auftraege: zweimal hing die Scheibe in START und ENDE an
  verschiedenen Teilen; "END unveraendert, START angleichen" half. Gabriel
  hat das Bild freigegeben. Bekannte Schwaeche: der Fuss der Maschine ist
  im ENDE etwas laenger und erscheint in der Ueberblendung kurz doppelt.
- **Geprueft:** Gate gruen (16 Befehle). Headless-Chrome gegen den
  Produktions-Build, frische `*.localhost`-Adresse, 360 px, Testdaten per
  Backup-Import: 17 Pruefungen gruen (Zuordnen, Katalog, Detail mit
  Ueberblendung, Muskelgrafik, "+ Neu"-Auswahl, keine Konsolenfehler).
  Nicht geprueft: "Standard-Uebungen laden" gegen die echte Cloud, Handy.
- **Rueckkehrpunkte:** `e6e555d` (v2.13.0), `1799e4f` (vor dieser Sitzung,
  v2.12.0), `8eaa3de` (v2.11.0), `6deda0f` (v2.10.0), `e9c2a67` (v2.9.2),
  `01031c1` (v2.6.0). Datenbank-Schema seit v2.x unveraendert (Dexie v4).
  Cloud-Sicherungen der Uebungs- und Log-Korrekturen liegen in `privat\`.
  impeccable auf 4.3.1 (Claude-Skills-Commit `d45f982`, nicht gepusht);
  `PRODUCT.md` steht noch im Schema von 3.5.0.
- **Worktrees:** der dieser Sitzung (`add-bizeps-machine-exercise-8f0f28`,
  sauber, auf master gemergt) und ein LEERER Ordner
  `.claude\worktrees\exercise-images-crop-e10a06` (gitignoriert, harmlos).

## Stolperfallen (aktuell)
- **ChatGPT-Konto steht auf dem Gratis-Tarif** (09.10., vorher Plus): drei
  Bilder am Stueck gingen durch, danach Werbung fuer Plus. Bei mehr
  Auftraegen kann ein Tageslimit kommen.
- **Headless-Chrome aus Claude heraus:** Profilordner NICHT unter AppData
  (die App-Kapsel virtualisiert ihn, IndexedDB scheitert mit "backing store"),
  ohne `--incognito`. Erprobt: `C:\Users\chime\fittrack-testprofil-<zeit>`,
  danach loeschen. Testdaten per `DOM.setFileInputFiles` auf das Backup-Feld
  in Settings; Navigation per `__vue_app__...$router.push`. Testskripte liegen
  im Scratchpad der Sitzungen (nicht im Repo), zuletzt `bizeps-test.mjs`
  unter `%LOCALAPPDATA%\Temp\claude\C--Projekte-Fitness-Tracker--claude-worktrees-add-bizeps-machine-exercise-8f0f28\171ff0a4-...\scratchpad\`.
  Jedes "Fenster zu" als Pruefung werten — ein still offenes Blatt verdeckte
  sonst zwei Fehler.
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
00. **Meldet Gabriel Probleme aus v2.14.0** (Checkliste
   `docs/tests/v2.14.0-handy.md`): Regeln zuerst in
   `scripts/gewicht-pro-seite-test.mjs` bzw. `saetze-test.mjs`
   (`rueckgaengigSchritt`), Oberflaeche in `TrackingView.vue`
   (`zeigeRueckgaengig`, `macheRueckgaengig`, Raeder in `.wheels-row`).
   Hat user1 nach dem 16.10. noch auf einer alten Version pro Seite
   eingetragen: nur diese Saetze mit `--bis` UND `--ohne` gezielt umrechnen,
   nie blind erneut. Rueckweg: `--zurueck --jetzt`.
0. **Meldet Gabriel Probleme aus v2.13.0** (Checkliste
   `docs/tests/v2.13.0-handy.md`): Fehlt die Uebung, mit `uebungen-cloud.mjs`
   den Cloud-Bestand lesen (doppelt? fehlt?). Stoert der doppelte Fuss: ein
   vierter Auftrag im Chat "Create Fitness Illustration" ("keep START, make
   the base frame in END identical"), neu messen, `neu-17`, Vertrag zuerst.
1. **Meldet Gabriel Probleme aus v2.12.0** (Checkliste
   `docs/tests/v2.12.0-handy.md`): Regeln zuerst in
   `scripts/laufeintrag-test.mjs` bzw. `zyklustag-test.mjs`, Oberflaeche in
   `RunSpontanForm.vue`, `ZyklusTagFeld.vue`, `RunSessionSheet.vue`.
2. **Meldet Gabriel Probleme aus v2.11.0** (Checkliste
   `docs/tests/v2.11.0-handy.md`): Ziehen in `onTagZiehStart`/`onTagBewegung`
   (`PlanningView.vue`), Regeln zuerst im Vertrag
   `scripts/planreihenfolge-test.mjs`.
3. **Meldet Gabriel Probleme aus v2.10.0** (Checkliste
   `docs/tests/v2.10.0-handy.md`): Wechsel in `wechsleKarte`/`onCardTouchEnd`
   (`TrackingView.vue`), Regeln zuerst im Ring-Vertrag. Zeigt ein Handy
   "Person 1": Sync angemeldet? `meta/userName_*` per REST pruefen.
4. **V15-Rest (Git-Historie)** nur nach Gabriels Entscheidung, siehe
   `verbesserungen.md`.
5. **Fruehere Versionen:** v2.9 1RM in `utils/verlauf.js`; v2.8.1
   `utils/trainingGeraet.js`; v2.8 `UebungsVerlauf.vue`; v2.7
   `StartNutzerwahl.vue`, `resetActiveUsers`; v2.4 Tastatur `Modal.vue`,
   Saetze `scripts/saetze-test.mjs`; Quick-Log `buildNotificationQuickLog`,
   `public/sw-custom.js`; v2.5 `PlanningView.vue`; v2.6 Bilder nach
   `docs/uebungsbilder-chatgpt.md`. Neue Uebungen: zuerst `uebungen-cloud.mjs`.
6. **Weitere Bilder nur auf Zuruf** (Kandidaten: Kurzhantel- und
   Schraegbank-Kurzhantel-Druecken); Herunterladen nur mit Gabriels Ja.
7. **Vorgaben nachrechnen, sobald echte Laeufe da sind:** Ablauf in
   `docs/laufplan-vorgaben.md` Abschnitt 5; Garmin-Abgleich zuerst in
   `scripts/runmatch-test.mjs`.
8. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5) — seit v2.12 mit
   Zyklustag (`feedback.cycleDay`) und ungeplanten Laeufen ("Stattdessen: ...").
9. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
10. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
    ausdruecklicher Freigabe.

## Offen
- **Im intervals.icu-Konto von user2 liegt noch keine Aktivitaet** (seit
  19.07.); erster echter Garmin-Test mit einem Plan-Lauf.
- **Der erste Lauf von user1 ist der eigentliche Test der Garmin-Anbindung**
  — das Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.). Seit
  v2.12 auch: ein spontaner Lauf, den die Uhr dem geplanten zuordnet, laesst
  sich per "Anders gelaufen" umhaengen (nur im Test mit Testdaten belegt).
- **Erster Deploy nach dem 19.10.2026** laeuft auf Ubuntu 26
  (`ubuntu-latest`, Actions warnt schon): Lauf dann ansehen; bricht er,
  `runs-on` in `.github/workflows/deploy.yml` voruebergehend auf
  `ubuntu-24.04` setzen.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I8**,
  **I9** — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
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
