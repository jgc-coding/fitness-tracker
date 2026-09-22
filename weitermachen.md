# Weitermachen — Stand 2026-09-22 (Autopilot-Lauf 11, Paket P11)

## Stand
- **Autopilot arbeitet `docs/plan-fittrack-v2.md` ab (v2.0.0, ohne-clean: kein
  Push, kein Deploy).** Live bleibt v1.8.1, bis Gabriel nach der Pruefung bewusst
  deployt. P1-P11 sind umgesetzt, als naechstes P12.
- **P11 ist umgesetzt:** Workout-Notiz und Zyklustag. Im aktiven Workout steht
  unter dem Kopf (Titel/Datum) die Zeile `.workout-meta` mit Knopf "Notiz"
  (immer) und Knopf "Zyklustag" (nur wenn ein aktiver Nutzer `zyklus: true`
  traegt — `zyklusUser`-Computed, laut constants.js nur Lisa). Vorhandene
  Werte sind am Knopf erkennbar ("Notiz ✓" / "Zyklustag 17"). Das Notiz-Modal
  hat ein Textfeld, Speichern ruft `updateWorkoutNote` (workout store):
  `note` + updatedAt per db.workoutLogs.update, danach pushRecord mit dem
  vollen Datensatz. Das Zyklus-Modal nutzt den bestehenden WheelPicker mit
  Werten 1-45 plus separatem Entfernen-Knopf; beide Wege laufen ueber
  `setCycleDay(userId, day)`: `cycleDays` wird als flache Kopie GEMERGT
  (day = null loescht nur den einen Schluessel), nie ersetzt. Beide Felder
  sind additiv — gelesen wird ueberall mit Fallback (`?.note || ''`,
  `?.cycleDays`), alte workoutLogs bleiben gueltig; Resume laedt das Log aus
  der DB, damit ueberleben Notiz und Zyklustag den Reload.
- **P10:** Schnellwechsel im Workout (TrackingView). Beim Aufbau
  der Workout-Liste (`startWorkout`, `startCustom`, beide Resume-Zweige) laeuft
  jeder Eintrag durch den Helfer `mitBasis`
  (`{ ...e, basisExerciseId: e.basisExerciseId || e.exerciseId }`) — Override/
  Resume behalten gespeicherte Werte, Quick-Add und Custom-Picker setzen die
  Basis direkt. Der Wechsel-Ring ist `getRing(entry)` =
  `[basisExerciseId, ...alternativen]`; Karten mit Ring-Laenge > 1 zeigen in
  der Namenszeile einen Ring-Knopf (horizontales Pfeil-Icon) mit Punktreihe
  darunter (ein Punkt je Position, aktiver Punkt in Akzentfarbe; nach freiem
  Tausch ausserhalb des Rings liefert `getRingIndex` -1 und kein Punkt ist
  aktiv). Tipp auf den Knopf und horizontales Wischen auf der Karte
  (|dx| > 40 px und |dx| > 2|dy|, passive Touch-Listener, links = vor,
  rechts = zurueck) rufen `cycleRing`: setzt `exerciseId` (ausserhalb des
  Rings: Sprung zur Basis), dann `persistWorkoutExercises`,
  `loadRecommendations`, `updateNotification` — derselbe Weg wie beim
  bestehenden Tausch, dessen Modal unveraendert bleibt. Ein
  Nachklick-Schutz (Zeitstempel `letzterWischUm`, 400 ms) faengt das click,
  das manche WebViews nach einem Wisch noch feuern, in allen Klick-Zielen der
  Karte ab (Rad, Detail, Tausch, Steigern, Ring-Knopf).
  Kopier-Leitplanke umgesetzt: `persistWorkoutExercises` (workout store) und
  der dauerhafte Tausch in `applySwap` kopieren `alternativen` als frisches
  Array (`[...(e.alternativen || [])]`) — sonst DataCloneError, seit P9 dort
  latent.
- **P9:** Alternativen-Knopf + Auswahl-Modal im Tag-Editor der PlanningView
  (Maximum 4, Basis nicht waehlbar); `alternativen` am Eintrag in
  `day.exercises`; `kopiereUebungsEintrag` an allen drei Neuaufbau-Stellen.
- **P8:** `src/components/tracking/ExerciseDetail.vue` (Detail-Modal:
  Bildwechsel 900ms, MuscleMap, gemeinsame Notiz, Notizfeld je Nutzer ueber
  useExerciseNotes, Speichern per Knopf UND beim Schliessen); Einstieg 1
  Tracking-Thumbnail (`@click.stop`), Einstieg 2 Katalog-Zeilen-Thumbnail.
