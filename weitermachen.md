# Weitermachen — Stand 2026-09-22 (Autopilot-Lauf 8, Paket P8)

## Stand
- **Autopilot arbeitet `docs/plan-fittrack-v2.md` ab (v2.0.0, ohne-clean: kein
  Push, kein Deploy).** Live bleibt v1.8.1, bis Gabriel nach der Pruefung bewusst
  deployt. P1-P8 sind umgesetzt, als naechstes P9.
- **P8 ist umgesetzt:** `src/components/tracking/ExerciseDetail.vue` (neues
  Modal auf Basis von Modal.vue, Android-Back schliesst): grosses Bild mit
  automatischem Wechsel zwischen Foto 0 und 1 alle 900ms (setInterval nur bei
  zwei vorhandenen Fotos, Foto 1 wird vorgeladen, Timer stoppt beim Schliessen
  und onUnmounted); darunter die MuscleMap (primaer/sekundaer aus dem
  Manifest-Eintrag, ohne Eintrag Grobgruppe der Uebung, size 170); darunter die
  gemeinsame Uebungs-Notiz (`notes`, nur Anzeige, nur wenn vorhanden); darunter
  je Nutzer ein Textfeld (ALLE drei Nutzer aus `authStore.users`, Standard-
  Nutzer zuoberst, Nutzerfarbe als linker Rand). Gespeichert wird ueber
  `useExerciseNotes.saveNote` (inkl. pushRecord) — per Knopf "Notizen
  speichern" UND beim Schliessen; geschrieben wird nur, was sich gegen den
  geladenen Stand geaendert hat (keine unnoetigen Cloud-Pushes), geloescht wird
  nie (Leeren = text ''). Einstieg 1: Tipp aufs Thumbnail der Tracking-Karte
  (`@click.stop` auf `.exercise-thumb`) oeffnet die Detailansicht, der Rest der
  Karte weiterhin das Eingabe-Rad. Einstieg 2: der Katalog hat jetzt ein
  40px-Zeilen-Thumbnail (Foto 0 bzw. MuscleMap-Platzhalter) mit `@click.stop`
  auf dieselbe Detailansicht; Zeilen-Tipp daneben oeffnet unveraendert das
  Bearbeiten-Formular.
- **P7:** `src/utils/uebungsBilder.js` (reine Funktionen, Manifest als
  Parameter), Vertragstest `scripts/uebungsbilder-matching-test.mjs` gruen;
  Uebungen tragen optional `imageKey` (Default null); Bild-Auswahlfeld in
  beiden CatalogView-Formularen; SettingsView-Knopf "Bilder automatisch
  zuordnen" (idempotent); 40px-Thumbnail auf der Tracking-Karte.
- **P6:** `src/components/shared/MuscleMap.vue` (Inline-SVG, 18
  data-muscle-Ids, Props primary/secondary/fallbackGroup/size, Grobgruppen-
  Fallback, kein color-mix); `scripts/musclemap-pruefen.mjs` gruen.
- **P5:** `src/data/uebungskatalog.json` (30 Eintraege, 31 Aliasse, Top-Level-
  Array), `scripts/uebungsbilder-holen.mjs` (sharp 400px webp q75, idempotent),
  60 Fotos unter `public/uebungsbilder/`, globPatterns mit webp.
- **P4:** Dexie v4 mit `exerciseNotes` (additiv), Composable
  `src/composables/useExerciseNotes.js`, Tabelle in SYNCED/IMPORT_TABLES/
  exportToJSON.
- **P3:** TrackingView komplett auf `authStore.activeUsers` (Karten, Rad-Tabs,
  Empfehlungen, Notification), Layout-Klasse `users-N`, Auto-Wechsel reihum,
  `preferredUserId` steuert Vorauswahl.
- **P2:** Startdialog "Wer trainiert?" (UserSelectModal), `activeUserIds` im
  auth store (localStorage), `userIds` am workoutLog, Chip-Zeile im Tracking.
- **P1:** Single-Variante komplett entfernt, drei Nutzer im Fundament.
- v1.8.1 ist weiterhin der Live-Stand (Tag `v1.8.1`, Details siehe CHANGELOG).

## Offen
- **Pakete P9-P13 des Plans** (`docs/plan-fittrack-v2.md`) — naechster
  Autopilot-Lauf macht bei P9 weiter (Alternativen in der Planung hinterlegen).
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
1. **Autopilot P9**: Alternativen im Tag-Editor der PlanningView (Knopf mit
   Zaehler, Auswahl-Modal, max 4, `alternativen` am Eintrag; Regressionsschutz
   in finishPicker/removeExerciseFromDay/updateExerciseSets — Kriterien im Plan).
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
- **Der Wechsel-Ring (P9/P10) braucht tiefe Kopien:** beim Persistieren von
  Uebungslisten `alternativen` mitkopieren
  (`list.map(e => ({ ...e, alternativen: [...(e.alternativen || [])] }))`),
  sonst DataCloneError.
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
- Lauf 8 / P8: Uebungs-Detailansicht mit Notizen je Nutzer. Beleg: alle fuenf
  pruefen.txt-Befehle gruen (`npm run build` jetzt 117 Module statt 114;
  ExerciseDetail bekommt einen eigenen Chunk `ExerciseDetail-*.js` 10.59 kB
  + eigenes CSS, weil zwei Lazy-Views ihn teilen; Precache 101 Eintraege);
  zusaetzlich `node ./scripts/uebungsbilder-matching-test.mjs` und
  `node ./scripts/musclemap-pruefen.mjs` weiter gruen (Regressionscheck).
  UI-Aenderungen: Detail-Modal (Bildwechsel 900ms, MuscleMap, gemeinsame
  Notiz, drei Nutzer-Notizfelder), `@click.stop` auf dem Tracking-Thumbnail,
  neues Zeilen-Thumbnail im Katalog mit Detail-Einstieg.
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
- Sichtpruefung der Detailansicht im Browser (Bildwechsel-Rhythmus, MuscleMap,
  Notizfelder, beide Einstiege, Rad-vs-Detail-Abgrenzung) — P8 ist nur durch
  Build + Vertragstests belegt; gehoert in die interaktive Pruefung vor dem
  Deploy auf einer frischen `*.localhost`-Adresse.
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
