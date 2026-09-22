# Keto Hybrid Fitness Tracker

PWA zum Tracken, Planen und Auswerten von Kraftsport-Training fuer drei Personen
(Lisa, Gab & Ben). Beim Start waehlt man, wer heute trainiert (1 bis 3 Nutzer);
alle teilen denselben Plan mit individuellen Gewichten und Wiederholungen.
Offline-first (IndexedDB), optionaler Cloud-Sync zwischen den Geraeten ueber
Firebase (gemeinsames Konto), deployed auf GitHub Pages.

## Funktionen
- Nutzerwahl beim App-Start ("Wer trainiert?"), im Workout jederzeit aenderbar;
  Anzeige und Sperrbildschirm-Knoepfe folgen den aktiven Nutzern
- Trainingsplaene mit Trainingstagen (woechentlich oder Woche A/B), Deload-Hinweis
- Workout-Tracking mit Gewichts-/Wiederholungsraedern, Vorbelegung mit den
  letzten Werten, "Gewicht steigern"-Merker
- Uebungsfotos mit Muskel-Grafik und Detailansicht, dort Notizen je Nutzer
- Alternativ-Uebungen je Plan-Eintrag mit Schnellwechsel im Workout
  (Tippen oder Wischen); Uebung tauschen (nur heute oder dauerhaft im Plan)
  oder spontan hinzufuegen; individuelles Training ohne Plan
- Workout-Notiz und Zyklustag am Trainings-Protokoll, nachtraeglich editierbar
  im Tages-Detail der History
- Sperrbildschirm-Benachrichtigung mit Quick-Log-Knopf (Satz eintragen ohne
  die App zu oeffnen)
- History als horizontales Spreadsheet je Muskelgruppe, CSV-Export, JSON-Backup
- Laufplaner-Reiter: Jahresplan per JSON-Import, Garmin-Abgleich ueber
  intervals.icu

## Entwicklung
```bash
npm install
npm run dev            # Entwicklungsserver auf http://localhost:5173/fitness-tracker/
npm run build          # Produktions-Build (wird im Deploy genutzt)
```

Details zu Architektur und Konventionen: `CLAUDE.md`. Firebase-Absicherung:
`docs/firebase-absicherung.md`. Aenderungshistorie: `CHANGELOG.md`.
