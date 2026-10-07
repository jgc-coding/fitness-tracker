# Keto Hybrid Fitness Tracker

**Prozess-Stufe: Produkt** (taeglich in Benutzung — Versionierung, CHANGELOG, Regressionscheck und Done-Gate gelten voll)

## Projektbeschreibung
PWA zum Tracken, Planen und Auswerten von Kraftsport-Training fuer drei Personen
(user1, user2, user3). Wer hinter welcher Kennung steht, liegt nur in der lokalen
`CLAUDE.local.md` (gitignoriert, nicht im Repo). Alle trainieren denselben Plan mit
individuellen Gewichten/Wiederholungen. Offline-first auf Android, Daten lokal in
IndexedDB, deployed auf GitHub Pages. Dazu der Reiter „Laufen" (Laufplaner).

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
user1 `#911f2f` (rot) · user2 `#2c5f8a` (blau) · user3 `#2f7d4f` (gruen)

## Dateistruktur (nur, was der Dateiname nicht verraet)
```
src/
  db/dexie.js            Schema v4 (exercises, plans, trainingDays, workoutLogs,
                         setLogs, syncQueue, meta, deletions, runPlans,
                         runSessions, exerciseNotes)
  services/syncService.js  Login, Firestore-Listener, Reconcile, Tombstones, Retry-Queue
  stores/running.js      Laufplaene, Laeufe, Import/Merge, Status-Export
  composables/useHistory.js  Spreadsheet-Daten, letzte Werte, Steigerungslogik
  components/shared/     Modal (Android-Back schliesst; folgt der Tastatur),
                         UserSelectModal (Besetzung im laufenden Workout),
                         MuscleMap (graue KI-Figur + Maske je Muskel,
                         ohne Manifest-Eintrag die Grobgruppe)
  components/tracking/   ExerciseDetail (Bild-Ueberblendung, MuscleMap, Notizen,
                         Verlauf), StartNutzerwahl (Farbkreise Startbildschirm),
                         UebungsVerlauf (SVG-Diagramm + Liste)
  data/uebungskatalog.json  Bild-Manifest: key, quelle, bilder, vorschau,
                         primaer/sekundaer (Muskel-Ids), aliasse (Katalognamen)
  data/standardUebungen.js  Standardliste — liest App, Bild-Vertrag, Cloud-Abgleich
  data/muskelgrafik.js   18 Muskel-Ids, Grobgruppen, Dateien/Masse der Grafik —
                         Komponente, Bau-Skript und Tests lesen NUR hier
  utils/                 Regeln als reine Funktionen, je ein Vertragstest in
                         scripts/ (zuerst Test, dann Regeln): saetze,
                         uebungsRing, uebungsBilder, uebungsDubletten,
                         planReihenfolge, radWerte (Vorwert ausserhalb des
                         Rasters nie still ersetzen), verlauf, trainingGeraet,
                         runPlanMerge, runMatch, laufEintrag, zyklusTag;
                         dazu runPlanSchema (Format),
                         intervalsApi (Browser + Node), exportData (CSV mit
                         BOM, JSON-Backup, Import merge-only), formatters
public/sw-custom.js      notificationclick + Quick-Log (schreibt in IndexedDB)
public/uebungsbilder/    je Manifest-Key frame-<n>.webp + vorschau.webp, LIZENZ.md
public/muskelgrafik/     grundfigur.webp + je Muskel-Id eine Maske <id>.png
scripts/                 Aufruf und Flags stehen im Kopf jedes Skripts.
                         Cloud (Zugang privat\firebase-konto.json, aus dem
                         Worktree --konto <Hauptbaum>; schreibende nur mit
                         --jetzt, sonst Trockenlauf): lauf-cloud,
                         uebungen-cloud (nur lesen: Bestand vs. Standardliste
                         und Bilder), uebungen-dubletten, uebungen-korrigieren
                         (umbenennen/tauschen/Geraet; --zurueck nur mit
                         --gruppe). Bilder:
                         uebungsbilder-schneiden (--bogen, --vermessen),
                         uebungsbilder-zuschnitt (Tabelle),
                         uebungsbilder-reihen-messen, uebungsbilder-holen,
                         muskelgrafik-bauen. Lauf: laufplan-pruefen,
                         laufplan-vorgaben, pace-modell, intervals-abruf.
                         Vertragstests: siehe .claude\pruefen.txt (das Gate)
docs/                    firebase-absicherung, laufplan-format (+ -beispiel.json),
                         laufplaner-plan, laufplan-cloud, laufplan-vorgaben,
                         garmin-anbindung, plan-fittrack-v2,
                         uebungsbilder-chatgpt, tests/ (Handy-Checklisten)
```

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
  Alt-Sessions werden aktiv abgemeldet. KEINE Registrierung — Konten entstehen nur
  in der Firebase Console.
