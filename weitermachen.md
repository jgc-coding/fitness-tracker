# Weitermachen — Stand 2026-09-05

## Stand
- **v1.4.0 Laufplaner (Paket 1) ist LIVE** (GitHub Pages, Tag `v1.4.0`, master).
  Neuer Reiter "Laufen" mit Woche / Jahr / Plan: Jahresplan von Claude als
  JSON importieren (Pruefung, Vorschau, Merge nach Kennung), Laeufe abhaken,
  verschieben, tauschen, auslassen, Stand als Datei zurueck an Claude.
  Dexie v3 (additiv), Sync und Backup erweitert. Beide Varianten gebaut und
  deployt; Live-Bundle enthaelt den Laufplaner-Chunk und die Version 1.4.0.
- Geprueft im laufenden Browser gegen IndexedDB: Import mit Vorschau, Abbruch
  bei fehlerhafter Datei (Fehler mit Pfad), alle Sheet-Aktionen, Reload-
  Festigkeit, Sprung Jahr -> Woche, Status-Export und Re-Import
  ("keine Aenderung"), Backup-Runde mit den neuen Tabellen, sechs Tabs auf
  360 px, Upgrade einer bestehenden v2-Datenbank ohne Datenverlust, dazu
  Kernfunktionen 1/2/5 (Plan, Satz loggen, Resume). 64 Node-Testfaelle sichern
  die Merge-Regeln ab. Nicht pruefbar ohne zweites Geraet: Sync Handy A -> B.
- **Branch-Lage bereinigt:** lokaler `master` und `origin/master` waren
  auseinandergelaufen (v1.3.0-save-state auf origin, Hub-Umzug lokal). Beide
  sind zusammengefuehrt; `meine-todos.md` bleibt geloescht, der Hub ist der
  eine Ort fuer Gabriels Aufgaben. Das dabei gefundene Handy-Todo
  ("Workout beenden"-Knopf testen) ist im Hub nachgetragen.
- Aufgeraeumt: beide Alt-Branches geloescht, Worktree abgemeldet. Es bleibt nur
  die leere Ordnerhuelle `.claude\worktrees\running-training-planner-5c3fc6`
  (Arbeitsverzeichnis der Sitzung, deshalb nicht loeschbar) — mit
  `rmdir` bzw. beim naechsten Aufraeumen entfernen. Repo hat nur noch `master`.

## Offen
- **Laufplaner Paket 2** (Garmin ueber intervals.icu, `I6b` in
  `verbesserungen.md`): bewusst nicht begonnen. Der Bauplan verlangt, Feldnamen
  und CORS zuerst gegen eine echte Antwort zu pruefen — dafuer braucht es
  Gabriels Konto und API-Schluessel (Anleitung: `docs/garmin-anbindung.md`,
  Schritte 1-3 stehen im Hub).
- **Erster Jahresplan fehlt.** Die App zeigt bis dahin nur den Leerzustand.
  Was Claude dafuer braucht, steht in `docs/laufplaner-plan.md` Abschnitt 8 und
  als Frageliste im Hub.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen
  in `verbesserungen.md`).
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
4. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die
   Beschriftungen blenden sich heute erst unter 340 px aus
   (`BottomNav.vue`, Media-Query) — Schwelle anheben statt Labels kuerzen.

## Stolperfallen (aktuell)
- **Der Reiter "Laufen" ist nicht der Ort fuer Planungslogik.** Plaene entstehen
  bei Claude, die App zeigt und protokolliert. Wer die Merge-Regeln anfasst,
  erweitert zuerst `scripts/laufplan-merge-test.mjs` (64 Faelle) — der Test ist
  der Vertrag, nicht der Code.
- **Browser-Pane: `requestAnimationFrame` ist eingefroren**, solange die Ansicht
  nicht sichtbar ist. Vue-Transitions (Router-Wechsel, Modal) bleiben dadurch
  haengen — die Seite ist logisch schon weiter, die alte Huelle steht noch im
  DOM. Fuer Tests hilft
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`.
  Klicks per `computer` scheitern in dem Zustand ebenfalls; `javascript_tool`
  mit `element.click()` funktioniert. Screenshots gehen gar nicht.
- Der Dev-Server der Single-Variante braucht einen eigenen Port
  (`.claude/launch.json`, Eintrag "Vite Dev Server (Single)", Port 5175) —
  sonst antwortet still die Haupt-App auf 5173.
