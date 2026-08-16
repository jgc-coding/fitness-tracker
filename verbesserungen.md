# Verbesserungen
Stand: 2026-08-16 (Runde 1 dieses Registers, Fokus: Gym-UX / Benutzererfahrung)

Vorgeschichte: Eine fruehere /improve-Runde (Punkte 1-12) ist in `weitermachen.md` auf dem
Branch `claude/sad-saha-69e479` dokumentiert und mit v1.1.0 dort weitgehend umgesetzt —
aber seit 2026-07-07 NICHT gemergt/deployt (siehe V1). Punkt 11 (Multi-Set) ist dort als
offene Entscheidung vermerkt und wird hier nicht doppelt gefuehrt.

## Kernfunktionen (Pruefliste — jede Runde erneut abfahren)
1. **Plan erstellen** (Plan + Trainingstag + Uebungen zuordnen) — erwartet: Plan sichtbar, Uebungen mit Sets · zuletzt: laeuft (2026-08-16, live in Single-Variante)
2. **Workout starten + Satz loggen** — erwartet: 1 Tap Start, Vorbelegung mit letzten Werten, Satz erscheint auf Karte · zuletzt: laeuft (2026-08-16, live)
3. **Uebung tauschen/hinzufuegen im Workout** — erwartet: Tausch bleibt bis Workout-Ende sichtbar · zuletzt: **kaputt** (V2, live nachgestellt 2026-08-16)
4. **Individuelles Training** — erwartet: ueberlebt App-Neustart · zuletzt: **kaputt** (V3, live nachgestellt 2026-08-16)
5. **Plan-Workout-Resume nach Reload** — erwartet: aktiver Tag + Saetze wieder da · zuletzt: laeuft (2026-08-16, live)
6. **History-Spreadsheet** — erwartet: Muskelgruppen, Werte je Datum, spontane Uebungen sichtbar · zuletzt: laeuft (2026-08-16, live; Leerzeilen-Fix liegt auf v1.1.0-Branch)
7. **Katalog** (Suche/Filter/eigene Uebung/Seed) — zuletzt: laeuft (2026-08-16, live; Sortier-Bug V5)
8. **Dual-User + Cloud-Sync** — zuletzt: nicht pruefbar (Live-Instanz haengt sofort an Echtdaten von Lisa & Gab — nur lesend geprueft, Code-Analyse ok)
9. **Export CSV/JSON + Notifications** — zuletzt: nicht pruefbar (Download/Sperrbildschirm nur am echten Geraet)

## Offen

- [ ] **V1** (A) v1.1.0-Release mergen + deployen (liegt seit 6 Wochen fertig auf Branch)
      Gefahr: Die deployte App meldet jeden Besucher ohne Passwort automatisch an; die
      Datenbank-Regeln erlauben jedem Angemeldeten Lesen/Schreiben/Loeschen ALLER Daten
      von Lisa & Gab. Der Fix (E-Mail-Login, Rules, Tombstones, Push-Fehler-Anzeige,
      Android-Back, CHANGELOG, .gitattributes, npm-audit-Lockfile) liegt komplett auf
      `claude/sad-saha-69e479` (9 Commits, 2026-07-07).
      Beleg: firestore.rules:9 (`allow read, write: if request.auth != null`),
      src/services/syncService.js:141 (signInAnonymously); Live-Beweis 2026-08-16: frisch
      geoeffnete Dev-Instanz zeigte nach Sekunden die Echtdaten inkl. offener Session.
      Aufwand: S (Prozess, kein neuer Code) · Risiko: hoch (oeffentliche URL, Vollzugriff)
      Ablauf: feste Reihenfolge in `weitermachen.md` des Branches (Firebase-Console-Schritte
      durch Gabriel → Merge → Deploy → beide Handys anmelden → Rules scharf).
- [ ] **V2** (B) Uebungs-Tausch/Quick-Add am Workout-Log persistieren
      Gefahr: Geraet belegt → Uebung getauscht → kurz in History/Planung geschaut → Tausch
      ist weg; ein bereits geloggter Satz der neuen Uebung verschwindet aus der Ansicht
      (Daten bleiben in setLogs, wirken aber verschluckt). Kern-Szenario von Gabriel.
      Beleg: live doppelt nachgestellt (2026-08-16, Single-App); src/views/TrackingView.vue:588-592
      (onMounted baut Liste aus day.exercises), :562-567 (Ruecksync nur bei isCustom).
      Auf v1.1.0-Branch NICHT behoben (dort :498/:570/:597). Aufwand: M
