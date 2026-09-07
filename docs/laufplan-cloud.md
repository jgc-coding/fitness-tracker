# Laufplaene direkt aus der Cloud

Bis v1.6.0 lief der Austausch ueber Dateien: die App exportierte den Stand,
Gabriel schickte die Datei an Claude, Claude schickte eine neue zurueck, Gabriel
importierte sie. Ab v1.7.0 geht es auch direkt.

Die Daten lagen schon immer online. `runPlans` und `runSessions` stehen in
derselben Sync-Liste wie die Kraftdaten (`src/services/syncService.js`), und die
Rueckmeldung nach dem Lauf steckt im Lauf-Datensatz. Gefehlt hat nur der Zugang
vom PC aus. Den schafft `scripts/lauf-cloud.mjs`.

**Es entsteht kein zweiter Weg in die Datenbank.** Das Skript meldet sich mit
demselben gemeinsamen Konto an wie die App, und es gelten dieselben
Firestore-Regeln: nur diese eine E-Mail darf ueberhaupt etwas lesen oder
schreiben (`firestore.rules`, Anleitung in `docs/firebase-absicherung.md`).

---

## 1. Einmalig einrichten

Lege `privat\firebase-konto.json` an — der Ordner `privat\` ist per
`.gitignore` ausgeschlossen, das Repo ist oeffentlich:

```json
{
  "email": "die-konto-adresse@beispiel.de",
  "password": "das-passwort-des-fitness-kontos"
}
```

Es ist dasselbe Konto, mit dem sich die App unter **Settings → Cloud** anmeldet.
Das Passwort steht **nur** in dieser Datei: nicht im Chat, nicht im Repo, nicht
in einem Skript. Das Skript gibt es nie aus und schreibt es in kein Log.

`apiKey` und `projectId` liest das Skript selbst aus `src/db/firebase.js` — die
beiden sind bei Firebase kein Geheimnis, und so gibt es keine zweite Stelle, die
bei einem Projektwechsel mitgepflegt werden muesste.

---

## 2. Stand holen

```
node .\scripts\lauf-cloud.mjs holen
node .\scripts\lauf-cloud.mjs holen --user user2 --ziel .\privat\stand-gab.json
```

Das Ergebnis ist eine ganz normale Laufplan-Datei im Format aus
`docs/laufplan-format.md`, mit Haken, Ist-Werten, Rueckmeldungen und
Tempovorgaben. Ohne `--ziel` landet sie als
`privat\cloud-stand-<user>-<datum>.json`.

Der eigene Export laeuft durch die eigene Pruefung. Meldet sie Fehler, stimmt
etwas mit den Daten in der Cloud nicht — die Datei wird trotzdem geschrieben,
damit man sie ansehen kann, aber die Meldung sollte man ernst nehmen.

---

## 3. Aenderungen schreiben

```
node .\scripts\lauf-cloud.mjs schreiben .\privat\laufplan-user2-v2.json
node .\scripts\lauf-cloud.mjs schreiben .\privat\laufplan-user2-v2.json --jetzt
```

**Ohne `--jetzt` passiert nichts.** Der erste Aufruf ist immer ein Trockenlauf:
er prueft die Datei, holt den aktuellen Stand, rechnet die Zusammenfuehrung
durch und zeigt, was passieren wuerde („3 Laeufe neu · 41 aktualisiert ·
12 erledigte bleiben"). Erst der zweite Aufruf schreibt.

Vier Dinge schuetzen dabei die Trainingsdaten:

1. **Findet die Pruefung einen Fehler, wird gar nichts geschrieben.** Kein halb
   eingespielter Plan.
2. **Zusammengefuehrt wird mit demselben Modul wie in der App**
   (`src/utils/runPlanMerge.js`). Ein abgehakter oder ausgelassener Lauf gewinnt
   also auch hier immer gegen die Datei — das Skript kann keine Trainingsdaten
   ueberschreiben.
3. **Vor dem ersten Schreibvorgang wird der bisherige Stand komplett gesichert**
   nach `privat\cloud-sicherung-<zeitstempel>.json`.
4. **Geloescht wird wie in der App:** erst ein Merker („Tombstone"), dann der
   Datensatz. Ohne den Merker wuerde ein Handy, das gerade offline war, den Lauf
   beim naechsten Abgleich wieder hochladen.

Die Handys uebernehmen die Aenderung sofort, wenn die App offen ist, sonst beim
naechsten Start.

---

## 4. Wenn etwas schiefgeht

| Meldung | Ursache |
|---------|---------|
| `Zugangsdatei fehlt` | `privat\firebase-konto.json` gibt es noch nicht, siehe Schritt 1. |
| `Anmeldung fehlgeschlagen (INVALID_LOGIN_CREDENTIALS)` | E-Mail oder Passwort stimmt nicht. |
| `Anmeldung fehlgeschlagen (TOO_MANY_ATTEMPTS_TRY_LATER)` | Zu viele Fehlversuche; ein paar Minuten warten. |
| `Lesen von "runSessions" fehlgeschlagen (403)` | Die Firestore-Regeln lassen dieses Konto nicht durch — Platzhalter-E-Mail in `firestore.rules` noch nicht ersetzt? |
| `Der Stand aus der Cloud besteht die eigene Pruefung nicht` | In der Cloud steht ein Datensatz, den das Format nicht kennt. Datei ansehen, Ursache klaeren, nichts blind ueberschreiben. |

Laeuft das Skript aus einem Worktree heraus, gibt es dort kein `privat\`. Dann
den Pfad ausdruecklich mitgeben:

```
node .\scripts\lauf-cloud.mjs holen --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
```

---

## 5. Was das Skript NICHT tut

- Es legt keine Konten an und aendert keine Regeln.
- Es fasst die Kraftdaten nicht an, nur `runPlans`, `runSessions` und die
  Loeschmerker.
- Es entscheidet nichts allein: ohne `--jetzt` schreibt es nie.
