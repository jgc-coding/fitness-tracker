# Dateiformat Laufplan

Dieses Dokument beschreibt das Austauschformat zwischen Claude und der App.
Es gilt in **beide Richtungen**: Claude erzeugt damit einen Jahresplan, und die
App exportiert damit ihren Stand (Haken, Ist-Werte, Verschiebungen) zurueck an
Claude. Ein Format, ein Pruefmodul, kein Uebersetzen.

Vorlage zum Abschauen: `docs/laufplan-beispiel.json` (erfundene Daten).
Pruefen vor dem Import:

```
node .\scripts\laufplan-pruefen.mjs .\privat\laufplan-user2-v1.json
```

Das Skript nutzt exakt dasselbe Pruefmodul wie die App
(`src/utils/runPlanSchema.js`). Was dort gruen ist, laesst sich importieren.

---

## 1. Der Kreislauf in vier Schritten

1. Claude erzeugt eine Datei in diesem Format (ein Plan je Person).
2. Gabriel importiert sie in der App unter **Laufen → Plan**.
3. Die App fuehrt Buch: erledigt, ausgelassen, verschoben, Ist-Werte.
4. Die App exportiert denselben Stand wieder in diesem Format; Claude passt an
   und liefert eine neue Datei. Der Import fuehrt beide Staende zusammen.

Damit Schritt 4 funktioniert, ist eine Regel wichtiger als alle anderen:

> **Kennungen (`id`) bleiben erhalten.** Wer einen Lauf verschiebt oder
> umbenennt, behaelt seine Kennung. Nur wirklich neue Laeufe bekommen neue
> Kennungen. Ueber die Kennung erkennt die App, was schon erledigt ist.

Konvention fuer neue Kennungen: `<planId>-<datum>-<a|b>`, zum Beispiel
`plan-gab-2027-2026-09-16-a`. Das `b` ist fuer einen zweiten Lauf am selben Tag.

---

## 2. Kopf der Datei

```json
{
  "format": "fittrack-laufplan",
  "formatVersion": 1,
  "exportedAt": "2030-01-05T10:00:00.000Z",
  "plans": [ ... ]
}
```

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `format` | ja | Muss woertlich `fittrack-laufplan` sein. |
| `formatVersion` | ja | Zurzeit die Zahl `1`. |
| `exportedAt` | nein | Zeitstempel des Exports, rein informativ. |
| `plans` | ja | Liste mit mindestens einem Plan. |

---

## 3. Ein Plan

```json
{
  "id": "plan-gab-2027",
  "userId": "user2",
  "name": "Backyard Ultra 2027",
  "isActive": true,
  "planVersion": 1,
  "goal": { "type": "backyard", "label": "Backyard Ultra", "date": "2027-09-04", "target": "12 Runden" },
  "phases": [ ... ],
  "weeks": [ ... ],
  "sessions": [ ... ]
}
```

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `id` | ja | Stabile Kennung des Plans, eindeutig in der Datei. |
| `userId` | ja | `user1` oder `user2`. Jede Person hat ihren eigenen Plan. |
| `name` | ja | Anzeigename, zum Beispiel „Backyard Ultra 2027". |
| `isActive` | nein | `true` = der Plan, der in der Jahresansicht gezeigt wird. Fehlt die Angabe, wird der zuletzt genannte Plan der Person aktiv. |
| `planVersion` | nein | Zaehler; die App erhoeht ihn bei jeder inhaltlichen Aenderung selbst. |
| `goal` | ja | Ziel des Plans, siehe unten. |
| `phases` | nein | Trainingsabschnitte, siehe unten. |
| `weeks` | nein | Wochenziele, siehe unten. |
| `sessions` | nein | Die Laeufe, siehe unten. |

### Ziel (`goal`)

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `type` | ja | `backyard`, `marathon`, `halfmarathon`, `ultra`, `fitness` oder `other`. |
| `label` | nein | Name des Rennens, wird in der Zielkarte angezeigt. |
| `date` | nein | Termin als `YYYY-MM-DD`; daraus rechnet die App den Countdown. |
| `target` | nein | Freier Text, zum Beispiel „12 Runden" oder „unter 2 Stunden". |

