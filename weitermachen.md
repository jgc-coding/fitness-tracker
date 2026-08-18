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
- **Aufgeraeumt (2026-08-17):** 9 anonyme Alt-Nutzer in der Console geloescht (nur das
  E-Mail-Konto bleibt), drei gemergte lokale Branches geloescht, beide Worktrees
  aufgeloest, Remote-Branch `claude/fittrack-single-standalone-ixm5sp` geloescht
  (Stand war 22b4714 — bei Bedarf wiederherstellbar per
  `git push origin 22b4714:refs/heads/<name>`). Repo hat jetzt nur noch `master`.

## Offen
- Keine unfertige Code-Baustelle. Zurueckgestellte Punkte stehen als **V8** (Direkt-
  eingabe im Gewichts-Rad), **I1** (Bildschirm-wach + Pausen-Timer) und **I5**
  (dunkles Design) in `verbesserungen.md` — nur auf Gabriels Zuruf anfassen.

## Naechste Schritte (Claude)
1. Nach Gabriels Handy-Tests (siehe `meine-todos.md`): meldet er Probleme beim Sync
   oder beim Quick-Log-Knopf, zuerst Firestore-Rules und Notification-Payload
   pruefen — beides ist v1.2.0-neu und nur am Geraet final testbar.
2. Kosmetik, falls noch vorhanden: leerer Ordner
   `.claude\worktrees\sad-saha-69e479` (nur die Huelle, Inhalt und Git-Registrierung
   sind weg — er war das Arbeitsverzeichnis der Sitzung und liess sich deshalb nicht
   loeschen). Einfach `rmdir` bzw. mit dem naechsten Aufraeumen entfernen.

## Stolperfallen (aktuell)
- **Im Haupt-Checkout `C:\Projekte\Fitness Tracker` arbeiten**, nicht in einem
  Worktree: Die letzte Sitzung lief in einem Worktree, und der Sessionstart-Hook
  hat dort eine veraltete `weitermachen.md` geladen ("v1.2.0 nicht deployt") —
  genau die Falle, die das Aufraeumen beseitigt hat.
- Geteilte Dateien immer in `src/` UND `single/src/` aendern (`npm run check:drift`);
  TrackingView/HistoryView/notifications/sw-custom sind dokumentierte Ausnahmen und
  muessen von Hand parallel gepflegt werden.
- Preview-Tool rendert in dieser Umgebung nicht (rAF eingefroren): Logik ueber
  Seitenstruktur/IndexedDB pruefen, Firebase-Console ueber Claude-in-Chrome.
- JSON-Backups beider Handys existieren (vor dem Update erstellt, 2026-08-17).