- **P7:** `src/utils/uebungsBilder.js` (reine Funktionen, Manifest als
  Parameter), Vertragstest `scripts/uebungsbilder-matching-test.mjs` gruen;
  `imageKey` an Uebungen, Bild-Auswahlfeld im Katalog, SettingsView-Knopf
  "Bilder automatisch zuordnen", 40px-Thumbnail auf der Tracking-Karte.
- **P6:** `src/components/shared/MuscleMap.vue` (Inline-SVG, 18
  data-muscle-Ids, Grobgruppen-Fallback); `scripts/musclemap-pruefen.mjs` gruen.
- **P5:** `src/data/uebungskatalog.json` (30 Eintraege, 31 Aliasse),
  `scripts/uebungsbilder-holen.mjs`, 60 Fotos, globPatterns mit webp.
- **P4:** Dexie v4 mit `exerciseNotes` (additiv), `useExerciseNotes`,
  Tabelle in SYNCED/IMPORT_TABLES/exportToJSON.
- **P3:** TrackingView komplett auf `authStore.activeUsers`, Layout-Klasse
  `users-N`, Auto-Wechsel reihum, `preferredUserId` steuert Vorauswahl.
- **P2:** Startdialog "Wer trainiert?" (UserSelectModal), `activeUserIds` im
  auth store (localStorage), `userIds` am workoutLog, Chip-Zeile im Tracking.
- **P1:** Single-Variante komplett entfernt, drei Nutzer im Fundament.
- v1.8.1 ist weiterhin der Live-Stand (Tag `v1.8.1`, Details siehe CHANGELOG).

## Offen
- **Pakete P12-P13 des Plans** (`docs/plan-fittrack-v2.md`) — naechster
  Autopilot-Lauf macht bei P12 weiter (History mit Tages-Detail).
- **Neue Pruefskripte in `.claude\pruefen.txt` aufnehmen** (interaktive
  Session, Paket-Laeufe duerfen dort nicht schreiben):
  `node ./scripts/musclemap-pruefen.mjs` und
  `node ./scripts/uebungsbilder-matching-test.mjs`.
- **`.claude\launch.json` enthaelt noch die Konfiguration "Vite Dev Server
  (Single)"**, die auf die geloeschte `vite.single.config.js` zeigt. Ein
  Paket-Lauf darf unter `.claude\` nicht schreiben — bitte in einer
  interaktiven Session entfernen.
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
1. **Autopilot P12**: History mit Tages-Detail (antippbare Datums-Kopfzellen,
   Tages-Modal mit Titel/Teilnehmern/Notiz/Zyklustag, dort nachtraeglich
   editierbar mit denselben Bausteinen wie P11, Punkt-Markierung an Zellen
   mit Notiz oder Zyklustag — Kriterien im Plan).
2. Vorgaben nachrechnen, sobald echte Laeufe da sind (fruehestens nach dem
   ersten Garmin-Lauf): Ablauf in `docs/laufplan-vorgaben.md` Abschnitt 5.
3. Nach dem ersten Lauf den Garmin-Abgleich pruefen; bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` erweitern, dann `src/utils/runMatch.js`.
4. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
5. Meldet Gabriel die Wdh-Luecke erneut: Diagnose in die App bauen
   (Trefferzahl je Uebung/Nutzer sichtbar machen), nicht raten.
6. Probleme mit "Workout beenden"/Quick-Log: `public/sw-custom.js` und die
   Notification-Payload in `TrackingView.vue` pruefen.
7. Reiter zu eng auf Gabriels Handy: Schwelle der Label-Media-Query in
   `BottomNav.vue` anheben statt Labels kuerzen.
8. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
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
- **`cycleDays` immer mergen, nie ersetzen:** `setCycleDay` (workout store)
  kopiert das Objekt flach (`{ ...(aw.cycleDays || {}) }`), setzt oder loescht
  genau EINEN Schluessel und schreibt dann das Ganze. Wer direkt
  `{ cycleDays: { user1: n } }` patcht, wirft die Eintraege anderer Nutzer weg.
  `note` und `cycleDays` sind additiv — ueberall mit Fallback lesen
  (`?.note || ''`), alte workoutLogs haben die Felder nicht. P12 nutzt fuer
  das nachtraegliche Editieren dieselben Store-Funktionen NICHT (die haengen
  am aktiven Workout) — dort ist `db.workoutLogs.update` + pushRecord auf
  beliebige Log-Ids gefragt.
