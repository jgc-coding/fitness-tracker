# Weitermachen — Stand 2026-09-16

## Stand
- **v1.8.1 ist LIVE** (Tag `v1.8.1`, Commit `c350d4c`, Actions gruen, Live-Bundle
  verifiziert: Version 1.8.1 im Settings-Chunk, TrackingView-Bundle identisch mit dem
  getesteten Build, `lastSetsCache` kommt darin nicht mehr vor). Gabriel hatte gemeldet,
  dass nach einem Uebungstausch die Wdh auf ALLEN Karten fehlten, das Gewicht aber
  stehenblieb; nach einem App-Neustart war sie wieder da. Ursache war die Schieflage in
  `loadRecommendations`: Der Gewichtsvorschlag wurde nur bei einem Treffer ueberschrieben,
  der separate Wdh-Speicher dagegen immer — auch mit leerem Abfrageergebnis. Jetzt kommen
  beide aus demselben Satz (`getLastReps` liest aus `recommendations`); `lastSetsCache`
  und eine Abfrage je Uebung und Nutzer sind entfallen. Befund **V15** ist miterledigt.
  Am Handy noch nicht angesehen (Hub).
- **Der Ausloeser ist NICHT bewiesen.** Dev-Server, Produktions-Build, nachgestellte
  Sync-Meldungen, Neustart mit Wiederaufnahme und Tausch unter Schreiblast blieben alle
  gruen; der halbe Zustand war nur waehrend des Ladens sichtbar (120 ms nach dem Start,
  "42.5kg" ohne Wdh). Die Aenderung macht ihn unabhaengig vom Ausloeser unmoeglich.
- **Aufgeraeumt (clean):** Branch `claude/workout-reps-display-54a26b` geloescht, sein
  Worktree `lisa-lauf-plan-anpassung-1a4d00` aus Git ausgetragen (Ordner haengt noch,
  siehe Offen), die Huelle `ga1-pace-herzfrequenz-8bbf3f` ist weg. Keine ungemergten
  Branches, kein Remote-Branch ausser `master`.

## Offen
- **Zwei Ordner-Reste unter `.claude\worktrees\`.** Beide enthalten nur Code-Kopien,
  `node_modules\` und `dist\`; die private Datei darin liegt pruefsummengleich im
  Hauptbaum-`privat\`. Der erste ist aus Git ausgetragen und nur noch ein Ordner:
  `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\lisa-lauf-plan-anpassung-1a4d00" -Recurse -Force`
  Der Worktree dieser Sitzung geht erst NACH ihrem Ende, samt Branch:
  `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\wiederholungszahl-exercise-switch-8b736b"; git -C "C:\Projekte\Fitness Tracker" branch -d claude/wiederholungszahl-exercise-switch-8b736b`
- **In Gabriels intervals.icu-Konto liegt noch keine einzige Aktivitaet.** Er ist seit
  19.07.2026 nicht gelaufen; die Garmin-Verbindung holt keine Historie nach. Erster
  echter Test mit seinem Plan-Lauf am Sa 19.09.2026 — dann ist `source: "GARMIN"` statt
  `"UPLOAD"` zu erwarten.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung.** Ihr Zugang steht
  (10.09.), aber intervals.icu bekommt nur Laeufe, die NACH dem Verbinden aufgezeichnet
  wurden — bis dahin ist ihr Konto dort leer. Gleiche Lage wie bei Gabriel.
- **V14** (Deploy-Actions heben) wartet auf Gabriels Freigabe (Hub-Sammelpunkt).
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen in
  `verbesserungen.md`).

## Naechste Schritte (Claude)
1. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (sinnvoll ab etwa vier Wochen,
   fruehestens nach dem 19.09.): Garmin-Export in `privat\` aktualisieren,
   `pace-modell.mjs` ansehen (vor allem Formkorrektur und Ausreisser), `wiedereinstieg`
   in `privat\pace-profil.json` anpassen, `laufplan-vorgaben.mjs` laufen lassen, mit
   `lauf-cloud.mjs schreiben` in die Cloud. Ablauf: `docs/laufplan-vorgaben.md` Abschnitt 5.
2. **Nach dem ersten Lauf den Garmin-Abgleich pruefen** (bei beiden): kommt die Aktivitaet
   an, trifft sie den geplanten Lauf, stimmen km und Zeit? Bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` um den Fall erweitern, dann `src/utils/runMatch.js` — der
   Test ist der Vertrag.
