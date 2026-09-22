# Weitermachen — Stand 2026-09-22 (Autopilot-Lauf 7, Paket P7)

## Stand
- **Autopilot arbeitet `docs/plan-fittrack-v2.md` ab (v2.0.0, ohne-clean: kein
  Push, kein Deploy).** Live bleibt v1.8.1, bis Gabriel nach der Pruefung bewusst
  deployt.
- **P7 ist umgesetzt:** `src/utils/uebungsBilder.js` (reine Funktionen, das
  Manifest kommt immer als Parameter herein — kein JSON-Import im Modul, damit
  Node den Vertragstest ohne Import-Attribut ausfuehren kann):
  `normalisiereName` (klein, gerade + typografische Anfuehrungszeichen und
  Doppelpunkte raus, Leerzeichen glaetten), `findeKatalogEintrag` /
  `findeImageKey` (Abgleich gegen `aliasse`, BEIDE Seiten normalisiert),
  `eintragFuerKey`, `bildPfad` (Vite-Base als Default-Parameter, wird erst beim
  Aufruf gelesen). Vertragstest `scripts/uebungsbilder-matching-test.mjs`:
  alle 31 Katalognamen treffen ihren Key, 3 Fantasienamen treffen nichts,
  plus Normalisierungs-Randfaelle — gruen. Uebungen tragen optional `imageKey`
  (addExercise-Parameter, Default null — nie undefined, Firestore lehnt das ab);
  CatalogView hat in Neu- und Bearbeiten-Formular ein Auswahlfeld "Bild"
  (Manifest-Eintraege + "Kein Bild") mit 96px-Vorschau. SettingsView-Knopf
  "Bilder automatisch zuordnen" (Karte Uebungskatalog): setzt `imageKey` NUR
  bei Uebungen ohne Wert, meldet "X zugeordnet, Y ohne Bild", schreibt per
  updateExercise aus useExercises (inkl. pushRecord). Tracking-Karte zeigt
  links ein 40px-Thumbnail (Foto 0.webp, nur wenn der Key im Manifest
  existiert), sonst die MuscleMap klein (size 44) mit Grobgruppen-Markierung.
- **P6 ist umgesetzt:** `src/components/shared/MuscleMap.vue` zeichnet
  Vorder- und Rueckseite als Inline-SVG (ein `<svg>` mit zwei Gruppen,
  viewBox 210x156); jede Muskelregion ist ein Shape mit `data-muscle`,
  alle 18 Ids vorhanden (neck/traps/shoulders/forearms auf beiden Seiten,
  chest/biceps/abdominals/obliques/quadriceps/abductors/adductors vorn,
  triceps/lats/middle_back/lower_back/glutes/hamstrings/calves hinten).
  Props `primary`/`secondary` (Arrays), `fallbackGroup`, `size` (Breite in
  px, Hoehe folgt dem Seitenverhaeltnis). Faerbung: primaer
  `var(--color-accent)`, sekundaer statisch #e0aeb5, Rest #d7dadc,
  Silhouetten-Teile (Kopf/Haende/Knie/Fuesse/Schienbeine) #ccd1d4 — kein
  color-mix. Ohne primary/secondary greift `GROBGRUPPEN`
  (chest/back/shoulders/legs/arms/core wie im Plan, `full_body` = alle
  Muskeln nur hell). `scripts/musclemap-pruefen.mjs` prueft 18 Ids +
  Grobgruppen-Tabelle und ist gruen; die Komponente wird erst in P7/P8
  eingebunden und ist darum noch in keinem Build-Chunk (Absicht).
- **P5 ist umgesetzt:** `src/data/uebungskatalog.json` (Top-Level-Array,
  30 Eintraege nach der fixen Plan-Tabelle; je Eintrag `key`, `name`,
  `bilder` (2 relative webp-Pfade), `primaer`/`sekundaer` als Arrays
  normalisierter Muskel-Ids mit Unterstrich, `aliasse` klein geschrieben —
  31 Aliasse gesamt, "low row" und "cable row (without chest support)"
  haengen beide an Seated_Cable_Rows). `scripts/uebungsbilder-holen.mjs`
  laedt je Key `0.jpg`/`1.jpg` von raw.githubusercontent.com
  (yuhonas/free-exercise-db), skaliert mit sharp auf 400px Breite als webp
  (Qualitaet 75, withoutEnlargement) nach `public/uebungsbilder/<key>/`,
  ueberspringt vorhandene Dateien und bricht bei Netz-/HTTP-Fehler mit
  Meldung und `process.exitCode = 1` ab (kein `process.exit()` nach fetch).
  Alle 60 webp liegen im Repo; `vite.config.js` globPatterns enthaelt jetzt
  `webp` — der Build precacht 99 Eintraege (1918 KiB) inkl. aller 60 Fotos.
