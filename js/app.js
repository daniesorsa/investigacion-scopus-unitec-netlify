// app.js - Lógica principal de la aplicación Web

let globalData = null;

let facultadChoices;
let autorChoices;

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    initRevealAnimations();
    initMap();
    initCharts();

    try {
        const response = await fetch('datos_dashboard_unitec.json');
        if (!response.ok) throw new Error('Error al cargar datos JSON');
        globalData = await response.json();
        
        document.getElementById('last-updated').textContent = `Última actualización: ${new Date(globalData.metadata.generadoEl).toLocaleDateString()}`;

        setupFilters(globalData);
        applyFiltersAndRender();

    } catch (error) {
        console.error("Error inicializando la app:", error);
        alert("No se pudo cargar la base de datos de SCOPUS.");
    }
});

function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    // El tema ya se aplicó en el <head> (evita parpadeo); aquí solo se sincronizan los íconos
    if (document.documentElement.classList.contains('dark')) {
        lightIcon.classList.remove('hidden');
    } else {
        darkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', function() {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        const root = document.documentElement;
        root.classList.add('theme-transition');
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            root.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
        setTimeout(() => root.classList.remove('theme-transition'), 400);

        // Repintar mapa y gráficas con la paleta del nuevo tema
        if (typeof refreshMapTheme === 'function') refreshMapTheme();
        if (typeof refreshChartsTheme === 'function') refreshChartsTheme();
    });
}

// Anima la aparición de las secciones .reveal al entrar en pantalla
function initRevealAnimations() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                setTimeout(() => { entry.target.style.transitionDelay = ''; }, 1000);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    els.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
        observer.observe(el);
    });
}

