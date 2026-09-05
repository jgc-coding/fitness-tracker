# Weitermachen — Stand 2026-09-05

## Stand
- **v1.4.0 Laufplaner (Paket 1) ist gebaut, geprueft und gemergt.** Neuer Reiter
  "Laufen" mit Woche / Jahr / Plan: Jahresplan von Claude als JSON importieren
  (Pruefung, Vorschau, Merge nach Kennung), Laeufe abhaken, verschieben,
  tauschen, auslassen, Stand als Datei zurueck an Claude. Dexie v3 (additiv),
  Sync und Backup erweitert. Beide Varianten (Haupt-App und FitTrack Single)
  bauen; Single zeigt das Modul mit einem Nutzer.
- Geprueft im laufenden Browser gegen IndexedDB: Import mit Vorschau, Abbruch
  bei fehlerhafter Datei (Fehler mit Pfad), alle Sheet-Aktionen, Reload-
  Festigkeit, Sprung Jahr -> Woche, Status-Export und Re-Import
  ("keine Aenderung"), Backup-Runde mit den neuen Tabellen, sechs Tabs auf
  360 px, Upgrade einer bestehenden v2-Datenbank ohne Datenverlust.
  Nicht pruefbar ohne zweites Geraet: Sync Handy A -> Handy B.
- **Branch-Lage bereinigt:** lokaler `master` und `origin/master` waren
  auseinandergelaufen (v1.3.0-save-state auf origin, Hub-Umzug lokal). Beide
  sind jetzt zusammengefuehrt; `meine-todos.md` bleibt geloescht, der Hub ist
  der eine Ort fuer Gabriels Aufgaben. Das dabei gefundene Handy-Todo
  ("Workout beenden"-Knopf testen) ist im Hub nachgetragen.
- v1.3.0 (Standard-Nutzer, Workout-Beenden in der Notification) und die
  Firebase-Absicherung sind unveraendert live.

## Offen
- **Laufplaner Paket 2** (Garmin ueber intervals.icu, `I6b` in
  `verbesserungen.md`): bewusst nicht begonnen. Der Bauplan verlangt, Feldnamen
  und CORS zuerst gegen eine echte Antwort zu pruefen — dafuer braucht es
  Gabriels Konto und API-Schluessel (Anleitung: `docs/garmin-anbindung.md`,
  Schritte 1-3 stehen im Hub).
- **Erster Jahresplan fehlt.** Die App zeigt bis dahin nur den Leerzustand.
  Was Claude dafuer braucht, steht in `docs/laufplaner-plan.md` Abschnitt 8 und
  als Frageliste im Hub.
- Zurueckgestellt, nur auf Zuruf: **V8** (Direkteingabe im Gewichts-Rad),
  **I1** (Wake-Lock/Timer), **I5** (Dark Mode), **I7** (ungeplanten Lauf von
  Hand eintragen — loest sich mit Paket 2 vermutlich von selbst).
- Der echte Knopfdruck auf "Workout beenden" am Android-Sperrbildschirm ist
  weiterhin ungetestet (nur am Geraet pruefbar, steht im Hub).

## Naechste Schritte (Claude)
1. **Ersten Jahresplan bauen**, sobald Gabriel die Eckdaten liefert (Zielrennen
   und Termin je Person, aktueller Wochenumfang, laengster Lauf, verfuegbare
   Tage, Krafttage, Verletzungen; optional die Garmin-CSV nach
   `privat\garmin-historie-<name>.csv`). Leitplanken und Ablauf:
   `docs/laufplaner-plan.md` Abschnitt 8. Datei mit
   `node .\scripts\laufplan-pruefen.mjs` pruefen, bevor Gabriel importiert.
2. **Paket 2 bauen**, sobald Athleten-Id und Schluessel existieren: erst mit
   `privat/intervals.json` eine echte Antwort ansehen (Abschnitt 6.2/6.4),
   dann `src/utils/runMatch.js` + Tests, dann die Verbindungs-Karte in
   `RunPlanView`. Nichts davon blind bauen.
3. Meldet Gabriel nach dem Handy-Test ein Problem mit "Workout beenden" oder
   dem Quick-Log-Knopf: zuerst `public/sw-custom.js` und die Notification-
   Payload in `TrackingView.vue` pruefen (beides v1.3.0-neu).

## Stolperfallen (aktuell)
- **Der Reiter "Laufen" ist nicht der Ort fuer Planungslogik.** Plaene entstehen
  bei Claude, die App zeigt und protokolliert. Wer die Merge-Regeln anfasst,
  erweitert zuerst `scripts/laufplan-merge-test.mjs` (64 Faelle) — der Test ist
  der Vertrag, nicht der Code.
- Geteilte Dateien immer in `src/` UND `single/src/` aendern
  (`npm run check:drift`); TrackingView/HistoryView/notifications/sw-custom/
  dexie/syncService/constants/App/SettingsView sind dokumentierte Ausnahmen und
  werden von Hand parallel gepflegt.
- **Browser-Pane: `requestAnimationFrame` ist eingefroren**, solange die Ansicht
  nicht sichtbar ist. Vue-Transitions (Router-Wechsel, Modal) bleiben dadurch
  haengen — die Seite ist logisch schon weiter, die alte Huelle steht noch im
  DOM. Fuer Tests hilft
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`.
  Klicks per `computer` scheitern in dem Zustand ebenfalls; `javascript_tool`
  mit `element.click()` funktioniert.
- Screenshots gehen in dieser Umgebung nicht; Pruefung laeuft ueber
  `read_page`, `get_page_text` und `javascript_tool` gegen IndexedDB.
- Der Dev-Server der Single-Variante braucht einen eigenen Port
  (`.claude/launch.json`, Eintrag "Vite Dev Server (Single)", Port 5175) —
  sonst antwortet still die Haupt-App auf 5173.
