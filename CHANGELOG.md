# Changelog

Alle nennenswerten Aenderungen am Keto Hybrid Fitness Tracker.
Format: Datum + Stichpunkte je Version (SemVer).

## [1.2.0] — 2026-08-16

Gym-UX-Release (Befunde V2-V13 + Ideen I2-I4 der /improve-Runde "Gym-UX").
Zusaetzlich zur Entscheidung dokumentiert: Es bleibt bewusst bei EINEM
getrackten Satz je Uebung (Referenzwert), kein Multi-Set-Tracking.

### Features
- **Quick-Log vom Sperrbildschirm (I3):** Die Workout-Benachrichtigung hat je
  Nutzer einen Knopf "Name OK: Uebung Gewicht x Wdh" — ein Tap traegt den Satz
  mit den vorgeschlagenen Werten ein, ohne die App zu oeffnen (der Service
  Worker schreibt direkt in die lokale Datenbank; Sync holt es nach).
- **Tausch nur heute oder dauerhaft (I2):** Beim Uebungs-Tausch fragt die App,
  ob der Ersatz nur fuer heute gilt oder den Plan dauerhaft aendern soll.
- **Zuletzt benutzt zuerst (I2):** Tausch-, Hinzufuegen- und Individuell-Listen
  sortieren nach zuletzt benutzter Uebung; die Tausch-Liste zeigt zusaetzlich
  die gleiche Muskelgruppe zuerst (V7).
- **App-Shortcuts (I4):** Long-Press aufs App-Icon bietet "Individuelles
  Training" und "History".

### Fixes
- **Tausch/Quick-Add ueberleben Tab-Wechsel und Reload (V2):** Abweichungen vom
  Plan werden am Workout-Protokoll gespeichert statt nur in der Ansicht.
  Vorher verschwand die getauschte Uebung (samt sichtbarem Satz) beim
  Zurueckkommen.
- **Individuelles Training ist reload-fest (V3):** Es liegt jetzt wie
  Plan-Workouts in der Datenbank und wird nach App-Neustart fortgesetzt.
- **0-kg-Vorschlag (V4):** Koerpergewichtsuebungen mit 0 kg bekommen nicht mehr
  faelschlich 20 kg vorgeschlagen.
- **Katalog-Sortierung (V5):** Uebungen sortieren jetzt sprachbewusst; klein-
  geschriebene Namen landen nicht mehr am Listenende.
- **Loesch-Warnung (V6):** Uebung mit Trainingseintraegen loeschen warnt, dass
  die Eintraege aus History und Export verschwinden.
- **History oeffnet bei den neuesten Trainings (V9)** statt ganz links bei den
  aeltesten.
- **Steigern-Merker wirkt (V10):** Der Vorschlag rechnet die Schrittweite
  (1,25 kg Langhantel/Maschine, sonst 1 kg) direkt ein.

### Intern
- v1.1.0 (Sicherheits-Release) in diesen Stand gemergt — Deploy-Reihenfolge
  siehe `weitermachen.md` (Firebase-Schritte VOR dem Merge auf master!).
- Prozess: `.claude/pruefen.txt` (Done-Gate), Prozess-Stufe "Produkt" in
  CLAUDE.md, echtes README statt Vite-Vorlage (V11-V13).
- verbesserungen.md als dauerhaftes Befund-Register eingefuehrt.

## [1.1.0] — 2026-07-07

Sicherheits- und Robustheits-Release (alle Punkte des /improve-Audits ausser Multi-Set).

### Sicherheit
- **Cloud-Zugriff abgesichert:** E-Mail/Passwort-Login (gemeinsames Konto)
  statt anonymer Anmeldung; Firestore-Regeln nur noch fuer das Konto
  (Vorlage in `firestore.rules`, Anleitung in `docs/firebase-absicherung.md`).
  Vorher konnte jeder Besucher der App-URL alle Daten lesen/aendern/loeschen.
- Dependencies: `npm audit fix` (Vite 6.4.3) — 0 bekannte Schwachstellen.

