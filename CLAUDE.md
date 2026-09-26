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
  db/dexie.js            Schema v4: exercises, plans, trainingDays, workoutLogs,
                         setLogs, syncQueue, meta, deletions, runPlans,
                         runSessions, exerciseNotes
  services/syncService.js  Login, Firestore-Listener, Reconcile, Tombstones, Retry-Queue
  stores/running.js      Laufplaene, Laeufe, Import/Merge, Status-Export
  composables/useHistory.js  Spreadsheet-Daten, letzte Werte, Steigerungslogik
  composables/useExerciseNotes.js  Notiz je Nutzer je Uebung (deterministische Id,
                         Leeren = text '', nie loeschen)
  components/shared/     Modal (Android-Back schliesst! folgt bei offener
                         Tastatur dem sichtbaren Bereich), EmptyState,
                         WheelPicker, UserSelectModal (Startdialog), MuscleMap
                         (Inline-SVG, 18 data-muscle-Ids, Grobgruppen-Fallback)
  components/tracking/ExerciseDetail.vue  Detailansicht: Ueberblendung Start-/
                         Endbild alle 1,2 s, MuscleMap, Notizfeld je Nutzer
  data/uebungskatalog.json  Bild-Manifest: key, quelle (ki|workout-guide),
                         bilder (1-2 Frames), vorschau, primaer/sekundaer
                         (Muskel-Ids), aliasse (Katalognamen)
  data/standardUebungen.js  Standardliste (Name, Gruppe, Geraet): liest die App
                         ("Standard-Uebungen laden"), der Bild-Vertrag und
                         der Cloud-Abgleich
  utils/
    runPlanSchema.js     Pruefmodul + Vokabular des Laufplan-Formats (reines JS)
    runPlanMerge.js      Merge-Regeln des Imports (reine Funktion)
    runMatch.js          Zuordnung Aktivitaet -> geplanter Lauf (reine Funktion)
    intervalsApi.js      Abruf und Umrechnung von intervals.icu (Browser + Node)
    exportData.js        CSV mit UTF-8-BOM, JSON-Backup (Import ist merge-only)
    uebungsBilder.js     Manifest-Zugriff + Namens-Matching (reine Funktionen,
                         Manifest kommt als Parameter)
    uebungsRing.js       Schnellwechsel-Ring + Standard-Uebung je Nutzer
                         (reine Funktionen)
    saetze.js            Saetze je Uebung und Person: offener Satz,
                         Vorbelegung, Rad-Reihenfolge, Quick-Log-Folge
                         (reine Funktionen)
    dateHelpers.js       KW-Erkennung, Deload-Berechnung
    formatters.js        toTitleCase (Uebungsnamen, DB/BB-Abkuerzungen)
public/sw-custom.js      notificationclick + Quick-Log (schreibt in IndexedDB)
public/uebungsbilder/    je Manifest-Key frame-<n>.webp (KI) oder .svg (Workout
                         Guide) + vorschau.webp (im Repo, precached),
                         LIZENZ.md = Bildnachweis beider Quellen
scripts/                 laufplan-pruefen, laufplan-vorgaben, pace-modell
                         (+ lib/pace-modell-kern), lauf-cloud, intervals-abruf,
                         uebungen-cloud (alle Uebungen der App aus der Cloud
                         lesen und mit Standardliste/Bildern abgleichen, nur
                         lesen; aus dem Worktree mit --konto <Hauptbaum>),
                         uebungsbilder-holen (Zeichnungen von Workout Guide
                         holen und einfaerben, idempotent, --neu = alles neu),
                         uebungsbilder-schneiden (KI-Sammelbilder aus
                         uebungsbilder-quellen/ zerschneiden nach der Tabelle
                         uebungsbilder-zuschnitt.mjs; --bogen = Pruefbogen,
                         --vermessen = Koordinatengitter fuer neue Bilder)
                         Vertragstests: laufplan-merge-test, runmatch-test,
                         pace-modell-test, musclemap-pruefen,
                         uebungsbilder-matching-test, uebungsring-test,
                         saetze-test