- **`basisExerciseId` gehoert dem Workout-Log, nie dem Plan:** `mitBasis`
  (TrackingView) setzt es nur in `workoutExercises`; der dauerhafte Tausch
  (`applySwap`) schreibt es bewusst NICHT in `day.exercises`. Der Ring liest
  `alternativen` aus dem Workout-Eintrag (beim Start aus dem Plan kopiert) —
  Plan-Aenderungen an Alternativen wirken erst auf das naechste Workout.
- **Wisch-Nachklick-Schutz nicht entfernen:** nach einem horizontalen Wisch
  feuern manche WebViews noch ein click aufs Element unterm Finger.
  `istWischNachklick()` (400 ms nach `letzterWischUm`) sitzt in
  `openExerciseInput`, `openExerciseDetail`, `openSwap`, `toggleIncrease` und
  `tapRing`. Der Zeitstempel wird bei JEDEM erkannten Horizontal-Wisch
  gesetzt, auch ohne Alternativen — so oeffnet ein Wisch auf einer Karte ohne
  Ring nichts aus Versehen.
- **Touch-Listener der Karte sind `.passive`** — kein preventDefault, damit
  vertikales Scrollen fluessig bleibt. Die Wisch-Schwelle (|dx| > 40 und
  |dx| > 2|dy|) steht im Plan-Kriterium; wer sie aendert, aendert den Vertrag.
- **Uebungslisten-Persistenz braucht tiefe Kopien:** `persistWorkoutExercises`
  (workout store) und der dauerhafte Tausch in `applySwap` kopieren
  `alternativen` als frisches Array
  (`{ ...e, alternativen: [...(e.alternativen || [])] }`) — ein reaktives
  Vue-Proxy-Array im Eintrag sprengt Dexie mit DataCloneError.
- **Uebungslisten in der Planung NUR ueber `kopiereUebungsEintrag` neu bauen**
  (PlanningView): der Helfer kopiert generisch ALLE Felder plus `alternativen`
  als frisches Array. Wer wieder Felder hart aufzaehlt
  (`{ exerciseId, sets, notes }`), verliert still die Alternativen — genau das
  war der Zustand vor P9.
- **`alternativen` ist optional:** alte Eintraege haben das Feld nicht, ueberall
  mit `(e.alternativen || [])` lesen. Neue Picker-Eintraege bekommen `[]`.
  Die Auswahl-Reihenfolge im Modal ist die Ring-Reihenfolge.
- **ExerciseDetail speichert Notizen auch beim Schliessen** (watch auf
  modelValue false ruft speichereGeaenderte). Wer das Modal umbaut, darf diesen
  Pfad nicht entfernen — sonst gehen Eingaben verloren, wenn jemand nur per
  Android-Back schliesst. Geschrieben wird NUR bei Aenderung gegen den
  geladenen Stand; ein exerciseNotes-Datensatz wird nie geloescht (Leeren =
  text '', sonst braeuchte es Tombstones).
- **Der Bildwechsel-Timer lebt nur bei offenem Modal:** startBildwechsel beim
  Oeffnen, stop beim Schliessen und onUnmounted. Wer weitere Bild-Anzeigen
  baut, uebernimmt das Muster (sonst tickt ein setInterval ewig weiter).
- **Thumbnail-Tipps stoppen die Weiterleitung:** `.exercise-thumb` traegt in
  TrackingView UND CatalogView `@click.stop` — ohne das oeffnet der Tipp
  zusaetzlich Rad bzw. Bearbeiten-Formular. Bei Layout-Umbauten beibehalten.
- **uebungsBilder.js importiert das Manifest NICHT selbst** — Funktionen nehmen
  den Katalog als Parameter; Views legen `import bildKatalog from
  '../data/uebungskatalog.json'` daneben. Matching-Vertrag ist
  `scripts/uebungsbilder-matching-test.mjs` — zuerst Test, dann Regeln.
- **`imageKey` nie als `undefined` schreiben** (Firestore lehnt undefined ab) —
  addExercise setzt `imageKey: null` als Default, Formulare geben `wert || null`
  weiter.
- **`fallbackGroup` der MuscleMap erwartet Grobgruppen-Ids aus `constants.js`**;
  sind `primary`/`secondary` gesetzt (auch nur eins), wird `fallbackGroup`
  komplett ignoriert. `full_body` faerbt bewusst nur hell.
- **Das Bild-Manifest ist ein Top-Level-Array**; `primaer`/`sekundaer` sind
  Arrays und passen direkt auf die MuscleMap-Props. Aliasse stehen klein, aber
  mit Doppelpunkt/Klammern — das Matching normalisiert beide Seiten.
