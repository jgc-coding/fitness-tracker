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
  "status": "planned",
  "actual": null,
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
| `status` | nein | `planned` (Standard), `done` oder `skipped`. |
| `actual` | nein | `{ km, minutes, avgHr, note }` oder `null`. |
| `source` | nein | Woher der Status kommt: `plan`, `manual` oder `intervals`. |
| `originalDate` | nein | Urspruenglich geplanter Tag, wenn in der App verschoben. |
| `externalId` | nein | Kennung der Garmin-Aktivitaet (`athletId:aktivitaetsId`). |
| `unplanned` | nein | `true` = Lauf kam von der Uhr, stand nicht im Plan. |

**Regel fuer `planned`:** Mindestens eines von `km`, `minutes` oder `loops` muss
gesetzt sein — ausser bei den Arten `strength`, `race` und `other`, die auch ohne
Vorgabe erlaubt sind. Es duerfen auch mehrere Werte zugleich stehen, zum Beispiel
`{ "km": 20, "minutes": 185, "loops": 3 }` fuer drei Runden a 6,7 km.

**Ruhetage sind keine Datensaetze.** Ein Tag ohne Lauf bleibt in der Datei leer.

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
| `plans[0].userId: unbekannter Nutzer` | Erlaubt sind nur `user1` und `user2`. |
| `format: erwartet "fittrack-laufplan"` | Es ist eine andere Datei (zum Beispiel ein App-Backup). |
