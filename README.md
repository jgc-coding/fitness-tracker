# Keto Hybrid Fitness Tracker

PWA zum Tracken, Planen und Auswerten von Kraftsport-Training fuer drei Personen
(Lisa, Gab & Ben). Offline-first (IndexedDB), optionaler Cloud-Sync zwischen den
Geraeten ueber Firebase (gemeinsames Konto), deployed auf GitHub Pages.

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
npm run dev            # Entwicklungsserver auf http://localhost:5173/fitness-tracker/
npm run build          # Produktions-Build (wird im Deploy genutzt)
```

Details zu Architektur und Konventionen: `CLAUDE.md`. Firebase-Absicherung:
`docs/firebase-absicherung.md`. Aenderungshistorie: `CHANGELOG.md`.