- **`uebungsbilder-holen.mjs` ueberspringt vorhandene Dateien** — wer ein Foto
  neu holen will, loescht erst die betroffenen webp.
- **Notizen je Nutzer laufen NUR ueber `useExerciseNotes`** (deterministische
  Id, pushRecord, Leeren = text '').
- **Es gibt keine `single/`-Kopie mehr** — kein cp, kein check:drift.
- **TrackingView kennt im Workout nur aktive Nutzer** (`activeUsers`,
  Vorauswahl ueber `preferredUserId`); `authStore.users` (alle drei) gehoert in
  History/Settings — und in die Notizfelder der ExerciseDetail (Absicht:
  Notizen gibt es fuer alle, auch wer heute nicht trainiert).
- **UserSelectModal uebernimmt die Auswahl NUR ueber Bestaetigen** (Android-Back
  = abbrechen) — Store nie schon beim Antippen schreiben.
- **Browser-Pane springt zwischen zwei Runden auf die Preview-Adresse zurueck**
  (`localhost:5173`): Tests als EIN `browser_batch`, der mit `navigate` beginnt.
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
- Lauf 11 / P11: Workout-Notiz und Zyklustag. Beleg: alle fuenf pruefen.txt-
  Befehle gruen (Build 117 Module, TrackingView-Chunk waechst von ~29.7 auf
  32.16 kB — Meta-Zeile, zwei Modals und die Draft-Logik stecken drin);
  Regressionscheck `musclemap-pruefen` und `uebungsbilder-matching-test`
  weiter gruen. Im Code belegt: `updateWorkoutNote` und `setCycleDay` im
  workout store folgen exakt dem Muster von `updateWorkoutUsers` (update mit
  updatedAt, activeWorkout nachziehen, pushRecord mit vollem Datensatz);
  `setCycleDay` mergt `cycleDays` ueber eine flache Kopie und loescht bei
  day = null nur den einen Schluessel; die Knoepfe zeigen vorhandene Werte
  ("Notiz ✓" via `workoutNote`-Computed, "Zyklustag N" via
  `currentCycleDay`); der Zyklus-Knopf haengt an `zyklusUser`
  (aktiver Nutzer mit `zyklus: true`); das Zyklus-Modal nutzt den
  bestehenden WheelPicker (Werte 1-45 aus `cycleValues`) plus separatem
  Entfernen-Knopf.
- Lauf 10 / P10: Schnellwechsel im Workout (Tippen + Wischen). Beleg: alle
  fuenf pruefen.txt-Befehle gruen (Build 117 Module, TrackingView-Chunk
  waechst von ~27.5 auf 29.68 kB — Ring-Logik und Wisch-Erkennung stecken
  drin); Regressionscheck `musclemap-pruefen` und
  `uebungsbilder-matching-test` weiter gruen. Im Code belegt: `mitBasis` an
  allen vier Listen-Aufbau-Stellen plus Quick-Add/Custom-Picker mit direkter
  Basis; `cycleRing` nutzt exakt den Tausch-Weg (persistWorkoutExercises ->
  loadRecommendations -> updateNotification); `persistWorkoutExercises` und
  `applySwap` kopieren `alternativen` als frisches Array (Leitplanke aus dem
  Plan); Ring-Knopf mit Punktreihe nur bei `getRing(...).length > 1`;
  `getRingIndex` -1 nach freiem Tausch -> kein aktiver Punkt, naechster
  Wechsel springt zu `ring[0]` (Basis).
- Lauf 9 / P9: Alternativen in der Planung. Beleg: alle fuenf pruefen.txt-
  Befehle gruen (Build 117 Module, PlanningView-Chunk waechst von ~10 auf
  13.81 kB — Modal und Logik stecken drin); zusaetzlich
  `node ./scripts/musclemap-pruefen.mjs` und
  `node ./scripts/uebungsbilder-matching-test.mjs` weiter gruen
  (Regressionscheck). Im Code belegt: `kopiereUebungsEintrag` wird an allen
  drei Neuaufbau-Stellen (`finishPicker`, `removeExerciseFromDay`,
  `updateExerciseSets`) und beim Alternativen-Speichern (`finishAltPicker`)
  benutzt; hartes Maximum 4 sitzt in `toggleAlternative`
  (`MAX_ALTERNATIVEN`), der Hinweis in der `alt-hint`-Zeile des Modals.
