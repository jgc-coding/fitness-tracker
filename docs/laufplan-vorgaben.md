# Puls- und Tempovorgaben im Laufplan

Ein Plan, der „locker laufen" sagt, hilft am Berg nicht weiter. Seit v1.7.0
steht an jedem geplanten Lauf, bei welchem Puls er laufen soll und welches
Tempo dabei herauskommt — abgeleitet aus den eigenen Laeufen der Vergangenheit,
nicht aus einer Tabelle.

Das Feld heisst `targets` und ist in `docs/laufplan-format.md` beschrieben.
Dieses Dokument erklaert, wie die Zahlen darin entstehen.

---

## 1. Der Weg in drei Schritten

1. **Modell schaetzen** aus der Garmin-Historie
   (`scripts/lib/pace-modell-kern.mjs`).
2. **Ansehen und beurteilen**, ob die Zahlen stimmen
   (`scripts/pace-modell.mjs`).
3. **In den Plan eintragen** nach Regeln, die im Profil stehen
   (`scripts/laufplan-vorgaben.mjs`).

```
node .\scripts\pace-modell.mjs --datei .\privat\garmin-historie-gab.csv
node .\scripts\laufplan-vorgaben.mjs --plan .\privat\laufplan-user2-v2.json --profil .\privat\pace-profil.json
```

---

## 2. Was das Modell rechnet

Ein Tempo haengt nicht nur am Puls. Dieselbe Anstrengung ergibt am Berg ein
langsameres Tempo als flach, und auf einem langen Lauf steigt der Puls bei
gleichem Tempo mit der Zeit an. Geschaetzt wird darum

```
Tempo = a + b * Puls + c * Hoehenmeter_je_km + d * Dauer_in_Stunden
```

mit kleinsten Quadraten, wobei juengere Laeufe staerker zaehlen (Halbwertszeit
180 Tage: ein halbes Jahr alter Lauf zaehlt halb so viel wie einer von heute).

Vier Entscheidungen dabei sind wichtiger als die Formel:

**Ausreisser fliegen raus, aber sichtbar.** Ein GPS-Sprung oder ein verrutschter
Pulsgurt verzieht die ganze Gerade. Laeufe, die mehr als 2,5 Streuungen daneben
liegen, werden in einer zweiten Runde entfernt — und namentlich gemeldet, damit
man selbst nachsehen kann. Bei Gab waren das zwei Laeufe mit 4:10 je km bei
einer Schrittlaenge von 1,32 m; das ist kein Laufen, das ist ein Messfehler.

**Ausserhalb der gemessenen Pulsspanne wird gedaempft.** Die Gerade sagt: jeder
Schlag mehr bringt gleich viel Tempo. Nahe am Maximalpuls stimmt das nicht mehr.
Wer die Gerade einfach verlaengert, bekommt ein Schwellentempo, das niemand
laufen kann. Jenseits der belegten Spanne zaehlt ein Pulsschlag daher nur noch
zu 60 Prozent.

**Die Formkorrektur wird ausgewiesen, nicht eingerechnet.** Der mittlere Rest
der zehn juengsten Laeufe misst, ob jemand gerade besser oder schlechter drauf
ist als im Schnitt des Zeitraums. Ob eine Pause vorbei ist, kann aber keine
Formel entscheiden — die Zahl steht im Bericht, die Entscheidung trifft ein
Mensch und schreibt sie als `wiedereinstieg` ins Profil.

**Was hochgerechnet ist, sagt der Bericht dazu.** Zeilen ausserhalb des
belegten Pulsbereichs sind mit `HOCHGERECHNET, nicht belegt` markiert.

Abgesichert ist das Modul mit `scripts/pace-modell-test.mjs` (19 Faelle gegen
erfundene Daten mit bekanntem Zusammenhang). Es laeuft im Done-Gate mit.

---

## 3. Das Profil

Das Trainingswissen steht **nicht im Skript**, sondern in
`privat\pace-profil.json`. Pulsbereiche sind Gesundheitsdaten, und dieses Repo
ist oeffentlich.