3. **Rueckmeldungen in die Plananpassung einbauen:** Sie stehen in der Cloud,
   `lauf-cloud.mjs holen` bringt sie mit. Kennungen behalten, erledigte Laeufe gewinnen
   lokal (`docs/laufplan-format.md` Abschnitt 5).
4. **Meldet Gabriel die Wdh-Luecke erneut** (Gewicht steht, Wdh fehlt): nicht weiter raten,
   sondern Diagnose in die App bauen. Seit v1.8.1 kann die Wdh nur noch fehlen, wenn
   `recommendations` selbst leer bleibt — also die Abfrage nichts findet. Telemetrie je
   Ladelauf (Trefferzahl je Uebung und Nutzer) sichtbar machen, dann messen statt raten.
5. Beim naechsten clean: die beiden Ordner-Reste aufraeumen (siehe Offen).
6. Meldet Gabriel ein Problem mit "Workout beenden" oder dem Quick-Log-Knopf: zuerst
   `public/sw-custom.js` und die Notification-Payload in `TrackingView.vue` pruefen.
7. Wdh-Anzeige (Umbruch, Sperrbildschirm-Zeile zu lang): `.user-value-data`,
   `.value-reps` und `getLastReps` in `TrackingView.vue`, `buildExerciseLines` in
   `utils/notifications.js` — immer in `src/` UND `single/src/`.
8. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die Beschriftungen
   blenden sich heute erst unter 340 px aus (`BottomNav.vue`, Media-Query) — Schwelle
   anheben statt Labels kuerzen.
9. Paket 3 (Wochenbericht per Telegram, `docs/laufplaner-plan.md` Abschnitt 7) nur nach
   ausdruecklicher Freigabe bauen.

## Was Gabriel selbst tun muss

Am 19.09.2026 von der Hub-Tafel hierher gezogen. Die Tafel nimmt seither nur
noch, was Gabriel selbst eintraegt oder ausdruecklich beauftragt. Wo oben im
Text von der Hub-Karte oder einem Hub-Sammelpunkt die Rede ist, sind diese
Punkte gemeint.

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
- **Browser-Pane springt zwischen zwei Runden auf die Preview-Adresse zurueck**
  (`localhost:5173`): Tests als EIN `browser_batch`, der mit `navigate` beginnt.
- **Die Pane vergisst Testdaten:** Nach einem Neustart der Browser-Pane ist die IndexedDB
  der `*.localhost`-Testadressen leer, und die Preview-Server sind beendet. Beides vor
  einem Wiederholungstest neu aufsetzen, sonst misst man eine leere App.
- **Dev-Server liest eine geaenderte `package.json` nicht neu:** Settings zeigt die alte
  Version; die neue Version im Build belegen (`dist/assets/SettingsView-*.js`).
- **Vue-Hot-Reload:** Fehler wie `X is not defined` in der Konsole stammen oft aus einem
  Zwischenstand des Editierens (erkennbar am `?t=`-Zeitstempel der Modul-URL). Erst nach
  frischem Laden — besser im Produktions-Build — ist die Konsole belastbar.
- **`git worktree remove` bei gesperrtem Ordner:** Git traegt den Worktree trotzdem aus
  ("Permission denied", Exit 255), eine Ordnerhuelle bleibt; der Branch ist loeschbar.
- **Browser-Pane fuehrt bei Dateien ausserhalb des Projekts kein JavaScript aus**, und
  `navigate` verstuemmelt `file://`-Adressen: lokale HTML-Seiten ueber den Dev-Server
  (kurz nach `public/` kopieren) oder in Claude-in-Chrome testen.
- **Zwischenablage im Browser-Pane gesperrt** ("Document is not focused"): Kopier-Knoepfe
  nur ueber den Fehlerpfad pruefbar, Inhalt direkt aus dem Store holen
  (`#app.__vue_app__.config.globalProperties.$pinia._s.get('running')`).
- **Pinia-Stores haben kein HMR:** nach jeder Store-Aenderung die Seite neu laden.
- **`requestAnimationFrame` eingefroren**, solange die Ansicht nicht sichtbar ist. Nach
  jedem Reload `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`;
  Klicks per `computer` scheitern dann, `element.click()` per `javascript_tool` geht.
- **Im Dev-Build geht `document.querySelector('.tracking-view').__vueParentComponent
  .setupState`** — damit lassen sich Zwischenspeicher der Ansicht direkt auslesen. Im
  Produktions-Build fehlt das; dort nur ueber die sichtbare Anzeige pruefen.