- **Loeschen = Tombstone:** `pushDelete` schreibt erst einen Merker in `deletions`
  (lokal, offline-faehig), dann Cloud. Reconcile ueberspringt tombstoned Records —
  sonst laedt ein Offline-Geraet Geloeschtes wieder hoch.
- **Neue Tabelle** (wie `exerciseNotes`, Dexie v4 additiv): in `SYNCED`,
  `IMPORT_TABLES` und den JSON-Export aufnehmen, sonst fehlt sie in Sync/Backup.
- **Vue-Proxys nie direkt in Dexie schreiben** (`DataCloneError`): reaktive
  Objekte/Arrays vorher flach kopieren (`list.map(e => ({ ...e }))`).
- **Saetze je Uebung sind eine Einstellung JE PERSON** (Gabriel 26.09.2026):
  Einstellungen -> 1-5, in `db.meta` als `saetze_<userId>` (gesynct). 1 = ein
  Referenzwert (Standard), ab 2 je Satz ein setLog mit `setNumber` 1..n (user1: 3).
  Regeln (offener Satz, Vorbelegung, Rad nach dem Speichern, Quick-Log-Folge) in
  `utils/saetze.js`. Das Sets-Feld der Planung bleibt reine Notiz.
- **Vorwert = Gewicht x Wdh aus EINEM Datensatz:** Karte, Empfehlung, Rad,
  Quick-Log und Sperrbildschirm lesen die Wdh nur ueber `getLastReps` aus
  `recommendations` — demselben Satz, aus dem das Gewicht kommt (zwei getrennte
  Speicher liessen in v1.8.1 Gewicht ohne Wdh stehen). Satz 1 ist der Eintrag in
  `recommendations`, Satz n kommt aus Satz n der letzten Einheit (`satzVorschlag`); "letzte Einheit" = OHNE das laufende Workout
  (`getLastSets(..., activeWorkout.id)`). Das `{{ ' ' }}` vor dem "×" ist Absicht
  (Umbruch auf 360 px).
- **Workout-Abweichungen liegen am Log:** Tausch/Quick-Add schreiben die Liste als
  `exercises`-Override an den `workoutLog` (persistWorkoutExercises); Resume nutzt
  das Override, sonst die Plan-Liste. Individuelle Trainings: `isCustom` im Log.
- **Zuletzt benutzt:** `saveSet` stempelt `lastUsedAt`; Tausch-/Add-/Custom-Listen
  sortieren danach, die Tausch-Liste zeigt die gleiche Muskelgruppe zuerst.
- **Quick-Log aus der Notification:** je Nutzer eine Warteschlange fertiger
  setLogs in `notification.data` (buildNotificationQuickLog); der Service Worker
  schreibt sie per Knopf direkt in IndexedDB + syncQueue, auch ohne offene App.
- **Nur ZWEI Notification-Knoepfe (Android):** Platz 1 Quick-Log des Standard-
  Nutzers (leer -> naechster rueckt nach), Platz 2 "Workout beenden"
  (`data.workoutLogId`, danach `workout-finished` an offene Fenster). Die Regel
  steht DOPPELT — `buildNotificationActions` (TrackingView) und
  `showCompactNotification` (Service Worker) gleich halten.