### Phasen (`phases`)

```json
{ "id": "p1", "name": "Grundlage", "from": "2030-01-07", "to": "2030-02-03", "focus": "lockerer Umfang" }
```

`id` ist innerhalb des Plans eindeutig, `from` darf nicht nach `to` liegen.
`focus` ist ein kurzer Satz, der in der Jahresansicht unter dem Phasennamen steht.

### Wochen (`weeks`)

```json
{ "start": "2030-01-07", "phaseId": "p1", "targetKm": 30, "targetMinutes": 200, "note": "Einstieg" }
```

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `start` | ja | **Muss ein Montag sein** (ISO-Woche). Sonst wird die Datei abgelehnt. |
| `phaseId` | nein | Verweist auf eine Phase desselben Plans. |
| `targetKm` | nein | Wochenziel in Kilometern; Grundlage des Fortschrittsbalkens. |
| `targetMinutes` | nein | Wochenziel in Minuten, falls in Zeit gedacht wird. |
| `note` | nein | Kurzer Hinweis, zum Beispiel „Entlastungswoche". |

Das Pruefskript warnt (ohne die Datei abzulehnen), wenn die Summe der geplanten
Kilometer einer Woche mehr als 20 Prozent vom `targetKm` abweicht. Diese Warnung
ist meistens ein echter Rechenfehler im Plan.

---

## 4. Ein Lauf (`sessions`)

```json
{
  "id": "plan-gab-2027-2026-09-16-a",
  "date": "2026-09-16",
  "type": "long",
  "title": "Langer Lauf",
  "description": "locker, alle 60 min essen ueben",
  "planned": { "km": 22, "minutes": 150, "loops": null },
  "targets": [
    { "label": "Grundtempo", "hrFrom": 128, "hrTo": 140, "paceFrom": "7:10", "paceTo": "7:40" }
  ],
  "status": "planned",
  "actual": null,
  "feedback": null,
  "source": "plan",
  "originalDate": null,
  "externalId": null,
  "unplanned": false
}
```

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `id` | ja | Stabile Kennung, eindeutig in der ganzen Datei. |
| `date` | ja | Kalendertag `YYYY-MM-DD`, lokal gedacht (kein UTC-Zeitstempel). |
| `type` | ja | Lauf-Art aus der Tabelle unten. |
| `title` | ja | Kurzer Titel, erscheint im Wochen-Chip. |
| `description` | nein | Die Durchfuehrung in ein bis zwei Saetzen. |
| `planned` | siehe unten | Vorgabe als `{ km, minutes, loops }`, jeweils Zahl oder `null`. |
| `targets` | nein | Puls und Tempo, siehe unten. Liste oder `null`. |
| `status` | nein | `planned` (Standard), `done` oder `skipped`. |
| `actual` | nein | `{ km, minutes, avgHr, note }` oder `null`. |
| `feedback` | nein | Rueckmeldung des Laeufers: `{ rpe, note, at }` oder `null`, siehe unten. |
| `source` | nein | Woher der Status kommt: `plan`, `manual` oder `intervals`. |
| `originalDate` | nein | Urspruenglich geplanter Tag, wenn in der App verschoben. |
| `externalId` | nein | Kennung der Garmin-Aktivitaet (`athletId:aktivitaetsId`). |
| `unplanned` | nein | `true` = Lauf kam von der Uhr, stand nicht im Plan. |

**Regel fuer `planned`:** Mindestens eines von `km`, `minutes` oder `loops` muss
gesetzt sein — ausser bei den Arten `strength`, `race` und `other`, die auch ohne
Vorgabe erlaubt sind. Es duerfen auch mehrere Werte zugleich stehen, zum Beispiel
`{ "km": 20, "minutes": 185, "loops": 3 }` fuer drei Runden a 6,7 km.

**Ruhetage sind keine Datensaetze.** Ein Tag ohne Lauf bleibt in der Datei leer.

