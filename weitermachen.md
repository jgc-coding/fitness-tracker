# Weitermachen — Stand 2026-09-22 (Autopilot-Lauf 13, Paket P13 — Plan komplett)

## Stand
- **Der Plan `docs/plan-fittrack-v2.md` ist KOMPLETT abgearbeitet (P1-P13).**
  Der Lauf war "ohne-clean": kein Push, kein Deploy, kein Tag. Live bleibt
  v1.8.1, bis Gabriel nach der Pruefung bewusst deployt (Ablauf im Plan,
  Abschnitt "Nach dem Lauf": Browser-Sichtpruefung, Bens Single-Backup,
  /deploy, Tag v2.0.0, Telegram mit Datenverlust-Warnung).
- **P13 ist umgesetzt:** Version 2.0.0, CHANGELOG, Doku.
  `package.json` steht auf `2.0.0` (Single Source of Truth, der Build zeigt
  sie im Settings-Chunk). `CHANGELOG.md` hat den 2.0.0-Block (2026-09-22):
  Features in Stichpunkten, die drei Entscheidungen (Ben frisch, Bildquelle
  free-exercise-db, Tippen+Wischen), Abschnitt "Entfernt" mit dem Hinweis,
  dass `/fitness-tracker/single/` nach dem naechsten Deploy weg ist, plus
  Technik (Dexie v4, neue Vertragstests). Die Projekt-CLAUDE.md beschreibt
  den v2-Stand als Architektur: Dateistruktur mit Schema v4/exerciseNotes,
  useExerciseNotes, UserSelectModal, MuscleMap, ExerciseDetail,
  uebungskatalog.json, uebungsBilder.js, uebungsbilder-holen und den zwei
  neuen Vertragstests; dazu fuenf neue Architektur-Punkte (Nutzerwahl
  geraete-lokal, Notiz/Zyklustag am workoutLog, exerciseNotes,
  Uebungsbilder aus dem Repo, Alternativen-Ring) — ohne Status-Woerter.
  README beschreibt die App als Drei-Personen-App mit Nutzerwahl und nennt
  die neuen Funktionen. `git grep -l "FitTrack Single" -- README.md
  CLAUDE.md` liefert keine Treffer.
- **P12:** History mit Tages-Detail: Datums-Kopfzellen antippbar
  (`openDayModal`), Tages-Modal mit Titel/Teilnehmer/Notiz/Zyklustag,
  nachtraegliches Editieren ueber `patchLog` (HistoryView, eigener
  Schreibweg — Store-Funktionen haengen am aktiven Workout), Akzent-Punkt
  an Tagen mit Notiz/Zyklustag (`metaDates`).
- **P11:** Workout-Notiz und Zyklustag im aktiven Workout (`.workout-meta`,
  `updateWorkoutNote`/`setCycleDay` im workout store; `cycleDays` immer
  flach mergen; Zyklus-Knopf nur bei aktivem Nutzer mit `zyklus: true`).
- **P10:** Schnellwechsel im Workout: Ring `[basisExerciseId,
  ...alternativen]` (`mitBasis`, `getRing`, `cycleRing`), Tipp aufs
  Wechsel-Symbol + horizontales Wischen (|dx| > 40, |dx| > 2|dy|),
  400ms-Nachklick-Schutz, Kopier-Leitplanke fuer `alternativen`.
- **P9:** Alternativen-Knopf + Auswahl-Modal im Tag-Editor (Maximum 4);
  `kopiereUebungsEintrag` an allen drei Neuaufbau-Stellen der PlanningView.
- **P8:** `ExerciseDetail.vue` (Bildwechsel 900ms, MuscleMap, Notiz je
  Nutzer via useExerciseNotes); Einstiege Tracking- und Katalog-Thumbnail.
- **P7:** `uebungsBilder.js` + Matching-Vertragstest, `imageKey` an
  Uebungen, Bild-Auswahlfeld im Katalog, Auto-Zuordnen-Knopf in Settings,
  Tracking-Thumbnail mit MuscleMap-Platzhalter.
