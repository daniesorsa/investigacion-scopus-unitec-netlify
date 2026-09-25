// map.js - Lógica del Mapa Inteligente (Leaflet)

let map;
let markersLayer;
let linesLayer;

const UNITEC_COORDS = [14.085, -87.167]; // Tegucigalpa
const UNITEC_COLOR = '#002855';
const LINE_COLOR = '#006FBA';
const MARKER_COLOR = '#DA291C';

function initMap() {
    // Inicializar mapa
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
        minZoom: 2
    });

    // Añadir capa base (OpenStreetMap estándar, sin necesidad de API key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    linesLayer = L.layerGroup().addTo(map);
}

function updateMap(paisesData, coordsData) {
    // Limpiar capas
    markersLayer.clearLayers();
    linesLayer.clearLayers();

    const bounds = L.latLngBounds();
    
    // Añadir marcador de UNITEC (siempre visible)
    const unitecIcon = L.circleMarker(UNITEC_COORDS, {
        radius: 8,
        fillColor: UNITEC_COLOR,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).bindPopup(`
        <div class="custom-popup-title">UNITEC / CEUTEC</div>
        <div class="custom-popup-data">Centro de Gravedad<br>Tegucigalpa, Honduras</div>
    `);
    markersLayer.addLayer(unitecIcon);
    bounds.extend(UNITEC_COORDS);

    let hasCollaborations = false;

    // Obtener el valor máximo para escalar grosores de línea
    const counts = Object.values(paisesData);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

    for (const [pais, count] of Object.entries(paisesData)) {
        if (pais === 'Honduras') continue; // Evitar linea de HND a HND si UNITEC es el centro
        
        const coords = coordsData[pais];
        if (coords) {
            hasCollaborations = true;
            const destLatLng = [coords[0], coords[1]];
            
            // Extender los bounds para el auto-zoom
            bounds.extend(destLatLng);

            // Calcular grosor de la línea basado en el número de colaboraciones
            // min weight = 1, max weight = 6
            const weight = 1 + (count / maxCount) * 5;

            // Dibujar Línea
            const line = L.polyline([UNITEC_COORDS, destLatLng], {
                color: LINE_COLOR,
                weight: weight,
                opacity: 0.6,
                className: 'animated-line'
            });
            
            line.bindPopup(`
                <div class="custom-popup-title">Colaboración con ${pais}</div>
                <div class="custom-popup-data">
                    <b>Total de Documentos:</b> ${count}
                </div>
            `);
            linesLayer.addLayer(line);

            // Dibujar Marcador del país
            const radius = 6 + (count / maxCount) * 12; // Radio entre 6 y 18
            const marker = L.circleMarker(destLatLng, {
                radius: radius,
                fillColor: MARKER_COLOR,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).bindPopup(`
                <div class="custom-popup-title">${pais}</div>
                <div class="custom-popup-data">
                    <b>Colaboraciones:</b> ${count}
                </div>
            `);
            markersLayer.addLayer(marker);
        }
    }

    // Inteligencia de Ajuste (Auto-Zoom / FitBounds)
    if (hasCollaborations) {
        // Añadir padding para que los marcadores no queden en el borde exacto
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    } else {
        // Si no hay colaboraciones, centrar en Honduras y alejar un poco
        map.setView(UNITEC_COORDS, 3);
    }
}
