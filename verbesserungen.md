# Verbesserungen
Stand: 2026-08-16 (Runde 1, Fokus: Gym-UX — Umsetzung als v1.2.0 auf Branch
`claude/fitness-tracker-gym-ux-fb030f`, inkl. Merge des v1.1.0-Branches)

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
8. **Dual-User + Cloud-Sync** — zuletzt: nicht pruefbar interaktiv (Echtdaten); Code-Stand v1.1.0 mit Login-Pflicht, Tombstones, Retry-Queue
9. **Export CSV/JSON + Notifications inkl. Quick-Log** — zuletzt: nicht pruefbar (Download/Sperrbildschirm nur am echten Geraet)

## Offen
- [ ] **V1** (A) v1.1.0+v1.2.0 deployen — WARTET AUF GABRIEL (Firebase-Schritte)
      Gefahr: Solange nicht deployt ist, laeuft im Netz weiter der Stand mit
      anonymem Vollzugriff auf alle Daten.
      Stand: Der v1.1.0-Branch ist in den Arbeits-Branch gemergt und v1.2.0 oben-
      drauf gebaut — es fehlt nur noch die Kette aus `weitermachen.md`:
      Firebase-Console-Schritte 1-3 (Gabriel) → Merge auf master (= Auto-Deploy)
      → Tag v1.2.0 → beide Handys anmelden → Rules scharf. · Risiko: hoch
- [ ] **V8** (C) Direkteingabe im Gewichts-Rad — zurueckgestellt 2026-08-16 (Gabriel)
      Tipp auf den Wert oeffnet Ziffernblock; Rad bleibt fuer Feinjustage.
      Beleg: WheelPicker.vue ohne Eingabefeld; bis zu 300 Rad-Positionen. · Aufwand: S-M

## Ideen
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
