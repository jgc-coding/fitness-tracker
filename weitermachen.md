# Weitermachen — Stand 2026-08-17

## Stand
- **v1.2.0 ist LIVE** (GitHub Pages, Tag `v1.2.0`, master b9b1375): Gym-UX-Release
  inkl. komplettem v1.1.0-Sicherheits-Release. Deploy-Lauf gruen (erster Versuch
  scheiterte an GitHub-503, Rerun ok); Live-Manifeste beider Apps verifiziert.
- Firebase Console erledigt (2026-08-17, Schritte 1-3 der Anleitung):
  E-Mail/Passwort-Provider aktiv, gemeinsames Konto angelegt (chimento.gabriel@...),
  Selbst-Registrierung gesperrt. Anonym-Provider ist NOCH aktiv (bis Schritt 6).
- Umgesetzt: V2-V7, V9-V13 + I2/I3/I4 (Details in `verbesserungen.md`/CHANGELOG).
  Entschieden: 1 Satz je Uebung bleibt (CLAUDE.md).

## Offen / naechste Schritte
1. Kurz-Check (Schritt 7 der Anleitung): Test-Gewicht auf einem Handy eintragen →
   muss nach Sekunden auf dem anderen erscheinen; Einstellungen → Cloud-Sync
   muss weiter „Aktiv" zeigen (beweist: Rules-Scharfschaltung stoert den Sync nicht).
2. Am Handy pruefen: Quick-Log-Knopf in der Sperrbildschirm-Notification
   (traegt Satz ohne App-Oeffnen ein — nur am Geraet final testbar).
3. Aufraeumen (optional, nur mit Gabriels Ok): 10 anonyme Alt-Nutzer in der
   Firebase-Konsole loeschen (sind seit Anonym-Deaktivierung wirkungslos);
   Branches `claude/sad-saha-69e479`, `claude/fitness-tracker-gym-ux-fb030f`
   und `claude/optimistic-blackburn-4a854f` loeschen (alle in master enthalten).

## Firebase-Absicherung — ERLEDIGT 2026-08-17 (alle 6 Schritte)
E-Mail/Passwort-Provider aktiv (ohne E-Mail-Link) · gemeinsames Konto
chimento.gabriel@gmail.com (Passwort nur bei Gabriel/Passwort-Manager) ·
Selbst-Registrierung gesperrt · v1.2.0 deployt · beide Handys angemeldet ·
Firestore-Rules scharf (nur das Konto, Vorlage = firestore.rules) ·
Anonym-Provider deaktiviert. Rollback: Rules-Versionshistorie in der Console.

## Stolperfallen (aktuell)
- Rules erst scharf schalten, wenn BEIDE Handys angemeldet sind (Reihenfolge!).
- Geteilte Dateien immer in src/ UND single/src/ aendern (`npm run check:drift`);
  TrackingView/HistoryView/notifications/sw-custom sind dokumentierte Ausnahmen
  und muessen von Hand parallel gepflegt werden.
- Preview-Tool: Tab rendert nicht (rAF eingefroren) — Logik ueber
  Seitenstruktur/IndexedDB testen; fuer die Firebase-Console stattdessen
  Claude-in-Chrome nutzen (funktioniert, Screenshots ok).
- JSON-Backups beider Handys existieren (vor dem Update erstellt, 2026-08-17).
