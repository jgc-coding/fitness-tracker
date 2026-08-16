# Weitermachen — Stand 2026-08-16

## Stand
- **v1.2.0 (Gym-UX-Release) fertig auf Branch `claude/fitness-tracker-gym-ux-fb030f`** —
  enthaelt per Merge auch das komplette v1.1.0 (Sicherheits-Release vom 07.07.).
  NICHT auf master, NICHT deployt.
- Umgesetzt: V2-V7, V9-V13 + I2/I3/I4 aus `verbesserungen.md` (Details/CHANGELOG dort).
  Entschieden: 1 Satz je Uebung bleibt (CLAUDE.md, Architektur-Hinweise).
- Regressionstest: check:drift + build:all gruen; Kernfunktionen live in der
  Single-Variante durchgespielt (Liste in verbesserungen.md).

## Offen / naechste Schritte (Reihenfolge wichtig!)
1. Gabriel: Firebase Console Schritte 1-3 aus `docs/firebase-absicherung.md`
   (E-Mail/Passwort-Provider an, gemeinsames Konto anlegen, Registrierung sperren).
2. Branch `claude/fitness-tracker-gym-ux-fb030f` auf master mergen — der Push
   loest das Deployment automatisch aus (/deploy bzw. deploy.yml). Tag `v1.2.0`.
3. Beide Handys: App laden, Einstellungen → Cloud-Sync → anmelden.
4. Gabriel: Rules scharf schalten + Anonym-Provider aus (Schritte 5-6 der Anleitung).
5. Am Handy einmal pruefen: Quick-Log-Knopf in der Sperrbildschirm-Notification
   (traegt Satz ohne App-Oeffnen ein — Verhalten ist nur am Geraet final testbar).

## Stolperfallen (aktuell)
- ERST einloggen (Schritt 3), DANN Rules scharf (Schritt 4) — sonst pausiert Sync.
- Geteilte Dateien immer in src/ UND single/src/ aendern (`npm run check:drift`);
  TrackingView/HistoryView/notifications/sw-custom sind dokumentierte Ausnahmen
  und muessen von Hand parallel gepflegt werden.
- Der alte Branch `claude/sad-saha-69e479` ist jetzt vollstaendig im Arbeits-Branch
  enthalten — nach dem master-Merge kann er weg (nicht vorher loeschen).
- Preview-Tool: Tab rendert nicht (rAF eingefroren) — Transitions/Screenshots dort
  nicht beurteilbar, Logik ueber Seitenstruktur/IndexedDB testen.
- Deploy-Nachricht an Lisa & Gab: "Nach dem Update einmalig anmelden, sonst kein
  Sync (Daten bleiben lokal erhalten)". Kein Datenverlust: Schema-Aenderungen sind
  additiv (workoutLog.exercises, exercise.lastUsedAt — alte Daten bleiben lesbar).