- **P6:** `MuscleMap.vue` (18 data-muscle-Ids, Grobgruppen-Fallback) +
  `musclemap-pruefen.mjs`.
- **P5:** Bild-Manifest (30 Eintraege, 31 Aliasse), `uebungsbilder-holen.mjs`,
  60 webp im Repo, Precache.
- **P4:** Dexie v4 mit `exerciseNotes` (additiv), Sync/Backup erweitert.
- **P3:** Tracking komplett auf `activeUsers`, Layout `users-N`,
  Auto-Wechsel reihum.
- **P2:** Startdialog "Wer trainiert?" (UserSelectModal), `activeUserIds`
  (localStorage), `userIds` am workoutLog, Chip-Zeile.
- **P1:** Single-Variante komplett entfernt, drei Nutzer im Fundament.
- v1.8.1 ist weiterhin der Live-Stand (Tag `v1.8.1`).

## Offen
- **v2.0.0 pruefen und deployen (interaktive Session mit Gabriel):**
  Browser-Sichtpruefung auf frischer `*.localhost`-Adresse (Punkte siehe
  "Noch nicht probiert" unten), davor Bens Single-Backup, dann /deploy +
  Tag `v2.0.0` + Telegram mit Warnzeile — Ablauf im Plan, "Nach dem Lauf".
- **Neue Pruefskripte in `.claude\pruefen.txt` aufnehmen** (interaktive
  Session, Paket-Laeufe duerfen dort nicht schreiben):
  `node ./scripts/musclemap-pruefen.mjs` und
  `node ./scripts/uebungsbilder-matching-test.mjs`.
- **`.claude\launch.json` enthaelt noch die Konfiguration "Vite Dev Server
  (Single)"**, die auf die geloeschte `vite.single.config.js` zeigt — in
  einer interaktiven Session entfernen.
- **Zwei Ordner-Reste unter `.claude\worktrees\`** (nur Code-Kopien, private
  Datei liegt pruefsummengleich im Hauptbaum-`privat\`):
  `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\lisa-lauf-plan-anpassung-1a4d00" -Recurse -Force`
  `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\wiederholungszahl-exercise-switch-8b736b"; git -C "C:\Projekte\Fitness Tracker" branch -d claude/wiederholungszahl-exercise-switch-8b736b`
- **In Gabriels intervals.icu-Konto liegt noch keine Aktivitaet** (seit 19.07.
  nicht gelaufen); erster echter Garmin-Test mit seinem Plan-Lauf.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung** — ihr
  intervals.icu-Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.).
- **V14** (Deploy-Actions auf Node-24-faehige Versionen heben) wartet auf
  Gabriels Freigabe.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**
  (Beschreibungen in `verbesserungen.md`).

## Naechste Schritte (Claude)
1. **Sichtpruefung v2.0.0 im Browser** (frische `*.localhost`-Adresse):
   Startdialog 1/2/3 Nutzer, Karten-Layouts, Alternativen-Wechsel per Tipp,
   Detailansicht, Notiz + Zyklustag, History-Tagesmodal, Regressionscheck
   der Kernfunktionen; UI-Verifikations-Regeln der globalen CLAUDE.md
   beachten. Wisch-Geste ehrlich als "nur am Geraet testbar" ausweisen.
2. Nach Gabriels Freigabe: /deploy, Tag `v2.0.0`, Telegram-Hinweis mit
   Warnzeile zu Bens Single-App (Plan, Abschnitt "Nach dem Lauf").
3. Vorgaben nachrechnen, sobald echte Laeufe da sind (fruehestens nach dem
   ersten Garmin-Lauf): Ablauf in `docs/laufplan-vorgaben.md` Abschnitt 5.
