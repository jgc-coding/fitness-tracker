---
name: deploy
description: Baut, committet und pusht auf master; GitHub Actions liefert danach auf GitHub Pages aus. Nur auf Gabriels Aufruf /deploy.
disable-model-invocation: true
---

# Deploy

Build, commit und deploy auf GitHub Pages.

## Schritte

1. Pruefe, ob es etwas auszuliefern gibt: `git status` (nicht committete Aenderungen) UND `git fetch origin` + `git log --oneline origin/master..HEAD` (committete, noch nicht gepushte Commits). Erst wenn beides leer ist: abbrechen mit Hinweis.
2. Version und CHANGELOG (Prozess-Stufe Produkt, siehe `CLAUDE.md`):
   - Nur Doku geaendert (`CLAUDE.md`, `docs/`, `weitermachen.md`, `verbesserungen.md`): keine neue Version, mit `[skip ci]` committen und pushen, dann hier aufhoeren.
   - Sonst: Steht `version` in `package.json` noch auf dem Stand von `origin/master`, nach SemVer von Hand anheben (Fix = PATCH, Feature = MINOR). `package.json` ist die einzige Quelle, `vite.config.js` liest sie. In `CHANGELOG.md` oben einen Block `## [x.y.z] — JJJJ-MM-TT` im Format der bisherigen Eintraege anlegen.
   - Ist die Version in den ungepushten Commits schon angehoben, nur pruefen, dass der CHANGELOG-Block dazu existiert.
3. Fuehre `npm run build` im Projektverzeichnis `C:\Projekte\Fitness Tracker` aus. Bei Fehlern: abbrechen und Fehler zeigen.
4. Zeige `git diff --stat` um die Aenderungen zusammenzufassen.
5. Erstelle einen aussagekraeftigen Commit nur mit den Dateien, die zu dieser Aenderung gehoeren (NICHT node_modules oder dist). Unbekannte untracked Dateien vorher zeigen und nachfragen: Das Repo ist oeffentlich.
   - Commit-Message basierend auf den tatsaechlichen Aenderungen
   - Format: kurze Zusammenfassung (max 72 Zeichen), dann Details
6. Annotierten Tag `vx.y.z` auf den Release-Commit setzen. Push auf `master` Branch, den Tag mit pushen.
7. Warte auf den GitHub Actions Workflow und pruefe ob das Deployment erfolgreich war (`gh run list`). Ein gruener Workflow allein ist noch kein Beweis.
8. Live-Beweis (`CLAUDE.md`, Abschnitt "Deploy und Umgebung"): `https://jgc-coding.github.io/fitness-tracker/` holen, im Hauptskript aus `index.html` den Namen von `assets/SettingsView-*.js` suchen, diese Datei holen. Erst wenn darin die neue Versionsnummer steht, ist der Deploy live.
9. Zeige die finale URL: `https://jgc-coding.github.io/fitness-tracker/`. Hinweis an Gabriel: Die PWA zeigt die neue Version erst nach einem Neustart der App.

## Wichtig
- PATH muss `/c/Program Files/GitHub CLI` enthalten fuer `gh`
- Projektverzeichnis ist `C:\Projekte\Fitness Tracker`
- Base-Path ist `/fitness-tracker/`
- Branch ist `master` (nicht main)
- Niemals `node_modules/` oder `dist/` committen
- Traegt der neueste gepushte Commit `[skip ci]`, startet der Workflow nicht. Dann zeigt Schritt 8 die alte Version: Ursache nennen, nicht als live melden.