### Puls- und Tempovorgabe (`targets`)

```json
"targets": [
  { "label": "Grundtempo", "hrFrom": 128, "hrTo": 138, "paceFrom": "7:15", "paceTo": "7:45" },
  { "label": "Steigerungen", "hrFrom": null, "hrTo": null, "paceFrom": "4:30", "paceTo": "5:00" }
]
```

Eine **Liste**, weil ein Tempolauf mehrere Tempi hat: locker traben, schnelle
Stuecke, Endbeschleunigung. Ein lockerer Dauerlauf hat genau einen Eintrag.
Hoechstens vier Eintraege je Lauf — mehr passt nicht mehr ins Lauf-Blatt und
niemand behaelt es beim Laufen im Kopf.

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `label` | nein | Name des Abschnitts, hoechstens 24 Zeichen. Fehlt er bei einem einzelnen Eintrag, zeigt die App „Ziel". |
| `hrFrom` / `hrTo` | siehe unten | Pulsbereich in Schlaegen je Minute, ganze Zahlen von 60 bis 220. |
| `paceFrom` / `paceTo` | siehe unten | Tempo je Kilometer als Text `"m:ss"`, zwischen `"2:00"` und `"20:00"`. |

**`paceFrom` ist die schnellere Grenze.** Eine Pace ist eine Zeit: kleiner heisst
schneller. `"7:15"` bis `"7:45"` ist richtig, umgekehrt wird die Datei abgelehnt.

**Beide Grenzen oder keine.** Ein halber Bereich (`hrFrom` ohne `hrTo`) ist ein
Fehler, kein stillschweigend ergaenzter Wert. Ein Eintrag darf den Puls oder das
Tempo weglassen, aber nicht beides — eine Vorgabe ohne Zahlen ist keine Vorgabe.

**Leer ist `null`, nie `[]`.** Ein leeres Array waere gegenueber einem aelteren
Lauf ohne dieses Feld eine Scheinaenderung, und jeder Import wuerde Datensaetze
anfassen, die sich gar nicht geaendert haben.

Die Vorgabe gehoert dem **Plan**, nicht dem Laeufer. Bringt eine neue Datei fuer
einen noch geplanten Lauf keine `targets` mit, ist die alte Vorgabe bewusst
zurueckgenommen und verschwindet — anders als bei `feedback`, das nie verloren
geht.

### Lauf-Arten

| `type` | Zeichen | Bedeutung |
|--------|---------|-----------|
| `easy` | 🏃 | Lockerer Dauerlauf. |
| `long` | 🛣️ | Langer Lauf. |
| `backtoback` | 👣 | Zweiter langer Lauf am Folgetag, auf muede Beine. |
| `loops` | 🔄 | Runden-Simulation im Stundenrhythmus (Backyard). |
| `tempo` | ⚡ | Tempoarbeit, Intervalle, Steigerungen. |
| `hills` | ⛰️ | Huegel- oder Bergwiederholungen. |
| `walk` | 🚶 | Gehen als Trainingseinheit. |
| `strength` | 🏋️ | Krafttraining, kein Lauf (Planwert optional). |
| `race` | 🏁 | Wettkampf oder Testwettkampf (Planwert optional). |
| `other` | ⚪ | Alles andere (Planwert optional). |

### Rueckmeldung nach dem Lauf (`feedback`)

```json
"feedback": { "rpe": 4, "note": "letzte 5 km schwer, Magen war ok", "at": "2030-01-22T18:22:11.000Z" }
```

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `rpe` | nein | Anstrengung als ganze Zahl von 1 bis 5, oder `null`. |
| `note` | nein | Ein Satz in eigenen Worten. |
| `at` | nein | Wann die Rueckmeldung entstand (Zeitstempel, rein informativ). |

Die Skala ist subjektiv gemeint, sie wird nicht aus dem Puls berechnet:
1 = sehr locker, 2 = locker, 3 = mittel, 4 = hart, 5 = maximal.

