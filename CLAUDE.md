# Keto Hybrid Fitness Tracker

## Projektbeschreibung
PWA (Progressive Web App) zum Tracken, Planen und Auswerten von Kraftsport-Training fuer ein Paar (Lisa & Gab). Beide trainieren denselben Plan mit individuellen Gewichten/Wiederholungen. Offline-first auf Android, Daten lokal in IndexedDB. Deployed auf GitHub Pages.

## Tech-Stack
- **Frontend:** Vue 3 (Composition API) + Vite 6
- **Routing:** Vue Router 4 (5 Routen, Lazy Loading)
- **State:** Pinia (Stores: auth, plans, workout)
- **Offline-DB:** Dexie.js v4 (IndexedDB)
- **PWA:** vite-plugin-pwa (Workbox, Service Worker)
- **Hosting:** GitHub Pages via GitHub Actions (`deploy.yml`)
- **CSS:** Custom, keine UI-Bibliothek
- **Sprache:** JavaScript (kein TypeScript)

## Design-Tokens
- Hintergrund: `#f3f6f7` | Akzent: `#911f2f` | Text: `#1e1f23`
- User 1 (Lisa): `#911f2f` (rot) | User 2 (Gab): `#2c5f8a` (blau)
- Definiert in `src/styles/variables.css`

## Dateistruktur
```
src/
  main.js                Einstiegspunkt, erstellt App mit Pinia + Router
  App.vue                Root-Komponente mit Bottom-Navigation
  router/index.js        5 Routen: /tracking, /planning, /history, /catalog, /settings
  stores/                Pinia Stores
    auth.js              Benutzernamen, User-Verwaltung
    plans.js             Trainingsplaene, Trainingstage, CRUD
    workout.js           Aktives Workout, Set-Logging, Gewicht-Steigern-Flag
  db/dexie.js            Dexie-Schema: exercises, plans, trainingDays, workoutLogs, setLogs, syncQueue, meta
  composables/           Wiederverwendbare Logik
    useExercises.js      Uebungen laden, suchen, CRUD
    useHistory.js        Spreadsheet-Daten, Max-Gewichte, Steigerungslogik
  views/
    TrackingView.vue     Workout ausfuehren, WheelPicker, Dual-User, Notifications
    PlanningView.vue     Plaene erstellen, Trainingstage, Uebungen zuordnen
    HistoryView.vue      Horizontales Spreadsheet, gruppiert nach Muskelgruppe
    CatalogView.vue      Uebungskatalog mit Suche und Filtern
    SettingsView.vue     Benutzernamen, Seed-Uebungen, Seed-History
  components/
    layout/              BottomNav (5 Tabs), TopBar
    shared/              Modal, EmptyState, WheelPicker
  utils/
    constants.js         MUSCLE_GROUPS, EQUIPMENT_TYPES, USERS, PLAN_TYPES
    dateHelpers.js       Datumsfunktionen, KW-Erkennung, Deload-Berechnung
    notifications.js     Service Worker Notifications fuer Sperrbildschirm
    exportData.js        CSV-Export (Spreadsheet-Layout), JSON-Backup
    volumeCalc.js        Volumenberechnung
  styles/
    variables.css        CSS Custom Properties (Farben, Abstande, Fonts)
    global.css           Reset, Basisstile, Utility-Klassen
public/
  logo.svg               Keto Hybrid Logo
  icons/                 PWA-Icons (192px, 512px)
.github/workflows/
  deploy.yml             CI/CD: Build + Deploy auf GitHub Pages (Branch: master)
```

## Befehle
```bash
npm run dev       # Entwicklungsserver (Port 5173)
npm run build     # Produktions-Build nach /dist
npm run preview   # Build lokal testen (Port 4173)
```

## Architektur-Hinweise
- **Offline-first:** Alle Reads kommen aus IndexedDB, Writes gehen in IndexedDB + syncQueue
- **Gewichtsschritte:** 1.25kg fuer Barbell/Machine-Weight, 1kg fuer alle anderen
- **Exercise Picker (Planung):** Sammelt Uebungen lokal, speichert batch beim Schliessen
- **Base-Path:** `/fitness-tracker/` in Vite, Router und PWA-Manifest
- **Default-User:** Lisa (user1), Gab (user2)
- **Default-Sets:** 2 pro Uebung bei Planerstellung

## Skills
- **`/deploy`** — Build, Commit, Push und Deploy auf GitHub Pages mit Status-Check
- **`/backup-restore`** — Vollstaendiges Backup aller IndexedDB-Daten als JSON, oder Wiederherstellung aus Backup-Datei

## Connectoren/APIs
<!-- Firebase-Integration steht noch aus — Cloud-Sync zwischen 2 Geraeten geplant -->