4. Nach dem ersten Lauf den Garmin-Abgleich pruefen; bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` erweitern, dann `src/utils/runMatch.js`.
5. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
6. Meldet Gabriel die Wdh-Luecke erneut: Diagnose in die App bauen
   (Trefferzahl je Uebung/Nutzer sichtbar machen), nicht raten.
7. Probleme mit "Workout beenden"/Quick-Log: `public/sw-custom.js` und die
   Notification-Payload in `TrackingView.vue` pruefen.
8. Reiter zu eng auf Gabriels Handy: Schwelle der Label-Media-Query in
   `BottomNav.vue` anheben statt Labels kuerzen.
9. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
   ausdruecklicher Freigabe.

## Was Gabriel selbst tun muss
- [ ] **VOR dem v2-Deploy: Bens altes Single-Backup sichern** — in der alten
  Single-App auf Bens Geraet Settings -> "Backup exportieren (JSON)", Datei
  aufheben. Nach dem Deploy ist `/fitness-tracker/single/` weg. (seit 2026-09-22)
- [ ] Rueckmeldung nach dem Lauf am Handy testen (v1.6.0 ist live) (seit 2026-09-07)
  - App schliessen und neu oeffnen, sonst zeigt sie noch 1.5.0
  - Laufen, Woche: einen erledigten Lauf antippen, Wie war es? tippen, Stufe und Notiz speichern
  - Laufen, Plan: Nur Rueckmeldungen kopieren antippen und den Text in den Chat kleben
- [ ] Lisas Handy: App neu starten, damit die Tempovorgaben ankommen (seit 2026-09-09)
- [ ] Beim naechsten Training v1.8.1 am Handy pruefen (seit 2026-09-16)
  - App ganz schliessen und neu oeffnen, unter Settings steht 1.8.1
  - Karte zeigt vor dem Eintragen Gewicht x Wdh, bei allen Uebungen
  - Eine Uebung tauschen: Wiederholungen bleiben ueberall stehen
  - Rad und Empfehlungszeile starten mit genau diesen Zahlen
- [ ] Claude Rueckmeldung geben (4 Punkte, Stand 16.09.) (seit 2026-09-16)
  - Soll die Zeile Erledigt ohne Rueckmeldung im kopierten Kurztext bleiben?
  - save-state clean und ignorierte privat-Dateien: Skill anpassen?
  - V14 freigeben: Deploy-Actions auf neue Version heben?
  - Worktree-Reste dieser Sitzung loeschen? Befehle stehen in weitermachen.md

## Stolperfallen (aktuell)
- **Die neuen Architektur-Regeln stehen jetzt in der Projekt-CLAUDE.md**
  (Nutzerwahl geraete-lokal, cycleDays-Merge, exerciseNotes-Schreibweg,
  Bild-Manifest, Alternativen-Ring samt Kopier-Leitplanke und
  Wisch-Nachklick-Schutz) — dort ist der dauerhafte Ort; hier bleiben nur
  die Punkte, die (noch) nicht in die CLAUDE.md gehoeren.
- **`cycleDays` immer mergen, nie ersetzen:** `setCycleDay` (workout store)
  kopiert flach und setzt/loescht genau EINEN Schluessel. Das nachtraegliche
  Editieren in der History (P12) nutzt bewusst `patchLog` (HistoryView) statt
  der Store-Funktionen; `writeLogCycle` liest den Log vor dem Merge frisch
  aus der DB.
- **`basisExerciseId` gehoert dem Workout-Log, nie dem Plan:** der dauerhafte
  Tausch (`applySwap`) schreibt es bewusst NICHT in `day.exercises`;
  Plan-Aenderungen an Alternativen wirken erst auf das naechste Workout.
- **Touch-Listener der Karte sind `.passive`** — kein preventDefault; die
  Wisch-Schwelle (|dx| > 40 und |dx| > 2|dy|) ist Plan-Vertrag.
- **`alternativen` ist optional:** ueberall mit `(e.alternativen || [])`
  lesen; die Auswahl-Reihenfolge im Modal ist die Ring-Reihenfolge.
- **Der Bildwechsel-Timer lebt nur bei offenem Modal** (start beim Oeffnen,
  stop beim Schliessen und onUnmounted) — Muster fuer weitere Bild-Anzeigen.
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop` in
  TrackingView UND CatalogView) — bei Layout-Umbauten beibehalten.
