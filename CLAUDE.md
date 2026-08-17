# Keto Hybrid Fitness Tracker

**Prozess-Stufe: Produkt** (taeglich in Benutzung — Versionierung, CHANGELOG, Regressionscheck und Done-Gate gelten voll)

## Projektbeschreibung
PWA (Progressive Web App) zum Tracken, Planen und Auswerten von Kraftsport-Training fuer ein Paar (Lisa & Gab). Beide trainieren denselben Plan mit individuellen Gewichten/Wiederholungen. Offline-first auf Android, Daten lokal in IndexedDB. Deployed auf GitHub Pages.

## Tech-Stack
- **Frontend:** Vue 3 (Composition API) + Vite 6
- **Routing:** Vue Router 4 (5 Routen, Lazy Loading)
- **State:** Pinia (Stores: auth, plans, workout)
- **Offline-DB:** Dexie.js v4 (IndexedDB, Schema v2 mit `deletions`-Tombstones)
- **Cloud-Sync:** Firebase (Firestore + Auth), lazy geladen; Login mit gemeinsamem
  E-Mail/Passwort-Konto — Setup/Regeln: `docs/firebase-absicherung.md` + `firestore.rules`
- **PWA:** vite-plugin-pwa (Workbox, Service Worker)
- **Hosting:** GitHub Pages via GitHub Actions (`deploy.yml`)
- **CSS:** Custom, keine UI-Bibliothek. Moderne Features wie `color-mix` fuer NEUE
  Styles meiden (alte Android-WebViews) — statische rgba-Werte bevorzugen
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
  db/dexie.js            Dexie-Schema v2: exercises, plans, trainingDays, workoutLogs,
                         setLogs, syncQueue (Push-Retry), meta, deletions (Tombstones)
  db/firebase.js         Firebase-Init (lazy import; nur Haupt-App)
  services/
    syncService.js       Cloud-Sync: E-Mail-Login, Firestore-Listener, Reconcile,
                         Tombstones, Retry-Queue, Status-Refs (syncStatus, pendingPushCount)
  composables/           Wiederverwendbare Logik
    useExercises.js      Uebungen laden, suchen, CRUD
    useHistory.js        Spreadsheet-Daten, letzte Werte, Steigerungslogik
  views/
    TrackingView.vue     Workout ausfuehren, WheelPicker, Dual-User, Notifications
    PlanningView.vue     Plaene erstellen, Trainingstage, Uebungen zuordnen
    HistoryView.vue      Horizontales Spreadsheet, gruppiert nach Muskelgruppe
    CatalogView.vue      Uebungskatalog mit Suche und Filtern
    SettingsView.vue     Benutzernamen, Seeds, Backup (Export/Import), Cloud-Login, Info
  components/
    layout/              BottomNav (5 Tabs), TopBar (mit Sync-Status-Punkt)
    shared/              Modal (Android-Back schliesst!), EmptyState, WheelPicker
  utils/
    constants.js         MUSCLE_GROUPS, EQUIPMENT_TYPES, USERS, PLAN_TYPES
    dateHelpers.js       Datumsfunktionen, KW-Erkennung, Deload-Berechnung
    formatters.js        toTitleCase (Uebungsnamen, DB/BB-Abkuerzungen)
    notifications.js     Service Worker Notifications fuer Sperrbildschirm
    exportData.js        CSV-Export (mit UTF-8-BOM), JSON-Backup + Import (merge-only)
  styles/
    variables.css        CSS Custom Properties (Farben, Abstande, Fonts)
    global.css           Reset, Basisstile, Utility-Klassen
public/
  logo.svg               Keto Hybrid Logo
  icons/                 PWA-Icons (192px, 512px)
  sw-custom.js           notificationclick-Handler + Quick-Log (schreibt Saetze in IndexedDB)
scripts/
  check-drift.mjs        Waechter: geteilte Dateien src/ <-> single/src/ identisch
docs/
  firebase-absicherung.md  Console-Anleitung (Konto, Registrierung sperren, Rules)
firestore.rules          Vorlage der Firestore-Regeln (Einspielen manuell via Console)
.github/workflows/
  deploy.yml             CI/CD: Build + Deploy auf GitHub Pages (Branch: master)
```

## Befehle
```bash
npm run dev       # Entwicklungsserver (Port 5173)
npm run build     # Produktions-Build nach /dist
npm run preview   # Build lokal testen (Port 4173)

