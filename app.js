
function resolveFotoPath(value) {
  if (!value) return "";
  let p = String(value).trim().replaceAll("\\", "/");
  p = p.replace(/^\.\//, "");
  if (!/^catalogo\/foto\//i.test(p)) {
    p = "catalogo/foto/" + p.split("/").pop();
  }
  return p;
}

let all = [];
let map;
let municipalityMarkers = [];
let currentMunicipality = null;

const $ = (id) => document.getElementById(id);

const MUNICIPALITY_CENTERS = {
  "Bedizzole": [45.508, 10.421],
  "Lonato": [45.463, 10.484],
  "Maderno": [45.639, 10.605],
  "Muscoline": [45.556, 10.468],
  "Puegnago": [45.550, 10.510],
  "Desenzano del Garda": [45.4717, 10.5377]
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function municipalityItems(comune) {
  return all.filter(x => x.comune === comune);
}


// --- Gestione automatica dei nuovi comuni (privacy) ---
let comuneCoordinates = {};

async function loadComuneCoordinates() {
  try {
    const r = await fetch("comuni.json");
    return r.ok ? await r.json() : {};
  } catch (_) {
    return {};
  }
}

async function getComuneCoordinate(comune) {
  if (comuneCoordinates[comune]) {
    return comuneCoordinates[comune];
  }

  // Solo il nome del comune viene usato per trovare il centro approssimativo.
  // Non vengono mai inviate coordinate o indirizzi della meridiana.
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(comune + ", Italia");

  try {
    const r = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    if (!r.ok) return null;

    const results = await r.json();
    if (!results.length) return null;

    const point = {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon)
    };

    comuneCoordinates[comune] = point;
    return point;
  } catch (_) {
    return null;
  }
}

async function init() {
  comuneCoordinates = await loadComuneCoordinates();
  try {
    const response = await fetch("data.json");
    if (response.ok) {
      all = await response.json();
    } else {
      throw new Error("data.json non disponibile");
    }
  } catch (err) {
    // Fallback for local file:// preview.
    all = FALLBACK_DATA;
  }

  if ($("count")) $("count").textContent = all.length;
  populateComuni();
  setupMap();
  showMapView();
$("comune").addEventListener("change", applyFilters);
}

function populateComuni() {
  [...new Set(all.map(x => x.comune).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, "it"))
    .forEach(c => $("comune").insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ));
}

function setupMap() {
  const points = Object.keys(MUNICIPALITY_CENTERS)
    .filter(c => all.some(x => x.comune === c))
    .map(c => MUNICIPALITY_CENTERS[c]);

  const avgLat = points.length ? points.reduce((s,p) => s + p[0], 0) / points.length : 45.5;
  const avgLon = points.length ? points.reduce((s,p) => s + p[1], 0) / points.length : 10.48;

  map = L.map("map").setView([avgLat, avgLon], 12);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  renderMunicipalityMarkers();
}

