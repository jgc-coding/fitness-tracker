# Weitermachen — Stand 2026-09-07

## Stand
- **v1.5.0 Garmin-Anbindung (Paket 2) ist LIVE** (Tag `v1.5.0`, master, Actions
  gruen, Live-Bundle verifiziert). Laeufe von der Uhr kommen ueber intervals.icu
  in den Plan: Verbindungs-Karte unter Laufen -> Plan, automatischer Abgleich
  beim Oeffnen (Pause 15 min) plus Knopf "Jetzt abgleichen", Zuordnung mit
  Ist-Werten, ungeplante Laeufe bleiben erhalten. Neu:
  `src/utils/intervalsApi.js`, `src/utils/runMatch.js`,
  `scripts/runmatch-test.mjs` (43 Faelle, im Done-Gate), `scripts/intervals-abruf.mjs`.
- **Vor dem Bau an echten Daten kalibriert statt geraten:** Feldnamen und
  Einheiten an einer echten Antwort geprueft, und der Browser-Zugriff von
  `jgc-coding.github.io` gegen die echte Adresse verifiziert (401 lesbar = erlaubt).
- Geprueft im laufenden Browser gegen IndexedDB: Fehlerpfad (falscher Schluessel
  -> menschlicher Satz plus Diagnose-Zeile mit ID), Erfolgspfad, Zuordnung zum
  geplanten Lauf, ungeplanter Lauf, zweiter Abgleich ohne Aenderung,
  15-Minuten-Pause, Backup ohne Schluessel, Wochenbilanz, Laufplan-Import
  (Paket 1) unveraendert, alle sechs Reiter ohne Konsolenfehler. Kein
  Schema-Wechsel (Dexie bleibt v3).