- **Gewichtsschritte:** 1.25 kg fuer Barbell/Machine-Weight, 1 kg sonst.
- **Exercise Picker (Planung):** sammelt lokal, speichert batch beim Schliessen.
- **Umsortieren in der Planung:** langer Druck (HALTEN_MS) hebt eine Gruppe samt
  Alternativen an. Touch- und Maus-Events, KEINE Pointer-Events (nur ein
  nicht-passiver `touchmove` stoppt das Scrollen). Gescrollt wird `.app-main`.
  `eintraege(day)` zeigt die Reihenfolge aus `gespeichert`, bis der Store sie hat.
- **Trainingstage umsortieren** (Gabriel 05.10.2026): eigenes Fenster
  "Reihenfolge" mit nur den Tagesnamen, Ziehen OHNE Halten (`touch-action:
  none` an den Zeilen), jedes Loslassen speichert. Platz = `dayOrder`; nach
  jedem Verschieben 0..n-1 (`neueTagesPlaetze`), neue Tage hinter den letzten
  (`naechsterTagesPlatz`). Gelesen wird NUR ueber `getDaysForPlan`
  (`sortiereTage`: Gleichstand -> aelterer zuerst) — Planung, Startbildschirm
  und "Tag wechseln" zeigen so dieselbe Reihenfolge. Woche A/B getrennt.
- **"Standard-Uebungen laden" vergleicht mit der Cloud, nie nur mit dem Geraet**
  (`getDocsFromServer`; ein frisches Handy legte am 27.09.2026 alles doppelt an).
  Ohne Anmeldung/Netz legt der Knopf nichts an. Dubletten zusammenfuehren:
  `scripts/uebungen-dubletten.mjs`.
- **Bildschirmtastatur ueberdeckt, statt zu verkleinern** (Android, Chrome ab 108):
  `Modal.vue` legt die Ueberlagerung auf `visualViewport`; `fullHeight`-Fenster
  bleiben voll hoch. Pruefbar nur am Handy oder mit nachgestelltem
  `visualViewport` (height/offsetTop/scale, resize-Event).
- **Nie zwei Modals uebereinander:** jedes lauscht auf Android-Zurueck, beide
  gingen gemeinsam zu. Unteransichten ersetzen den Inhalt (so der Verlauf in
  ExerciseDetail).
- **Standard-Nutzer, Nutzerwahl und Geraete-Kennung sind GERAETE-lokal**
  (localStorage, Schluessel mit DB-Namen, auth store) — nie in `db.meta`, die
  Tabelle wird gesynct und beide Handys ueberschrieben sich gegenseitig. Der
  Standard-Nutzer ist Vorauswahl im Rad, in der History und am Notification-Knopf.
  `activeUserIds` ist nie leer (Fallback `[defaultUserId]`); die Farbkreise auf dem
  Startbildschirm schreiben sie bei jedem Tipp, der letzte laesst sich nicht
  abwaehlen. `resetActiveUsers` laeuft beim App-Start ohne eigenes offenes
  Training und nach "Workout beenden" (Knopf und Notification) — NICHT bei "Tag
  wechseln". Im Workout aendert man die Besetzung per Tipp auf die Kreise im Kopf.
  Das Workout kennt nur `activeUsers`; `authStore.users` (alle drei) gehoert in
  History, Settings und Detailansicht. `startWorkout` stempelt `userIds` an den
  Log, Resume uebernimmt sie.
- **Ein Training gehoert seinem Handy:** jeder Start stempelt `deviceId` an den
  workoutLog. Fortsetzen (`resumeTodaysWorkout`, App.vue) und Wiederverwenden
  (`startWorkout`) NUR ueber `utils/trainingGeraet.js` — sonst springt ein Handy
  per Sync in das laufende Training des anderen und schreibt dessen Besetzung um
  (01.10.2026). Logs ohne `deviceId` gelten als fremd.