docs/                    firebase-absicherung, laufplan-format (+ -beispiel.json),
                         laufplaner-plan, laufplan-cloud, laufplan-vorgaben,
                         garmin-anbindung, plan-fittrack-v2
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
- **Saetze je Uebung sind eine Einstellung JE PERSON** (Entscheidung Gabriel
  2026-09-26, ersetzt "ein Satz je Uebung" vom 16.08.): Einstellungen -> "Saetze je
  Uebung" 1-5, gespeichert in `db.meta` als `saetze_<userId>` (gesynct wie die
  Namen, gilt also auf beiden Handys). 1 = ein Referenzwert wie bis v2.3 (Standard
  fuer alle), ab 2 hat jeder Satz ein eigenes setLog mit `setNumber` 1..n (Lisa: 3).
  Die Regeln stehen als reine Funktionen in `utils/saetze.js`, Vertrag
  `scripts/saetze-test.mjs` (zuerst Test, dann Regeln): offener Satz (Luecken
  zuerst), Vorbelegung (heute gespeichert -> Satz davor von heute -> Vorschlag aus
  der letzten Einheit), Rad nach dem Speichern (reihum der naechste ANDERE Nutzer
  mit offenem Satz, sonst der naechste Satz desselben Nutzers) und die
  Quick-Log-Folge (jeder offene Satz einzeln, Label "S2"). Das Sets-Feld der
  Planung bleibt reine Notiz.
- **Vorwert = Gewicht x Wdh aus EINEM Datensatz:** Karte, Empfehlungszeile,
  Rad-Vorbelegung, Quick-Log-Knopf und Sperrbildschirm lesen die Wdh nur ueber
  `getLastReps` (TrackingView) — und die holt sie aus `recommendations`, also aus
  demselben gespeicherten Satz, aus dem das Gewicht kommt. Zwei getrennte Speicher
  gab es schon einmal: der Gewichtsvorschlag wurde nur bei einem Treffer
  ueberschrieben, die Wdh dagegen immer, und ein leeres Abfrageergebnis liess das
  Gewicht ohne Wdh stehen (v1.8.1). Mit mehreren Saetzen gilt dasselbe je Satz:
  Satz 1 ist der Eintrag in `recommendations`, Satz n kommt aus Satz n der letzten
  Einheit (`satzVorschlag`). "Letzte Einheit" heisst OHNE das laufende Workout
  (`getLastSets(..., activeWorkout.id)`) — sonst wird nach dem ersten Satz von
  heute "letztes Mal" zu "heute". Auf 360-px-Handys bricht der Wert vor dem "×"
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
- **Bildschirmtastatur ueberdeckt, statt zu verkleinern** (Android, Chrome ab 108):
  `Modal.vue` misst waehrend es offen ist den sichtbaren Bereich
  (`visualViewport`) und legt die Ueberlagerung darauf; Suchfenster (`fullHeight`)
  bleiben bei offener Tastatur voll hoch. Vorher klebte das Fenster am unteren Rand
  und die Treffer rutschten beim Tippen hinter die Tastatur. Die Browser-Pane hat
  keine Bildschirmtastatur: pruefbar nur mit einem nachgestellten `visualViewport`
  (Objekt mit height/offsetTop/scale, resize-Event) und am Handy.
- **Standard-Nutzer ist GERAETE-lokal** (`localStorage`, Schluessel mit DB-Namen, siehe
  `stores/auth.js`): Vorauswahl im Gewichts-Rad, in der History, am Notification-Knopf.
  Bewusst NICHT in `db.meta` — die Tabelle wird gesynct, und beide Handys wuerden sich
  den Wert gegenseitig ueberschreiben.
- **Nutzerwahl ist ebenfalls GERAETE-lokal:** Der Startdialog "Wer trainiert?"
  (UserSelectModal, entfaellt bei heutigem unfertigem Workout) setzt
  `activeUserIds` im auth store (localStorage, Fallback ohne gespeicherte
  Auswahl: `[defaultUserId]`, nie leer). Vorausgewaehlt ist immer genau der
  Standard-Nutzer (`startVorauswahl` — nur im Startdialog; die Farbkreise im
  Workout-Kopf zeigen allein die aktuelle Besetzung); im Workout aenderbar
  per Tipp auf die Farbkreise. Das Workout kennt nur
  `activeUsers` (Karten-Layout nach Anzahl, Auto-Wechsel reihum,
  Notification-Warteschlangen); `authStore.users` (alle drei) gehoert in
  History, Settings und die Notizfelder der Detailansicht. `startWorkout`
  stempelt `userIds` an den workoutLog; Resume uebernimmt sie zurueck.
- **Notiz und Zyklustag haengen am workoutLog** (`note` String, `cycleDays`
  Objekt `{ userId: Zahl }`, beide optional — ueberall mit Fallback lesen).
  Der Zyklustag-Knopf erscheint nur, wenn ein aktiver Nutzer `zyklus: true`
  traegt (constants.js, nur Lisa). `cycleDays` wird IMMER als flache Kopie
  gemergt (ein Schluessel gesetzt/geloescht), nie ersetzt. Im aktiven Workout
  schreiben die Store-Funktionen (`updateWorkoutNote`, `setCycleDay`); das
  nachtraegliche Editieren im Tages-Modal der History laeuft ueber einen
  eigenen Weg (`patchLog`, HistoryView), weil die Store-Funktionen am aktiven
  Workout haengen.
