# Keto Hybrid Fitness Tracker

**Prozess-Stufe: Produkt** (taeglich in Benutzung — Versionierung, CHANGELOG, Regressionscheck und Done-Gate gelten voll)

## Projektbeschreibung
PWA zum Tracken, Planen und Auswerten von Kraftsport-Training fuer drei Personen
(Lisa, Gab & Ben). Alle trainieren denselben Plan mit individuellen
Gewichten/Wiederholungen. Offline-first auf Android, Daten lokal in IndexedDB,
deployed auf GitHub Pages. Dazu der Reiter „Laufen" (Laufplaner, siehe unten).

## Tech-Stack
- **Frontend:** Vue 3 (Composition API) + Vite 6, Vue Router 4 (Lazy Loading), Pinia
- **Sprache:** JavaScript, **kein** TypeScript
- **Offline-DB:** Dexie.js v4 (IndexedDB)
- **Cloud-Sync:** Firebase (Firestore + Auth), lazy geladen; gemeinsames
  E-Mail/Passwort-Konto — Setup: `docs/firebase-absicherung.md` + `firestore.rules`
- **PWA:** vite-plugin-pwa (Workbox); **Hosting:** GitHub Pages via `deploy.yml`
- **CSS:** custom, keine UI-Bibliothek. Moderne Features wie `color-mix` fuer NEUE
  Styles meiden (alte Android-WebViews) — statische rgba-Werte bevorzugen

## Design-Tokens (`src/styles/variables.css`)
Hintergrund `#f3f6f7` · Akzent `#911f2f` · Text `#1e1f23` ·
User 1 Lisa `#911f2f` (rot) · User 2 Gab `#2c5f8a` (blau) · User 3 Ben `#2f7d4f` (gruen)

## Dateistruktur (nur, was der Dateiname nicht verraet)
```
src/
  db/dexie.js            Schema v3: exercises, plans, trainingDays, workoutLogs,
                         setLogs, syncQueue, meta, deletions, runPlans, runSessions
  services/syncService.js  Login, Firestore-Listener, Reconcile, Tombstones, Retry-Queue
  stores/running.js      Laufplaene, Laeufe, Import/Merge, Status-Export
  composables/useHistory.js  Spreadsheet-Daten, letzte Werte, Steigerungslogik
  components/shared/     Modal (Android-Back schliesst!), EmptyState, WheelPicker
  utils/
    runPlanSchema.js     Pruefmodul + Vokabular des Laufplan-Formats (reines JS)
    runPlanMerge.js      Merge-Regeln des Imports (reine Funktion)
    runMatch.js          Zuordnung Aktivitaet -> geplanter Lauf (reine Funktion)
    intervalsApi.js      Abruf und Umrechnung von intervals.icu (Browser + Node)
    exportData.js        CSV mit UTF-8-BOM, JSON-Backup (Import ist merge-only)
    dateHelpers.js       KW-Erkennung, Deload-Berechnung
    formatters.js        toTitleCase (Uebungsnamen, DB/BB-Abkuerzungen)
public/sw-custom.js      notificationclick + Quick-Log (schreibt in IndexedDB)
scripts/                 laufplan-pruefen, laufplan-vorgaben, pace-modell
                         (+ lib/pace-modell-kern), lauf-cloud, intervals-abruf
                         Vertragstests: laufplan-merge-test, runmatch-test, pace-modell-test
docs/                    firebase-absicherung, laufplan-format (+ -beispiel.json),
                         laufplaner-plan, laufplan-cloud, laufplan-vorgaben,
                         garmin-anbindung
```
Views (6 Reiter), Router, Stores `auth`/`plans`/`workout`, `styles/`, `main.js` und
`App.vue` heissen wie ihr Inhalt.

## Befehle
```bash
npm run dev       # Entwicklungsserver (Port 5173)
npm run build     # Produktions-Build nach /dist — so laeuft der Deploy
npm run preview   # Build lokal testen (Port 4173)
```

