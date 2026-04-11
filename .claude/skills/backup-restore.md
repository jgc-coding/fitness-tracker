# Backup & Restore

Erstellt ein vollstaendiges Backup aller App-Daten oder stellt ein Backup wieder her.

## Backup

1. Erstelle eine JavaScript-Datei `backup-export.mjs` im Projektverzeichnis die:
   - Dexie importiert und die DB oeffnet (gleiche Schema-Definition wie `src/db/dexie.js`)
   - Alle Tabellen ausliest: exercises, plans, trainingDays, workoutLogs, setLogs, syncQueue, meta
   - Alles als JSON in eine Datei schreibt: `backup-YYYY-MM-DD.json`
   - Die Anzahl der Eintraege pro Tabelle ausgibt
2. Fuehre das Script aus: `node backup-export.mjs`
3. Zeige den Dateipfad und die Zusammenfassung

## Restore

1. Frage den Benutzer nach dem Pfad zur Backup-Datei
2. Erstelle eine JavaScript-Datei `backup-import.mjs` die:
   - Die JSON-Datei einliest
   - Validiert dass alle erwarteten Tabellen vorhanden sind
   - WARNUNG anzeigt: "Bestehende Daten werden ueberschrieben"
   - Alle Tabellen leert und die Backup-Daten einfuegt
   - Die Anzahl der wiederhergestellten Eintraege pro Tabelle ausgibt
3. Fuehre das Script aus: `node backup-import.mjs <pfad>`

## Wichtig
- Projektverzeichnis ist `C:\Projekte\Fitness Tracker`
- Dexie-Schema ist in `src/db/dexie.js` definiert
- Backup-Dateien NICHT committen (in .gitignore aufnehmen falls noetig)
- Dexie in Node.js braucht `dexie` + `fake-indexeddb` als Polyfill
- Alternative: Das Backup kann auch direkt als Download-Funktion in der App (SettingsView.vue) implementiert werden, falls ein rein browser-basierter Ansatz bevorzugt wird

## Format der Backup-Datei
```json
{
  "version": 1,
  "createdAt": "2026-04-11T...",
  "tables": {
    "exercises": [...],
    "plans": [...],
    "trainingDays": [...],
    "workoutLogs": [...],
    "setLogs": [...],
    "syncQueue": [...],
    "meta": [...]
  }
}
```
