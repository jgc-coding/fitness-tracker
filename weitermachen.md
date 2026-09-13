# Weitermachen — Stand 2026-09-13

## Stand
- **v1.8.0 ist LIVE** (Tag `v1.8.0`, Commit `3ad060e`, Actions gruen, Live-Bundle beider
  Apps geprueft). Die Uebungskarte zeigt je Nutzer Gewicht UND Wdh der letzten Einheit
  ("42.5kg x 10"), ebenso Empfehlungszeile und Sperrbildschirm; bei 360 px bricht der
  Wert vor dem "x" um. Quelle ist `getLastReps` in `TrackingView.vue` (beide Kopien).
  Browser 360/412 px und Regressionscheck gruen, am Handy noch nicht angesehen (Hub).
- **Aufgeraeumt (clean):** drei gemergte Branches geloescht, Worktree
  `lauftraining-online-pace-a1bbf7` entfernt, die drei alten Ordnerhuellen sind weg.
  `privat\einrichtung-lauftrainer.md` lag nur im Worktree dieser Sitzung und liegt
  jetzt auch im Hauptbaum-`privat\` (Pruefsumme gleich).

## Offen
- **`.claude\worktrees\ga1-pace-herzfrequenz-8bbf3f` ist eine leere Ordnerhuelle.** Git
  kennt den Worktree nicht mehr; das Loeschen des Ordners scheiterte mit "Permission
  denied", weil ein Prozess ihn haelt. Entfernen, sobald er frei ist (ohne `-Recurse`,
  scheitert also, falls doch etwas darin liegt):
  `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\ga1-pace-herzfrequenz-8bbf3f"`
- **Worktree `lisa-lauf-plan-anpassung-1a4d00`** (Branch `claude/workout-reps-display-54a26b`,
  gemergt) blieb stehen, weil diese Sitzung darin lief. Inhalt ausser Code:
  `node_modules\`, `dist\` und `privat\einrichtung-lauftrainer.md` (Kopie im Hauptbaum).
- **In Gabriels intervals.icu-Konto liegt noch keine einzige Aktivitaet.** Er
  ist seit 19.07.2026 nicht gelaufen; die Garmin-Verbindung holt keine Historie
  nach. Erster echter Test mit seinem Plan-Lauf am Sa 19.09.2026 — dann ist
  `source: "GARMIN"` statt `"UPLOAD"` zu erwarten.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung.** Ihr Zugang
  steht (10.09.), aber intervals.icu bekommt nur Laeufe, die NACH dem Verbinden
  aufgezeichnet wurden — bis dahin ist ihr Konto dort leer. Gleiche Lage wie bei
  Gabriel.
- **V14** (Deploy-Actions heben) und **V15** (Doppel-Eintrag mischt Gewicht und Wdh)
  warten auf Gabriels Freigabe (Hub-Sammelpunkt).
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen
  in `verbesserungen.md`).

## Naechste Schritte (Claude)
1. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (sinnvoll ab etwa vier
   Wochen, fruehestens nach dem 19.09.): Garmin-Export in `privat\`
   aktualisieren, `pace-modell.mjs` ansehen (vor allem Formkorrektur und
   Ausreisser), `wiedereinstieg` in `privat\pace-profil.json` anpassen,
   `laufplan-vorgaben.mjs` laufen lassen, mit `lauf-cloud.mjs schreiben` in die
   Cloud. Ablauf steht in `docs/laufplan-vorgaben.md` Abschnitt 5.
2. **Nach dem ersten Lauf den Garmin-Abgleich pruefen** (bei beiden, Zugaenge
   stehen seit 10.09.): kommt die
   Aktivitaet an, trifft sie den geplanten Lauf, stimmen km und Zeit? Bei
   Abweichungen zuerst `scripts/runmatch-test.mjs` um den Fall erweitern, dann
   `src/utils/runMatch.js` — der Test ist der Vertrag.
3. **Rueckmeldungen in die Plananpassung einbauen:** Sie stehen jetzt selbst in
   der Cloud, `lauf-cloud.mjs holen` bringt sie mit. Kennungen behalten,
   erledigte Laeufe gewinnen lokal (`docs/laufplan-format.md` Abschnitt 5).
4. Beim naechsten clean aufraeumen: die leere Huelle `ga1-pace-herzfrequenz-8bbf3f`
   und den Worktree `lisa-lauf-plan-anpassung-1a4d00` samt Branch (siehe Offen).
5. Meldet Gabriel ein Problem mit "Workout beenden" oder dem Quick-Log-Knopf:
   zuerst `public/sw-custom.js` und die Notification-Payload in
   `TrackingView.vue` pruefen.
6. **Meldet Gabriel etwas zur Wdh-Anzeige** (Umbruch, Sperrbildschirm-Zeile zu lang):
   `.user-value-data`, `.value-reps` und `getLastReps` in `TrackingView.vue`,
   `buildExerciseLines` in `utils/notifications.js` — immer in `src/` UND `single/src/`.
7. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die
   Beschriftungen blenden sich heute erst unter 340 px aus
   (`BottomNav.vue`, Media-Query) — Schwelle anheben statt Labels kuerzen.
8. Paket 3 (Wochenbericht per Telegram, `docs/laufplaner-plan.md` Abschnitt 7)
   nur nach ausdruecklicher Freigabe bauen.

## Stolperfallen (aktuell)
- **Browser-Pane springt zwischen zwei Runden auf die Preview-Adresse zurueck**
  (`localhost:5173`): Tests als EIN `browser_batch`, der mit `navigate` beginnt.
- **Dev-Server liest eine geaenderte `package.json` nicht neu:** Settings zeigt die alte
  Version; die neue Version im Build belegen (`dist/assets/SettingsView-*.js`).
- **Vue-Hot-Reload, Template vor Skript geaendert:** `_ctx.X is not a function` in der
  Konsole ist ein Zwischenstand; nach frischem Laden Fehler selbst mitschneiden.
- **`git worktree remove` bei gesperrtem Ordner:** Git traegt den Worktree trotzdem aus
  ("Permission denied", Exit 255), eine leere Huelle bleibt; der Branch ist loeschbar.
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