- **Notizen je Nutzer je Uebung liegen in `exerciseNotes`** (Dexie v4, additiv;
  in SYNCED, IMPORT_TABLES und JSON-Export). Schreiben NUR ueber
  `useExerciseNotes`: deterministische Id `exerciseId + '_' + userId`,
  Leeren schreibt `text: ''` statt zu loeschen (sonst braeuchte es Tombstones).
  Die Detailansicht speichert auch beim Schliessen (Android-Back) — nur
  Geaendertes wird gepusht.
- **Uebungsbilder kommen aus dem Repo, nie von fremden Servern:** Das Manifest
  `src/data/uebungskatalog.json` verbindet Katalognamen (`aliasse`) mit
  Bildern und Muskeln (`primaer`/`sekundaer` fuer die MuscleMap). `quelle`
  bestimmt das zustaendige Skript, keins fasst die Eintraege des anderen an:
  `ki` = farbige KI-Bilder, `frame-<n>.webp` = Phase n des Sammelbilds
  (1 START, 2 MITTE, 3 ENDE), geschnitten von `scripts/uebungsbilder-schneiden.mjs`
  nach der Tabelle `scripts/uebungsbilder-zuschnitt.mjs`; `workout-guide` =
  Linienzeichnungen, `frame-<n>.svg` = Frame n der Quelle, von
  `scripts/uebungsbilder-holen.mjs`. Keys (Workout-Guide-Slugs) bleiben beim
  Quellwechsel stabil, gespeicherte `imageKey` zeigen dann sofort das neue Bild.
  `bilder` nennt 1 Frame (Standbild) oder 2 (Detailansicht blendet ueber),
  Wahl je Uebung per Augenschein — in den KI-Bildern ist MITTE oft eine Kopie.
  Die KI-Sammelbilder haben das Transparenz-Karomuster eingemalt: das Skript
  erkennt es am Muster, nicht an der Helligkeit (sonst bleicht die Haut aus);
  nach jeder Tabellen-Aenderung den `--bogen` ansehen. `vorschau.webp`
  (128 px) dient Karte und Katalog. Pfade loesen `bildUrl`/`vorschauUrl` auf
  (nie selbst zusammenbauen). Uebungen tragen optional `imageKey` (nie
  `undefined`, immer `null` — Firestore lehnt undefined ab); ohne Bild zeigt
  die Karte die MuscleMap mit Grobgruppen-Markierung. "Bilder automatisch
  zuordnen" ersetzt NUR leere und verwaiste Keys: wer eine bestehende
  Zuordnung aendern will, nimmt den alten Key aus dem Manifest (so v2.1.0 bei
  den geteilten Keys `machine-chest-press`/`seated-row`). Vertraege:
  `scripts/uebungsbilder-matching-test.mjs` (Matching, Quelle, Pfade, Dateien,
  Schnitt-Tabelle — zuerst Test, dann Regeln), die 18 Muskel-Ids per
  `scripts/musclemap-pruefen.mjs`.
- **In der App nachgetragene Uebungen sind keine Sonderfaelle:** Katalog ->
  "+ Neu" legt Uebungen nur in der Datenbank an, der Code kennt sie nicht.
  Den echten Bestand zeigt `scripts/uebungen-cloud.mjs` (nur lesen); was dort
  "nur in der App" steht, kommt mit exaktem Namen, Gruppe und Geraet in
  `src/data/standardUebungen.js` und in den Bild-Vertrag (der Test verlangt
  fuer jede Standard-Uebung ein Bild).
- **Bildnachweis ist Pflicht, nicht Deko:** Einstellungen -> Info und
  `public/uebungsbilder/LIZENZ.md` nennen beide Quellen — nie entfernen, bei
  neuen Bildquellen ergaenzen. Die Workout-Guide-Zeichnungen (auch bearbeitet)
  stehen unter CC BY-SA 4.0; die Angabe bleibt, solange eine davon im Manifest
  steht. Bilder aus dem Screenshot-Stil (Gymvisual, ExerciseDB und deren
  GitHub-Kopien) sind kostenpflichtig und duerfen nicht ins oeffentliche Repo —
  die KI-Bilder aehneln dem Stil, sind aber neu erzeugt.
