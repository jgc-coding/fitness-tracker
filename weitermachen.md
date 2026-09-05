# Weitermachen — Stand 2026-08-28

## Stand
- **v1.3.0 ist LIVE** (GitHub Pages, Tag `v1.3.0`, master): Standard-Nutzer in
  den Einstellungen (geraete-lokal per localStorage, nicht gesynct), "Workout
  beenden" als Knopf in der Sperrbildschirm-Notification, passende Muskel-
  gruppen zuerst beim Uebung-Hinzufuegen. Deploy gruen, live-Bundles per curl
  verifiziert (Haupt-App + FitTrack Single).
- Nebenbei behoben: leeres "aktives" Workout, wenn ausserhalb der
  Tracking-Ansicht beendet wurde (`resumeTodaysWorkout` raeumt jetzt auf,
  wenn kein offenes Training mehr in der DB liegt).
- Firebase-Absicherung unveraendert komplett (Stand 17.08., alle 6 Schritte
  aus `docs/firebase-absicherung.md` weiterhin aktiv).

## Offen
- Keine unfertige Code-Baustelle. Zurueckgestellte Punkte weiterhin **V8**
  (Direkteingabe im Gewichts-Rad), **I1** (Wake-Lock/Timer), **I5** (Dark
  Mode) in `verbesserungen.md` — nur auf Gabriels Zuruf anfassen.
- Der echte Knopfdruck auf "Workout beenden" am Android-Sperrbildschirm ist
  ungetestet — im Browser laesst sich eine Notification-Action nicht
  ausloesen. Beide Haelften (Service-Worker-Schreibvorgang, App-Reaktion)
  sind einzeln verifiziert. Siehe `meine-todos.md`.

## Naechste Schritte (Claude)
1. Meldet Gabriel nach dem Handy-Test (siehe `meine-todos.md`) ein Problem mit
   "Workout beenden" oder dem Quick-Log-Knopf: zuerst `public/sw-custom.js`
   (bzw. `single/public/sw-custom.js`) und die Notification-Payload in
   `TrackingView.vue` (`buildNotificationQuickLog`/`buildNotificationActions`)
   pruefen — beides ist v1.3.0-neu.

## Stolperfallen (aktuell)
- **Im Haupt-Checkout `C:\Projekte\Fitness Tracker` arbeiten**, nicht in einem
  Worktree: Ein Worktree kann eine veraltete `weitermachen.md` in den Kontext
  laden (siehe Session vom 17.08.).
- Geteilte Dateien immer in `src/` UND `single/src/` aendern (`npm run check:drift`);
  TrackingView/HistoryView/notifications/sw-custom sind dokumentierte Ausnahmen und
  muessen von Hand parallel gepflegt werden.
- Preview-Tool: Screenshot schlaegt fehl, wenn die Browser-Pane nicht sichtbar
  ist ("pane not displayed") — Struktur-/Wert-Pruefung per `read_page`,
  `get_page_text`, `javascript_tool` funktioniert zuverlaessig und reicht fuer
  Logik-Checks (so diese Session durchgefuehrt).
- Session-Worktree `.claude\worktrees\workout-settings-ui-improvements-157885`
  + Branch `claude/workout-settings-ui-improvements-157885` sind ueberfluessig
  (Branch = master, identischer Commit 01f3dfa). Noch nicht entfernt (war das
  Arbeitsverzeichnis dieser Sitzung) — Kommandos stehen im Chat-Abschluss-
  bericht vom 28.08., vor dem Ausfuehren wie immer bei Gabriel nachfragen.
