# Q Systems

Marketing- und Rechtstexte-Website für die iOS-Apps **Instead**, **DermaScan** und **Plant Care**.

Statische Seite (HTML/CSS/JS, kein Build-Schritt), ausgeliefert über GitHub Pages.
Keine Cookies, keine externen Ressourcen, keine Schriften von Dritten – alles ist selbst enthalten
oder System-Font. Das ist eine bewusste Entscheidung: Ohne Drittressourcen braucht die Seite
kein Consent-Banner.

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Übersicht, Hub-Karten, Haltung zum Datenschutz |
| `instead.html` | Produktseite Instead (eigenes dunkles „Dusk"-Theme) |
| `dermascan.html` | Produktseite DermaScan |
| `plantcare.html` | Produktseite Plant Care |
| `datenschutz.html` | Datenschutzerklärung (Allgemeinteil + ein Kapitel je App) |
| `agb.html` | Nutzungsbedingungen, Abo- und Verbraucherinformationen |
| `impressum.html` | Impressum & Offenlegung (ECG, GewO, UGB, MedienG) |
| `rechtliches.html` | Verteilerseite; hält alte Links am Leben |
| `styles.css` | Gemeinsames Designsystem + `theme-instead` |
| `app.js` | SVG-Icon-Sprite und Interaktionen (Reveal, Count-up, Explorer, Before/After) |

## Rechtstexte ändern

`datenschutz.html`, `agb.html` und `impressum.html` sind **generierte Dateien – nicht direkt
bearbeiten.** Sie entstehen aus Fragmenten in `legal/`, die der Generator nummeriert, mit
Inhaltsverzeichnis versieht und in die Seitenhülle einsetzt:

```
legal/build_legal.py            # Generator
legal/legal-impressum.html      # Fragmente: h2/h3/h4, unnummeriert
legal/legal-ds-allgemein.html   # Allgemeinteil der Datenschutzerklärung
legal/legal-ds-instead.html     # je ein Kapitel pro App (h3)
legal/legal-ds-dermascan.html
legal/legal-ds-plantcare.html
legal/legal-agb.html
legal/FACTS.md                  # verifizierte Faktenbasis aus dem App-Quellcode
```

Nach jeder Änderung an einem Fragment:

```sh
python3 legal/build_legal.py all      # oder: impressum | agb | datenschutz
```

Der Generator zieht dabei alle internen Kommentarblöcke (Quellenlisten, Handlungsbedarf vor
Release) aus dem Text und legt sie in `legal/*-quellen.txt` ab. **Diese Notizen dürfen nicht in
den ausgelieferten HTML-Dateien landen** – ein HTML-Kommentar ist einen Klick auf „Seitenquelltext
anzeigen" vom Gelesenwerden entfernt.

## Offene Punkte vor dem Live-Gang

- Unternehmensdaten in `impressum.html` befüllen (alle `[…]`-Platzhalter).
- Domain festlegen und die Rechtstext-Links **in den Apps** darauf umstellen
  (Instead zeigt auf `llammer.com`, DermaScan auf `dermascan.app`, Plant Care auf `itsybitsybootsy.github.io`).
- Bewertungen und Kennzahlen auf `index.html` durch echte ersetzen – sie sind derzeit Platzhalter
  und im Footer als solche gekennzeichnet.
- Produktnamen und Claims von DermaScan gegen die MDR-Zweckbestimmung prüfen
  (Begriffe wie „Analyse" gelten als Anhaltspunkt für eine medizinische Zweckbestimmung).
