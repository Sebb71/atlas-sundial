# Atlante delle Meridiane

Prima versione del sito statico per GitHub Pages.

## Struttura

- `index.html` — pagina principale
- `style.css` — grafica
- `app.js` — mappa, ricerca e schede
- `data.json` — dati delle meridiane
- `foto/` — fotografie

## Come aggiungere una nuova meridiana

1. Copia la fotografia nella cartella `foto/`.
2. Aggiungi un oggetto in `data.json`.
3. Nel campo `foto` usa `foto/nome-file.jpg`.
4. Inserisci coordinate decimali in `latitudine` e `longitudine`.
5. Se il motto non è noto, usa `null`.

Il sito usa Leaflet e OpenStreetMap via CDN, quindi non richiede un server applicativo.


## Apertura locale

Questa versione può essere aperta direttamente facendo doppio clic su `index.html`.
I dati delle 5 meridiane sono incorporati in `app.js`, quindi non dipende da una richiesta
fetch a `data.json`. Per GitHub Pages il file `data.json` resta comunque disponibile.
