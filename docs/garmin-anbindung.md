# Garmin an den Laufplaner anbinden (ueber intervals.icu)

Ziel: Ein Lauf, den die Uhr aufgezeichnet hat, setzt in der App selbst den Haken
und traegt die Ist-Werte ein. Kein Abtippen mehr.

Warum der Umweg ueber intervals.icu: Garmin gibt seine offizielle Schnittstelle
nur an Firmen mit eigenem Server. intervals.icu ist ein kostenloser Dienst und
offizieller Garmin-Partner — jeder neue Lauf landet dort automatisch, und von
dort darf die App ihn direkt aus dem Browser abholen.

**Diese Einrichtung macht ihr selbst.** Claude legt keine Konten an und gibt
keine Zugriffe frei. Die Schluessel bleiben auf dem Geraet und werden nie in
einen Chat geschrieben.

---

## Schritt fuer Schritt (etwa 10 Minuten, je Person einmal)

### 1. Konto bei intervals.icu anlegen
Auf `https://intervals.icu` registrieren. Der Dienst ist kostenlos.

### 2. Garmin verbinden
In den Einstellungen von intervals.icu den Punkt fuer Garmin Connect suchen und
verbinden. Dabei fragt Garmin nach eurem Login und eurer Zustimmung.

Ab jetzt kommt jeder **neue** Lauf automatisch bei intervals.icu an.
**Alte Laeufe kommen dabei nicht mit.** Falls die Vorgeschichte gebraucht wird
(zum Beispiel damit Claude den ersten Jahresplan an eurem echten Umfang
ausrichtet), gibt es sie einmalig als Datei:
Garmin Connect im Browser oeffnen → Aktivitaeten → auf Laufen filtern → die
Liste bis zum Ende scrollen → "CSV exportieren". Die Datei nach
`privat\garmin-historie-<name>.csv` legen (der Ordner `privat` wird nie
mit ins Repository gegeben).

### 3. Schluessel erzeugen
In den Einstellungen von intervals.icu den Bereich "Developer Settings" oeffnen
und einen API-Key erzeugen. Dort steht auch die **Athleten-Id** in der Form
`i123456`. Beides braucht die App.

Der Schluessel ist wie ein Passwort: Er gehoert nicht in einen Chat, nicht in
eine Notiz-App und nicht ins Repository.

### 4. In der App eintragen
In der App: **Laufen → Plan → Verbindung intervals.icu**. Dort Athleten-Id und
Schluessel eintragen und "Verbindung testen" antippen.

Jedes Handy traegt den Schluessel seines eigenen Besitzers ein. Die Ist-Werte
wandern anschliessend ueber den normalen Cloud-Sync auf das andere Handy — der
Schluessel selbst bleibt auf dem Geraet, an dem er eingetragen wurde.

> Dieser Punkt kommt mit Paket 2 (Version 1.5.0) in die App. Die Schritte 1 bis 3
> koennen unabhaengig davon schon jetzt erledigt werden — sie sind die
> Voraussetzung dafuer, dass Paket 2 ueberhaupt gebaut und gegen echte Daten
> geprueft werden kann.

### 5. Nur fuer Claude-Sitzungen am PC (freiwillig)
Damit Claude in einer Anpass-Sitzung die letzten Laeufe selbst ansehen kann,
legt ihr die Zugaenge einmal lokal ab, in `privat\intervals.json`:

```json
{
  "user1": { "athleteId": "i000000", "apiKey": "hier-der-schluessel" },
  "user2": { "athleteId": "i000000", "apiKey": "hier-der-schluessel" }
}
```

Der Ordner `privat\` steht in `.gitignore` und wird nie committet.

---

## Was danach passiert

- Beim Oeffnen des Reiters "Laufen" holt die App neue Laeufe ab, wenn der letzte
  Abgleich mehr als 15 Minuten her ist. Zusaetzlich gibt es einen Knopf
  "Jetzt abgleichen".
- Ein Lauf wird dem geplanten Lauf desselben Tages zugeordnet — bei mehreren
  Kandidaten dem, dessen Vorgabe am besten passt. Der Lauf gilt dann als
  erledigt, mit Strecke, Dauer und Puls.
- Ein Lauf ohne passenden Plan-Eintrag erscheint als "ungeplant" und bleibt
  erhalten; ein Import ueberschreibt ihn nie.
- Die App loescht nie etwas und entfernt nie einen Haken, den ihr selbst gesetzt
  habt. Ein von Hand gesetzter Haken bekommt die Ist-Werte nur nachgetragen.

## Wenn etwas nicht klappt

| Meldung | Bedeutung |
|---------|-----------|
| "Schluessel oder Athleten-Id stimmen nicht" | Tippfehler, oder der Schluessel wurde bei intervals.icu neu erzeugt. |
| "Offline oder Dienst nicht erreichbar" | Kein Netz, oder intervals.icu hat gerade eine Stoerung. Der naechste Abgleich holt alles nach. |
| Der Lauf von heute fehlt | Zuerst in intervals.icu nachsehen: Ist er dort angekommen? Garmin schiebt Aktivitaeten manchmal mit Verzoegerung weiter. |

## Verbindung wieder loesen

In der App den Schluessel ueber "Entfernen" loeschen — danach fragt die App
nichts mehr ab. Bereits eingetragene Ist-Werte bleiben erhalten. Wer auch die
Bruecke selbst kappen will, trennt bei intervals.icu die Garmin-Verbindung.