- **Alternativen-Ring mit Standard-Uebung JE NUTZER:** In der Planung traegt
  ein Eintrag in `day.exercises` optional `alternativen` (Array aus
  exerciseId, hartes Maximum 4) und `bevorzugt` ({ userId: exerciseId } —
  die gemerkte Standard-Uebung je Nutzer, gesynct); Uebungslisten dort NUR
  ueber `kopiereUebungsEintrag` neu bauen (kopiert generisch alle Felder —
  harte Feldaufzaehlung verliert Alternativen und Standards). Die Planung
  listet die Alternativen eingerueckt unter der 1. Wahl, jede mit eigenem x
  (`removeAlternative`); ein darauf gemerkter Standard bleibt stehen und
  wirkt nicht mehr.
  Im Workout ist der Ring `[basisExerciseId, ...alternativen]`, und JEDER
  Nutzer hat darin seine eigene aktive Uebung: `userExerciseIds`
  ({ userId: exerciseId }, nur Abweichungen) am Workout-Eintrag, aufgeloest
  ueber `aktiveUebungId` — Regeln als reine Funktionen in
  `utils/uebungsRing.js`, Vertrag in `scripts/uebungsring-test.mjs` (zuerst
  Test, dann Regeln). `basisExerciseId` und `userExerciseIds` gehoeren dem
  Workout-Log (Helfer `mitBasis`, belegt Standards aus `bevorzugt` vor),
  nie dem Plan. Der Karten-Kopf zeigt die Uebung des bevorzugten Nutzers
  (`kopfId`); Wechsel je Nutzer per Tipp auf die Wechsel-Zeile seines
  Bereichs ODER horizontalem Wischen (|dx| > 40px und |dx| > 2|dy|, passive
  Listener; auf einem `.user-value` wechselt dessen Nutzer, sonst der
  bevorzugte). Der Wechsel-Knopf nennt das ZIEL des Tipps, nie die aktuelle
  Uebung (die steht im Titel); weicht die Uebung eines Nutzers vom Titel ab,
  steht ihr Name in seiner Farbe dabei — Regel `wechselAnzeige`. Jeder
  Wechsel schiebt Titel und Werte zur Seite (`<Transition>` schieben-vor /
  schieben-zurueck, Schluessel = aktive Uebung): der Karten-Schluessel darf
  beim Ringwechsel NICHT wechseln, sonst gibt es keine Animation. Die
  Karte selbst (Variante A, 26.09.2026): kleines Vorschaubild neben dem
  Titel, je Person ein Bereich mit Farbkreis; zu zweit nebeneinander, allein
  und zu dritt je eine Zeile. Der Stern in der Wechsel-Zeile schreibt
  `bevorzugt` per updateTrainingDay in den Plan (Toggle). Saetze, Empfehlungen, Rad und
  Notification laufen ueberall ueber `aktiveId(eintrag, userId)`. Der freie
  Tausch bleibt eine Karten-Entscheidung: er setzt `exerciseId` und LEERT
  `userExerciseIds`. Jeder Wechsel laeuft den Tausch-Weg
  (persistWorkoutExercises, Empfehlungen, Notification). Ein
  400ms-Nachklick-Schutz (`istWischNachklick`) faengt das click ab, das
  WebViews nach einem Wisch feuern — nicht entfernen. Beim Persistieren
  `alternativen`, `userExerciseIds` und `bevorzugt` als frische Kopien
  schreiben (sonst DataCloneError).

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
  Ohne Browser belegt: das ausgelieferte `assets/SettingsView-*.js` (Name steht im
  Hauptskript aus `index.html`) enthaelt die Versionsnummer.
- **Die Browser-Pane registriert auf `http://*.localhost` keine Service Worker** —
  auch ein Minimal-SW scheitert dort mit "unknown error when fetching the script"
  (Gegenprobe 22.09.2026). Diese Konsolenfehler sind kein App-Fehler; Offline-/PWA-
  Verhalten nur am Handy pruefen.
- **Browser-Tests mit Testdaten nur auf einer frischen Adresse** wie
  `http://reps-test.localhost:5173/fitness-tracker/` (jede `*.localhost`-Subdomain ist
  eine eigene Herkunft ohne Anmeldung). `localhost` und `127.0.0.1` koennen aus einer
  frueheren Sitzung angemeldet sein — dann landet jeder gespeicherte Testsatz in der
  echten Cloud.
- **Preview-Port 4173 ist oft von einer anderen Sitzung belegt** (alter Stand): nie
  beenden, sondern voruebergehend eine eigene Konfiguration mit anderem Port und
  `--strictPort` in `.claude/launch.json` (danach zuruecksetzen); Version in Settings
  gegenpruefen.
- **Reine Doku-Commits mit `[skip ci]` im Betreff pushen** — jeder Push auf `master`
  startet sonst einen Deploy, der denselben App-Stand neu baut.
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