- **Notiz und Zyklustag haengen am workoutLog** (`note`, `cycleDays` `{ userId:
  Zahl }`, beide optional — immer mit Fallback lesen; am Lauf: Laufplaner).
  Das Rad startet beim ERRECHNETEN Tag (`useZyklusTag`), gespeichert wird erst
  mit "Speichern". Zyklustag-Knopf nur, wenn
  ein aktiver Nutzer `zyklus: true` traegt (constants.js, nur ein Nutzer). `cycleDays` IMMER als flache
  Kopie mergen, nie ersetzen. Aktives Workout: Store-Funktionen; nachtraeglich in
  der History: eigener Weg `patchLog`.
- **Notizen je Nutzer je Uebung (`exerciseNotes`)** schreibt NUR
  `useExerciseNotes`: Id `exerciseId + '_' + userId`, Leeren = `text: ''` statt
  loeschen (sonst braeuchte es Tombstones). Die Detailansicht speichert auch beim
  Schliessen, nur Geaendertes.
- **Uebungsbilder kommen aus dem Repo, nie von fremden Servern.** Das Manifest
  verbindet Namen (`aliasse`) mit Bildern und Muskeln; welche Muskeln leuchten,
  entscheidet allein das Manifest. `quelle` bestimmt das zustaendige Skript, keins
  fasst die Eintraege des anderen an: `ki` = `frame-<n>.webp` (1 START, 2 MITTE,
  3 ENDE) aus `uebungsbilder-schneiden` nach `uebungsbilder-zuschnitt`;
  `workout-guide` = `frame-<n>.svg` aus `uebungsbilder-holen`. Keys bleiben beim
  Quellwechsel stabil. Neue Bilder nur nach `docs/uebungsbilder-chatgpt.md`
  (Reihenbilder, drei Uebungen, START links, ENDE rechts); nach jeder
  Tabellen-Aenderung den `--bogen` ansehen (springt die Figur: `ausrichtung:
  'mitte'`). Pfade nur ueber `bildUrl`/`vorschauUrl`.
  `imageKey` ist `null`, nie `undefined` (Firestore lehnt ab); ohne Bild zeigt die
  Karte die MuscleMap. "Bilder automatisch zuordnen" ersetzt NUR leere und
  verwaiste Keys — eine bestehende Zuordnung aendert man mit dem Key aus dem
  Manifest.
- **In der App nachgetragene Uebungen sind keine Sonderfaelle:** "+ Neu" im
  Katalog legt sie nur in der Datenbank an. Was `uebungen-cloud.mjs` als "nur in
  der App" zeigt, kommt mit exaktem Namen, Gruppe und Geraet in die Standardliste
  und den Bild-Vertrag (der verlangt fuer jede Standard-Uebung ein Bild).
- **Uebung umbenennen = vier Stellen zugleich:** Standardliste, Alias im Manifest
  (alter Name bleibt Alias), Bild-Vertrag, Cloud per `uebungen-korrigieren.mjs`.
  Vertauschte Uebungen tauschen Name und Bild statt Saetze umzuhaengen. Bis alle
  Handys aktualisiert sind, legt "Standard-Uebungen laden" auf einer alten Version
  den alten Namen neu an.
- **Bildnachweis ist Pflicht:** Einstellungen -> Info und
  `public/uebungsbilder/LIZENZ.md` nennen jede ausgelieferte Bildquelle — nie
  entfernen, neue ergaenzen. Seit v2.6.0 nur KI-Bilder; kommt eine
  Workout-Guide-Zeichnung (CC BY-SA 4.0) zurueck, muss ihr Nachweis zurueck in die
  App. Gymvisual-/ExerciseDB-Bilder (auch GitHub-Kopien) sind kostenpflichtig und
  duerfen nicht ins oeffentliche Repo; die KI-Bilder aehneln dem Stil, sind aber
  neu erzeugt.
