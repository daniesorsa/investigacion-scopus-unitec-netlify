// map.js - Lógica del Mapa Inteligente (Leaflet)
//
// IDIOMA: Los mapas base de OpenStreetMap muestran cada país en su idioma local
// (ruso, chino, árabe...). Para mantener TODO en español usamos mapas base SIN
// etiquetas (Esri Canvas, gratuitos y sin API key) y dibujamos nosotros las
// etiquetas en español (ver i18n.js) para UNITEC y cada país colaborador.

let map;
let baseLayer;
let markersLayer;
let linesLayer;
let lastMapArgs = null;

const UNITEC_COORDS = [14.085, -87.167]; // Tegucigalpa
const UNITEC_COLOR = '#002855';
const LINE_COLOR = '#006FBA';
const MARKER_COLOR = '#DA291C';

const TILE_URLS = {
    light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
};

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

function initMap() {
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
        minZoom: 2,
        zoomSnap: 0.25
    }).setView(UNITEC_COORDS, 3); // vista inicial (necesaria para las animaciones flyTo)

    // Textos de controles en español
    map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-in').title = 'Acercar';
    map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-out').title = 'Alejar';
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

    setMapTheme();

    markersLayer = L.layerGroup().addTo(map);
    linesLayer = L.layerGroup().addTo(map);

    // Zoom mínimo dinámico: el mundo siempre llena el ancho del contenedor
    // (evita franjas grises "Map data not yet available" a los lados)
    const fitMinZoom = () => {
        const z = Math.ceil(Math.log2(map.getSize().x / 256) * 4) / 4;
        map.setMinZoom(Math.max(2, z));
    };
    fitMinZoom();
    map.on('resize', fitMinZoom);

    // Etiquetas: con poco zoom solo se ven las principales; al acercar aparecen todas
    const updateLabelDensity = () => {
        map.getContainer().classList.toggle('labels-all', map.getZoom() >= 4.5);
    };
    map.on('zoomend', updateLabelDensity);
    updateLabelDensity();
}

// Cambia el mapa base entre claro y oscuro (se llama también al alternar el tema)
function setMapTheme() {
    if (baseLayer) map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(isDarkMode() ? TILE_URLS.dark : TILE_URLS.light, {
        attribution: 'Mapa base &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
        noWrap: true
    }).addTo(map);
}

function updateMap(paisesData, coordsData) {
    lastMapArgs = [paisesData, coordsData];
    markersLayer.clearLayers();
    linesLayer.clearLayers();

    const bounds = L.latLngBounds();

    // Marcador UNITEC con pulso animado
    const pulse = L.marker(UNITEC_COORDS, {
        icon: L.divIcon({ className: 'unitec-pulse', html: '<span></span>', iconSize: [40, 40] }),
        interactive: false
    });
    markersLayer.addLayer(pulse);

    const unitecMarker = L.circleMarker(UNITEC_COORDS, {
        radius: 9,
        fillColor: isDarkMode() ? '#FFC72C' : UNITEC_COLOR,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
        className: 'map-marker-pop'
    }).bindPopup(`
        <div class="custom-popup-title">UNITEC / CEUTEC</div>
        <div class="custom-popup-data">Sede central<br>Tegucigalpa, Honduras</div>
    `).bindTooltip('UNITEC', { permanent: true, direction: 'left', offset: [-10, 0], className: 'map-label map-label-main' });
    markersLayer.addLayer(unitecMarker);
    bounds.extend(UNITEC_COORDS);

    let hasCollaborations = false;
    const entries = Object.entries(paisesData).sort((a, b) => b[1] - a[1]);
    const counts = entries.map(e => e[1]);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

    entries.forEach(([pais, count], index) => {
        if (pais === 'Honduras') return; // UNITEC ya es el centro
        const coords = coordsData[pais];
        if (!coords) return;

        hasCollaborations = true;
        const nombre = paisES(pais);
        const destLatLng = [coords[0], coords[1]];
        bounds.extend(destLatLng);

        const delay = Math.min(index * 40, 1200); // entrada escalonada
        const weight = 1.5 + (count / maxCount) * 5;
        const docsTxt = `${count} ${count === 1 ? 'documento' : 'documentos'}`;

        const line = L.polyline([UNITEC_COORDS, destLatLng], {
            color: LINE_COLOR,
            weight: weight,
            opacity: 0.65,
            className: 'animated-line'
        }).bindPopup(`
            <div class="custom-popup-title">UNITEC ↔ ${nombre}</div>
            <div class="custom-popup-data"><b>Colaboraciones:</b> ${docsTxt}</div>
        `);
        linesLayer.addLayer(line);

        const radius = 7 + (count / maxCount) * 13;
        const marker = L.circleMarker(destLatLng, {
            radius: radius,
            fillColor: MARKER_COLOR,
            color: '#fff',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.85,
            className: 'map-marker-pop'
        }).bindPopup(`
            <div class="custom-popup-title">${nombre}</div>
            <div class="custom-popup-data"><b>Colaboraciones:</b> ${docsTxt}</div>
        `).bindTooltip(nombre, { permanent: true, direction: 'top', offset: [0, -radius], className: index < 12 ? 'map-label' : 'map-label map-label-minor' });

        marker.on('mouseover', () => marker.setStyle({ fillOpacity: 1, weight: 3 }));
        marker.on('mouseout', () => marker.setStyle({ fillOpacity: 0.85, weight: 1.5 }));
        markersLayer.addLayer(marker);

        // Retardo escalonado para la animación de entrada
        [line, marker].forEach(layer => {
            const el = layer.getElement && layer.getElement();
            if (el) el.style.animationDelay = `${delay}ms`;
        });
    });

    if (hasCollaborations) {
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 5, duration: 1.2 });
    } else {
        map.flyTo(UNITEC_COORDS, 4, { duration: 1.2 });
    }
}

// Redibujar el mapa con el tema actual (colores de marcador y mapa base)
function refreshMapTheme() {
    setMapTheme();
    if (lastMapArgs) updateMap(...lastMapArgs);
}
