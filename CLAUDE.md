# Keto Hybrid Fitness Tracker

## Projektbeschreibung
PWA (Progressive Web App) zum Tracken, Planen und Auswerten von Kraftsport-Training fuer ein Paar (2 Benutzer). Beide Benutzer trainieren denselben Plan, aber mit individuellen Gewichten und Wiederholungen. Die App funktioniert offline auf Android und synchronisiert Daten zwischen Geraeten via Cloud.

## Tech-Stack
- **Frontend:** Vue 3 (Composition API) + Vite
- **Routing:** Vue Router 4
- **State:** Pinia
- **Offline-DB:** Dexie.js v4 (IndexedDB)
- **Cloud:** Firebase Firestore + Auth + Hosting (Spark/Free) — noch nicht integriert
- **PWA:** vite-plugin-pwa (Workbox)
- **CSS:** Custom, keine UI-Bibliothek
- **Sprache:** JavaScript (kein TypeScript)

## Design-Tokens
- Hintergrund: `#f3f6f7` | Akzent: `#911f2f` | Text: `#1e1f23`
- User 1: `#911f2f` (rot) | User 2: `#2c5f8a` (blau)
- Definiert in `src/styles/variables.css`

## Dateistruktur
```
src/
  main.js              Einstiegspunkt, erstellt App mit Pinia + Router
  App.vue              Root-Komponente mit Bottom-Navigation
  router/index.js      4 Routen: /tracking, /planning, /history, /catalog
  stores/              Pinia Stores (auth, plans, workout)
  db/dexie.js          Dexie-Schema: exercises, plans, trainingDays, workoutLogs, setLogs
  composables/         useExercises, useHistory
  views/               TrackingView, PlanningView, HistoryView, CatalogView
  components/layout/   BottomNav, TopBar
  components/shared/   Modal, EmptyState
  utils/               constants, dateHelpers, volumeCalc, exportData
  styles/              variables.css, global.css
public/
  logo.svg             Keto Hybrid Logo
```

## Befehle
```bash
npm run dev       # Entwicklungsserver starten (Port 5173)
npm run build     # Produktions-Build nach /dist
npm run preview   # Build lokal testen
```

## Skills
<!-- Wird spaeter befuellt -->

## Connectoren/APIs
<!-- Wird spaeter befuellt — Firebase-Integration steht noch aus -->
