# Q Systems · Skinmetrics

Marketing- und Rechtstexte-Website für die iOS-App **Skinmetrics** (skinmetrics.app).

Statische Seite (HTML/CSS/JS, kein Build-Schritt), ausgeliefert über GitHub Pages.
Keine Cookies, keine externen Ressourcen, keine Schriften von Dritten. Alles ist selbst enthalten
oder System-Font.

## Projektstruktur

```
apps-website/
├── index.html                 # Produktseite Skinmetrics
├── assets/
│   ├── css/site.css           # Designsystem der Produktseite
│   ├── css/legal.css          # Layout der Rechtstexte (gleiche Tokens)
│   ├── js/site.js             # Scroll-Effekte, Demos, Vorher/Nachher-Regler, FAQ
│   └── img/
│       ├── screens/           # App-Screenshots (WebP), scan-face = KI-Bild für den Scan-Mock
│       ├── marketing/         # Vorher/Nachher-Illustration (KI-generiert, so gekennzeichnet)
│       ├── og.jpg             # Vorschaubild für Links (1200×630)
│       ├── app-icon.png, favicon.png
│       └── apple-touch-icon.png
├── legal/
│   ├── index.html             # Übersicht Rechtstexte
│   ├── datenschutz.html
│   ├── agb.html
│   └── impressum.html
├── datenschutz.html, agb.html, impressum.html, rechtliches.html,
│   privacy.html, terms.html   # Weiterleitungen → legal/
├── skinmetrics.html           # Weiterleitung → index.html
└── dermascan.html, skinfolio.html  # Legacy-Weiterleitungen
```

Die Weiterleitungen im Root-Verzeichnis halten bestehende URLs (App Store, Onboarding-Links, Bookmarks) gültig.

## Lokal starten

```sh
python3 -m http.server 8080
```

Dann im Browser: http://localhost:8080/

## Hinweise zu den Texten

- Sichtbare Texte auf der Produktseite enthalten bewusst keine Binde- oder Gedankenstriche.
- Jede Aussage über die App muss dem aktuellen App-Code entsprechen. Demos und Werte sind als
  „Beispieldaten“ gekennzeichnet, Gesichter als KI-generiert.
- Solange die App nicht im App Store ist, führen die Buttons zu einer Mail an hello@q-systems.app.
  Nach dem Launch: Buttons „Zum Start benachrichtigen“ durch den App-Store-Link ersetzen und die
  Hinweise „Bald im App Store“ entfernen.
- Rechtstext-Quellen und Build-Skripte liegen bewusst **nicht** in diesem Repo (siehe `.gitignore`).
