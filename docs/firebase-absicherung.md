# Firebase absichern — Anleitung fuer Gabriel

Stand: Juli 2026 (App-Version 1.1.0)

## Warum?

Bisher durfte **jeder** Besucher der App-URL die Cloud-Daten lesen, aendern
und loeschen (anonyme Anmeldung + offene Regeln). Ab Version 1.1.0 meldet
sich die App mit einem **gemeinsamen E-Mail/Passwort-Konto** an, und die
Firestore-Regeln lassen nur noch genau dieses Konto zu.

## Reihenfolge ist wichtig!

Erst wenn **beide Handys** eingeloggt sind, werden die Regeln scharf
geschaltet. Sonst stoppt der Sync (Daten gehen dabei aber nicht verloren —
alles bleibt lokal auf dem Handy und wird nach dem Login nachgesynct).

### Schritt 0: Backup (2 Minuten)

Auf beiden Handys: **Einstellungen → Backup → Backup exportieren (JSON)**
und die Datei irgendwo ablegen (z.B. an euch selbst schicken).

### Schritt 1: Login-Verfahren aktivieren

1. [console.firebase.google.com](https://console.firebase.google.com) oeffnen,
   Projekt **gymtracker-ketohybrid** waehlen.
2. Links: **Authentication** → Tab **Sign-in method**.
3. Bei **E-Mail/Passwort** auf das Stift-Symbol → **Aktivieren** → Speichern.
   („E-Mail-Link" NICHT aktivieren, nur das normale E-Mail/Passwort.)

### Schritt 2: Gemeinsames Konto anlegen

1. **Authentication** → Tab **Users** → **Add user**.
2. Eure gemeinsame E-Mail eintragen + ein **starkes Passwort** vergeben
   (Passwort-Manager!). Dieses Login teilt ihr euch zu zweit.

### Schritt 3: Selbst-Registrierung sperren

Sonst koennte sich jeder Fremde selbst ein Konto anlegen:

1. **Authentication** → Tab **Settings** → Abschnitt **User actions**.
2. Haekchen bei **„Enable create (sign-up)"** ENTFERNEN
   (bzw. „Benutzererstellung zulassen" deaktivieren) → Speichern.

### Schritt 4: App-Update auf beide Handys + einloggen

1. Neue Version deployen (macht Claude / `/deploy`), App auf beiden Handys
   oeffnen und einmal neu laden (Update zieht automatisch).
2. Auf beiden Handys: **Einstellungen → Cloud-Sync → E-Mail + Passwort →
   Anmelden**. Status muss auf **„Aktiv"** springen.

### Schritt 5: Regeln scharf schalten

Erst wenn Schritt 4 auf BEIDEN Handys erledigt ist:

1. Firebase Console → **Firestore Database** → Tab **Rules**.
2. Kompletten Inhalt ersetzen durch den Inhalt der Datei
   [`firestore.rules`](../firestore.rules) aus dem Repo — dabei
   `FITNESS-KONTO@BEISPIEL.DE` durch eure echte Konto-E-Mail ersetzen
   (klein geschrieben).
3. **Publish** klicken.

### Schritt 6: Anonyme Anmeldung deaktivieren

1. **Authentication** → **Sign-in method**.
2. **Anonym** deaktivieren (falls dort aktiv).

### Schritt 7: Kurz-Check

- Beide Handys: Einstellungen → Cloud-Sync zeigt **„Aktiv"**, Konto-Zeile
  zeigt eure E-Mail.
- Auf einem Handy ein Test-Gewicht eintragen → erscheint nach ein paar
  Sekunden auf dem anderen Handy in der History.

## Rollback (falls etwas klemmt)

In der Firebase Console unter **Firestore Database → Rules** gibt es eine
Versions-Historie — dort kann man jederzeit die vorherige Regel-Version
wiederherstellen. Die App funktioniert auch ohne Cloud vollstaendig weiter
(offline-first); es geht dabei nichts verloren.