- **Beide Jahresplaene sind gebaut und von Gabriel importiert** (Lisa: 100 Meilen
  Berlin 14.08.2027, 48 Wochen; Gab: Backyard Ultra 19.06.2027, 40 Wochen).
  Kopien liegen in `C:\Projekte\Fitness Tracker\privat\`.
- **Gabriels intervals.icu-Zugang steht** (Athleten-Id `i704265`, Garmin
  verbunden). Der Schluessel kam per Telegram und wurde von
  `privat\intervals-von-telegram.mjs` direkt in `privat\intervals.json`
  geschrieben, ohne durch den Chat zu laufen.
- Aufgeraeumt: vier gemergte Branches und ihre Worktrees entfernt, alle
  `privat\`-Daten aus den Worktrees vorher in den Hauptbaum gesichert
  (16 Dateien). Repo hat nur noch `master` plus den Branch dieser Sitzung.

## Offen
- **In Gabriels intervals.icu-Konto liegt noch keine einzige Aktivitaet.** Die
  Garmin-Verbindung holt keine Historie nach, und er ist seit 19.07.2026 nicht
  gelaufen. Der erste echte Test kommt mit seinem ersten Plan-Lauf am
  Sa 19.09.2026 — dann ist `source: "GARMIN"` statt `"UPLOAD"` zu erwarten.
- **Lisas intervals.icu-Zugang fehlt** (Konto, Garmin verbinden, Schluessel).
  Gabriel macht das vom PC; danach traegt sie ihn auf ihrem Handy ein.
- **CLAUDE.md ist auf ~14.500 Zeichen gewachsen** (Richtwert 13.000). Straffung
  vorgeschlagen, wartet auf Gabriels Ok — nichts eigenmaechtig kuerzen.
- Vier leere Worktree-Huellen unter `.claude\worktrees\` sind von einem Prozess
  gesperrt und blieben liegen (Befehl steht unten bei den naechsten Schritten).
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen
  in `verbesserungen.md`).
- Der echte Knopfdruck auf "Workout beenden" am Android-Sperrbildschirm ist
  weiterhin ungetestet (nur am Geraet pruefbar, steht im Hub).

## Naechste Schritte (Claude)
1. **Nach Gabriels erstem Lauf (ab 19.09.) den echten Abgleich pruefen:** kommt
   die Aktivitaet an, trifft sie den geplanten Lauf, stimmen km und Zeit? Bei
   Abweichungen zuerst `scripts/runmatch-test.mjs` um den Fall erweitern, dann
   `src/utils/runMatch.js` anfassen — der Test ist der Vertrag.
2. **Lisas Zugang einrichten**, sobald ihr Konto existiert: Schluessel nie in den
   Chat, sondern per `privat\intervals-von-telegram.mjs` oder direkt in
   `privat\intervals.json` (Eintrag `user1`).
3. Leere Ordnerhuellen entfernen, sobald kein Prozess sie mehr haelt:
   `Remove-Item "C:\Projekte\Fitness Tracker\.claude\worktrees\<name>" -Recurse -Force`
   fuer `garmin-trainingpeaks-data-sync-bdabf9`, `lisa-training-plan-e35753`,
   `lisa-training-tracking-extract-f10072`, `running-training-planner-5c3fc6`.
4. Meldet Gabriel ein Problem mit "Workout beenden" oder dem Quick-Log-Knopf:
   zuerst `public/sw-custom.js` und die Notification-Payload in
   `TrackingView.vue` pruefen (beides v1.3.0-neu).
5. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die
   Beschriftungen blenden sich heute erst unter 340 px aus
   (`BottomNav.vue`, Media-Query) — Schwelle anheben statt Labels kuerzen.
6. Paket 3 (Wochenbericht per Telegram, `docs/laufplaner-plan.md` Abschnitt 7)
   nur nach ausdruecklicher Freigabe bauen.

## Stolperfallen (aktuell)
- **Bash frisst `${...}` in `node -e`-Aufrufen.** Ein JS-Template-Literal in
  einem doppelt gequoteten Bash-String wird von der Shell expandiert und kommt
  LEER im Code an (heute zweimal passiert, einmal unbemerkt in
  `RunningView.vue`). Auch ein Heredoc kann am Parser scheitern. Fuer neue oder
  geaenderte Dateien mit Template-Literals das Write/Edit-Tool nehmen; wenn
  `node -e` ersetzt, den einzufuegenden Text vorher in eine Datei schreiben und
  per `readFileSync` einsetzen.
- **Der Reiter "Laufen" ist nicht der Ort fuer Planungslogik.** Plaene entstehen
  bei Claude, die App zeigt und protokolliert. Wer Merge- oder Abgleich-Regeln
  anfasst, erweitert zuerst den Test (`laufplan-merge-test.mjs` 64 Faelle,
  `runmatch-test.mjs` 43 Faelle) — der Test ist der Vertrag, nicht der Code.
- **Nach einem Deploy zeigt die PWA erst nach einem Neustart die neue Version.**
  Der Service Worker liefert bis dahin den alten Stand aus. Zum Pruefen im
  Browser-Pane: Service Worker abmelden, Caches leeren, neu laden — dann aber
  von der Wurzel `/fitness-tracker/` aus starten, denn ohne Service Worker
  laufen Deeplinks wie `/settings` bei GitHub Pages in einen 404.
- **Browser-Pane: `requestAnimationFrame` ist eingefroren**, solange die Ansicht
  nicht sichtbar ist. Vue-Transitions bleiben haengen — die Seite ist logisch
  schon weiter, die alte Huelle steht noch im DOM. Fuer Tests hilft
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`.
  Klicks per `computer` scheitern in dem Zustand; `javascript_tool` mit
  `element.click()` funktioniert. Screenshots laufen manchmal in einen Timeout
  und klappen beim zweiten Versuch.
- **Zugangsdaten im Browser-Test:** Ein Skript, das Schluessel aus einer Datei
  liest und in Formularfelder schreibt, wird vom Sicherheitsfilter blockiert —
  zu Recht. Der Weg, der funktioniert: `window.fetch` auf die echte Antwortform
  umbiegen und den UI-Pfad mit Testwerten pruefen; die echte Schnittstelle
  separat in Node testen.
- Der Dev-Server der Single-Variante braucht einen eigenen Port
  (`.claude/launch.json`, Eintrag "Vite Dev Server (Single)", Port 5175) —
  sonst antwortet still die Haupt-App auf 5173.
