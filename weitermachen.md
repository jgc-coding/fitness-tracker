# Weitermachen — Stand 2026-08-17

## Stand
- **v1.2.0 ist LIVE** (GitHub Pages, Tag `v1.2.0`, master): Gym-UX-Release inkl.
  komplettem v1.1.0-Sicherheits-Release. Deploy gruen (erster Lauf scheiterte an
  einer GitHub-Stoerung/503, Rerun ok); Live-Manifeste beider Apps verifiziert.
- **Firebase-Absicherung komplett** (alle 6 Schritte aus `docs/firebase-absicherung.md`):
  E-Mail/Passwort-Login aktiv (ohne E-Mail-Link), gemeinsames Konto angelegt,
  Selbst-Registrierung gesperrt, beide Handys angemeldet, Firestore-Rules scharf
  (nur das eine Konto), Anonym-Anbieter deaktiviert. Der frueher offene Vollzugriff
  auf alle Trainingsdaten ist damit zu. Rollback: Rules-Versionshistorie in der Console.
- Umgesetzt: V2-V7, V9-V13 + I2/I3/I4 (Details in `verbesserungen.md`/`CHANGELOG.md`).
  Zurueckgestellt von Gabriel: V8, I1, I5.
- Aufgeraeumt: 9 anonyme Alt-Nutzer in der Console geloescht (nur das E-Mail-Konto
  bleibt), drei gemergte lokale Branches geloescht.

## Offen
- Keine unfertige Code-Baustelle. Zurueckgestellte Punkte stehen als **V8** (Direkt-
  eingabe im Gewichts-Rad), **I1** (Bildschirm-wach + Pausen-Timer) und **I5**
  (dunkles Design) in `verbesserungen.md` — nur auf Gabriels Zuruf anfassen.

## Naechste Schritte (Claude)
1. **Wartet auf Freigabe:** zwei verwaiste Worktrees entfernen — sie enthalten
   veraltete Kopien von `CLAUDE.md`/`weitermachen.md` (Stand VOR dem Release) und
   koennen eine dort gestartete Sitzung in die Irre fuehren:
   `git worktree remove ".claude/worktrees/optimistic-blackburn-4a854f"` und
   `git worktree remove ".claude/worktrees/sad-saha-69e479"`
2. **Wartet auf Freigabe:** gemergten Remote-Branch loeschen (nur alter Stand,
   Inhalt via PR #1 in master):
   `git push origin --delete claude/fittrack-single-standalone-ixm5sp`
3. Nach Gabriels Handy-Tests (siehe `meine-todos.md`): meldet er Probleme beim
   Sync oder beim Quick-Log-Knopf, zuerst Firestore-Rules und Notification-Payload
   pruefen — beides ist v1.2.0-neu und nur am Geraet final testbar.

## Stolperfallen (aktuell)
- Diese Sitzung lief in einem **Worktree**, der Release aber auf master im Haupt-
  Checkout `C:\Projekte\Fitness Tracker`. Kuenftig direkt dort arbeiten, sonst
  zeigen `weitermachen.md`/`CLAUDE.md` einen alten Stand (siehe Schritt 1).
- Geteilte Dateien immer in `src/` UND `single/src/` aendern (`npm run check:drift`);
  TrackingView/HistoryView/notifications/sw-custom sind dokumentierte Ausnahmen und
  muessen von Hand parallel gepflegt werden.
- Preview-Tool rendert in dieser Umgebung nicht (rAF eingefroren): Logik ueber
  Seitenstruktur/IndexedDB pruefen, Firebase-Console ueber Claude-in-Chrome.
- JSON-Backups beider Handys existieren (vor dem Update erstellt, 2026-08-17).