async function renderMunicipalityMarkers() {
  municipalityMarkers.forEach(m => map.removeLayer(m));
  municipalityMarkers = [];

  const counts = {};
  all.forEach(item => {
    if (item.comune) counts[item.comune] = (counts[item.comune] || 0) + 1;
  });

  for (const comune of Object.keys(counts)) {
    let coords = MUNICIPALITY_CENTERS[comune];

    // First use the local municipality-centre database.
    if (!coords && comuneCoordinates[comune]) {
      const p = comuneCoordinates[comune];
      coords = [Number(p.lat), Number(p.lon)];
    }

    // For a genuinely new municipality, geocode only the municipality name.
    if (!coords) {
      const p = await getComuneCoordinate(comune);
      if (p) {
        coords = [p.lat, p.lon];
        comuneCoordinates[comune] = p;
      }
    }

    if (!coords) continue;

    const count = counts[comune];
    const icon = L.divIcon({
      className: "sundial-marker",
      html: "☀️",
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker(coords, { icon }).addTo(map);
    marker.bindTooltip(
      `<strong>${escapeHtml(comune)}</strong><br>${count} ${count === 1 ? "meridiana catalogata" : "meridiane catalogate"}`,
      { direction: "top", offset: [0, -12], opacity: 0.95 }
    );
    marker.on("click", () => showMunicipality(comune));
    municipalityMarkers.push(marker);
  }
}

function applyFilters() {
  const selectedComune = $("comune").value;
  if (selectedComune) {
    showMunicipality(selectedComune);
  } else {
    showMapView();
  }
}
function showMunicipality(comune) {
  currentMunicipality = comune;
  const items = municipalityItems(comune);

  $("comune").value = comune;
  $("details").innerHTML = `
    <div class="selection-prompt">
      <p class="eyebrow">MERIDIANE CATALOGATE</p>
      <h2>${escapeHtml(comune)}</h2>
      <p>Seleziona una meridiana dall'elenco.</p>
    </div>`;

  $("municipality-list").classList.remove("view-hidden");
  $("municipality-list").innerHTML = `
    <div class="municipality-list-inner">
      <button type="button" class="back-map" id="back-map">← Torna alla mappa</button>
      <div class="municipality-items">
        ${items.map((item, i) => `
          <button type="button" class="municipality-item" data-index="${i}">
            <span>Meridiana ${i + 1}</span>
          </button>
        `).join("")}
      </div>
    </div>`;

  $("back-map").onclick = showMapView;

  $("municipality-list").querySelectorAll(".municipality-item").forEach(btn => {
    btn.onclick = () => showDetail(items[Number(btn.dataset.index)]);
  });
}
function showDetail(item) {
  const mapArea = document.querySelector(".map-area");
  mapArea.innerHTML = `
    <div class="detail-view">
      <button type="button" class="back-map detail-back" id="detail-back">← Torna alla mappa</button>
      <img class="details-photo" src="${escapeHtml(resolveFotoPath(item.foto))}" alt="Meridiana di ${escapeHtml(item.comune)}">
      <div class="detail-body">
        <p class="eyebrow">MERIDIANA</p>
        <h2>${escapeHtml(item.comune)}</h2>
        ${item.localita ? `<div class="detail-locality"><strong>Località:</strong> ${escapeHtml(item.localita)}</div>` : ""}
        ${item.motto ? `<div class="motto">“${escapeHtml(item.motto)}”</div>` : ""}
        <div class="meta">
          ${item["anno fotografia"] ? `<div><strong>Anno fotografia:</strong> ${escapeHtml(item["anno fotografia"])}</div>` : ""}
          ${item["google maps"] ? `<div class="google-maps-link"><strong>Google Maps:</strong> ${/^https?:\/\//i.test(String(item["google maps"])) ? `<a href="${escapeHtml(item["google maps"])}" target="_blank" rel="noopener noreferrer">Apri la posizione ↗</a>` : `<span>${escapeHtml(item["google maps"])}</span>`}</div>` : ""}
          ${item.note ? `<div><strong>Note:</strong> ${escapeHtml(item.note)}</div>` : ""}
        </div>
      </div>
    </div>`;
  $("detail-back").onclick = showMapView;
}
function showMapView() {
  const mapArea = document.querySelector(".map-area");
  mapArea.innerHTML = `<div id="map" aria-label="Mappa delle meridiane"></div>`;

  $("comune").value = "";
  $("details").innerHTML = `
    <div class="empty">
      <div class="sun">☀</div>
      <p>Seleziona un comune dall'elenco oppure clicca un sole sulla mappa.</p>
    </div>`;
  $("municipality-list").innerHTML = "";
  $("municipality-list").classList.add("view-hidden");

  setupMap();
}
const FALLBACK_DATA = [{"id": "bedizzole_via-xx-settembre", "comune": "Bedizzole", "foto": "foto/meridiana_001.jpg", "motto": null, "anno": null, "note": "Nella fotografia non è leggibile con certezza una frase/motto.", "localita": null}, {"id": "lonato_piazza-corlo", "comune": "Lonato", "foto": "foto/meridiana_002.jpg", "motto": null, "anno": 2006, "note": "Sul quadrante sono visibili anche altre iscrizioni; il motto non è identificabile con sufficiente certezza.", "localita": null}, {"id": "lonato_via-famiglia", "comune": "Lonato", "foto": "foto/meridiana_003.jpg", "motto": null, "anno": null, "note": "La superficie della meridiana non presenta un'iscrizione leggibile nella fotografia.", "localita": null}, {"id": "maderno_villa-lucia", "comune": "Maderno", "foto": "foto/meridiana_004.jpg", "motto": null, "anno": null, "note": "Meridiana decorativa; non è leggibile con certezza un motto.", "localita": null}, {"id": "muscoline_fraz-morsone", "comune": "Muscoline", "foto": "foto/meridiana_005.jpg", "motto": "HORAS TIBI SERENAS", "anno": null, "note": "È visibile anche l'iscrizione PONAVINI sul cartiglio inferiore.", "localita": null}];

init().catch(err => {
  console.error(err);
  $("details").innerHTML = '<div class="empty"><h2>Errore nel caricamento</h2><p>Controlla i file del sito.</p></div>';
});