## Architektur: Kraft-Training
- **Offline-first:** Alle Reads aus IndexedDB. Writes gehen in IndexedDB und (wenn
  angemeldet) direkt nach Firestore; fehlgeschlagene Pushes landen in der `syncQueue`
  und werden nachgeholt (App-Start, online-Event, naechster Erfolg).
- **Kein Sync ohne Login** (Status `auth-required`, Banner im Tracking). Anonyme
  Alt-Sessions werden aktiv abgemeldet. Die App hat KEINE Registrierung — Konten
  entstehen nur in der Firebase Console.
- **Loeschen = Tombstone:** `pushDelete` schreibt erst einen Merker in `deletions`
  (lokal, offline-faehig), dann Cloud. Reconcile ueberspringt tombstoned Records —
  sonst laedt ein Offline-Geraet Geloeschtes wieder hoch ("Wiederauferstehung").
- **Vue-Proxys nie direkt in Dexie schreiben:** reaktive Objekte/Arrays (z.B.
  `day.exercises`) sprengen `put`/`update` mit `DataCloneError`. Vorher flach
  kopieren (`list.map(e => ({ ...e }))`).
- **Ein Satz je Uebung ist Absicht** (Entscheidung Gabriel 2026-08-16): genau ein
  Referenzwert (Gewicht x Wdh) je Uebung und Nutzer; das Sets-Feld der Planung ist
  reine Notiz. Kein Multi-Set-Tracking bauen.
- **Vorwert = Gewicht x Wdh aus EINEM Datensatz:** Karte, Empfehlungszeile,
  Rad-Vorbelegung, Quick-Log-Knopf und Sperrbildschirm lesen die Wdh nur ueber
  `getLastReps` (TrackingView) — und die holt sie aus `recommendations`, also aus
  demselben gespeicherten Satz, aus dem das Gewicht kommt. Zwei getrennte Speicher
  gab es schon einmal: der Gewichtsvorschlag wurde nur bei einem Treffer
  ueberschrieben, die Wdh dagegen immer, und ein leeres Abfrageergebnis liess das
  Gewicht ohne Wdh stehen (v1.8.1). Auf 360-px-Handys bricht der Wert vor dem "x"
  um (`{{ ' ' }}` im Template ist Absicht, siehe Kommentar dort).
- **Workout-Abweichungen liegen am Log:** Tausch/Quick-Add schreiben die aktuelle
  Uebungsliste als `exercises`-Override an den `workoutLog` (persistWorkoutExercises);
  Resume nutzt das Override, sonst die Plan-Liste. Individuelle Trainings liegen
  ebenfalls in `db.workoutLogs` (isCustom) und ueberleben Reloads.
- **Zuletzt benutzt:** `saveSet` stempelt `lastUsedAt`; Tausch-/Add-/Custom-Listen
  sortieren danach, die Tausch-Liste gruppiert "gleiche Muskelgruppe zuerst".
- **Quick-Log aus der Notification:** Die App legt je Nutzer eine Warteschlange
  fertiger setLog-Datensaetze in `notification.data` (buildNotificationQuickLog); der
  Service Worker schreibt sie bei Knopfdruck direkt in IndexedDB (zusaetzlich in die
  syncQueue) — funktioniert ohne offene App.
- **Nur ZWEI Notification-Knoepfe (Android-Limit):** Platz 1 Quick-Log des
  Standard-Nutzers (leere Warteschlange -> naechster Nutzer rueckt nach), Platz 2 fest
  "Workout beenden" (setzt completedAt, `data.workoutLogId`); danach meldet der SW
  `workout-finished` an offene Fenster. Die Regel steht DOPPELT —
  `buildNotificationActions` (TrackingView) und `showCompactNotification`
  (Service Worker) muessen gleich bleiben.