- **P4 ist umgesetzt:** Dexie v4 mit neuer Tabelle `exerciseNotes`
  (`db.version(4).stores({ exerciseNotes: 'id, exerciseId, userId' })`,
  additiv, bestehende Versionen unveraendert). Neues Composable
  `src/composables/useExerciseNotes.js`: `loadNotesForExercise` (Map
  userId -> Datensatz), `getNote`, `saveNote` mit deterministischer Id
  `exerciseId + '_' + userId`, createdAt bleibt erhalten, updatedAt neu,
  danach `pushRecord`; Leeren schreibt `text: ''` statt zu loeschen (kein
  Tombstone noetig). `exerciseNotes` steht in `SYNCED` (syncService), in
  `IMPORT_TABLES`, in `exportToJSON` und in der Sync-Event-Liste am Ende von
  `importFromJSON` (exportData). KEINE UI-Aenderung — das Composable wird
  erst in P8 (Uebungs-Detailansicht) eingebunden und ist darum noch in
  keinem Build-Chunk enthalten (Absicht, kein Fehler).
- **P3 ist umgesetzt:** TrackingView arbeitet vollstaendig ueber
  `authStore.activeUsers` statt `authStore.users` (Karten-Werte, Rad-Tabs,
  `loadRecommendations`, `buildNotificationQuickLog`, Aufruf von
  `buildExerciseLines`) — inaktive Nutzer tauchen im Workout nirgends mehr auf.
  Karten-Layout per Klasse `users-N` an `.exercise-values` (1 volle Breite,
  2 nebeneinander, 3 untereinander via `flex-direction: column`, kein modernes
  CSS). Auto-Wechsel nach dem Speichern geht reihum zum naechsten AKTIVEN
  Nutzer ohne gespeicherten Satz (bei 1 Nutzer kein Wechsel); Hinweistext unter
  dem Rad ist nutzerzahl-neutral und bei 1 Nutzer ausgeblendet. Neues Computed
  `preferredUserId`: Standard-Nutzer, wenn aktiv, sonst erster aktiver — steuert
  Rad-Vorauswahl und den ersten Notification-Knopf. `onActiveUsersChanged`
  laedt nach einer Besetzungsaenderung im laufenden Workout Empfehlungen und
  Notification nach. HistoryView zeigt weiter ALLE drei Nutzer (Absicht).
- **P2 (Lauf 2):** Startdialog "Wer trainiert?", `activeUserIds` im auth store
  (localStorage, Fallback `['user1','user2']`), `userIds` am workoutLog,
  Chip-Zeile im Tracking (Details im Lauf-2-Protokoll unten).
- **P1 (Lauf 1):** Single-Variante komplett entfernt, drei Nutzer im Fundament.
- v1.8.1 ist weiterhin der Live-Stand (Tag `v1.8.1`, Details siehe CHANGELOG).

## Offen
- **Pakete P8-P13 des Plans** (`docs/plan-fittrack-v2.md`) — naechster
  Autopilot-Lauf macht bei P8 weiter (Uebungs-Detailansicht mit Notizen
  je Nutzer).
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
1. **Autopilot P8**: Uebungs-Detailansicht `ExerciseDetail.vue` (grosses Bild
   mit ~900ms-Wechsel zwischen Foto 0 und 1, MuscleMap, gemeinsame Notiz,
   Notizfeld je Nutzer via useExerciseNotes), Einstieg per Tipp aufs
   Thumbnail der Tracking-Karte (Klick-Weiterleitung stoppen!) und aus der
   Katalog-Zeile (Kriterien im Plan).
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
- **MuscleMap haengt seit P7 in der Tracking-Karte** (Platzhalter ohne Foto,
  size 44) und laeuft damit durch `npm run build`; `scripts/
  musclemap-pruefen.mjs` bleibt der Vertrag fuer Ids + Grobgruppen.
- **uebungsBilder.js importiert das Manifest NICHT selbst** — alle Funktionen
  nehmen den Katalog als Parameter (Node-Test ohne JSON-Import-Attribut).
  Wer das Modul in einer View nutzt: `import bildKatalog from
  '../data/uebungskatalog.json'` daneben legen und durchreichen. Der
  Matching-Vertrag ist `scripts/uebungsbilder-matching-test.mjs` — zuerst
  den Test erweitern, dann die Regeln.
