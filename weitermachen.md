# Weitermachen — Stand 2026-09-07

## Stand
- **v1.6.0 Rueckmeldung nach dem Lauf ist LIVE** (Tag `v1.6.0`, master, Actions
  gruen, Live-Bundle geprueft). Je Lauf lassen sich Anstrengung 1-5 und eine
  Notiz festhalten, beides freiwillig. Zwei Wege dorthin: im Formular
  "Erledigt" und ueber den Knopf "Wie war es?" bei schon abgehakten Laeufen
  (Normalfall seit der Uhr-Anbindung). Neu unter Laufen -> Plan:
  "Nur Rueckmeldungen kopieren" — Kurztext der letzten acht Wochen, faellt bei
  gesperrter Zwischenablage auf eine `.txt`-Datei zurueck.
- **Eigenes Feld statt `actual.note`:** `feedback { rpe, note, at }` je Lauf.
  `actual` gehoert der Maschine (Garmin-Zahlen, Zeitnotiz, Grund fuers
  Auslassen), `feedback` dem Laeufer. Kein Import und kein Abgleich fasst es an;
  `formatVersion` bleibt 1, alte Plandateien bleiben gueltig.
- Vertraege erweitert: `laufplan-merge-test.mjs` 86 Faelle (F1-F7 fuer die
  Rueckmeldung), `runmatch-test.mjs` 48 Faelle. Beide im Done-Gate.
- Geprueft im laufenden Browser gegen IndexedDB: Abhaken mit Stufe und Notiz,
  Nachtragen bei einem Lauf von der Uhr (Strecke/Zeit/Puls/Quelle/`externalId`
  unberuehrt), Anzeige im Blatt, Kurztext, Rueckreise Export -> Import ergibt
  "keine Aenderung", alle sechs Reiter ohne Konsolenfehler. Kein Schema-Wechsel
  (Dexie bleibt v3).
- **Weiterhin gueltig:** v1.5.0 Garmin ueber intervals.icu laeuft unveraendert;
  beide Jahresplaene sind importiert (Lisa 100 Meilen Berlin 14.08.2027, Gab
  Backyard Ultra 19.06.2027), Kopien in `C:\Projekte\Fitness Tracker\privat\`;
  Gabriels intervals.icu-Zugang steht (Athleten-Id `i704265`).

## Offen
- **Praxistest von v1.6.0 am Handy steht aus** (Rueckmeldung geben, Kurztext
  kopieren). Das echte Kopieren in die Zwischenablage war im eingebetteten
  Testbrowser nicht pruefbar — siehe Stolperfallen. Steht im Hub.
- **In Gabriels intervals.icu-Konto liegt noch keine einzige Aktivitaet.** Die
  Garmin-Verbindung holt keine Historie nach, und er ist seit 19.07.2026 nicht
  gelaufen. Der erste echte Test kommt mit seinem ersten Plan-Lauf am
  Sa 19.09.2026 — dann ist `source: "GARMIN"` statt `"UPLOAD"` zu erwarten.
- **Lisas intervals.icu-Zugang fehlt** (Konto, Garmin verbinden, Schluessel).
  Gabriel macht das vom PC; danach traegt sie ihn auf ihrem Handy ein.
- **CLAUDE.md ist auf 15.209 Zeichen gewachsen** (Richtwert 13.000). Straffung
  vorgeschlagen, wartet auf Gabriels Ok — nichts eigenmaechtig kuerzen.
- **Offene Frage zum Kurztext:** Er endet je Person mit einer Zeile
  "Erledigt ohne Rueckmeldung: N". Sie steht nur im kopierten Text, nicht in der
  App, und soll verhindern, dass Claude aus drei Rueckmeldungen auf zehn Laeufe
  schliesst. Gabriel wollte keinen Hinweis in der Oberflaeche — er entscheidet,
  ob die Zeile im Text bleibt.
- Vier leere Worktree-Huellen unter `.claude\worktrees\` sind weiterhin von
  einem Prozess gesperrt (heute erneut versucht, `rmdir` scheitert).
- Branch und Worktree dieser Sitzung (`claude/garmin-connection-sync-319408`)
  sind gemergt, konnten aber nicht aus der laufenden Sitzung heraus entfernt
  werden — Befehle unten bei den naechsten Schritten.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen
  in `verbesserungen.md`).
- Der echte Knopfdruck auf "Workout beenden" am Android-Sperrbildschirm ist
  weiterhin ungetestet (nur am Geraet pruefbar, steht im Hub).

## Naechste Schritte (Claude)
1. **Rueckmeldungen in die Plananpassung einbauen:** Schickt Gabriel den
   Kurztext oder den vollen Stand, daraus die naechste Plandatei ableiten
   (Kennungen behalten, erledigte Laeufe gewinnen lokal —
   `docs/laufplan-format.md` Abschnitt 5).
2. **Nach Gabriels erstem Lauf (ab 19.09.) den echten Abgleich pruefen:** kommt
   die Aktivitaet an, trifft sie den geplanten Lauf, stimmen km und Zeit? Bei
   Abweichungen zuerst `scripts/runmatch-test.mjs` um den Fall erweitern, dann
   `src/utils/runMatch.js` anfassen — der Test ist der Vertrag.
3. **Lisas Zugang einrichten**, sobald ihr Konto existiert: Schluessel nie in den
   Chat, sondern per `privat\intervals-von-telegram.mjs` oder direkt in
   `privat\intervals.json` (Eintrag `user1`).
4. Reste dieser Sitzung entfernen, sobald kein Prozess sie mehr haelt:
   `git -C "C:\Projekte\Fitness Tracker" worktree remove ".claude\worktrees\garmin-connection-sync-319408"`,
   danach `git -C "C:\Projekte\Fitness Tracker" branch -d claude/garmin-connection-sync-319408`
   und `git -C "C:\Projekte\Fitness Tracker" push origin --delete claude/garmin-connection-sync-319408`.
5. Leere Ordnerhuellen entfernen, sobald kein Prozess sie mehr haelt:
   `Remove-Item "C:\Projekte\Fitness Tracker\.claude\worktrees\<name>" -Recurse -Force`
   fuer `garmin-trainingpeaks-data-sync-bdabf9`, `lisa-training-plan-e35753`,
   `lisa-training-tracking-extract-f10072`, `running-training-planner-5c3fc6`.
6. Meldet Gabriel ein Problem mit "Workout beenden" oder dem Quick-Log-Knopf:
   zuerst `public/sw-custom.js` und die Notification-Payload in
   `TrackingView.vue` pruefen (beides v1.3.0-neu).
7. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die
   Beschriftungen blenden sich heute erst unter 340 px aus
   (`BottomNav.vue`, Media-Query) — Schwelle anheben statt Labels kuerzen.
8. Paket 3 (Wochenbericht per Telegram, `docs/laufplaner-plan.md` Abschnitt 7)
   nur nach ausdruecklicher Freigabe bauen.

## Stolperfallen (aktuell)
- **Zwischenablage im Browser-Pane ist gesperrt:** `navigator.clipboard.writeText`
  scheitert dort mit "Document is not focused", weil das eingebettete Fenster
  keinen Fokus hat. Kopier-Knoepfe sind damit nur ueber ihren Fehlerpfad
  pruefbar; den Inhalt stattdessen direkt aus dem Store holen
  (`#app.__vue_app__.config.globalProperties.$pinia._s.get('running')`).