- **Alternativen-Ring, Wechsel IMMER fuer alle zusammen** (Gabriel 04.10.2026 —
  vorher wechselte ein Wisch nur einen Nutzer, der andere blieb unbemerkt auf der
  alten Uebung): Ein Plan-Eintrag traegt optional `alternativen` (exerciseIds,
  hartes Maximum 4) und `bevorzugt` ({ userId: exerciseId }, gesynct). Uebungslisten
  dort NUR ueber `kopiereUebungsEintrag` neu bauen (harte Feldaufzaehlung verliert
  Felder). Im Workout ist der Ring `[basisExerciseId, ...alternativen]`, und
  `exerciseId` ist die Uebung der Karte FUER ALLE. Wisch (|dx| > 40 px und > 2|dy|,
  passive Listener, egal wo auf der Karte) und Wechsel-Knopf laufen ueber
  `gemeinsamWeiter` (setzt `exerciseId`, LEERT `userExerciseIds`), ebenso der freie
  Tausch. `userExerciseIds` ist nur noch Altbestand aus Trainings bis v2.9 (jeder
  wechselte einzeln): weiter gelesen, nie mehr gesetzt; weicht ein Nutzer ab, steht
  seine Uebung in seiner Farbe in seinem Bereich (`wechselAnzeige().eigene`).
  Saetze, Empfehlungen, Rad und Notification laufen trotzdem ueberall ueber
  `aktiveId(eintrag, userId)`. Der Stern ist der Standard des Plan-Platzes fuer
  alle: `toggleStandard` schreibt denselben Wert fuer jeden Nutzer (aeltere
  Versionen lesen je Nutzer), `kartenStandard` liest zuerst den bevorzugten Nutzer
  (alte Einzel-Sterne gelten so fuer die ganze Karte); der erste Aufbau aus der
  Plan-Liste startet damit (`startMitStandard` in `mitBasis`). Ein Standard auf
  einer entfernten Alternative wirkt nicht mehr. Eine Wechsel-Zeile je Karte, der
  Knopf nennt das ZIEL, nie die aktuelle Uebung. Der Karten-Schluessel darf beim
  Ringwechsel NICHT wechseln (sonst keine Schiebe-Animation) — darum aus
  `basisExerciseId` + Index, nie aus `exerciseId`. Karten-Layout
  Variante A (Gabriel 26.09.): Vorschaubild neben dem Titel, je Person ein Bereich
  mit Farbkreis, zu zweit nebeneinander, sonst je eine Zeile; allein steht die
  Wechsel-Zeile rechts neben dem Wert (`.karte-1`). Jeder Wechsel laeuft den
  Tausch-Weg (persist, Empfehlungen, Notification). Der 400-ms-Nachklick-Schutz
  (`istWischNachklick`) faengt das click nach einem Wisch ab — nicht entfernen.
  `alternativen`, `userExerciseIds`, `bevorzugt` als frische Kopien persistieren.

## Architektur: Laufplaner
- **Claude plant, die App zeigt und haelt fest.** Plaene entstehen als JSON-Datei von
  Claude (Vertrag: `docs/laufplan-format.md`). Der Import prueft vollstaendig, zeigt
  eine Vorschau und schreibt in EINER Dexie-Transaktion; Tombstones und Push danach.
- **Merge-Regel:** Kennungen (`id`) sind die Klammer. Erledigte und ausgelassene
  Laeufe gewinnen lokal, noch geplante uebernimmt die Datei, geloescht wird nur, was
  geplant UND in der Zukunft ist. Ohne Aenderung wird nichts geschrieben.
  Ausformuliert in `docs/laufplaner-plan.md` 5.4.
- **Der Test ist der Vertrag:** Merge- oder Abgleich-Regeln erst in
  `laufplan-merge-test.mjs` bzw. `runmatch-test.mjs` aendern.
- **Ein Satz je Lauf, ein Haken:** kein Lauf-Tracking. Haken ohne Ist-Werte erlaubt;
  in der Wochenbilanz zaehlt dann der Planwert.