- **`imageKey` nie als `undefined` schreiben** (Firestore lehnt undefined-
  Felder beim pushRecord ab) — addExercise setzt darum `imageKey: null` als
  Default, Formulare geben `wert || null` weiter.
- **`fallbackGroup` erwartet die Grobgruppen-Ids aus `constants.js`
  (MUSCLE_GROUPS)** — `full_body` faerbt bewusst nur hell (sekundaer),
  alle anderen Gruppen kraeftig. Sind `primary`/`secondary` gesetzt (auch
  nur eins von beiden), wird `fallbackGroup` komplett ignoriert.
- **Das Bild-Manifest ist ein Top-Level-Array** (kein Wrapper-Objekt);
  `primaer` und `sekundaer` sind Arrays — sie passen damit direkt auf die
  MuscleMap-Props `primary`/`secondary` aus P6. Die `aliasse` stehen klein
  und OHNE die Anfuehrungszeichen der Plan-Tabelle ("bad girl", nicht
  '"bad girl"'), aber MIT Doppelpunkt/Klammern ("machine: chest press",
  "cable row (without chest support)") — das Matching (uebungsBilder.js)
  normalisiert darum beide Seiten (klein, Anfuehrungszeichen/Doppelpunkte
  raus, Leerzeichen glaetten), nicht nur die Eingabe.
- **`uebungsbilder-holen.mjs` ueberspringt vorhandene Dateien** — wer ein
  Foto neu holen will (z.B. nach Aenderung von Breite/Qualitaet), loescht
  erst die betroffenen webp unter `public/uebungsbilder/<key>/`.
- **Notizen je Nutzer laufen NUR ueber `useExerciseNotes`** (deterministische
  Id, `pushRecord`, Leeren = `text: ''`). Wer in P8 die Detailansicht baut,
  loescht nie einen exerciseNotes-Datensatz — sonst braucht es Tombstones.
- **Es gibt keine `single/`-Kopie mehr** — kein `cp src/X single/src/X`, kein
  check:drift. Aeltere Notizen, die das noch verlangen, sind ueberholt.
- **TrackingView kennt nur noch aktive Nutzer:** Wer dort neue Anzeigen baut,
  nimmt `authStore.activeUsers`; `authStore.users` (alle drei) ist im Workout
  tabu und gehoert nur noch in History/Settings. Vorauswahl-Logik laeuft ueber
  das Computed `preferredUserId`.
- **UserSelectModal uebernimmt die Auswahl NUR ueber Bestaetigen** — das ist
  Absicht (Android-Back = abbrechen). Wer den Dialog erweitert, darf den Store
  nicht schon beim Antippen der Namen schreiben.
- **Der Wechsel-Ring (ab P9/P10) braucht tiefe Kopien:** beim Persistieren von
  Uebungslisten `alternativen` mitkopieren, sonst DataCloneError (Leitplanke
  im Plan).
- **Browser-Pane springt zwischen zwei Runden auf die Preview-Adresse zurueck**
  (`localhost:5173`): Tests als EIN `browser_batch`, der mit `navigate` beginnt.
- **Die Pane vergisst Testdaten:** Nach einem Neustart der Browser-Pane ist die
  IndexedDB der `*.localhost`-Testadressen leer und die Preview-Server sind
  beendet — vor einem Wiederholungstest neu aufsetzen.
- **Dev-Server liest eine geaenderte `package.json` nicht neu:** neue Version im
  Build belegen (`dist/assets/SettingsView-*.js`).
- **Vue-Hot-Reload:** Konsolenfehler aus Editier-Zwischenstaenden (erkennbar am
  `?t=`-Zeitstempel); erst nach frischem Laden belastbar.
- **Pinia-Stores haben kein HMR:** nach jeder Store-Aenderung Seite neu laden.
- **`requestAnimationFrame` eingefroren**, solange die Ansicht nicht sichtbar
  ist; nach Reload rAF auf setTimeout stubben, Klicks per `element.click()`.
- **Im Dev-Build geht `__vueParentComponent.setupState`** zum Auslesen der
  Ansicht; im Produktions-Build nur ueber die sichtbare Anzeige pruefen.

## Autopilot-Protokoll