- **`uebungsbilder-holen.mjs` ueberspringt vorhandene Dateien** — wer ein
  Foto neu holen will, loescht erst die betroffenen webp.
- **UserSelectModal uebernimmt die Auswahl NUR ueber Bestaetigen**
  (Android-Back = abbrechen) — Store nie schon beim Antippen schreiben.
- **Browser-Pane springt zwischen zwei Runden auf die Preview-Adresse
  zurueck** (`localhost:5173`): Tests als EIN `browser_batch`, der mit
  `navigate` beginnt.
- **Die Pane vergisst Testdaten:** nach Neustart der Browser-Pane ist die
  IndexedDB der `*.localhost`-Testadressen leer, Preview-Server sind beendet.
- **Dev-Server liest eine geaenderte `package.json` nicht neu:** neue Version
  im Build belegen (`dist/assets/SettingsView-*.js`).
- **Vue-Hot-Reload:** Konsolenfehler aus Editier-Zwischenstaenden (`?t=`-
  Zeitstempel); erst nach frischem Laden belastbar. Pinia-Stores haben kein
  HMR — nach Store-Aenderung Seite neu laden.
- **`requestAnimationFrame` eingefroren**, solange die Ansicht nicht sichtbar
  ist; im Dev-Build geht `__vueParentComponent.setupState`, im Produktions-
  Build nur die sichtbare Anzeige.

## Autopilot-Protokoll

### Funktioniert (mit Beleg)
- Lauf 13 / P13: Version 2.0.0, CHANGELOG, Doku — der Plan ist damit komplett.
  Beleg: alle fuenf pruefen.txt-Befehle gruen (Build meldet
  `fitness-tracker@2.0.0`, 117 Module); Regressionscheck `musclemap-pruefen`
  und `uebungsbilder-matching-test` weiter gruen. Kriterien belegt:
  `package.json` Version `2.0.0`, und `Select-String "2.0.0"` trifft im
  gebauten `dist/assets/SettingsView-*.js` (Settings zeigt die Version also
  automatisch, `__APP_VERSION__` aus package.json). CHANGELOG-Block 2.0.0
  mit Datum 2026-09-22, Features, den drei Entscheidungen (Ben frisch,
  free-exercise-db, Tippen+Wischen) und dem /single/-Hinweis unter
  "Entfernt". CLAUDE.md: Dateistruktur auf Schema v4 + alle neuen Dateien,
  fuenf neue Architektur-Punkte ohne Status-Woerter. README:
  Drei-Personen-App mit Nutzerwahl, neue Funktionen als Stichpunkte.
  `git grep -l "FitTrack Single" -- README.md CLAUDE.md` liefert keine
  Treffer (Exit ohne Ausgabe).
- Lauf 12 / P12: History mit Tages-Detail. Beleg: alle fuenf pruefen.txt-
  Befehle gruen (HistoryView-Chunk 7.68 kB JS / 4.43 kB CSS — Tages-Modal,
  Edit-Modals und Punkt-Markierung stecken drin); `.date-head` mit
  `openDayModal`, `.meta-dot` bei `metaDates.has(date)`, Schreibweg
  `patchLog` + `writeLogCycle` (frisch aus DB, flacher Merge).
- Lauf 11 / P11: Workout-Notiz und Zyklustag. Beleg: alle fuenf Befehle
  gruen; `updateWorkoutNote`/`setCycleDay` nach dem Muster
  `updateWorkoutUsers`, Merge ueber flache Kopie, Knoepfe zeigen Werte.
- Lauf 10 / P10: Schnellwechsel (Tippen + Wischen). Beleg: alle fuenf Befehle
  gruen; `mitBasis` an allen Aufbau-Stellen, `cycleRing` auf dem Tausch-Weg,
  Kopier-Leitplanke in `persistWorkoutExercises` und `applySwap`.