### Sync
- **Tombstones:** Geloeschte Eintraege koennen nicht mehr durch ein Geraet,
  das waehrend der Loeschung offline war, "wiederauferstehen"
  (neue `deletions`-Tabelle, Dexie-Schema v2, additiv/verlustfrei).
- **Sichtbare Push-Fehler:** Fehlgeschlagene Uploads landen in einer
  Warteschlange, werden automatisch nachgeholt (App-Start, wieder online,
  naechster Erfolg) und in den Einstellungen rot angezeigt.

### Features
- **Backup-Import in der App:** Einstellungen → Backup. Export enthaelt jetzt
  auch Benutzernamen (meta) und Loesch-Merker; Import ist merge-only
  (loescht nie) und gleicht danach mit der Cloud ab.
- **Android-Zurueck schliesst Dialoge** statt die App zu verlassen.

### Fixes
- CSV-Export: UTF-8-BOM (Excel-Umlaute) und keine leeren Uebungszeilen mehr.
- History: Uebungen ohne geloggte Werte erzeugen keine leeren Zeilen mehr.
- Notification-Klick fokussiert nur noch echte App-Fenster (strikter
  Scope-Match statt Substring) — wahrscheinliche Ursache fuer
  "App oeffnet im Browser statt als App".
- Viewport erlaubt wieder Zoomen (`user-scalable=no` entfernt).

### Intern
- Drift-Waechter `scripts/check-drift.mjs`: geteilte Dateien zwischen
  `src/` und `single/src/` muessen byte-identisch sein; laeuft vor jedem
  Build/Deploy. Alle Fixes in beide Apps gespiegelt.
- Toter Code entfernt (volumeCalc, ungenutzte useHistory-Funktionen,
  Scaffold-Assets in beiden Apps).
- CHANGELOG.md (dieses Dokument) rueckwirkend angelegt, CLAUDE.md
  aktualisiert, `.gitattributes` gegen Zeilenenden-Drift.
- UI-Feinschliff: weichere Schatten, aktive Nav-Pill, Fokus-Ringe,
  Button-Feedback, Modal-Grabber (bewusst ohne color-mix — kompatibel
  mit aelteren Android-WebViews).

## [1.0.8] — 2026-06-30
- FitTrack Single: unabhaengige Einzelnutzer-Variante unter
  `/fitness-tracker/single/` (eigene IndexedDB, kein Cloud-Sync,
  eigene PWA); Deploy baut beide Apps (`build:all`).
  (Als Feature-Merge ohne Versions-Bump veroeffentlicht.)

## [1.0.7] — 2026-05-30
- Technische Verbesserungen: Firebase lazy geladen (kleineres Bundle),
  Version aus package.json als Single Source of Truth (`__APP_VERSION__`),
  Sync-Status in den Einstellungen.

## [1.0.6] — 2026-05-30
- Empfehlung zeigt letzten statt maximalen Wert.
- Individuelles Training (freie Uebungsauswahl ohne Plan).
- Klick auf die Workout-Benachrichtigung oeffnet/fokussiert die App.

## [1.0.5] — 2026-04-18
- Bugfixes aus Code-Audit.

## [1.0.4] — 2026-04-15
- Uebungsauswahl: Sortierung + Gruppierung, DB/BB-Abkuerzungen.

## [1.0.3] — 2026-04-15
- Firebase-Cloud-Sync zwischen den Geraeten (damals anonyme Anmeldung).

## [1.0.2] — 2026-04-14
- Dezentes Steigern-Icon, Plan loeschen, Title-Case-Namen, Notizen inline.

## [1.0.0] — 2026-04-09
- Erstversion: PWA mit Tracking (WheelPicker, zwei Nutzer), Planung
  (Plaene/Trainingstage, Woche A/B, Deload), History-Spreadsheet,
  Uebungskatalog, CSV/JSON-Export, Seed-Daten, GitHub-Pages-Deploy.