- Lauf 8 / P8: Uebungs-Detailansicht mit Notizen je Nutzer. Beleg: alle fuenf
  pruefen.txt-Befehle gruen; ExerciseDetail als eigener Chunk; `@click.stop`
  auf beiden Thumbnail-Einstiegen.
- Lauf 7 / P7: Bilder in Karten und Katalog, automatische Zuordnung. Beleg:
  Matching-Test gruen (31 Katalognamen treffen, 3 Fantasienamen nicht),
  Build mit eigenem Chunk `uebungskatalog-*.js`.
- Lauf 6 / P6: MuscleMap. Beleg: `musclemap-pruefen.mjs` meldet 18 von 18 Ids,
  Grobgruppen-Tabelle konsistent, alles gruen; kompiliert fehlerfrei
  (@vue/compiler-sfc-Probe).
- Lauf 5 / P5: Bild-Manifest, Foto-Download, Precache. Beleg: Download-Skript
  idempotent (2. Lauf "0 geladen, 60 uebersprungen"), 60 webp im Repo,
  `dist/sw.js` precacht alle Fotos.
- Lauf 4 / P4: Dexie v4 mit exerciseNotes, Sync und Backup erweitert. Beleg:
  git grep zeigt Schemaeintrag, SYNCED, IMPORT_TABLES, exportToJSON;
  Composable syntaxgeprueft.
- Lauf 3 / P3: Tracking fuer 1-3 aktive Nutzer. Beleg: kein `authStore.users`
  mehr in TrackingView, Klasse `users-N`, Auto-Wechsel reihum.
- Lauf 2 / P2: Startdialog + activeUserIds im Store (localStorage, Fallback
  `['user1','user2']`), userIds am workoutLog, Chip-Zeile.
- Lauf 1 / P1: Single-Variante entfernt (Kriterien-Greps ohne Treffer);
  Loeschen per `Remove-Item` statt `git rm` (schreibende git-Befehle verboten).

### Fehlversuche (mit exaktem Grund)
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
- Funktionstest von Notiz und Zyklustag gegen eine echte IndexedDB (Speichern,
  erneutes Oeffnen, Resume nach Reload, Entfernen des Zyklustags, Sync-Push) —
  P11 ist durch Build + Code-Weg belegt; gehoert in die interaktive
  Sichtpruefung vor dem Deploy auf einer frischen `*.localhost`-Adresse.
- Die Wisch-Geste selbst ist im Lauf nicht ausfuehrbar (Touch-Events brauchen
  ein echtes Geraet oder eine Browser-Pane mit Touch-Emulation) — P10 ist
  durch Build + Code-Weg belegt; Wischen gehoert auf die Handy-Checkliste des
  Plans ("Nach dem Lauf", Punkt 4). Tipp auf das Wechsel-Symbol laesst sich
  dagegen im Browser pruefen (interaktive Sichtpruefung vor dem Deploy).
- Sichtpruefung des Alternativen-Modals im Browser (Knopf + Zaehler,
  Gruppierung "Gleiche Muskelgruppe zuerst", Maximum-Hinweis, Erhalt der
  Alternativen beim Hinzufuegen/Entfernen/Sets-Aendern gegen eine echte
  IndexedDB) — P9 ist nur durch Build + Code-Weg belegt; gehoert in die
  interaktive Pruefung vor dem Deploy auf einer frischen `*.localhost`-Adresse.
- Sichtpruefung der Detailansicht im Browser (Bildwechsel-Rhythmus, MuscleMap,
  Notizfelder, beide Einstiege, Rad-vs-Detail-Abgrenzung) — P8 ist nur durch
  Build + Vertragstests belegt.
- Funktionstest der Notiz-Speicherung gegen eine echte IndexedDB (Speichern-
  Knopf, Schliessen-Pfad, Sync-Push) — bis jetzt nur Code-Weg belegt.
- Sichtpruefung von Thumbnail, MuscleMap-Platzhalter, Bild-Auswahlfeld und
  Auto-Zuordnung (P7) sowie der 60 Fotos (zeigt jedes Bild die richtige
  Uebung?) — interaktive Pruefung vor dem Deploy.
- Der Knopf "Bilder automatisch zuordnen" lief noch nie gegen eine echte
  IndexedDB mit den 31 Katalog-Uebungen.
- `.claude\launch.json` bereinigen (Schreiben unter `.claude\` ist dem
  Paket-Lauf verboten — interaktive Session noetig).
- Browser-Test des Startdialogs, der Chip-Zeile und der 1/2/3-Layouts (nach
  allen Paketen; Wisch-Geste aus P10 nur am Geraet testbar).
