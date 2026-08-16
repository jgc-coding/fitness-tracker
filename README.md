# Keto Hybrid Fitness Tracker

PWA zum Tracken, Planen und Auswerten von Kraftsport-Training fuer zwei Personen
(Lisa & Gab). Offline-first (IndexedDB), optionaler Cloud-Sync zwischen den
Geraeten ueber Firebase (gemeinsames Konto), deployed auf GitHub Pages.

Dazu gehoert **FitTrack Single** (`single/`): eine unabhaengige Einzelnutzer-
Variante ohne Cloud-Sync, die unter `/fitness-tracker/single/` mit ausgeliefert
wird.

## Funktionen
- Trainingsplaene mit Trainingstagen (woechentlich oder Woche A/B), Deload-Hinweis
- Workout-Tracking mit Gewichts-/Wiederholungsraedern, Vorbelegung mit den
  letzten Werten, "Gewicht steigern"-Merker
- Uebung mitten im Workout tauschen (nur heute oder dauerhaft im Plan) oder
  spontan hinzufuegen; individuelles Training ohne Plan
- Sperrbildschirm-Benachrichtigung mit Quick-Log-Knopf (Satz eintragen ohne
  die App zu oeffnen)
- History als horizontales Spreadsheet je Muskelgruppe, CSV-Export, JSON-Backup

## Entwicklung
```bash
npm install
npm run dev            # Haupt-App auf http://localhost:5173/fitness-tracker/
npm run dev:single     # Single-Variante
npm run check:drift    # Waechter: src/ und single/src/ muessen synchron sein
npm run build:all      # beide Apps bauen (wird im Deploy genutzt)
```

Details zu Architektur und Konventionen: `CLAUDE.md`. Firebase-Absicherung:
`docs/firebase-absicherung.md`. Aenderungshistorie: `CHANGELOG.md`.