### Funktioniert (mit Beleg)
- Lauf 7 / P7: Bilder in Karten und Katalog, automatische Zuordnung. Beleg:
  `node ./scripts/uebungsbilder-matching-test.mjs` meldet "alles gruen"
  (31 Katalognamen treffen ihren Key, 3 Fantasienamen treffen nichts,
  plus Normalisierungs-/Pfad-Randfaelle, Exit 0);
  `node ./scripts/musclemap-pruefen.mjs` weiter gruen; alle fuenf
  pruefen.txt-Befehle gruen (`npm run build` jetzt 114 Module statt 110 —
  uebungsBilder.js, uebungskatalog.json und MuscleMap sind erstmals im
  Bundle, eigener Chunk `uebungskatalog-*.js` ~7.9 kB, TrackingView-Chunk
  34.8 kB). UI-Aenderungen: Bild-Auswahlfeld mit Vorschau in beiden
  CatalogView-Modals, Knopf "Bilder automatisch zuordnen" in SettingsView,
  40px-Thumbnail bzw. MuscleMap-Platzhalter links auf der Tracking-Karte.
- Lauf 6 / P6: Muskel-Grafik MuscleMap. Beleg:
  `node ./scripts/musclemap-pruefen.mjs` meldet "data-muscle-Ids gefunden:
  18 von 18", "Grobgruppen-Tabelle: 7 Gruppen erwartet, 17 Muskel-Ids
  genannt" (die 18. Referenz ist `full_body: ALLE_MUSKELN`, bewusst ohne
  Duplikat-Liste) und "alles gruen" (Exit 0); ein Scratchpad-Skript mit
  `@vue/compiler-sfc` (parse + compileScript + compileTemplate) bestaetigt
  "kompiliert fehlerfrei". Alle fuenf pruefen.txt-Befehle gruen
  (`npm run build` 110 Module, 3.44s — MuscleMap absichtlich noch in
  keinem Chunk, siehe Stolperfalle).
- Lauf 5 / P5: Bild-Manifest, Foto-Download, Precache. Beleg:
  `src/data/uebungskatalog.json` hat 30 Eintraege (31 Aliasse, zwei davon an
  Seated_Cable_Rows); `node ./scripts/uebungsbilder-holen.mjs` lief zweimal —
  erster Lauf "60 geladen, 0 uebersprungen", zweiter Lauf "0 geladen,
  60 uebersprungen" (Idempotenz belegt); der Zaehl-Einzeiler meldet
  "webp: 60 | 2 x Eintraege: 60 | OK"; `dist/sw.js` enthaelt nach dem Build
  alle 60 `uebungsbilder/...webp`-Pfade (globPatterns um `webp` erweitert,
  Precache 99 Eintraege / 1918.58 KiB). Alle fuenf pruefen.txt-Befehle gruen
  (`npm run build` 110 Module, 3.45s).
- Lauf 4 / P4: Dexie v4 mit exerciseNotes, Sync und Backup erweitert.
  Beleg: `git grep -n "exerciseNotes" -- src/db/dexie.js
  src/services/syncService.js src/utils/exportData.js` zeigt den
  v4-Schemaeintrag (eine Zeile, Kommentar "additiv, verlustfrei" direkt
  darueber), den `SYNCED`-Eintrag `{ name: 'exerciseNotes', keyField: 'id' }`,
  `IMPORT_TABLES`, `exportToJSON` und die Sync-Event-Liste;
  `src/composables/useExerciseNotes.js` existiert (Syntax per
  `node --check` an einer .mjs-Kopie belegt, Exit 0). Keine UI-Datei
  angefasst. Alle fuenf pruefen.txt-Befehle gruen (`npm run build`
  110 Module, 3.88s).
- Lauf 3 / P3: Tracking-Anzeige fuer 1 bis 3 aktive Nutzer.
  Beleg: `git grep -n "authStore.users" -- src/views/TrackingView.vue` liefert
  keine Treffer mehr; Karten-Werte, Rad-Tabs, `loadRecommendations`,
  `buildNotificationQuickLog` und der `buildExerciseLines`-Aufruf iterieren
  ueber `authStore.activeUsers`; `.exercise-values` traegt die Klasse
  `users-N` mit CSS-Regel `users-3 { flex-direction: column }`;
  `savePickerValues` wechselt reihum zum naechsten aktiven Nutzer ohne Satz
  (Modulo ueber `activeUsers`, bei 1 Nutzer laeuft die Schleife leer);
  `preferredUserId` (Computed) steuert Rad-Vorauswahl und Notification-Reihen-
  folge; Hinweistext mit `v-if="activeUsers.length > 1"`. HistoryView
  unveraendert bei `authStore.users`. Alle fuenf pruefen.txt-Befehle gruen
  (`npm run build` 110 Module, TrackingView-Chunk 27.24 kB).
