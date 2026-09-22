# Plan: FitTrack v2.0.0 — Drei Nutzer, Bilder, Alternativen, Notizen

Erstellt 2026-09-22 von Claude (Fable) nach Gabriels Vorgaben. Wird per
`/autopilot docs/plan-fittrack-v2.md ohne-clean` abgearbeitet — **ohne-clean ist
Pflicht**: Es wird NICHT gepusht und NICHT deployt. Live bleibt v1.8.1, bis
Gabriel nach der Pruefung bewusst deployt (Abschnitt "Nach dem Lauf").

## Ziel

Aus der Zwei-Personen-App wird eine Drei-Personen-App (Lisa, Gab, Ben) mit
Nutzerwahl beim App-Start. Die Single-Variante entfaellt ersatzlos
(Gabriels Entscheidung 2026-09-22: **Ben startet frisch**, keine Datenuebernahme).
Dazu kommen: Uebungsfotos mit Muskel-Grafik, eine Uebungs-Detailansicht mit
Notizen je Nutzer, Alternativ-Uebungen mit Schnellwechsel (Tippen UND Wischen —
Gabriels Wahl), eine Workout-Notiz und Lisas Zyklustag-Rad.

## Entscheidungen (von Gabriel, 2026-09-22)

1. **Bens Single-Daten:** frisch starten, keine Uebernahme. Die Single-Variante
   (`single/`, `/fitness-tracker/single/`) wird komplett entfernt.
2. **Uebungsfotos:** aus der freien Datenbank `yuhonas/free-exercise-db`
   (GitHub, Unlicense/gemeinfrei; 2 Fotos je Uebung). Die Zuordnung der 31
   Katalog-Uebungen steht fest in diesem Plan (Tabelle unten; 30 Bild-Eintraege,
   weil sich zwei Ruder-Uebungen ein Foto teilen). Die Muskel-Grafik
   (Koerper-Silhouette mit Markierung) wird selbst gebaut, keine Fremdquelle.
3. **Alternativen-Bedienung im Workout:** Tippen auf ein Wechsel-Symbol UND
   horizontales Wischen auf der Karte.

## Vorbereitung durch die startende Session (VOR dem Autopilot-Start)