- **Pinia-Stores haben kein HMR:** Aendert man eine Store-Funktion, laeuft im
  offenen Tab weiter die alte Fassung (kein `acceptHMRUpdate`). Nach jeder
  Store-Aenderung die Seite neu laden, sonst prueft man den alten Code.
- **Bash frisst `${...}` in `node -e`-Aufrufen.** Ein JS-Template-Literal in
  einem doppelt gequoteten Bash-String wird von der Shell expandiert und kommt
  LEER im Code an. Fuer neue oder geaenderte Dateien mit Template-Literals das
  Write/Edit-Tool nehmen; wenn `node -e` sein muss, den Text vorher in eine
  Datei schreiben und per `readFileSync` einsetzen.
- **Der Reiter "Laufen" ist nicht der Ort fuer Planungslogik.** Plaene entstehen
  bei Claude, die App zeigt und protokolliert. Wer Merge- oder Abgleich-Regeln
  anfasst, erweitert zuerst den Test (`laufplan-merge-test.mjs` 86 Faelle,
  `runmatch-test.mjs` 48 Faelle) — der Test ist der Vertrag, nicht der Code.
- **Nach einem Deploy zeigt die PWA erst nach einem Neustart die neue Version.**
  Der Service Worker liefert bis dahin den alten Stand aus. Zum Pruefen im
  Browser-Pane: Service Worker abmelden, Caches leeren, neu laden — dann aber
  von der Wurzel `/fitness-tracker/` aus starten, denn ohne Service Worker
  laufen Deeplinks wie `/settings` bei GitHub Pages in einen 404.
- **Browser-Pane: `requestAnimationFrame` ist eingefroren**, solange die Ansicht
  nicht sichtbar ist. Vue-Transitions bleiben haengen, die Seite steht halb
  verblasst im DOM. Fuer Tests hilft
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`
  (nach jedem Reload erneut). Klicks per `computer` scheitern in dem Zustand;
  `javascript_tool` mit `element.click()` funktioniert. Screenshots laufen
  manchmal in einen Timeout und klappen beim zweiten Versuch.
- Der Dev-Server der Single-Variante braucht einen eigenen Port
  (`.claude/launch.json`, Eintrag "Vite Dev Server (Single)", Port 5175) —
  sonst antwortet still die Haupt-App auf 5173.