- **Gewichtsschritte:** 1.25 kg fuer Barbell/Machine-Weight, 1 kg sonst.
- **Exercise Picker (Planung):** sammelt lokal, speichert batch beim Schliessen.
- **Standard-Nutzer ist GERAETE-lokal** (`localStorage`, Schluessel mit DB-Namen, siehe
  `stores/auth.js`): Vorauswahl im Gewichts-Rad, in der History, am Notification-Knopf.
  Bewusst NICHT in `db.meta` — die Tabelle wird gesynct, und beide Handys wuerden sich
  den Wert gegenseitig ueberschreiben.

## Architektur: Laufplaner
- **Claude plant, die App zeigt und haelt fest.** Plaene entstehen NICHT in der App,
  sondern als JSON-Datei von Claude (Vertrag: `docs/laufplan-format.md`). Der Import
  prueft erst vollstaendig, zeigt eine Vorschau und schreibt dann in EINER
  Dexie-Transaktion; Tombstones und Cloud-Push laufen danach.
- **Merge-Regel:** Kennungen (`id`) sind die Klammer zwischen Claude und App. Erledigte
  und ausgelassene Laeufe gewinnen immer lokal, noch geplante uebernimmt die Datei,
  geloescht wird nur, was geplant UND in der Zukunft ist. Aendert sich nichts, wird
  nichts geschrieben (der eigene Status-Export ergibt beim Re-Import "keine Aenderung").
  Ausformuliert in `docs/laufplaner-plan.md` 5.4.
- **Der Test ist der Vertrag, nicht der Code.** Wer Merge- oder Abgleich-Regeln
  anfasst, erweitert ZUERST `scripts/laufplan-merge-test.mjs` bzw.
  `scripts/runmatch-test.mjs`.
- **Ein Satz je Lauf, ein Haken:** kein Lauf-Tracking in der App. Der Haken darf ohne
  Ist-Werte gesetzt werden; in der Wochenbilanz zaehlt dann der Planwert.
- **`targets` gehoert dem PLAN, `feedback` dem LAEUFER.** `targets` ist die Puls- und
  Tempovorgabe (bis zu vier Abschnitte je Lauf, `{ label, hrFrom, hrTo, paceFrom,
  paceTo }`, Tempo als Text "m:ss", leer = `null`); fehlt sie in einer neuen Datei, ist
  sie zurueckgenommen. `feedback` ist `{ rpe 1-5, note, at }` und geht NIE verloren —
  kein Import und kein Garmin-Abgleich fasst es an. `actual.note` gehoert dagegen der
  Maschine (Zeitnotiz der Uhr, Grund fuers Auslassen).
- **Die Tempozahlen kommen aus der eigenen Historie**, nicht aus einer Tabelle
  (`docs/laufplan-vorgaben.md`). Ausserhalb des gemessenen Pulsbereichs wird die
  Hochrechnung gedaempft, sonst entstuende ein Schwellentempo, das niemand laufen kann.
  Das Trainingswissen (Pulsbereiche) liegt in `privat\pace-profil.json`, nie im Repo.
- **Der PC kann direkt an die Cloud** (`scripts/lauf-cloud.mjs`,
  `docs/laufplan-cloud.md`): dasselbe Konto, dieselben Regeln, derselbe Merge wie in
  der App. Ohne `--jetzt` immer nur ein Trockenlauf, vor jedem Schreiben eine
  Sicherung, beim Loeschen ein Tombstone. Zugangsdaten NUR in
  `privat\firebase-konto.json`, nie im Chat.
- **Garmin laeuft ueber intervals.icu, nicht direkt.** Die App holt fertige Aktivitaeten
  (`intervalsApi.js`), ordnet sie dem geplanten Lauf desselben Tages zu (`runMatch.js`)
  und setzt Haken samt Ist-Werten. Sie loescht nie etwas, entfernt nie einen Haken,
  ergaenzt einen von Hand gesetzten nur; dieselbe Aktivitaet kommt nie zweimal herein
  (`externalId` = `athleteId:id`).