Diese Schritte kann ein Paket-Lauf nicht selbst tun (Schreiben unter `.claude\`
ist ihm verboten):

1. `.claude\pruefen.txt` anpassen: die Zeile `npm run check:drift` ERSATZLOS
   streichen (P1 entfernt die Single-Kopie, der Drift-Check wuerde ab dann rot
   stoppen). Alle anderen Zeilen bleiben.
2. Diese Plan-Datei und die pruefen.txt-Aenderung regulaer committen
   (macht der Autopilot-Preflight sonst selbst).
3. Startbefehl mit diesen Freigaben:
   `-ErlaubteBefehle "npm,node,rm,git rm,git grep,git ls-files,Remove-Item"`
   (rm/git rm fuer P1 "Datei existiert nicht mehr"; git grep/ls-files fuer die
   Such-Kriterien; node fuer Pruef- und Downloadskripte).
4. Hinweis Netzwerk: P5 laedt Fotos von `raw.githubusercontent.com` (node-Skript
   mit fetch). Ohne Internet stoppt P5 mit klarer Meldung — das ist gewollt,
   nicht raten.

## Technische Leitplanken (gelten fuer JEDES Paket)

- **Die Doppel-Pflege `src/` + `single/src/` entfaellt ab P1.** Ab dann gibt es
  nur noch `src/`. Kein `cp` nach `single/` mehr, kein check:drift.
- **Dexie bleibt additiv:** Neue Felder an bestehenden Tabellen brauchen KEINE
  Versionserhoehung. Nur die neue Tabelle `exerciseNotes` kommt als
  `db.version(4).stores(...)` dazu (P4). Nie bestehende Indizes umbauen, nichts
  loeschen. `public/sw-custom.js` oeffnet die DB ohne Versionsnummer und ist
  nicht betroffen.
- **Vue-Proxys nie direkt in Dexie schreiben.** Beim Persistieren von
  Uebungslisten JEDEN Eintrag tief genug kopieren — ab P9 traegt ein Eintrag
  das Array `alternativen`, das MIT kopiert werden muss:
  `list.map(e => ({ ...e, alternativen: [...(e.alternativen || [])] }))`.
  Sonst DataCloneError beim `put`.
- **Jeder Dexie-Schreibweg pusht in die Cloud** (`pushRecord` nach dem
  lokalen Write, Muster ueberall im Code). Neue Tabellen gehoeren in `SYNCED`
  (syncService), `IMPORT_TABLES` + Export (exportData). Die Firestore-Rules
  matchen per Wildcard alle Collections — dort ist NICHTS zu tun.
- **Rueckwaertskompatibel bleiben:** Ein Handy mit v1.8.1 muss mit den neuen
  Cloud-Daten weiterlaufen (unbekannte Felder ignorieren, keine Pflichtfelder
  erzwingen). Neue Felder immer mit Fallback lesen (`aw.userIds || Fallback`).
- **Kein `color-mix` und keine anderen modernen CSS-Features in NEUEN Styles**
  (alte Android-WebViews) — statische rgba-Werte nutzen. Bestehende Stellen
  nicht anfassen.
- **Nichts von fremden Servern laden zur Laufzeit.** Fotos werden EINMAL per
  Skript geholt und liegen dann im Repo (`public/uebungsbilder/`).
- **Ein Satz je Uebung bleibt Absicht** (Architektur-Entscheidung) — kein
  Multi-Set-Tracking, das Sets-Feld der Planung bleibt Notiz.
- Texte in der Oberflaeche auf Deutsch, in Code-Kommentaren ae/oe/ue wie im
  Bestand. Bestehende, funktionierende Features nicht umbauen, nur erweitern.

## Datenmodell-Erweiterungen (Ueberblick)

| Ort | Neu | Bedeutung |
|---|---|---|
| `constants.js` USERS | user3 "Ben", Farbe gruen; user1 bekommt `zyklus: true` | dritter Nutzer; Zyklus-UI nur fuer Lisa |
| auth store | `activeUserIds` (localStorage, geraete-lokal) | wer heute trainiert |
| workoutLogs | `userIds` (Array), `note` (String), `cycleDays` (Objekt `{userId: Zahl}`) | Teilnehmer, Workout-Notiz, Zyklustag |
| trainingDays.exercises[i] | `alternativen` (Array aus exerciseId, max 4) | hinterlegte Alternativ-Uebungen |
| workout-Override exercises[i] | `basisExerciseId` | Ring-Anker fuer den Schnellwechsel |
| exercises | `imageKey` (String oder null) | Verweis in den Bild-Katalog |
| NEU: exerciseNotes (Dexie v4) | `{ id: exerciseId + '_' + userId, exerciseId, userId, text, createdAt, updatedAt }` | Notiz je Nutzer je Uebung, workout-unabhaengig |
| NEU: `src/data/uebungskatalog.json` | Bild-Manifest (statisch im Repo) | Fotos, Muskeln, Namens-Aliasse |

## Bild-Zuordnung (fix, nicht raten — Schluessel = free-exercise-db `id`)

Quelle je Bild: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<KEY>/0.jpg` (und `1.jpg`).

| Katalogname (Alias) | KEY | primaer | sekundaer |
|---|---|---|---|
| Hack Squat | Hack_Squat | quadriceps | calves, glutes, hamstrings |
| Leg Press | Leg_Press | quadriceps | calves, glutes, hamstrings |
| Leg curl | Lying_Leg_Curls | hamstrings | — |
| hip thrusts | Barbell_Hip_Thrust | glutes | calves, hamstrings |
| "bad girl" | Thigh_Abductor | abductors | glutes |
| "good girl" | Thigh_Adductor | adductors | glutes, hamstrings |
| seated leg curl | Seated_Leg_Curl | hamstrings | — |
| seated leg extension | Leg_Extensions | quadriceps | — |
| calve raises | Standing_Calf_Raises | calves | — |
| lunges | Dumbbell_Lunges | quadriceps | calves, glutes, hamstrings |
| DB Bench press | Dumbbell_Bench_Press | chest | shoulders, triceps |
| DB incline Bench press | Incline_Dumbbell_Press | chest | shoulders, triceps |
| machine: chest press | Machine_Bench_Press | chest | shoulders, triceps |
| machine: incline chest press | Leverage_Incline_Chest_Press | chest | shoulders, triceps |
| Cable Crossover | Cable_Crossover | chest | shoulders |
| BB Bench press | Barbell_Bench_Press_-_Medium_Grip | chest | shoulders, triceps |
| BB incline Bench press | Barbell_Incline_Bench_Press_-_Medium_Grip | chest | shoulders, triceps |
| weighted pull up | Weighted_Pull_Ups | lats | biceps, middle back |
| Latzug | Wide-Grip_Lat_Pulldown | lats | biceps, middle back, shoulders |
| chest supported row | Dumbbell_Incline_Row | middle back | biceps, forearms, lats, shoulders |
| low row | Seated_Cable_Rows | middle back | biceps, lats, shoulders |
| cable row (without chest support) | Seated_Cable_Rows | middle back | biceps, lats, shoulders |
| lower back | Hyperextensions_Back_Extensions | lower back | glutes, hamstrings |
| shoulder press | Leverage_Shoulder_Press | shoulders | triceps |
| BB overhead press | Standing_Military_Press | shoulders | triceps |
| DB Side lateral | Side_Lateral_Raise | shoulders | — |
| Standing Concentration Curl | Standing_Concentration_Curl | biceps | forearms |
| Cable Bicep Curl | Standing_Biceps_Cable_Curl | biceps | — |
| Cable Rope Triceps Pushdown | Triceps_Pushdown_-_Rope_Attachment | triceps | — |
| Cable Overhead Triceps Extension | Cable_Rope_Overhead_Triceps_Extension | triceps | — |
| core | Plank | abdominals | — |

Hinweise: "low row" und "cable row" teilen sich bewusst dasselbe Foto (die
Datenbank hat nur eine Ruder-Maschine); im Manifest ist das ZWEI Aliasse an
EINEM Eintrag. Muskelnamen mit Leerzeichen ("middle back", "lower back") werden
im Manifest zu `middle_back`, `lower_back` normalisiert.

## Nicht enthalten (Scope-Grenzen)

- KEINE Uebernahme von Bens Single-Daten (Entscheidung: frisch starten).
- KEIN Deploy, KEIN Push, KEIN Tag, KEIN Firebase-Console-Schritt im Lauf.
- KEINE Videos/GIFs von extern — die "Bewegung" entsteht aus dem Wechsel der
  zwei Fotos. Eigene Bilder/Animationen kann Gabriel spaeter in
  `public/uebungsbilder/<key>/` ablegen (gleicher Mechanismus).
- KEIN Multi-Set-Tracking, KEIN Umbau des bestehenden Tausch-Modals, KEINE
  Aenderung am Laufplaner.
- KEINE Zyklus-Prognose/Statistik — nur Erfassung + Anzeige.
- KEIN dunkles Design, keine sonstigen zurueckgestellten V/I-Punkte.

## Pakete

- [x] P1: Single-Variante entfernt, drei Nutzer im Fundament
  - Kriterium: Ordner `single/` und Datei `vite.single.config.js` existieren nicht mehr; `scripts/check-drift.mjs` existiert nicht mehr
  - Kriterium: `package.json` enthaelt keine Skripte `dev:single`, `build:single`, `preview:single`, `check:drift`, `build:all` mehr; `.github/workflows/deploy.yml` ruft stattdessen `npm run build` auf (Kommentar zur Zwei-App-Auslieferung dort entfernt)
  - Kriterium: `vite.config.js` enthaelt keine `navigateFallbackDenylist` fuer `/single/` mehr; `public/sw-custom.js` prueft in `isOwnClient` nicht mehr auf `single/`
  - Kriterium: `src/utils/constants.js` USERS enthaelt user3 mit Name "Ben" (Farbe `var(--color-user3)`), user1 traegt `zyklus: true`; `src/styles/variables.css` definiert `--color-user3` (gruen, z.B. #2f7d4f) und `--color-user3-bg`
  - Kriterium: SettingsView zeigt die Benutzer-Beschriftung generisch fuer alle Nutzer ("Benutzer 3" statt hart kodiertem Zweier-Ternary)
  - Kriterium: CLAUDE.md und README.md sind angepasst: `git grep -l "FitTrack Single" -- CLAUDE.md README.md` und `git grep -l "single/src" -- CLAUDE.md README.md` und `git grep -l "check:drift" -- CLAUDE.md README.md package.json scripts/ src/` liefern jeweils keine Treffer; die uebrigen Beschreibungen dort bleiben korrekt (kein Status-Text)
  - Kriterium: pruefen.txt gruen (`npm run build` eingeschlossen)
- [x] P2: Startdialog "Wer trainiert?" und aktive Nutzer im Store
  - Kriterium: auth store fuehrt `activeUserIds` (Ref, Array) + `activeUsers` (Computed) + Setter mit localStorage-Persistenz (Schluessel mit `db.name`-Praefix wie beim Standard-Nutzer); Fallback bei leerem/kaputtem Speicher ist `['user1','user2']`, nie ein leeres Array
  - Kriterium: Neue Komponente (z.B. `src/components/shared/UserSelectModal.vue`) auf Basis des bestehenden Modals: Mehrfachauswahl der drei Nutzer mit Nutzerfarben, Bestaetigen-Knopf bei 0 Ausgewaehlten deaktiviert, letzte Auswahl vorausgewaehlt
  - Kriterium: App.vue zeigt den Dialog beim Start, AUSSER es existiert ein heutiges unfertiges Workout (direkte Dexie-Abfrage wie in `resumeTodaysWorkout`); Schliessen ueber Android-Back laesst die bisherige Auswahl unveraendert gelten
  - Kriterium: `startWorkout` und `startCustomWorkout` schreiben `userIds: [...activeUserIds]` an den workoutLog; `resumeTodaysWorkout` uebernimmt vorhandene `aw.userIds` in `activeUserIds` (Fallback: gespeicherte Auswahl)
  - Kriterium: TrackingView zeigt eine antippbare Chip-Zeile mit den aktiven Nutzernamen (Nutzerfarben); Tipp oeffnet den Dialog erneut; Aenderung waehrend eines aktiven Workouts aktualisiert `userIds` am workoutLog (bestehende Saetze bleiben unangetastet)
  - Kriterium: pruefen.txt gruen
- [x] P3: Tracking-Anzeige fuer 1 bis 3 aktive Nutzer
  - Kriterium: Uebungskarten, Empfehlungs-Laden (`loadRecommendations`), Rad-Tabs, Notification-Warteschlangen (`buildNotificationQuickLog`) und `buildExerciseLines` arbeiten ueber `activeUsers` statt `users` — inaktive Nutzer tauchen im Workout nirgends auf
  - Kriterium: Karten-Layout nach Anzahl: 1 Nutzer volle Breite, 2 nebeneinander (wie bisher), 3 untereinander (CSS-Klasse nach `activeUsers.length`, keine neuen modernen CSS-Features)
  - Kriterium: Auto-Wechsel nach dem Speichern im Rad geht der Reihe nach zum naechsten AKTIVEN Nutzer ohne gespeicherten Satz (funktioniert fuer 1, 2 und 3; bei 1 Nutzer kein Wechsel, Hinweistext ausgeblendet); der Hinweistext unter dem Rad ist nutzerzahl-neutral formuliert
  - Kriterium: Ist der Standard-Nutzer nicht aktiv, ist im Rad und in der Notification der erste aktive Nutzer vorausgewaehlt
  - Kriterium: HistoryView zeigt weiterhin ALLE drei Nutzer im Umschalter (Absicht: History ist unabhaengig von der Tageswahl)
  - Kriterium: `git grep -n "authStore.users" -- src/views/TrackingView.vue` liefert keine Treffer mehr (alles auf activeUsers umgestellt)
  - Kriterium: pruefen.txt gruen
- [x] P4: Dexie v4 mit exerciseNotes, Sync und Backup erweitert
  - Kriterium: `src/db/dexie.js` enthaelt `db.version(4).stores({ exerciseNotes: 'id, exerciseId, userId' })` mit Kommentar "additiv, verlustfrei" — bestehende Versionen unveraendert
  - Kriterium: Neues Composable (z.B. `src/composables/useExerciseNotes.js`): Laden je Uebung, Speichern je Nutzer mit deterministischer Id `exerciseId + '_' + userId`, updatedAt, `pushRecord`; Leeren schreibt `text: ''` statt zu loeschen
  - Kriterium: `SYNCED` in syncService, `IMPORT_TABLES` und `exportToJSON` in exportData enthalten `exerciseNotes` (git grep belegbar in beiden Dateien)
  - Kriterium: Keine UI-Aenderung in diesem Paket
  - Kriterium: pruefen.txt gruen
- [x] P5: Bild-Manifest, Foto-Download, Precache
  - Kriterium: `src/data/uebungskatalog.json` existiert und enthaelt exakt die Eintraege der Plan-Tabelle: je Eintrag `key`, `name` (lesbarer Anzeigename), `bilder` (2 relative Pfade `uebungsbilder/<key>/0.webp`, `.../1.webp`), `primaer`, `sekundaer` (normalisierte Muskel-Ids mit Unterstrich), `aliasse` (die Katalognamen aus der Tabelle, klein geschrieben); "low row" und "cable row (without chest support)" sind zwei Aliasse am Eintrag Seated_Cable_Rows
  - Kriterium: `scripts/uebungsbilder-holen.mjs` liest das Manifest, laedt je Key `0.jpg`/`1.jpg` von raw.githubusercontent.com (URL-Muster siehe Plan), skaliert mit sharp auf 400px Breite als webp (Qualitaet ~75) nach `public/uebungsbilder/<key>/`, ist idempotent (vorhandene Dateien uebersprungen) und bricht bei Netzfehler mit klarer Meldung und Exit ungleich 0 ab
  - Kriterium: Das Skript wurde ausgefuehrt; ein node-Einzeiler belegt: Anzahl der webp-Dateien unter `public/uebungsbilder/` == 2 x Anzahl der Manifest-Eintraege
  - Kriterium: `vite.config.js` globPatterns enthaelt `webp` (Fotos sind offline verfuegbar)
  - Kriterium: pruefen.txt gruen
- [x] P6: Muskel-Grafik MuscleMap
  - Kriterium: `src/components/shared/MuscleMap.vue` zeichnet zwei schematische Koerper-Silhouetten (Vorderseite + Rueckseite) als Inline-SVG; jede Muskelregion ist ein Pfad/Shape mit `data-muscle`-Attribut; insgesamt sind alle 18 Ids vorhanden: neck, traps, shoulders, chest, biceps, triceps, forearms, abdominals, obliques, lats, middle_back, lower_back, glutes, abductors, adductors, quadriceps, hamstrings, calves
  - Kriterium: Props: `primary` (Array), `secondary` (Array), `fallbackGroup` (Grobgruppen-Id) und `size`; primaer kraeftig eingefaerbt (Akzentrot), sekundaer hell, Rest neutral grau; ohne primary/secondary greift die Grobgruppen-Zuordnung: chest->[chest], back->[lats,middle_back,lower_back,traps], shoulders->[shoulders], legs->[quadriceps,hamstrings,glutes,calves,abductors,adductors], arms->[biceps,triceps,forearms], core->[abdominals,obliques], full_body->alle (hell)
  - Kriterium: `scripts/musclemap-pruefen.mjs` liest die .vue-Datei und prueft, dass alle 18 `data-muscle`-Ids vorkommen und die Grobgruppen-Tabelle nur bekannte Ids nennt; Lauf ist gruen
  - Kriterium: pruefen.txt gruen
- [x] P7: Bilder in Karten und Katalog, automatische Zuordnung
  - Kriterium: Neues Hilfsmodul (z.B. `src/utils/uebungsBilder.js`): Manifest-Zugriff, Pfad-Aufloesung mit Vite-Base, Namens-Matching (klein schreiben, Anfuehrungszeichen/Doppelpunkte entfernen, Mehrfach-Leerzeichen glaetten, Abgleich gegen `aliasse`) — als reine Funktionen
  - Kriterium: `scripts/uebungsbilder-matching-test.mjs` prueft das Matching als Vertrag: alle 31 Katalognamen aus der Plan-Tabelle treffen ihren Key, drei Fantasienamen treffen nichts; Lauf ist gruen
  - Kriterium: Uebungen tragen optional `imageKey`; CatalogView-Formulare (Neu + Bearbeiten) haben ein Auswahlfeld "Bild" (Manifest-Eintraege mit Anzeigename + Option "kein Bild") mit kleiner Vorschau des gewaehlten Bilds
  - Kriterium: SettingsView-Knopf "Bilder automatisch zuordnen": setzt `imageKey` NUR bei Uebungen ohne Wert (idempotent), meldet "X zugeordnet, Y ohne Bild", schreibt per updateExercise (inkl. pushRecord)
  - Kriterium: Tracking-Karte zeigt links ein kleines Thumbnail (~40px, Foto 0.webp); ohne Bild stattdessen die MuscleMap klein mit Grobgruppen-Markierung als Platzhalter
  - Kriterium: pruefen.txt gruen
- [ ] P8: Uebungs-Detailansicht mit Notizen je Nutzer
  - Kriterium: Neues Modal (z.B. `src/components/tracking/ExerciseDetail.vue`): grosses Bild, das bei zwei vorhandenen Fotos automatisch alle ~900ms zwischen Position 0 und 1 wechselt (Bewegungs-Eindruck); darunter MuscleMap (primaer/sekundaer aus dem Manifest, sonst Grobgruppe); darunter die gemeinsame Uebungs-Notiz (bestehendes `notes`-Feld, nur Anzeige)
  - Kriterium: Je Nutzer ein eigenes Notizfeld (alle drei Nutzer, Nutzerfarbe am Rand, Standard-Nutzer zuoberst), gespeichert ueber das exerciseNotes-Composable aus P4 (Speichern-Knopf oder beim Schliessen; danach gepusht)
  - Kriterium: Einstieg 1: Tipp auf das Thumbnail der Tracking-Karte oeffnet die Detailansicht und NICHT das Eingabe-Rad (Klick-Weiterleitung gestoppt); Karten-Tipp ausserhalb des Thumbnails oeffnet weiterhin das Rad
  - Kriterium: Einstieg 2: im Katalog oeffnet ein Tipp auf das Thumbnail/Bild-Symbol der Zeile dieselbe Detailansicht; das Bearbeiten-Verhalten des Katalogs bleibt unveraendert
  - Kriterium: pruefen.txt gruen
- [ ] P9: Alternativen in der Planung hinterlegen
  - Kriterium: Im Tag-Editor der PlanningView hat jede Uebungszeile einen kleinen Alternativen-Knopf mit Zaehler (z.B. "⇄ 2"); er oeffnet ein Auswahl-Modal (Suche, gleiche Muskelgruppe zuerst, Mehrfachauswahl, hartes Maximum 4 mit sichtbarem Hinweis)
  - Kriterium: Die Auswahl wird als `alternativen` (Array aus exerciseId) am Eintrag in `day.exercises` gespeichert (updateTrainingDay, flache Kopien, pushRecord-Weg wie im Bestand)
  - Kriterium: `finishPicker`, `removeExerciseFromDay` und `updateExerciseSets` in PlanningView erhalten beim Neuaufbau der Liste vorhandene `alternativen` (Regressionsschutz: Uebungen hinzufuegen/entfernen/Sets aendern verliert keine Alternativen — im Code belegt, alle drei Stellen kopieren generisch alle Felder)
  - Kriterium: Eintraege ohne `alternativen` bleiben gueltig (alte Plaene laufen unveraendert)
  - Kriterium: pruefen.txt gruen
- [ ] P10: Schnellwechsel im Workout (Tippen + Wischen)
  - Kriterium: Beim Workout-Start erhaelt jeder Eintrag in `workoutExercises` ein `basisExerciseId` (die geplante Uebung), falls noch nicht vorhanden (Resume/Override behaelt gespeicherte Werte); der Wechsel-Ring ist `[basisExerciseId, ...alternativen]`
  - Kriterium: Karten mit Ring-Laenge > 1 zeigen ein Wechsel-Symbol plus Punktreihe (ein Punkt je Ring-Position, aktiver Punkt markiert); Tipp auf das Symbol springt zur naechsten Ring-Position
  - Kriterium: Horizontales Wischen auf der Karte (Touch: |dx| > 40px und |dx| > 2x|dy|) wechselt vor/zurueck im Ring; vertikales Scrollen und normales Tippen bleiben unbeeintraechtigt; ohne Alternativen loest Wischen nichts aus
  - Kriterium: Jeder Wechsel setzt `exerciseId`, ruft `persistWorkoutExercises` (Kopier-Leitplanke!), laedt Empfehlungen neu und aktualisiert die Notification — wie beim bestehenden Tausch; das bestehende Tausch-Modal (freier Tausch) bleibt unveraendert erreichbar
  - Kriterium: Nach einem freien Tausch auf eine Uebung AUSSERHALB des Rings zeigt die Punktreihe keinen aktiven Punkt; der naechste Tipp springt zur Basis-Uebung
  - Kriterium: pruefen.txt gruen
- [ ] P11: Workout-Notiz und Zyklustag
  - Kriterium: Im aktiven Workout gibt es unter dem Kopf (Titel/Datum) eine Zeile mit Knopf "Notiz" (immer) und Knopf "Zyklustag" (nur wenn ein aktiver Nutzer `zyklus: true` traegt); vorhandene Werte sind am Knopf erkennbar (z.B. "Notiz ✓" / "Zyklustag 17")
  - Kriterium: Notiz-Modal mit Textfeld; Speichern schreibt `note` an den workoutLog (updatedAt + pushRecord); erneutes Oeffnen zeigt den gespeicherten Text; Resume nach Reload ebenfalls
  - Kriterium: Zyklus-Modal nutzt den bestehenden WheelPicker mit Werten 1 bis 45 plus separatem "Entfernen"-Knopf; Speichern schreibt `cycleDays: { [userId]: Zahl }` fuer den Zyklus-Nutzer an den workoutLog (Objekt mergen, nicht ersetzen), Entfernen loescht nur diesen Schluessel
  - Kriterium: Beide Felder sind additiv — workoutLogs ohne sie bleiben ueberall gueltig
  - Kriterium: pruefen.txt gruen
- [ ] P12: History mit Tages-Detail
  - Kriterium: In der History ist jede Datums-Kopfzelle antippbar und oeffnet ein Tages-Modal: alle workoutLogs dieses Datums mit Titel (Trainingstag bzw. "Individuelles Training"), Teilnehmer-Namen aus `userIds` (Fallback bei alten Logs: keine Anzeige), Workout-Notiz, Zyklustag
  - Kriterium: Notiz und Zyklustag sind im Tages-Modal nachtraeglich editierbar (gleiche Bausteine wie P11, Schreibweg db.workoutLogs.update + pushRecord)
  - Kriterium: Datums-Kopfzellen mit vorhandener Notiz oder Zyklustag tragen eine kleine Punkt-Markierung
  - Kriterium: Die Spreadsheet-Darstellung selbst (Zeilen, Max-Spalte, Scroll-Verhalten) bleibt unveraendert
  - Kriterium: pruefen.txt gruen
- [ ] P13: Version 2.0.0, CHANGELOG, Doku
  - Kriterium: `package.json` Version ist `2.0.0` (Single Source of Truth, Settings zeigt sie automatisch)
  - Kriterium: CHANGELOG.md hat einen 2.0.0-Block (Datum, Features in Stichpunkten, Entscheidungen: Ben frisch, Bildquelle free-exercise-db, Tippen+Wischen; Hinweis: Single-Variante entfernt, /single/ ist nach dem naechsten Deploy weg)
  - Kriterium: Projekt-CLAUDE.md beschreibt den neuen Stand: drei Nutzer + Nutzerwahl (geraete-lokal), exerciseNotes (Dexie v4), Bild-Manifest + uebungsbilder-holen, Alternativen-Ring, Notiz/Zyklustag am workoutLog — als Architektur-Beschreibung, ohne Status-Woerter wie "geplant" oder "offen"
  - Kriterium: README.md beschreibt die App als Drei-Personen-App mit Nutzerwahl; `git grep -l "FitTrack Single" -- README.md CLAUDE.md` liefert keine Treffer (Formulierungen wie "Single Source of Truth" sind davon unberuehrt und erlaubt)
  - Kriterium: pruefen.txt gruen

## Nach dem Lauf (interaktive Session mit Gabriel — NICHT Autopilot)

1. **Pruefen vor dem Deploy:** Browser-Tests auf frischer `*.localhost`-Adresse
   (Startdialog 1/2/3 Nutzer, Karten-Layouts, Alternativen-Wechsel, Detail-
   ansicht, Notiz + Zyklustag, History-Tagesmodal, Regressionscheck der
   Kernfunktionen aus verbesserungen.md). UI-Verifikations-Regeln der globalen
   CLAUDE.md beachten (Viewport zuerst; Wisch-Geste ist am Geraet zu testen,
   nicht im Browser — ehrlich ausweisen).
2. **Bens Versicherung (VOR dem Deploy, durch Gabriel/Ben):** In der alten
   Single-App auf Bens Geraet einmal Settings -> "Backup exportieren (JSON)"
   antippen und die Datei aufheben. Ben startet zwar frisch, aber damit ist
   sein alter Stand gesichert, falls er es sich anders ueberlegt. Nach dem
   Deploy ist die Single-App nicht mehr erreichbar.
3. **Deploy:** per `/deploy` (Build, Commit, Push, Pages, Status-Check), danach
   Tag `v2.0.0`. Telegram-Hinweis an die Handys: App komplett schliessen und
   neu oeffnen, Settings muss 2.0.0 zeigen. Warnzeile in die Nachricht:
   "Bens alte Single-App verschwindet mit diesem Update — Backup vorher
   exportieren" (Datenverlust-Check der globalen Regeln).
4. **Handy-Checkliste (kann Claude nicht selbst pruefen):** Startdialog auf
   beiden Handys; drei Nutzer eintragen; Wischen auf der Karte; Sperrbildschirm-
   Quick-Log mit 1 und 3 aktiven Nutzern; Fotos offline (Flugmodus nach erstem
   Laden); Lisas Zyklustag-Rad.

## Rollback (falls etwas schiefgeht)

- **Vor dem Deploy:** Es ist nichts gepusht und nichts live — lokalen Stand
  verwerfen heisst schlicht: nicht deployen. Rueckkehrpunkt-SHA nennt der
  Autopilot-Preflight.
- **Nach dem Deploy:** Live-Rueckkehr = Checkout des Tags `v1.8.1`, bauen,
  deployen. ACHTUNG Datenbank: Ein Handy, das v2 schon geoeffnet hat, steht auf
  IndexedDB-Schema v4; die unveraenderte v1.8.1-App wirft dort beim Oeffnen
  einen Versionsfehler. Rollback-Rezept deshalb: auf dem v1.8.1-Stand einen
  Hotfix bauen, der NUR den leeren Schema-Eintrag
  `db.version(4).stores({ exerciseNotes: 'id, exerciseId, userId' })`
  ergaenzt — dann laeuft die alte App auch auf der gehobenen DB. Daten gehen in
  keinem der Wege verloren (alle Aenderungen sind additiv, geloescht wird nie).
