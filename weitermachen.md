# Weitermachen — Stand 2026-07-07

## Stand
- v1.1.0 fertig auf Branch `claude/sad-saha-69e479` (8 Commits, NICHT gemerged/deployed).
- Umgesetzt: /improve-Punkte 1-10 + 12 (Sicherheit: E-Mail-Login + Rules-Vorlage,
  Tombstones, Retry-Queue, Backup-Import, CSV-BOM, History-Filter, Drift-Waechter,
  Doku, toter Code, Modal-Back, SW-Fokus-Fix, UI-Polish). Punkt 11 (Multi-Set) offen.
- Regressionstest am Production-Build gruen (Login-Flow, Dexie-v2-Migration,
  Backup-Import E2E, History, Single-App); build:all + check:drift + audit gruen.

## Offen / naechste Schritte (Reihenfolge wichtig!)
1. Gabriel: Firebase Console Schritte 1-3 aus `docs/firebase-absicherung.md`
   (E-Mail/Passwort-Provider an, gemeinsames Konto anlegen, Registrierung sperren).
2. Merge auf master + Deploy (/deploy) + Git-Tag `v1.1.0`.
3. Beide Handys: App laden, Einstellungen -> Cloud-Sync -> anmelden.
4. Gabriel: Rules scharf schalten + Anonym-Provider aus (Schritte 5-6 der Anleitung).
5. Punkt 11 entscheiden: Sets-Feld aus Planung entfernen ODER Multi-Set-Tracking.

## Stolperfallen (aktuell)
- ERST einloggen (Schritt 3), DANN Rules scharf (Schritt 4) — sonst pausiert Sync.
- Geteilte Dateien immer in src/ UND single/src/ aendern (`npm run check:drift`).
- Deploy-Nachricht an Lisa & Gab: "Nach dem Update einmalig anmelden, sonst kein
  Sync (Daten bleiben lokal erhalten)". Kein Datenverlust: Dexie v2 ist additiv.
- Preview-Tool: Tab rendert nicht (rAF eingefroren) — Transitions/Screenshots dort
  nicht beurteilbar, Logik ueber Vue-State/history testen.