```json
{
  "user2": {
    "csv": "C:/.../privat/garmin-historie-gab.csv",
    "monate": 18,
    "halbwertszeitTage": 180,
    "gelaendeStandard": 6,
    "gelaende": { "standard": 6, "flach": 2, "huegelig": 12 },
    "wiedereinstieg": [
      { "bis": "2026-10-18", "zuschlagSek": 20 },
      { "bis": "2026-11-15", "zuschlagSek": 10 }
    ],
    "regeln": [ ... ]
  }
}
```

| Feld | Bedeutung |
|------|-----------|
| `csv` | Garmin-Export dieser Person. |
| `monate` | Wie weit zurueck das Modell schaut. |
| `halbwertszeitTage` | Nach wie vielen Tagen ein Lauf nur noch halb zaehlt. |
| `gelaende` | Benannte Referenzwerte in Hoehenmetern je km. |
| `gelaendeStandard` | Wird genommen, wenn ein Ziel kein `gelaende` nennt. |
| `wiedereinstieg` | Zuschlag in Sekunden je km bis zu einem Datum. Von oben nach unten, die erste passende Stufe gilt. |
| `regeln` | Welcher Lauf welche Vorgabe bekommt. |

### Regeln

Regeln werden von oben nach unten geprueft, **die erste passende gewinnt**.

```json
{
  "name": "Schwelle-Intervalle",
  "wenn": { "typ": ["tempo"], "text": "Schwelle" },
  "ziele": [
    { "label": "Ein- und Auslaufen", "hr": [125, 138], "gelaende": "flach" },
    { "label": "Schwelle", "hr": [158, 168], "gelaende": "flach", "dauerStunden": 0.25 },
    { "label": "Trab dazwischen", "pace": ["8:00", "9:00"] }
  ]
}
```

`wenn.typ` ist die Lauf-Art, `wenn.text` ein regulaerer Ausdruck ueber Titel
**und** Beschreibung (Gross- und Kleinschreibung egal). Fehlt `wenn.text`, passt
die Regel auf jeden Lauf der genannten Arten — solche Regeln gehoeren nach
unten.

Je Ziel:

| Feld | Bedeutung |
|------|-----------|
| `label` | Name des Abschnitts, hoechstens 24 Zeichen. |
| `hr` | `[von, bis]` in Schlaegen je Minute. Daraus rechnet das Modell das Tempo. |
| `pace` | `["m:ss", "m:ss"]` fest vorgegeben — dann rechnet das Modell nicht. |
| `gelaende` | Name aus `gelaende` oder eine Zahl. |
| `dauerStunden` | Dauer dieses Abschnitts. Ohne Angabe zaehlt die Dauer der ganzen Einheit. |

**Wann ein festes Tempo statt eines Pulsbereichs?** Wenn die Vorgabe eine Taktik
ist und keine Belastungsfrage. Das Rundentempo beim Backyard muss so langsam
sein, dass nach der Runde noch Zeit zum Essen und Sitzen bleibt — das hat mit
Puls nichts zu tun. Ein Ziel darf beides tragen: festes Tempo plus Pulsbereich
als Obergrenze.

**Warum `dauerStunden` bei kurzen Abschnitten?** Das Modell macht laengere Laeufe
langsamer. Ein Acht-Minuten-Intervall in einem Zwei-Stunden-Lauf soll aber nicht
mit der Zwei-Stunden-Bremse gerechnet werden.

---

## 4. Was das Skript nicht anfasst

Erledigte und ausgelassene Laeufe bleiben unberuehrt. Eine Vorgabe fuer etwas,
das schon gelaufen ist, waere eine nachtraegliche Behauptung — und der Import
wuerde sie ohnehin verwerfen (Merge-Regel 4 in `docs/laufplan-format.md`).

Laeufe, auf die keine Regel passt, bleiben ohne Vorgabe und werden am Ende
aufgelistet. Stilles Raten gibt es nicht.

Findet die Pruefung des Ergebnisses auch nur einen Fehler, wird **nichts**
geschrieben.

---

## 5. Wann nachrechnen?

Sobald genug neue Laeufe da sind, typischerweise alle vier bis sechs Wochen.
Der Ablauf: Garmin-Export aktualisieren, `pace-modell.mjs` ansehen (vor allem
die Formkorrektur und die Ausreisser), `wiedereinstieg` im Profil anpassen,
`laufplan-vorgaben.mjs` laufen lassen, mit `lauf-cloud.mjs schreiben` in die
Cloud (siehe `docs/laufplan-cloud.md`).