# FitTrack Single (unabhaengige Einzelnutzer-Variante, siehe unten)
# ACHTUNG: nutzt denselben Default-Port 5173 wie `npm run dev`. Laeuft beides
# parallel, antwortet still die Haupt-App -> `npm run dev:single -- --port 5175 --strictPort`
npm run dev:single     # Dev-Server der Single-Variante
npm run build:single   # Build nach /dist/single
npm run check:drift    # Prueft, ob src/ und single/src/ synchron sind
npm run build:all      # check:drift + beide Apps bauen — wird im Deploy genutzt
```

## FitTrack Single (unabhaengige Variante)
Eigenstaendige Variante fuer **eine** Person, komplett getrennt von der Zwei-Nutzer-App.
- **WICHTIG — Doppel-Wartung:** `single/src/` ist eine Kopie von `src/`. Jede Aenderung an
  einer geteilten Datei MUSS in beide Kopien (`cp src/X single/src/X`). `npm run check:drift`
  erzwingt das vor jedem Build; bewusste Ausnahmen stehen in `scripts/check-drift.mjs`.
- **Speicherort:** `single/` (eigene `index.html` + Kopie von `src/`), Build-Config `vite.single.config.js`
- **Unabhaengig:** Kein Firebase, kein Cloud-Sync. Eigene IndexedDB-Datenbank `FitnessTrackerSingle`
  (Haupt-App nutzt `FitnessTracker`) — auch im selben Browser keine gemeinsamen Daten.
- **Ein Nutzer:** `USERS` enthaelt nur `user1`; Dual-User-UI (User-Tabs, History-Umschalter) ist ausgeblendet.
- **Base-Path:** `/fitness-tracker/single/` — eigene PWA (Name „FitTrack Single", eigener Scope/Manifest/Service-Worker).
- **Deploy:** `deploy.yml` baut via `npm run build:all` beide Apps in dieselbe GitHub-Pages-Artifact
  (`/fitness-tracker/` und `/fitness-tracker/single/`). Die Haupt-App bleibt unveraendert; einzige Anpassung
  dort ist eine `navigateFallbackDenylist` fuer `/single/`, damit sich die Service-Worker nicht stoeren.

## Architektur-Hinweise
- **Offline-first:** Alle Reads kommen aus IndexedDB. Writes gehen in IndexedDB und werden
  (wenn angemeldet) direkt nach Firestore gepusht; fehlgeschlagene Pushes landen in der
  `syncQueue` und werden automatisch nachgeholt (App-Start, online-Event, naechster Erfolg).
- **Sync-Auth:** Kein Sync ohne Login (Status `auth-required`, Banner im Tracking).
  Anonyme Alt-Sessions werden aktiv abgemeldet. Die App hat KEINE Registrierung —
  Konten entstehen nur in der Firebase Console (`docs/firebase-absicherung.md`).
- **Loeschen = Tombstone:** `pushDelete` schreibt zuerst einen Merker in `deletions`
  (lokal, offline-faehig), dann Cloud. Reconcile ueberspringt tombstoned Records —
  sonst laedt ein Offline-Geraet Geloeschtes wieder hoch ("Wiederauferstehung").
- **Vue-Proxys nie direkt in Dexie schreiben:** reaktive Objekte/Arrays (aus `ref`/
  `reactive`, z.B. `day.exercises`) sprengen `put`/`update` mit `DataCloneError`.
  Vor jedem Schreibvorgang flach kopieren (`list.map(e => ({ ...e }))`).
- **Gewichtsschritte:** 1.25kg fuer Barbell/Machine-Weight, 1kg fuer alle anderen
- **Exercise Picker (Planung):** Sammelt Uebungen lokal, speichert batch beim Schliessen
- **Base-Path:** `/fitness-tracker/` in Vite, Router und PWA-Manifest
- **Default-User:** Lisa (user1), Gab (user2)
- **Ein Satz je Uebung ist Absicht** (Entscheidung Gabriel 2026-08-16): getrackt wird
  genau ein Referenzwert (Gewicht x Wdh) pro Uebung und Nutzer; das Sets-Feld der
  Planung ist reine Notiz. Kein Multi-Set-Tracking bauen.
- **Workout-Abweichungen liegen am Log:** Tausch/Quick-Add schreiben die aktuelle
  Uebungsliste als `exercises`-Override an den `workoutLog` (persistWorkoutExercises);
  Resume nutzt das Override, sonst die Plan-Liste. Individuelle Trainings liegen
  ebenfalls in `db.workoutLogs` (isCustom) und ueberleben Reloads.
- **Zuletzt benutzt:** `saveSet` stempelt `lastUsedAt` an die Uebung; Tausch-/Add-/
  Custom-Listen sortieren danach, die Tausch-Liste gruppiert zusaetzlich
  "gleiche Muskelgruppe zuerst".
- **Quick-Log aus der Notification:** Die App legt je Nutzer eine Warteschlange
  fertiger setLog-Datensaetze in `notification.data` (buildNotificationQuickLog);
  der Service Worker (`public/sw-custom.js`) schreibt sie bei Knopfdruck direkt in
  IndexedDB (Haupt-App zusaetzlich in die syncQueue) — funktioniert ohne offene App.

## Skills
- **`/deploy`** — Build, Commit, Push und Deploy auf GitHub Pages mit Status-Check
- **`/backup-restore`** — Vollstaendiges Backup aller IndexedDB-Daten als JSON, oder Wiederherstellung aus Backup-Datei

## Connectoren/APIs
- Firebase-Projekt `gymtracker-ketohybrid` (Firestore + Auth). Config in
  `src/db/firebase.js` (der API-Key ist bei Firebase kein Geheimnis — der Schutz
  liegt in den Firestore-Rules + gesperrter Registrierung, siehe docs/).
- **Dieses Repo ist OEFFENTLICH.** Keine personenbezogenen Daten in Repo-Dateien —
  auch nicht in Doku wie `weitermachen.md`. Die Konto-E-Mail bleibt als Platzhalter
  `FITNESS-KONTO@BEISPIEL.DE` in `firestore.rules`; die echte Adresse existiert nur
  in der Firebase Console (und in Claudes lokalem Memory).
- **Console-Arbeit** laeuft ueber Claude-in-Chrome (Preview-Tool rendert nicht):
  Der Rules-Editor ist CodeMirror 5 (`document.querySelector('.CodeMirror')
  .CodeMirror.setValue(...)`); der Anonym-Anbieter-Dialog ist hoeher als das Fenster
  und nicht scrollbar — Speichern dort per Skript-Klick ausloesen.