- [ ] **V3** (B) Individuelles Training in db.workoutLogs persistieren (reload-fest)
      Gefahr: Android beendet die PWA in der Hosentasche; danach ist das laufende
      individuelle Training samt Uebungsliste weg — mitten im Training alles neu
      zusammenklicken. Geloggte Saetze bleiben erhalten (setLogs), der Container nicht.
      Beleg: live nachgestellt (Reload → "Training starten"); src/stores/workout.js:53-68
      (memory-only, eigener Code-Kommentar Z.47-48), resumeTodaysWorkout findet nur DB-Logs
      (:178-188). Auf v1.1.0 NICHT behoben. Aufwand: M
- [ ] **V4** (B) 0-kg-Vorschlag: `|| 20` durch `?? 20` ersetzen
      Gefahr: Koerpergewichtsuebungen mit 0 kg bekommen naechstes Mal 20 kg vorgeschlagen —
      die 0 zaehlt in JavaScript als "nichts da" (Falsy-Falle).
      Beleg: src/views/TrackingView.vue:422-423 (auf v1.1.0: :428/:446). Aufwand: S
- [ ] **V5** (B) Katalog-Sortierung vereinheitlichen (orderBy vs. localeCompare)
      Gefahr: Nach dem Laden sortiert IndexedDB byte-weise (Grossbuchstaben vor
      Kleinbuchstaben, Anfuehrungszeichen zuerst) — kleingeschriebene Uebungen stehen an
      falscher Stelle, die Liste wirkt unsortiert, Uebungen werden uebersehen.
      Beleg: src/composables/useExercises.js:14 (orderBy) vs. :38 (localeCompare);
      auf v1.1.0 identisch. Fix: nach dem Laden einmal localeCompare-sortieren. Aufwand: S
- [ ] **V6** (B) Uebung loeschen: warnen, wenn Trainingshistorie existiert
      Gefahr: Katalog aufraeumen laesst komplette Trainingshistorien aus History und Export
      verschwinden (Saetze bleiben unsichtbar in der DB) — wirkt wie Datenverlust.
      Beleg: src/composables/useExercises.js:52-55 (loescht nur exercise);
      src/composables/useHistory.js:103+134 (Zeilen nur aus Katalog). Aufwand: S-M
- [ ] **V7** (C) Tausch-Liste auf gleiche Muskelgruppe vorfiltern
      Gefahr: Im "Geraet belegt"-Moment listet der Tausch-Dialog alle 31 Uebungen A-Z
      (beginnt bei Beinen, auch beim Schulter-Tausch) — Tipp-Suche statt zwei Taps.
      Beleg: live gesehen; src/views/TrackingView.vue:301-304 (nur Namenssuche); der
      Planungs-Picker hat Muskelgruppen-Sortierung bereits (PlanningView.vue:266-292).
      Aufwand: S
- [ ] **V8** (C) Direkteingabe im Gewichts-Rad (Tipp auf Wert → Ziffernblock)
      Gefahr: 60 kg Unterschied = ~48 Rasterschritte Kurbelei mit Schwungphysik; nach
      Tausch/neuer Uebung startet das Rad bei 20 kg. Laengste Einzelinteraktion der App.
      Beleg: src/components/shared/WheelPicker.vue:1-21 (kein input, Werte ohne @click),
      src/views/TrackingView.vue:332-346 (bis 300 Positionen), Fallback :422. Aufwand: S-M
- [ ] **V9** (C) History beim Oeffnen ans rechte Ende scrollen (neueste Trainings)
      Gefahr: Der Gym-Standardblick "was war letztes Mal?" landet bei den AELTESTEN Daten
      und wischt jedes Mal quer durch Monate.
      Beleg: src/composables/useHistory.js:112 (alt→neu), src/views/HistoryView.vue:148-157
      (kein Scroll-Init). Aufwand: S
