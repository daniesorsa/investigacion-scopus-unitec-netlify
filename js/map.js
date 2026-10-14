// map.js - Lógica del Mapa Inteligente de Colaboraciones (100% en Español)
// Utiliza geometría vectorial GeoJSON nativa (web/data/world.json)
// Garantiza 0% texto en inglés (sin océanos ni mapas base en inglés),
// soporte perfecto para Modo Claro y Modo Oscuro, y animaciones de alta fidelidad.

let map;
let geoJsonLayer = null;
let markersLayer = null;
let linesLayer = null;
let oceanLabelsLayer = null;
let worldGeoData = null;
let lastMapPaisesData = null;
let lastMapCoordsData = null;

const UNITEC_COORDS = [14.085, -87.167]; // Tegucigalpa, Honduras
const UNITEC_COLOR = '#002855';
const UNITEC_GOLD = '#FFC72C';
const LINE_COLOR = '#006FBA';
const MARKER_COLOR = '#DA291C';

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

async function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Inicializar mapa de Leaflet sin capas externas en inglés
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 0.9,
        minZoom: 1.5,
        zoomSnap: 0.25,
        attributionControl: true
    }).setView(UNITEC_COORDS, 3);

    // Controles de zoom traducidos al Español
    const zoomIn = map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-in');
    const zoomOut = map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-out');
    if (zoomIn) zoomIn.title = 'Acercar';
    if (zoomOut) zoomOut.title = 'Alejar';

    // Atribución 100% institucional y en español
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('Dirección de Investigación • UNITEC / CEUTEC');

    // Grupos de capas
    markersLayer = L.layerGroup().addTo(map);
    linesLayer = L.layerGroup().addTo(map);
    oceanLabelsLayer = L.layerGroup().addTo(map);

    // Cargar datos vectoriales mundiales
    try {
        const res = await fetch('data/world.json');
        if (res.ok) {
            worldGeoData = await res.json();
            renderGeoJsonBase();
        }
    } catch (e) {
        console.warn('Cargando geometría mundial...', e);
    }

    renderOceanLabels();
    updateMapStyleClasses();
}

// Rótulos geográficos sutiles de océanos 100% en Español
function renderOceanLabels() {
    if (!oceanLabelsLayer) return;
    oceanLabelsLayer.clearLayers();

    const oceanLabels = [
        { lat: 24, lng: -42, text: 'OCÉANO ATLÁNTICO' },
        { lat: 2, lng: -125, text: 'OCÉANO PACÍFICO' },
        { lat: 15, lng: -75, text: 'MAR CARIBE' },
        { lat: -15, lng: 75, text: 'OCÉANO ÍNDICO' }
    ];

    oceanLabels.forEach(o => {
        const icon = L.divIcon({
            className: 'ocean-watermark',
            html: `<span>${o.text}</span>`,
            iconSize: [160, 24]
        });
        oceanLabelsLayer.addLayer(L.marker([o.lat, o.lng], { icon, interactive: false }));
    });
}

// Renderizar países con estilos corporativos en Español
function renderGeoJsonBase() {
    if (!worldGeoData || !map) return;
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);

    const dark = isDarkMode();
    const activeCountries = lastMapPaisesData ? Object.keys(lastMapPaisesData) : [];

    geoJsonLayer = L.geoJSON(worldGeoData, {
        style: (feature) => {
            const rawName = feature.properties.name;
            const isCollaborator = activeCountries.includes(rawName);
            const isHonduras = (rawName === 'Honduras');

            if (isHonduras) {
                return {
                    fillColor: dark ? '#1E3A8A' : '#DBEAFE',
                    fillOpacity: 0.9,
                    color: dark ? '#60A5FA' : '#006FBA',
                    weight: 1.8
                };
            }

            if (isCollaborator) {
                return {
                    fillColor: dark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(0, 111, 186, 0.16)',
                    fillOpacity: 0.8,
                    color: dark ? '#60A5FA' : '#006FBA',
                    weight: 1.4
                };
            }

            return {
                fillColor: dark ? '#151F32' : '#FFFFFF',
                fillOpacity: 0.9,
                color: dark ? '#26374D' : '#CBD5E1',
                weight: 0.8
            };
        },
        onEachFeature: (feature, layer) => {
            const spanishName = paisES(feature.properties.name);
            const rawName = feature.properties.name;
            const count = lastMapPaisesData && lastMapPaisesData[rawName] ? lastMapPaisesData[rawName] : 0;

            const tooltipText = count > 0 
                ? `<b>${spanishName}</b><br>${count} ${count === 1 ? 'colaboración' : 'colaboraciones'}`
                : `<b>${spanishName}</b>`;

            layer.bindTooltip(tooltipText, {
                direction: 'top',
                className: 'country-hover-tooltip',
                sticky: true
            });

            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({
                        weight: 2,
                        color: isDarkMode() ? '#FFC72C' : '#002855',
                        fillOpacity: 0.95
                    });
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        l.bringToFront();
                    }
                    if (markersLayer) markersLayer.bringToFront();
                },
                mouseout: (e) => {
                    if (geoJsonLayer) geoJsonLayer.resetStyle(e.target);
                }
            });
        }
    }).addTo(map);

    // Enviar capa base al fondo
    geoJsonLayer.bringToBack();
}

