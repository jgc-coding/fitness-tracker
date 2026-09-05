# Verbesserungen
Stand: 2026-08-17 (Runde 1, Fokus: Gym-UX — als v1.2.0 umgesetzt, gemergt,
deployt und abgesichert; nur V8/I1/I5 sind zurueckgestellt)

Vorgeschichte: Die /improve-Runde vom 2026-07-07 (Punkte 1-12) ist in
`weitermachen.md` dokumentiert und mit v1.1.0 umgesetzt. Punkt 11 ist entschieden:
**Es bleibt bewusst bei EINEM getrackten Satz je Uebung** (Gabriel, 2026-08-16) —
steht jetzt als Architektur-Entscheidung in der CLAUDE.md.

## Kernfunktionen (Pruefliste — jede Runde erneut abfahren)
1. **Plan erstellen** (Plan + Trainingstag + Uebungen zuordnen) — erwartet: Plan sichtbar, Uebungen mit Sets · zuletzt: laeuft (2026-08-16, live in Single-Variante)
2. **Workout starten + Satz loggen** — erwartet: 1 Tap Start, Vorbelegung mit letzten Werten, Satz erscheint auf Karte · zuletzt: laeuft (2026-08-16, live)
3. **Uebung tauschen/hinzufuegen im Workout** — erwartet: Tausch ueberlebt Tab-Wechsel und Reload; Frage "nur heute / dauerhaft" · zuletzt: laeuft (2026-08-16, live nach V2-Fix)
4. **Individuelles Training** — erwartet: ueberlebt App-Neustart · zuletzt: laeuft (2026-08-16, live nach V3-Fix)
5. **Plan-Workout-Resume nach Reload** — erwartet: aktiver Tag + Saetze wieder da · zuletzt: laeuft (2026-08-16, live)
6. **History-Spreadsheet** — erwartet: Muskelgruppen, neueste Spalte direkt sichtbar, spontane Uebungen dabei · zuletzt: laeuft (2026-08-16, live)
7. **Katalog** (Suche/Filter/eigene Uebung/Seed) — zuletzt: laeuft (2026-08-16, live)
8. **Dual-User + Cloud-Sync** — zuletzt: laut Gabriel zeigen beide Handys „Aktiv" (2026-08-17, nach Login); Datenfluss-Test Handy→Handy steht noch aus (`meine-todos.md`). Von Claude nicht interaktiv pruefbar (Echtdaten)
9. **Export CSV/JSON + Notifications inkl. Quick-Log** — zuletzt: nicht pruefbar (Download/Sperrbildschirm nur am echten Geraet)

## Offen
- [ ] **V8** (C) Direkteingabe im Gewichts-Rad — zurueckgestellt 2026-08-16 (Gabriel)
      Tipp auf den Wert oeffnet Ziffernblock; Rad bleibt fuer Feinjustage.
      Beleg: WheelPicker.vue ohne Eingabefeld; bis zu 300 Rad-Positionen. · Aufwand: S-M

## Ideen
- **I6** (Erweiterung) Laufplaner: Jahresplan aus Claude in der App, Laeufe automatisch von Garmin —
      freigegeben 2026-09-05 (Gabriel), noch nicht begonnen. Kompletter Bauplan mit
      Datenmodell, Dateiformat, Merge-Regeln und Akzeptanzkriterien: `docs/laufplaner-plan.md`.
      Paket 1 (v1.4.0, Reiter "Laufen") zuerst, Paket 2 (v1.5.0, intervals.icu) danach. · Aufwand: L + M
- **I1** (Erweiterung) Trainingsmodus: Bildschirm-Wachhalten + Pausen-Timer — zurueckgestellt 2026-08-16 (Gabriel) · Aufwand: M
      Nutzen: Handy bleibt zwischen Saetzen an, ein Blick + ein Tap; Timer meldet den
      naechsten Satz. · Bedarf: kein wakeLock/Timer im Repo · Abgrenzung: kein Audio-Coaching.
- **I5** (Erweiterung) Dunkles Design — zurueckgestellt 2026-08-16 (Gabriel) · Aufwand: M
      Nutzen: weniger Blendung in gedimmter Gym-Beleuchtung. · Bedarf: nur helle
      Palette in variables.css · Abgrenzung: genau ein dunkles Theme.
- **I2** angenommen am 2026-08-16 → umgesetzt in v1.2.0 (Tausch dauerhaft + zuletzt benutzt)
- **I3** angenommen am 2026-08-16 → umgesetzt in v1.2.0 (Quick-Log aus der Notification)
- **I4** angenommen am 2026-08-16 → umgesetzt in v1.2.0 (App-Shortcuts)

## Abgelehnt
(noch nichts — V8/I1/I5 sind zurueckgestellt, nicht abgelehnt)

## Erledigt
- **V1** (A) Release + Absicherung — erledigt 2026-08-17: master gemergt, v1.2.0
  deployt und getaggt, alle 6 Firebase-Schritte durch (Login-Pflicht, Rules nur
  fuers gemeinsame Konto, Anonym-Anbieter aus). Der offene Vollzugriff ist zu.
- **V2** Uebungs-Tausch/Quick-Add am Workout-Log persistiert — erledigt in v1.2.0
- **V3** Individuelles Training reload-fest (db.workoutLogs) — erledigt in v1.2.0
- **V4** 0-kg-Vorschlag (`??` statt `||`) — erledigt in v1.2.0
- **V5** Katalog-Sortierung localeCompare — erledigt in v1.2.0
- **V6** Loesch-Warnung bei vorhandener Historie — erledigt in v1.2.0
- **V7** Tausch-Liste gleiche Muskelgruppe zuerst — erledigt in v1.2.0
- **V9** History oeffnet bei den neuesten Trainings — erledigt in v1.2.0
- **V10** Steigern-Merker rechnet Schrittweite in Vorschlag — erledigt in v1.2.0
- **V11** `.claude/pruefen.txt` (Done-Gate) — erledigt in v1.2.0
- **V12** Prozess-Stufe "Produkt" in CLAUDE.md — erledigt in v1.2.0
- **V13** README ersetzt Vite-Vorlage — erledigt in v1.2.0
- (v1.1.0, Vorrunde) Tombstones, sichtbare Push-Fehler, Android-Back, History-
  Leerzeilen, CSV-BOM, CHANGELOG/.gitattributes, CLAUDE.md-Drift, npm-audit-Lockfile