Beide Teile sind freiwillig. Sind Stufe und Notiz leer, steht `null` statt eines
leeren Objekts — sonst waere jede Rueckreise der Datei eine Scheinaenderung.

`actual.note` und `feedback.note` sind zwei verschiedene Dinge. In `actual.note`
steht Technisches, das die App selbst eintraegt (zum Beispiel „Gesamtzeit
12:00 h" beim Abgleich mit der Uhr) sowie der Grund fuer einen ausgelassenen
Lauf. In `feedback.note` steht, was der Laeufer selbst geschrieben hat.

---

## 5. Was beim Import mit vorhandenen Daten passiert

Der Import ueberschreibt nicht blind, sondern fuehrt zusammen. Die Regeln in
Kurzform — ausfuehrlich in `docs/laufplaner-plan.md`, Abschnitt 5.4, und als
Test in `scripts/laufplan-merge-test.mjs`:

1. **Bekannter Plan** (gleiche `id`): Name, Ziel, Phasen und Wochen kommen aus
   der Datei; `planVersion` zaehlt eins hoch, wenn sich wirklich etwas geaendert hat.
2. **Neuer Plan** fuer eine Person: wird der aktive Plan. Der alte Plan bleibt als
   Geschichte erhalten, verliert aber seine noch geplanten Laeufe in der Zukunft.
3. **Bekannter Lauf, noch geplant:** Die Datei gewinnt. Steht in der Datei ein
   anderes Datum, gilt der Lauf als von Claude neu terminiert.
4. **Bekannter Lauf, schon abgehakt oder ausgelassen:** Der lokale Stand gewinnt
   komplett. Die Datei aendert daran nichts.
5. **Neue Kennung:** Der Lauf wird angelegt.
6. **Lokaler Lauf fehlt in der Datei:** Er wird nur geloescht, wenn er noch
   geplant ist **und** in der Zukunft liegt. Vergangenes bleibt stehen.
7. **Laeufe von der Uhr** (`unplanned: true`) werden nie durch einen Import geloescht.
8. **Rueckmeldungen gehen nie verloren.** Bringt die Datei fuer einen noch
   geplanten Lauf keine `feedback` mit, bleibt die vorhandene stehen. Bei
   erledigten Laeufen aendert ein Import ohnehin nichts (Regel 4).
9. **Puls- und Tempovorgaben folgen der Datei.** Sie gehoeren dem Plan: was in
   der Datei steht, gilt; was fehlt, ist zurueckgenommen. Genau umgekehrt zu
   Regel 8, weil `targets` von Claude kommt und `feedback` vom Laeufer.

Vor dem Schreiben zeigt die App eine Vorschau („3 Laeufe neu · 41 aktualisiert ·
2 entfernt · 12 erledigte bleiben"). Findet die Pruefung auch nur einen Fehler,
wird **nichts** geschrieben.

---

## 6. Haeufige Fehler

| Fehlermeldung | Ursache |
|---------------|---------|
| `plans[0].weeks[3].start: ... ist kein Montag` | Woche beginnt an einem anderen Wochentag. |
| `plans[0].sessions[7].date: kein gueltiges Datum` | Tippfehler oder ein Tag, den es nicht gibt (zum Beispiel 30. Februar). |
| `plans[0].sessions[9].id: Kennung "..." kommt in der Datei mehrfach vor` | Zwei Laeufe teilen sich eine Kennung. |
| `plans[0].sessions[2].planned: Lauf-Art "easy" braucht mindestens km, minutes oder loops` | Vorgabe fehlt. |
| `plans[0].sessions[4].targets[0]: Tempobereich laeuft rueckwaerts` | `paceFrom` muss die schnellere (kleinere) Zeit sein. |
| `plans[0].sessions[4].targets[0].paceFrom: muss ein Tempo "m:ss" ... sein` | Komma statt Doppelpunkt, oder Sekunden ueber 59. |
| `plans[0].userId: unbekannter Nutzer` | Erlaubt sind nur `user1` und `user2`. |
| `format: erwartet "fittrack-laufplan"` | Es ist eine andere Datei (zum Beispiel ein App-Backup). |