function updateMap(paisesData, coordsData) {
    lastMapPaisesData = paisesData;
    lastMapCoordsData = coordsData;

    if (!markersLayer || !linesLayer) return;

    markersLayer.clearLayers();
    linesLayer.clearLayers();

    // Actualizar estilos de polígonos vectoriales
    if (worldGeoData) {
        renderGeoJsonBase();
    }

    const bounds = L.latLngBounds();

    // 1. Pulso institucional en UNITEC Tegucigalpa
    const pulse = L.marker(UNITEC_COORDS, {
        icon: L.divIcon({ className: 'unitec-pulse', html: '<span></span>', iconSize: [42, 42] }),
        interactive: false
    });
    markersLayer.addLayer(pulse);

    // 2. Marcador central UNITEC
    const dark = isDarkMode();
    const unitecMarker = L.circleMarker(UNITEC_COORDS, {
        radius: 10,
        fillColor: dark ? UNITEC_GOLD : UNITEC_COLOR,
        color: '#FFFFFF',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 1,
        className: 'map-marker-pop'
    }).bindPopup(`
        <div class="custom-popup-title">UNITEC / CEUTEC</div>
        <div class="custom-popup-data"><b>Sede Central</b><br>Tegucigalpa, Honduras</div>
    `).bindTooltip('UNITEC / CEUTEC', {
        permanent: true,
        direction: 'left',
        offset: [-12, 0],
        className: 'map-label map-label-main'
    });
    markersLayer.addLayer(unitecMarker);
    bounds.extend(UNITEC_COORDS);

    let hasCollaborations = false;
    const entries = Object.entries(paisesData).sort((a, b) => b[1] - a[1]);
    const counts = entries.map(e => e[1]);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

    entries.forEach(([pais, count], index) => {
        if (pais === 'Honduras') return;
        const coords = coordsData[pais];
        if (!coords) return;

        hasCollaborations = true;
        const nombreEs = paisES(pais);
        const destLatLng = [coords[0], coords[1]];
        bounds.extend(destLatLng);

        const delay = Math.min(index * 35, 1000);
        const weight = 1.6 + (count / maxCount) * 5;
        const docsTxt = `${count} ${count === 1 ? 'documento' : 'documentos'}`;

        // Línea animada conectando con Tegucigalpa
        const line = L.polyline([UNITEC_COORDS, destLatLng], {
            color: dark ? '#60A5FA' : LINE_COLOR,
            weight: weight,
            opacity: 0.7,
            className: 'animated-line'
        }).bindPopup(`
            <div class="custom-popup-title">UNITEC ↔ ${nombreEs}</div>
            <div class="custom-popup-data"><b>Colaboraciones:</b> ${docsTxt}</div>
        `);
        linesLayer.addLayer(line);

        // Marcador circular del país colaborador
        const radius = 6.5 + (count / maxCount) * 13;
        const marker = L.circleMarker(destLatLng, {
            radius: radius,
            fillColor: MARKER_COLOR,
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.88,
            className: 'map-marker-pop'
        }).bindPopup(`
            <div class="custom-popup-title">${nombreEs}</div>
            <div class="custom-popup-data"><b>Colaboraciones:</b> ${docsTxt}</div>
        `).bindTooltip(nombreEs, {
            permanent: true,
            direction: 'top',
            offset: [0, -radius],
            className: index < 14 ? 'map-label' : 'map-label map-label-minor'
        });

        marker.on('mouseover', () => marker.setStyle({ fillOpacity: 1, weight: 3 }));
        marker.on('mouseout', () => marker.setStyle({ fillOpacity: 0.88, weight: 1.5 }));
        markersLayer.addLayer(marker);

        // Retardo para animación fluida de entrada
        [line, marker].forEach(layer => {
            const el = layer.getElement && layer.getElement();
            if (el) el.style.animationDelay = `${delay}ms`;
        });
    });

    if (hasCollaborations) {
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 5, duration: 1.1 });
    } else {
        map.flyTo(UNITEC_COORDS, 3.5, { duration: 1.1 });
    }
}

function updateMapStyleClasses() {
    const el = document.getElementById('map');
    if (!el) return;
    if (isDarkMode()) {
        el.style.backgroundColor = '#0A1120';
    } else {
        el.style.backgroundColor = '#EBF3FA';
    }
}

function refreshMapTheme() {
    updateMapStyleClasses();
    renderOceanLabels();
    if (worldGeoData) {
        renderGeoJsonBase();
    }
    if (lastMapPaisesData && lastMapCoordsData) {
        updateMap(lastMapPaisesData, lastMapCoordsData);
    }
}