- [ ] **V10** (C) Steigern-Merker in Vorschlagswert einrechnen
      Gefahr: Der Pfeil merkt den Vorsatz, aber das Rad startet beim alten Gewicht — der
      Merker spart keinen Handgriff.
      Beleg: src/views/TrackingView.vue:87 (nur Anzeige), :420-423 (kein Aufschlag);
      Schrittweite existiert (1,25 kg Barbell/Machine, sonst 1 kg). Aufwand: S
- [ ] **V11** (D) `.claude/pruefen.txt` anlegen (Done-Gate)
      Gefahr: Ohne die Datei prueft der Stop-Hook nichts — "geprueft" bleibt Behauptung.
      Beleg: fehlt auf master UND v1.1.0-Branch (.claude/ nur launch.json + skills).
      Start: eine Zeile `npm run build:all`. Aufwand: S
- [ ] **V12** (D) Prozess-Stufe "Produkt" in Zeile 1-3 der CLAUDE.md
      Gefahr: Ohne Stufe ist nicht entscheidbar, ob fehlende Dateien Absicht sind.
      Beleg: CLAUDE.md:1-4 ohne Stufe (master und v1.1.0). Aufwand: S
- [ ] **V13** (D) README durch echte Projekt-Doku ersetzen
      Gefahr: Repo erklaert sich Fremden und kuenftigen Sessions nicht.
      Beleg: README.md:1-5 = Vite-Template, auch auf v1.1.0. Aufwand: S

## Ideen

- **I1** (Erweiterung) Trainingsmodus: Bildschirm-Wachhalten + Pausen-Timer — Aufwand: M
      Nutzen: Handy bleibt zwischen Saetzen an der Bank liegen, ein Blick + ein Tap statt
      Entsperren und App-Suchen; Timer meldet den naechsten Satz. ·
      Bedarf: kein wakeLock/Timer im Repo (Grep 0 Treffer), Notification nur Anzeige ·
      Abgrenzung: kein Audio-Coaching, keine automatische Satzerkennung.
- **I2** (Abrundung) Tausch dauerhaft uebernehmen + "zuletzt benutzt" zuerst — Aufwand: S
      Nutzen: Wird die Ausweich-Uebung zur Gewohnheit, uebernimmt ein Tap sie in den Plan;
      haeufige Uebungen stehen in Tausch-/Add-/Katalog-Listen oben. ·
      Bedarf: swapExercise aendert nie den Plan (TrackingView.vue:511-520), kein
      lastUsed-Feld im Schema · Abgrenzung: keine stillschweigende Plan-Aenderung.
- **I3** (Erweiterung) Satz aus der Sperrbildschirm-Notification loggen — Aufwand: M
      Nutzen: Der haeufigste Fall ("gleiches Gewicht nochmal") geht ohne Entsperren —
      groesster Hebel gegen "Handy raus". ·
      Bedarf: Notification + SW-Klick-Handler existieren (sw-custom.js), einzige Action ist
      "Oeffnen" (notifications.js:40-42) · Abgrenzung: Gewicht AENDERN weiter in der App.
- **I4** (Abrundung) App-Shortcuts im PWA-Manifest — Aufwand: S
      Nutzen: Long-Press aufs Icon → "Heutiges Workout" / "Individuelles Training",
      Einstieg in 1 Tap statt 3-4. ·
      Bedarf: manifest ohne shortcuts-Feld (vite.config.js:39-68) · Abgrenzung: keine
      Widgets (koennen PWAs auf Android nicht).
- **I5** (Erweiterung) Dunkles Design — Aufwand: M
      Nutzen: In gedimmter Gym-Beleuchtung blendet die weisse Oberflaeche; dunkle Variante
      macht den kurzen Blick angenehmer. ·
      Bedarf: nur eine helle Palette (variables.css:1-57), kein prefers-color-scheme im
      Repo · Abgrenzung: genau ein dunkles Theme, kein Theme-Baukasten.

## Abgelehnt
(noch nichts)

## Erledigt
(auf dem ungemergten v1.1.0-Branch bereits behoben, hier nicht neu gefuehrt: Tombstones,
sichtbare Push-Fehler, Android-Back schliesst Modals, History-Leerzeilen, CSV-BOM,
CHANGELOG/.gitattributes, CLAUDE.md-Drift inkl. Status-Zeile, npm-audit-Lockfile —
gelten als erledigt, sobald V1 gemergt ist)