- Lauf 9 / P9: Alternativen in der Planung. Beleg: alle fuenf Befehle gruen;
  `kopiereUebungsEintrag` an allen drei Neuaufbau-Stellen, Maximum 4.
- Lauf 8 / P8: Uebungs-Detailansicht. Beleg: alle fuenf Befehle gruen;
  ExerciseDetail als eigener Chunk; `@click.stop` auf beiden Einstiegen.
- Lauf 7 / P7: Bilder in Karten/Katalog + Auto-Zuordnung. Beleg:
  Matching-Test gruen (31 treffen, 3 Fantasienamen nicht).
- Lauf 6 / P6: MuscleMap. Beleg: `musclemap-pruefen.mjs` 18 von 18 Ids.
- Lauf 5 / P5: Bild-Manifest + Fotos. Beleg: Skript idempotent
  (2. Lauf "0 geladen, 60 uebersprungen"), 60 webp, Precache.
- Lauf 4 / P4: Dexie v4 + exerciseNotes. Beleg: git grep Schemaeintrag,
  SYNCED, IMPORT_TABLES, exportToJSON.
- Lauf 3 / P3: Tracking fuer 1-3 aktive Nutzer. Beleg: kein
  `authStore.users` mehr in TrackingView, Klasse `users-N`.
- Lauf 2 / P2: Startdialog + activeUserIds (localStorage, Fallback
  `['user1','user2']`), userIds am workoutLog, Chip-Zeile.
- Lauf 1 / P1: Single-Variante entfernt (Kriterien-Greps ohne Treffer).

### Fehlversuche (mit exaktem Grund)
- Lauf 13: eine PowerShell-Zeile `git grep ...; "Exit=$LASTEXITCODE"` wurde
  von der Sandbox als expandierbarer String verweigert — der `git grep`
  allein (ohne Exit-Code-Anhang) lief dann durch und ist als Beleg
  ausreichend (keine Ausgabe = keine Treffer).
- Lauf 12: keine.
- Lauf 11: keine.
- Lauf 10: keine.
- Lauf 9: keine.
- Lauf 8: keine.
- Lauf 7: keine.
- Lauf 6: keine.
- Lauf 5: keine.
- Lauf 4: PowerShell-Kette `Copy-Item ...; node --check ...; if ($?)` von der
  Sandbox als Mehrfach-Operation verweigert — Kopie per Write-Tool,
  `node --check` einzeln.
- Lauf 3: keine.
- Lauf 2: keine.
- Lauf 1: `git grep` mit `cd` davor bzw. mit `echo "rc=$?"`-Kette verweigert —
  jeden `git grep` einzeln und ohne `cd`.

### Noch nicht probiert
- Sichtpruefung der GESAMTEN v2 im Browser auf frischer `*.localhost`-Adresse
  (interaktive Session vor dem Deploy): Startdialog 1/2/3 Nutzer und
  Chip-Zeile (P2/P3), Thumbnails/MuscleMap/Auto-Zuordnung und die 60 Fotos
  (P5-P7), Detailansicht mit Bildwechsel und Notiz-Speicherung gegen echte
  IndexedDB (P8), Alternativen-Modal und Erhalt beim Plan-Editieren (P9),
  Ring-Wechsel per Tipp (P10), Notiz/Zyklustag speichern + Resume (P11),
  Tages-Modal mit nachtraeglichem Editieren (P12), Settings zeigt 2.0.0
  (P13). Alles bislang nur durch Build + Vertragstests + Code-Weg belegt.
- Die Wisch-Geste (P10) ist nur am echten Geraet testbar — steht auf der
  Handy-Checkliste des Plans ("Nach dem Lauf", Punkt 4).
- Der Knopf "Bilder automatisch zuordnen" lief noch nie gegen eine echte
  IndexedDB mit den 31 Katalog-Uebungen.
- `.claude\launch.json` und `.claude\pruefen.txt` bereinigen/erweitern
  (Schreiben unter `.claude\` ist dem Paket-Lauf verboten — interaktive
  Session noetig; pruefen.txt soll die zwei neuen Vertragstests aufnehmen).
