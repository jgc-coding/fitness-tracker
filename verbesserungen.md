# Verbesserungen
Stand: 2026-08-17 (Runde 1, Fokus: Gym-UX — als v1.2.0 umgesetzt, gemergt,
deployt und abgesichert; nur V8/I1/I5 sind zurueckgestellt)

Vorgeschichte: Die /improve-Runde vom 2026-07-07 (Punkte 1-12) ist in
`weitermachen.md` dokumentiert und mit v1.1.0 umgesetzt. Punkt 11 war zunaechst
"bewusst EIN getrackter Satz je Uebung" (Gabriel, 2026-08-16); am 2026-09-26
entschieden neu: Satzzahl je Person einstellbar (v2.4.0, Regel in der CLAUDE.md).

## Kernfunktionen (Pruefliste — jede Runde erneut abfahren)
1. **Plan erstellen** (Plan + Trainingstag + Uebungen zuordnen) — erwartet: Plan sichtbar, Uebungen mit Sets · zuletzt: laeuft (2026-08-16, live in Single-Variante)
2. **Workout starten + Satz loggen** — erwartet: 1 Tap Start, Vorbelegung mit letzten Werten, Satz erscheint auf Karte · zuletzt: laeuft (2026-09-13, Browser, beide Apps: Karte zeigt Gewicht x Wdh, Rad startet mit denselben Zahlen, Speichern beider Nutzer mit Auto-Wechsel)
3. **Uebung tauschen/hinzufuegen im Workout** — erwartet: Tausch ueberlebt Tab-Wechsel und Reload; Frage "nur heute / dauerhaft" · zuletzt: Tausch "nur heute" laeuft (2026-09-13, Browser); Reload nach Tausch und Hinzufuegen zuletzt 2026-08-16 geprueft
4. **Individuelles Training** — erwartet: ueberlebt App-Neustart · zuletzt: laeuft (2026-09-13, Browser — nach Neuladen wieder da)
5. **Plan-Workout-Resume nach Reload** — erwartet: aktiver Tag + Saetze wieder da · zuletzt: laeuft (2026-08-16, live)
6. **History-Spreadsheet** — erwartet: Muskelgruppen, neueste Spalte direkt sichtbar, spontane Uebungen dabei · zuletzt: laeuft (2026-08-16, live)
7. **Katalog** (Suche/Filter/eigene Uebung/Seed) — zuletzt: laeuft (2026-08-16, live)
8. **Dual-User + Cloud-Sync** — zuletzt: laut Gabriel zeigen beide Handys „Aktiv" (2026-08-17, nach Login); Datenfluss-Test Handy→Handy steht noch aus (`meine-todos.md`). Von Claude nicht interaktiv pruefbar (Echtdaten)
9. **Export CSV/JSON + Notifications inkl. Quick-Log** — zuletzt: nicht pruefbar (Download/Sperrbildschirm nur am echten Geraet)
10. **Laufplaner** (Plan importieren, Woche/Jahr, Erledigt/Verschieben/Tauschen, Status-Export) — zuletzt: laeuft (2026-09-05, im Browser gegen IndexedDB geprueft, beide Varianten)

## Offen
- [ ] **V8** (C) Direkteingabe im Gewichts-Rad — zurueckgestellt 2026-08-16 (Gabriel)
      Tipp auf den Wert oeffnet Ziffernblock; Rad bleibt fuer Feinjustage.
      Beleg: WheelPicker.vue ohne Eingabefeld; bis zu 300 Rad-Positionen. · Aufwand: S-M
- [ ] **V14** (C) Deploy-Workflow auf Node-24-faehige Actions heben — gefunden 2026-09-13
      GitHub meldet beim Deploy "Node.js 20 is deprecated": checkout, setup-node und
      upload-artifact laufen nur noch erzwungen auf Node 24. Heute gruen; faellt der
      Zwang weg, bricht der Deploy. Versionen bewusst anheben, mit Test-Deploy pruefen.
      Nachtrag 2026-09-23: zusaetzlich wechselt `ubuntu-latest` ab 19.10.2026 auf
      Ubuntu 26 (Hinweis im Lauf 35912764194) — beim Anheben mit pruefen.
      Beleg: Actions-Lauf 34761917049; deploy.yml nutzt Actions @v4 und node-version 20. · Aufwand: S

## Ideen
- **I7** (Erweiterung) Ungeplanten Lauf von Hand eintragen — Aufwand: S
      Nutzen: Paket 1 kennt nur Laeufe aus dem Claude-Plan; ein spontaner Lauf
      laesst sich bis Paket 2 nirgends festhalten. Abgrenzung: ein Knopf in der
      Wochenansicht, der einen Lauf mit `unplanned: true` anlegt — mit Paket 2
      kommt derselbe Lauf ohnehin automatisch von der Uhr, deshalb erst danach
      entscheiden, ob es den Knopf noch braucht.
- **I8** (Erweiterung) Alle Saetze eines Tages in der History zeigen — Aufwand: S-M
      Nutzen: Seit v2.4.0 erfasst Lisa jeden Satz einzeln; History und CSV
      zeigen je Tag aber nur den schwersten. Abgrenzung: Tipp auf eine Zelle
      zeigt die Saetze dieses Tages; die Tabelle selbst bleibt ein Wert je Zelle.
- **I9** (Erweiterung) Einen einzelnen Satz loeschen — Aufwand: S
      Nutzen: Ein versehentlich gespeicherter Satz (z.B. per Sperrbildschirm)
      laesst sich bisher nur ueberschreiben. Abgrenzung: "Satz entfernen" im
      Rad fuer gespeicherte Saetze, Loeschen mit Tombstone (pushDelete).
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
- **I6b** (Erweiterung) Laufplaner Paket 2 — erledigt in v1.5.0: Verbindung zu
  intervals.icu unter Laufen -> Plan, automatischer Abgleich beim Oeffnen und
  auf Knopfdruck, Zuordnung mit Ist-Werten, ungeplante Laeufe bleiben erhalten,
  Schluessel nur auf dem Geraet, 43 Vertragsfaelle gruen.
- **I6a** (Erweiterung) Laufplaner Paket 1 — erledigt in v1.4.0: Reiter "Laufen"
  (Woche/Jahr/Plan), Import und Status-Export des Claude-Jahresplans, Merge nach
  Kennung, Dexie v3, Sync und Backup erweitert, 64 Vertragsfaelle gruen.
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