- **Zeit bei Laeufen: Runden zaehlen anders.** Fuer Lauf-Typ `loops` gilt die Gesamtzeit
  (`elapsed_time`), sonst die Zeit in Bewegung (`moving_time`); der andere Wert landet
  als Notiz in `actual.note`. Beim Backyard 2026 sind das 12:00 h gegen 9:24 h. Das
  Dateiformat kennt nur EIN Minutenfeld — ein zusaetzliches Feld in `actual` ginge beim
  Status-Export still verloren.
- **Schluessel fuer intervals.icu sind GERAETE-lokal** (`localStorage`): nicht in
  `db.meta`, nicht in der Cloud, nicht im Backup-Export. Die Athleten-Id steckt dagegen
  in jeder `externalId` und ist damit Teil der gesyncten Daten — gewollt, sie ist kein
  Geheimnis.

## Deploy und Umgebung
- **Base-Path** `/fitness-tracker/` in Vite, Router und PWA-Manifest.
- **Default-User:** Lisa (user1), Gab (user2), Ben (user3).
- **Nach einem Deploy zeigt die PWA erst nach einem Neustart die neue Version** — der
  Service Worker liefert bis dahin den alten Stand aus. Zum Live-Pruefen im Browser:
  Service Worker abmelden, Caches leeren, dann von der Wurzel `/fitness-tracker/`
  starten; ohne Service Worker enden Deeplinks wie `/settings` bei GitHub Pages im 404.
- **Browser-Tests mit Testdaten nur auf einer frischen Adresse** wie
  `http://reps-test.localhost:5173/fitness-tracker/` (jede `*.localhost`-Subdomain ist
  eine eigene Herkunft ohne Anmeldung). `localhost` und `127.0.0.1` koennen aus einer
  frueheren Sitzung angemeldet sein — dann landet jeder gespeicherte Testsatz in der
  echten Cloud.
- **`privat\` gehoert in den Hauptbaum** (`C:\Projekte\Fitness Tracker\privat`). Ein
  `privat\` in einem Worktree geht mit ihm verloren: `git worktree remove` loescht
  ignorierte Dateien ohne Rueckfrage. Vorher `git status --porcelain --ignored` pruefen.

## Skills
- **`/deploy`** — Build, Commit, Push und Deploy auf GitHub Pages mit Status-Check
- **`/backup-restore`** — Backup aller IndexedDB-Daten als JSON, oder Wiederherstellung

## Connectoren/APIs
- Firebase-Projekt `gymtracker-ketohybrid` (Firestore + Auth), Config in
  `src/db/firebase.js`. Der API-Key ist bei Firebase kein Geheimnis — der Schutz liegt
  in den Firestore-Rules und der gesperrten Registrierung.
- **Zwei Logins mit derselben Adresse — die haeufigste Falle hier.** Die Firebase
  Console gehoert Google und nimmt Gabriels GOOGLE-Passwort. Das App-Konto steht in der
  Nutzerliste des Projekts (Anbieter nur E-Mail/Passwort, kein Google) und hat ein
  EIGENES. Wer das Google-Passwort in `privat\firebase-konto.json` schreibt, bekommt
  `INVALID_LOGIN_CREDENTIALS`, und Firebase sagt absichtlich nicht, welches von beiden
  falsch war. Kandidaten durchprobieren: `privat\passwort-pruefen.html`.
- **Dieses Repo ist OEFFENTLICH.** Keine personenbezogenen Daten in Repo-Dateien, auch
  nicht in Doku. Die Konto-E-Mail bleibt als Platzhalter `FITNESS-KONTO@BEISPIEL.DE` in
  `firestore.rules`; die echte Adresse existiert nur in der Firebase Console und in
  Claudes lokalem Memory.
- **Console-Arbeit** laeuft ueber Claude-in-Chrome (das Preview-Tool rendert sie nicht):
  Der Rules-Editor ist CodeMirror 5 (`document.querySelector('.CodeMirror')
  .CodeMirror.setValue(...)`); der Anonym-Anbieter-Dialog ist hoeher als das Fenster und
  nicht scrollbar — Speichern dort per Skript-Klick ausloesen.
