# Weitermachen — Stand 2026-09-22 (Autopilot-Lauf 3, Paket P3)

## Stand
- **Autopilot arbeitet `docs/plan-fittrack-v2.md` ab (v2.0.0, ohne-clean: kein
  Push, kein Deploy).** Live bleibt v1.8.1, bis Gabriel nach der Pruefung bewusst
  deployt.
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
- **Pakete P4-P13 des Plans** (`docs/plan-fittrack-v2.md`) — naechster
  Autopilot-Lauf macht bei P4 weiter (Dexie v4 mit `exerciseNotes`, Sync- und
  Backup-Erweiterung, KEINE UI-Aenderung in dem Paket).
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
1. **Autopilot P4**: Dexie v4 mit `exerciseNotes` (additiv), Composable
   `useExerciseNotes`, `SYNCED`/`IMPORT_TABLES`/`exportToJSON` erweitern
   (Kriterien im Plan).
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
- Lauf 3: keine.
- Lauf 2: keine.
- Lauf 1: `git grep` mit vorangestelltem `cd` bzw. mit `echo "rc=$?"`-Kette
  wurde von der Sandbox verweigert (Verzeichniswechsel vor
  Versionskontroll-Befehl bzw. Mehrfach-Operation). Loesung: jeden `git grep`
  einzeln und ohne `cd`.

### Noch nicht probiert
- `.claude\launch.json` bereinigen (Schreiben unter `.claude\` ist dem
  Paket-Lauf verboten — interaktive Session noetig).
- Browser-Test des Startdialogs, der Chip-Zeile und der neuen 1/2/3-Layouts
  (laut Plan erst nach allen Paketen in der interaktiven Pruefung vor dem
  Deploy; die Wisch-Geste aus P10 ist ohnehin nur am Geraet testbar).
