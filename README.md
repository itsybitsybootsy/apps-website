# Q Systems · Skinmetrics

Marketing- und Rechtstexte-Website für die iOS-App **Skinmetrics**.

Statische Seite (HTML/CSS/JS, kein Build-Schritt), ausgeliefert über GitHub Pages.
Keine Cookies, keine externen Ressourcen, keine Schriften von Dritten — alles ist selbst enthalten
oder System-Font.

## Projektstruktur

```
apps-website/
├── index.html                 # Produktseite Skinmetrics
├── assets/
│   ├── css/styles.css         # Designsystem
│   ├── js/app.js              # SVG-Icons & Interaktionen
│   └── img/
│       ├── product/           # App-Screenshots
│       ├── marketing/           # Vorher/Nachher-Bilder
│       └── labels/            # KI-Kennzeichnung (EU-Label)
├── legal/
│   ├── index.html             # Übersicht Rechtstexte
│   ├── datenschutz.html
│   ├── agb.html
│   └── impressum.html
├── datenschutz.html           # Weiterleitung → legal/
├── agb.html                   # Weiterleitung → legal/
├── impressum.html             # Weiterleitung → legal/
├── rechtliches.html           # Weiterleitung → legal/
├── skinmetrics.html           # Weiterleitung → index.html
├── dermascan.html             # Legacy-Weiterleitung
└── skinfolio.html             # Legacy-Weiterleitung
```

Die Weiterleitungen im Root-Verzeichnis halten bestehende URLs (App Store, Bookmarks) gültig.

## Lokal starten

```sh
python3 -m http.server 8080
```

Dann im Browser: http://localhost:8080/

## Hinweise

- Rechtstext-Quellen und Build-Skripte liegen bewusst **nicht** in diesem Repo (siehe `.gitignore`).
- Bilder unter `assets/img/product/` sind App-Screenshots; `assets/img/marketing/` enthält KI-generierte Vorher/Nachher-Grafiken.
