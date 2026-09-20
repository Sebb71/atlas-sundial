let all = [];
let filtered = [];
let map;
let markers = [];

const $ = (id) => document.getElementById(id);

function label(item) {
  return [item.comune, item.localita, item.via].filter(Boolean).join(" · ");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

async function init() {
  all = [{"id":"bedizzole_via-xx-settembre","comune":"Bedizzole","localita":null,"via":"Via XX Settembre","latitudine":45.511882,"longitudine":10.425186,"foto":"foto/Bedizzole_via-XX-settembre_45.511882, 10.425186.jpg","motto":null,"anno":null,"note":"Nella fotografia non è leggibile con certezza una frase/motto."},{"id":"lonato_piazza-corlo","comune":"Lonato","localita":null,"via":"Piazza Corlo","latitudine":45.464138,"longitudine":10.482974,"foto":"foto/Lonato_piazza-Corlo_45.464138, 10.482974.jpg","motto":null,"anno":2006,"note":"Sul quadrante sono visibili anche altre iscrizioni; il motto non è identificabile con sufficiente certezza."},{"id":"lonato_via-famiglia","comune":"Lonato","localita":null,"via":"Via Famiglia","latitudine":45.466506,"longitudine":10.477181,"foto":"foto/Lonato_via-famiglia_45.466506, 10.477181.jpg","motto":null,"anno":null,"note":"La superficie della meridiana non presenta un'iscrizione leggibile nella fotografia."},{"id":"maderno_villa-lucia","comune":"Maderno","localita":null,"via":"Villa Lucia","latitudine":45.637266,"longitudine":10.600806,"foto":"foto/Maderno_Villa-Lucia_45.637266, 10.600806.jpg","motto":null,"anno":null,"note":"Meridiana decorativa; non è leggibile con certezza un motto."},{"id":"muscoline_fraz-morsone","comune":"Muscoline","localita":"Morsone","via":null,"latitudine":45.558316,"longitudine":10.470399,"foto":"foto/Muscoline_fraz-Morsone_45.558316, 10.470399.jpg","motto":"HORAS TIBI SERENAS","anno":null,"note":"È visibile anche l'iscrizione PONAVINI sul cartiglio inferiore."}];
  $("count").textContent = all.length;
  populateComuni();
  setupMap();
  render(all);
  $("search").addEventListener("input", applyFilters);
  $("comune").addEventListener("change", applyFilters);
  $("reset").addEventListener("click", () => {
    $("search").value = "";
    $("comune").value = "";
    applyFilters();
  });
}

function populateComuni() {
  [...new Set(all.map(x => x.comune).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, "it"))
    .forEach(c => $("comune").insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
}

function setupMap() {
  const avgLat = all.reduce((s,x) => s + x.latitudine, 0) / all.length;
  const avgLon = all.reduce((s,x) => s + x.longitudine, 0) / all.length;
  map = L.map("map").setView([avgLat, avgLon], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

function applyFilters() {
  const q = $("search").value.trim().toLowerCase();
  const comune = $("comune").value;
  filtered = all.filter(x => {
    const hay = [x.comune, x.localita, x.via, x.motto, x.note, x.anno].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!comune || x.comune === comune);
  });
  render(filtered);
}

function render(items) {
  filtered = items;
  $("result-count").textContent = `${items.length} risultat${items.length === 1 ? "o" : "i"}`;
  renderMarkers(items);
  renderCards(items);
  if (items.length) {
    const bounds = L.latLngBounds(items.map(x => [x.latitudine, x.longitudine]));
    map.fitBounds(bounds.pad(.18), {maxZoom: 14});
  }
}

function renderMarkers(items) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  items.forEach((item, index) => {
    const m = L.marker([item.latitudine, item.longitudine]).addTo(map);
    m.bindTooltip(label(item), {direction: "top"});
    m.on("click", () => showDetails(item));
    markers.push(m);
  });
}

function renderCards(items) {
  $("cards").innerHTML = items.map((item, i) => `
    <article class="card" data-id="${escapeHtml(item.id)}">
      <img src="${escapeHtml(item.foto)}" alt="Meridiana di ${escapeHtml(label(item))}" loading="lazy">
      <div class="card-body">
        <h3>${escapeHtml(item.comune)}${item.localita ? " — " + escapeHtml(item.localita) : ""}</h3>
        <p>${escapeHtml(item.via || "Località non specificata")}</p>
        ${item.motto ? `<p class="motto-small">“${escapeHtml(item.motto)}”</p>` : ""}
      </div>
    </article>`).join("");

  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const item = all.find(x => x.id === card.dataset.id);
      if (item) {
        showDetails(item);
        map.setView([item.latitudine, item.longitudine], 16);
      }
    });
  });
}

function showDetails(item) {
  $("details").innerHTML = `
    <img class="details-photo" src="${escapeHtml(item.foto)}"
         alt="Meridiana di ${escapeHtml(label(item))}">
    <div class="detail-body">
      <p class="eyebrow">MERIDIANA</p>
      <h2>${escapeHtml(item.comune)}${item.localita ? " — " + escapeHtml(item.localita) : ""}</h2>
      <div class="location">${escapeHtml(item.via || "Località non specificata")}</div>
      ${item.motto ? `<div class="motto">“${escapeHtml(item.motto)}”</div>` : ""}
      <div class="meta">
        <div><strong>Coordinate:</strong> ${item.latitudine}, ${item.longitudine}</div>
        ${item.anno ? `<div><strong>Anno:</strong> ${escapeHtml(item.anno)}</div>` : ""}
        ${item.note ? `<div><strong>Note:</strong> ${escapeHtml(item.note)}</div>` : ""}
      </div>
    </div>`;
}

init().catch(err => {
  console.error(err);
  $("details").innerHTML = '<div class="empty"><h2>Errore nel caricamento</h2><p>Controlla che data.json sia presente.</p></div>';
});