- **`targets` gehoert dem PLAN, `feedback` dem LAEUFER.** `targets`: bis zu vier
  Abschnitte `{ label, hrFrom, hrTo, paceFrom, paceTo }`, Tempo "m:ss", leer =
  `null`; fehlt es in einer neuen Datei, ist es zurueckgenommen. `feedback`
  `{ rpe 1-5, note, at }` geht NIE verloren — kein Import, kein Garmin-Abgleich
  fasst es an. `actual.note` gehoert der Maschine.
- **Die Tempozahlen kommen aus der eigenen Historie** (`docs/laufplan-vorgaben.md`);
  ausserhalb des gemessenen Pulsbereichs gedaempft. Pulsbereiche nur in
  `privat\pace-profil.json`, nie im Repo.
- **Der PC kann direkt an die Cloud** (`lauf-cloud.mjs`, `docs/laufplan-cloud.md`):
  gleiches Konto, gleiche Regeln. Ohne `--jetzt` Trockenlauf, vor jedem Schreiben
  eine Sicherung, beim Loeschen ein Tombstone. Zugangsdaten NUR in
  `privat\firebase-konto.json`, nie im Chat.
- **Garmin laeuft ueber intervals.icu.** Die App holt fertige Aktivitaeten, ordnet
  sie dem Lauf desselben Tages zu und setzt Haken samt Ist-Werten. Sie loescht nie,
  entfernt nie einen Haken, ergaenzt einen von Hand gesetzten nur; dieselbe
  Aktivitaet kommt nie zweimal (`externalId` = `athleteId:id`).
- **Runden zaehlen anders:** Typ `loops` nimmt `elapsed_time`, sonst `moving_time`;
  der andere Wert landet in `actual.note`. Das Format kennt nur EIN Minutenfeld —
  ein zusaetzliches Feld in `actual` ginge beim Status-Export still verloren.
- **Der Pace Umrechner liest mit** (`C:\Projekte\Pace Umrechner`): `runPlans`,
  `runSessions`, `meta/userName_user1|2` per REST, nur lesend; Bahn-Tabellen aus
  `targets`, Dauer aus dem label ("Steigerungen 20 s"). Wer Format, Labels oder
  Firebase-Projekt aendert, zieht dort `src/lib/cloud.ts` bzw. `training.ts` mit.
- **Selbst eingetragene Laeufe** (Gabriel 07.10.2026) sind normale Laeufe mit
  `unplanned: true`, `source: 'manual'` — kein neues Feld, kein neuer Status.
  "Anders gelaufen" legt einen neuen Lauf an und setzt den geplanten auf
  `skipped` ("Stattdessen: <Titel>" in `actual.note`) oder laesst ihn `planned`;
  war er schon erledigt, WANDERN `actual`, `externalId`, `source` und `feedback`
  auf den neuen (sonst doppelt gezaehlt bzw. von der Uhr doppelt geholt). Beides
  in EINER Transaktion. Loeschen nur ohne `externalId` (die Uhr holte ihn
  zurueck), mit Tombstone. Regeln in `utils/laufEintrag.js`, Vertrag
  `scripts/laufeintrag-test.mjs`.
- **Zyklustag am Lauf = `feedback.cycleDay`** (1-45), damit gilt die
  Feedback-Regel: kein Import und kein Abgleich verliert ihn. Das Feld steht
  nur drin, wenn gesetzt (sonst Scheinaenderung bei aelteren Rueckmeldungen).
  Vorschlag = zeitlich naechster Eintrag aus Training ODER Lauf plus
  Kalendertage (`utils/zyklusTag.js`, Vertrag `scripts/zyklustag-test.mjs`);
  gespeichert wird, was im Formular stand. Versionen vor 2.12 verlieren den
  Wert, wenn sie die Rueckmeldung neu speichern.
- **Das Lauf-Blatt setzt sich nur beim Wechsel des Laufs zurueck** (Watch auf
  einen TEXT aus `modelValue|id`, nie ein Array): sonst warf jede Aenderung am
  Lauf das offene Formular weg, und die Fertig-Meldung des Unterformulars ging
  verloren (Vue verwirft Ereignisse entfernter Komponenten).
