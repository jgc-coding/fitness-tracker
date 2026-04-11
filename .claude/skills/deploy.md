# Deploy

Build, commit und deploy auf GitHub Pages.

## Schritte

1. Pruefe ob es ueberhaupt Aenderungen gibt (`git status`). Falls keine: abbrechen mit Hinweis.
2. Fuehre `npm run build` im Projektverzeichnis `C:\Projekte\Fitness Tracker` aus. Bei Fehlern: abbrechen und Fehler zeigen.
3. Zeige `git diff --stat` um die Aenderungen zusammenzufassen.
4. Erstelle einen aussagekraeftigen Commit (staged + untracked Files, NICHT node_modules oder dist):
   - Commit-Message basierend auf den tatsaechlichen Aenderungen
   - Format: kurze Zusammenfassung (max 72 Zeichen), dann Details
   - Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
5. Push auf `master` Branch.
6. Warte auf den GitHub Actions Workflow und pruefe ob das Deployment erfolgreich war (`gh run list`).
7. Zeige die finale URL: `https://jgc-coding.github.io/fitness-tracker/`

## Wichtig
- PATH muss `/c/Program Files/GitHub CLI` enthalten fuer `gh`
- Projektverzeichnis ist `C:\Projekte\Fitness Tracker`
- Base-Path ist `/fitness-tracker/`
- Branch ist `master` (nicht main)
- Niemals `node_modules/` oder `dist/` committen