- Lauf 2 / P2: Startdialog "Wer trainiert?" und aktive Nutzer im Store.
  Beleg: `src/stores/auth.js` exportiert `activeUserIds`/`activeUsers`/
  `setActiveUsers` (localStorage-Schluessel `${db.name}:activeUserIds`,
  Fallback `['user1','user2']`); `src/components/shared/UserSelectModal.vue`
  existiert; App.vue oeffnet den Dialog nur ohne heutiges unfertiges Workout;
  `startWorkout`/`startCustomWorkout` schreiben `userIds`, `resumeTodaysWorkout`
  liest sie zurueck; TrackingView hat die Chip-Zeile mit
  `onActiveUsersChanged` -> `updateWorkoutUsers`.
- Workout-Store nutzt den auth store direkt (`useAuthStore()` im Setup) —
  kein Import-Zyklus, auth.js importiert workout.js nicht.
- Lauf 1 / P1: Single-Variante entfernt und Drei-Nutzer-Fundament gelegt.
  Beleg: `single/`, `vite.single.config.js`, `scripts/check-drift.mjs`
  existieren nicht mehr; die drei Kriterien-Greps (`FitTrack Single`,
  `single/src`, `check:drift`) liefern keine Treffer; alle fuenf
  pruefen.txt-Befehle gruen.
- Loeschen per PowerShell `Remove-Item` statt `git rm` (schreibende
  git-Befehle sind dem Paket-Lauf verboten); `git status` fuehrt die
  Loeschungen sauber als `D`.

### Fehlversuche (mit exaktem Grund)
- Lauf 7: keine.
- Lauf 6: keine.
- Lauf 5: keine (Netzzugriff auf raw.githubusercontent.com lief im ersten
  Versuch durch).
- Lauf 4: eine PowerShell-Kette `Copy-Item ...; node --check ...; if ($?)`
  wurde von der Sandbox als Mehrfach-Operation verweigert. Loesung: Kopie
  per Write-Tool, `node --check` als Einzelbefehl.
- Lauf 3: keine.
- Lauf 2: keine.
- Lauf 1: `git grep` mit vorangestelltem `cd` bzw. mit `echo "rc=$?"`-Kette
  wurde von der Sandbox verweigert (Verzeichniswechsel vor
  Versionskontroll-Befehl bzw. Mehrfach-Operation). Loesung: jeden `git grep`
  einzeln und ohne `cd`.

### Noch nicht probiert
- Sichtpruefung von Thumbnail, MuscleMap-Platzhalter, Bild-Auswahlfeld und
  Auto-Zuordnung im Browser (P7 ist nur durch Vertragstest + Build belegt,
  keine optische Pruefung) — gehoert in die interaktive Pruefung vor dem
  Deploy auf einer frischen `*.localhost`-Adresse.
- Sichtpruefung der 60 Fotos (zeigt jedes Bild wirklich die richtige
  Uebung?) — die Keys stammen fix aus der Plan-Tabelle, alle Downloads
  liefen mit HTTP 200, aber den Bildinhalt hat niemand angesehen; ab P7
  sind sie auf der Tracking-Karte sichtbar, gehoert in die interaktive
  Pruefung vor dem Deploy.
- Der Knopf "Bilder automatisch zuordnen" lief noch nie gegen eine echte
  IndexedDB mit den 31 Katalog-Uebungen (nur der Matching-Vertragstest
  unter Node) — Funktionstest in der interaktiven Browser-Pruefung.
- Funktionstest des Composables gegen eine echte IndexedDB (laut Plan erst
  in der interaktiven Browser-Pruefung nach allen Paketen; bis P8 gibt es
  keine UI, die es aufruft).
- `.claude\launch.json` bereinigen (Schreiben unter `.claude\` ist dem
  Paket-Lauf verboten — interaktive Session noetig).
- Browser-Test des Startdialogs, der Chip-Zeile und der neuen 1/2/3-Layouts
  (laut Plan erst nach allen Paketen in der interaktiven Pruefung vor dem
  Deploy; die Wisch-Geste aus P10 ist ohnehin nur am Geraet testbar).