- **Schluessel fuer intervals.icu sind GERAETE-lokal:** nicht in `db.meta`, nicht in
  der Cloud, nicht im Backup. Die Athleten-Id in `externalId` ist gewollt gesynct.

## Deploy und Umgebung
- **Base-Path** `/fitness-tracker/` in Vite, Router und PWA-Manifest.
- **Nach einem Deploy zeigt die PWA erst nach einem Neustart die neue Version.**
  Live pruefen ohne Browser: das ausgelieferte `assets/SettingsView-*.js` (Name im
  Hauptskript aus `index.html`) enthaelt die Versionsnummer. Im Browser: Service
  Worker abmelden, Caches leeren, von der Wurzel starten (Deeplinks ohne Service
  Worker enden bei GitHub Pages im 404).
- **Die Browser-Pane registriert auf `http://*.localhost` keine Service Worker**
  ("unknown error when fetching the script") — kein App-Fehler; Offline nur am Handy.
- **Browser-Tests mit Testdaten nur auf einer frischen `*.localhost`-Subdomain**
  (eigene Herkunft ohne Anmeldung); `localhost`/`127.0.0.1` koennen angemeldet sein,
  dann landen Testsaetze in der echten Cloud. Testdaten ueber den echten
  Backup-Import (Datei-Feld per `DataTransfer`, `change` ausloesen).
  Verlaesslichster Weg: Headless-Chrome per DevTools-Protokoll (`--incognito`
  ohne Profilordner, Emulation 360-390 px, vor Fotos 0,5 s warten).
- **Preview-Port 4173 ist oft von einer anderen Sitzung belegt:** nie beenden,
  eigenen Port mit `--strictPort` nehmen; Version in Settings gegenpruefen.
- **Reine Doku-Commits mit `[skip ci]` pushen** — sonst baut jeder Push neu.
- **`privat\` gehoert in den Hauptbaum:** `git worktree remove` loescht ignorierte
  Dateien ohne Rueckfrage. Vorher `git status --porcelain --ignored` pruefen.

## Skills
- **`/deploy`** — Build, Commit, Push und Deploy auf GitHub Pages mit Status-Check
- **Backup ist kein Skill, sondern in der App:** Einstellungen -> Backup (ganze Datenbank als JSON; der Import fuehrt nur zusammen, `utils/exportData.js`).

## Connectoren/APIs
- Firebase-Projekt `gymtracker-ketohybrid` (Firestore + Auth), Config in
  `src/db/firebase.js`. Der API-Key ist kein Geheimnis — der Schutz liegt in den
  Firestore-Rules und der gesperrten Registrierung.
- **Zwei Logins mit derselben Adresse — die haeufigste Falle.** Die Firebase
  Console nimmt Gabriels GOOGLE-Passwort, das App-Konto (nur E-Mail/Passwort) hat
  ein EIGENES. Das Google-Passwort in `privat\firebase-konto.json` ergibt
  `INVALID_LOGIN_CREDENTIALS`. Kandidaten durchprobieren:
  `privat\passwort-pruefen.html`.
- **Dieses Repo ist OEFFENTLICH.** Keine personenbezogenen Daten, auch nicht in
  Doku, Tests, Kommentaren oder Beispiel-Pfaden: die Nutzer heissen dort nur
  user1-3. Anzeigenamen liest die App aus `db.meta` (`userName_<id>`, gesynct)
  ueber den auth store, `constants.js` traegt nur Platzhalter "Person n". Die Konto-E-Mail steht als Platzhalter `FITNESS-KONTO@BEISPIEL.DE` in
  `firestore.rules`; die echte nur in der Firebase Console und Claudes Memory.
- **Console-Arbeit** ueber Claude-in-Chrome: Rules-Editor ist CodeMirror 5
  (`document.querySelector('.CodeMirror').CodeMirror.setValue(...)`); der
  Anonym-Anbieter-Dialog ist nicht scrollbar — Speichern per Skript-Klick.