// Contador animado para los números de las tarjetas
function animateNumber(el, target, decimals = 0, duration = 900) {
    if (!el) return;
    const start = parseFloat((el.dataset.value || '0')) || 0;
    el.dataset.value = target;
    const t0 = performance.now();
    const fmt = v => v.toLocaleString('es-HN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    function step(now) {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(start + (target - start) * eased);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function setupFilters(data) {
    const facultadSelect = document.getElementById('facultad-filter');
    const autorSelect = document.getElementById('autor-filter');

    // Extraer facultades únicas
    const facultades = [...new Set(data.autores.map(a => a.facultad))].sort();
    
    facultades.forEach(fac => {
        const option = document.createElement('option');
        option.value = fac;
        option.textContent = fac;
        facultadSelect.appendChild(option);
    });

    data.autores.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(autor => {
        const option = document.createElement('option');
        option.value = autor.id;
        option.textContent = `${autor.nombre} (${autor.facultad})`;
        autorSelect.appendChild(option);
    });

    facultadChoices = new Choices(facultadSelect, {
        removeItemButton: true,
        placeholderValue: 'Seleccione Facultades...',
        searchPlaceholderValue: 'Buscar facultad...'
    });

    autorChoices = new Choices(autorSelect, {
        removeItemButton: true,
        placeholderValue: 'Seleccione Autores...',
        searchPlaceholderValue: 'Buscar autor...'
    });

    facultadSelect.addEventListener('change', () => {
        const selectedFacultades = facultadChoices.getValue(true) || [];
        
        let filteredAutores = globalData.autores;
        if (selectedFacultades.length > 0) {
            filteredAutores = filteredAutores.filter(a => selectedFacultades.includes(a.facultad));
        }
        
        filteredAutores.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        const currentSelectedAutores = autorChoices.getValue(true) || [];
        autorChoices.clearChoices();
        autorChoices.setChoices(filteredAutores.map(autor => ({
            value: autor.id,
            label: `${autor.nombre} (${autor.facultad})`,
            selected: currentSelectedAutores.includes(autor.id)
        })));
        
        applyFiltersAndRender();
    });

    autorSelect.addEventListener('change', applyFiltersAndRender);
    
    document.getElementById('btn-reset').addEventListener('click', () => {
        facultadChoices.removeActiveItems();
        autorChoices.removeActiveItems();
        autorChoices.clearChoices();
        autorChoices.setChoices(globalData.autores.map(autor => ({
            value: autor.id,
            label: `${autor.nombre} (${autor.facultad})`,
            selected: false
        })));
        applyFiltersAndRender();
    });
}

function applyFiltersAndRender() {
    const selectedFacultades = facultadChoices.getValue(true) || [];
    const selectedAutores = autorChoices.getValue(true) || [];

    let activeAutores = globalData.autores;
    
    if (selectedFacultades.length > 0) {
        activeAutores = activeAutores.filter(a => selectedFacultades.includes(a.facultad));
    }
    
    if (selectedAutores.length > 0) {
        activeAutores = activeAutores.filter(a => selectedAutores.includes(a.id));
    }

    const generalKpisContainer = document.getElementById('general-kpis');
    const authorKpisContainer = document.getElementById('author-kpis-container');
    const authorTableContainer = document.getElementById('author-table-container');

    if (selectedAutores.length > 0) {
        generalKpisContainer.classList.add('hidden');
        authorKpisContainer.classList.remove('hidden');
        authorTableContainer.classList.remove('hidden');
        renderAuthorDetails(activeAutores, authorKpisContainer, authorTableContainer);
    } else {
        generalKpisContainer.classList.remove('hidden');
        authorKpisContainer.classList.add('hidden');
        authorTableContainer.classList.add('hidden');
        authorKpisContainer.innerHTML = '';
        authorTableContainer.innerHTML = '';
    }

    const aggregatedData = aggregateData(activeAutores);

    updateKPIs(activeAutores.length, aggregatedData.totalPubs, aggregatedData.totalCites, Object.keys(aggregatedData.paises).length);
    updateTimelineChart(aggregatedData.timeline);
    updateCountriesChart(aggregatedData.paises);
    
    updateMap(aggregatedData.paises, globalData.coordenadasPaises);
}

function renderAuthorDetails(autores, kpisContainer, tableContainer) {
    const statCard = (label, valueAttrs, colorCls) => `
        <div class="card-lift bg-gray-50 dark:bg-dark-soft p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center">
            <p class="text-xs text-gray-500 dark:text-dark-muted uppercase font-semibold tracking-wide">${label}</p>
            <p class="text-2xl font-bold mt-1 ${colorCls}" ${valueAttrs}>0</p>
        </div>`;
    const num = (v, dec = 0) => (v === undefined || v === null || v === '' || isNaN(v)) ? 'data-text="-"' : `data-count="${v}" data-decimals="${dec}"`;

    // Tarjetas y Botones Arriba del Mapa
    kpisContainer.innerHTML = autores.map((autor, i) => `
        <div class="anim-enter bg-white dark:bg-dark-card rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-dark-border" style="animation-delay:${i * 90}ms">
            <div class="bg-unitec-navy px-6 py-4 flex flex-col md:flex-row justify-between items-center text-white">
                <div class="mb-4 md:mb-0 text-center md:text-left">
                    <h3 class="text-xl font-bold">${autor.nombre}</h3>
                    <p class="text-sm text-blue-100">Facultad: ${autor.facultad}</p>
                </div>
                <div class="flex flex-wrap justify-center gap-2">
                    <button onclick="downloadAuthorData('${autor.id}', 'xlsx')" class="btn-press px-3 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold shadow flex items-center">↓ Descargar XLSX</button>
                    <button onclick="downloadAuthorData('${autor.id}', 'json')" class="btn-press px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm font-semibold shadow flex items-center">↓ Descargar JSON</button>
                    <button onclick="downloadAuthorData('${autor.id}', 'pptx')" class="btn-press px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-semibold shadow flex items-center">↓ Descargar PPTX</button>
                </div>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    ${statCard('Publicaciones', num(autor.stats.totalPubs), 'text-unitec-blue dark:text-blue-400')}
                    ${statCard('Citas Totales', num(autor.stats.totalCites), 'text-amber-600 dark:text-ceutec-gold')}
                    ${statCard('Citas s/Autocitas', num(autor.stats.exclTotalCites !== undefined ? autor.stats.exclTotalCites : autor.stats.totalCites), 'text-gray-800 dark:text-gray-100')}
                    ${statCard('Promedio Citas', num(autor.stats.citePromedio, 2), 'text-gray-800 dark:text-gray-100')}
                    ${statCard('Redes Colab.', num(autor.stats.redesColaboracion), 'text-gray-800 dark:text-gray-100')}
                </div>
            </div>
        </div>
    `).join('');

    // Animar los números de las tarjetas recién creadas
    kpisContainer.querySelectorAll('[data-count]').forEach(el => {
        animateNumber(el, parseFloat(el.dataset.count), parseInt(el.dataset.decimals, 10));
    });
    kpisContainer.querySelectorAll('[data-text]').forEach(el => { el.textContent = el.dataset.text; });

    const linkCls = 'text-unitec-blue dark:text-blue-400 hover:underline font-semibold';

    // Tabla Abajo del Mapa
    tableContainer.innerHTML = autores.map((autor, i) => `
        <div class="anim-enter bg-white dark:bg-dark-card rounded-xl shadow-md p-6 border border-gray-200 dark:border-dark-border" style="animation-delay:${150 + i * 90}ms">
            <h4 class="text-lg font-bold text-unitec-navy dark:text-white mb-4 border-b border-gray-200 dark:border-dark-border pb-2">Tabla de Publicaciones - ${autor.nombre}</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm text-left border border-gray-200 dark:border-dark-border">
                    <thead class="text-xs text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-dark-soft uppercase border-b border-gray-200 dark:border-dark-border">
                        <tr>
                            <th class="px-4 py-3">Año</th>
                            <th class="px-4 py-3 w-1/2">Título</th>
                            <th class="px-4 py-3">Revista / Fuente</th>
                            <th class="px-4 py-3 text-center">Citas</th>
                            <th class="px-4 py-3 text-center">Enlace</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(autor.articulos && autor.articulos.length > 0) ? autor.articulos.map((art, r) => `
                            <tr class="anim-enter border-b border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-dark-soft transition-colors" style="animation-delay:${Math.min(r, 20) * 25}ms">
                                <td class="px-4 py-3 align-top font-semibold text-gray-800 dark:text-gray-100">${art.year}</td>
                                <td class="px-4 py-3 align-top text-gray-900 dark:text-gray-200">${art.title}</td>
                                <td class="px-4 py-3 align-top italic text-gray-600 dark:text-dark-muted">${art.journal || art.docType || ''}</td>
                                <td class="px-4 py-3 align-top text-center font-bold text-amber-600 dark:text-ceutec-gold">${art.cites !== undefined ? art.cites : '-'}</td>
                                <td class="px-4 py-3 align-top text-center">
                                    ${art.link
                                        ? `<a href="${art.link}" target="_blank" class="${linkCls}">Scopus</a>`
                                        : (art.doi ? `<a href="https://doi.org/${art.doi}" target="_blank" class="${linkCls}">DOI</a>` : '-')}
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-500 dark:text-dark-muted">No hay publicaciones registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

window.downloadAuthorData = async function(autorId, format) {
    const autor = globalData.autores.find(a => a.id === autorId);
    if (!autor) return;
    
    // Fecha en que los datos fueron extraídos por el Admin
    const adminDateStr = new Date(globalData.metadata.generadoEl).toLocaleDateString();

    if (format === 'json') {
        const dataStr = JSON.stringify(autor, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        saveAs(blob, `${autor.id}_SCOPUS.json`);
    } 
    else if (format === 'xlsx') {
        if (typeof XLSX === 'undefined') return alert('Librería XLSX no cargada aún');
        const wb = XLSX.utils.book_new();
        
        const statsData = [
            ["Métrica", "Valor"],
            ["Nombre", autor.nombre],
            ["Facultad", autor.facultad],
            ["Total Publicaciones", autor.stats.totalPubs],
            ["Total Citas", autor.stats.totalCites],
            ["Citas sin autocitas", autor.stats.exclTotalCites !== undefined ? autor.stats.exclTotalCites : autor.stats.totalCites],
            ["Promedio de Citas", autor.stats.citePromedio],
            ["Redes de Colaboración (Países)", autor.stats.redesColaboracion],
            ["Extraido el", adminDateStr]
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, "Estadísticas Generales");

        if (autor.articulos && autor.articulos.length > 0) {
            const pubsData = autor.articulos.map(art => ({
                "Año": art.year,
                "Título": art.title,
                "Revista/Fuente": art.journal || art.docType || '',
                "Citas": art.cites,
                "Enlace Scopus": art.link || '',
                "DOI": art.doi ? `https://doi.org/${art.doi}` : ''
            }));
            const wsPubs = XLSX.utils.json_to_sheet(pubsData);
            XLSX.utils.book_append_sheet(wb, wsPubs, "Publicaciones");
        }

        XLSX.writeFile(wb, `${autor.id}_SCOPUS.xlsx`);
    }
    else if (format === 'pptx') {
        try {
            await generarPlantillaAutorPptx(autor, globalData);
        } catch (e) {
            console.error('Error generando PPTX:', e);
            alert('Error generando la presentación PPTX. Revise la consola.');
        }
    }
};

function aggregateData(autores) {
    const result = {
        totalPubs: 0,
        totalCites: 0,
        paises: {},
        timeline: {
            years: globalData.timelineGlobal.years,
            publicaciones: new Array(globalData.timelineGlobal.years.length).fill(0),
            citas: new Array(globalData.timelineGlobal.years.length).fill(0)
        }
    };

    autores.forEach(autor => {
        result.totalPubs += autor.stats.totalPubs;
        result.totalCites += autor.stats.totalCites;

        if (autor.stats.pubsPerYear && autor.stats.pubsPerYear.length === result.timeline.years.length) {
            for (let i = 0; i < result.timeline.years.length; i++) {
                result.timeline.publicaciones[i] += autor.stats.pubsPerYear[i] || 0;
                result.timeline.citas[i] += autor.stats.citesPerYear[i] || 0;
            }
        }

        if (autor.paisesColaboracion) {
            for (const [pais, count] of Object.entries(autor.paisesColaboracion)) {
                if (!result.paises[pais]) result.paises[pais] = 0;
                result.paises[pais] += count;
            }
        }
    });

    return result;
}

function updateKPIs(autores, pubs, citas, paises) {
    animateNumber(document.getElementById('kpi-autores'), autores);
    animateNumber(document.getElementById('kpi-pubs'), pubs);
    animateNumber(document.getElementById('kpi-citas'), citas);
    animateNumber(document.getElementById('kpi-paises'), paises);
}
