// app.js - Lógica principal de la aplicación Web

let globalData = null;

let facultadChoices;
let autorChoices;

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
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

    // Comprobar preferencia de modo oscuro
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        lightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        darkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', function() {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
        
        // Forzar redibujado de gráficas si es necesario
        if (typeof timelineChart !== 'undefined') timelineChart.resize();
        if (typeof countriesChart !== 'undefined') countriesChart.resize();
    });
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
    // Tarjetas y Botones Arriba del Mapa
    kpisContainer.innerHTML = autores.map(autor => `
        <div class="bg-white dark:bg-dark-card rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-dark-border transition-colors">
            <div class="bg-unitec-navy px-6 py-4 flex flex-col md:flex-row justify-between items-center text-white">
                <div class="mb-4 md:mb-0 text-center md:text-left">
                    <h3 class="text-xl font-bold">${autor.nombre}</h3>
                    <p class="text-sm opacity-90">Facultad: ${autor.facultad}</p>
                </div>
                <div class="flex flex-wrap justify-center space-x-2">
                    <button onclick="downloadAuthorData('${autor.id}', 'xlsx')" class="px-3 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-bold shadow transition-colors flex items-center">
                        ↓ Descargar XLSX
                    </button>
                    <button onclick="downloadAuthorData('${autor.id}', 'json')" class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-bold shadow transition-colors flex items-center">
                        ↓ Descargar JSON
                    </button>
                    <button onclick="downloadAuthorData('${autor.id}', 'pptx')" class="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-bold shadow transition-colors flex items-center">
                        ↓ Descargar PPTX
                    </button>
                </div>
            </div>
            
            <div class="p-6">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center transition-colors">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Publicaciones</p>
                        <p class="text-2xl font-bold text-unitec-blue dark:text-blue-400">${autor.stats.totalPubs}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center transition-colors">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Citas Totales</p>
                        <p class="text-2xl font-bold text-ceutec-gold">${autor.stats.totalCites}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center transition-colors">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Citas s/Autocitas</p>
                        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">${autor.stats.exclTotalCites !== undefined ? autor.stats.exclTotalCites : autor.stats.totalCites}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center transition-colors">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Promedio Citas</p>
                        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">${autor.stats.citePromedio !== undefined ? autor.stats.citePromedio.toFixed(2) : '-'}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-dark-border text-center transition-colors">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Redes Colab.</p>
                        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">${autor.stats.redesColaboracion || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Tabla Abajo del Mapa
    tableContainer.innerHTML = autores.map(autor => `
        <div class="bg-white dark:bg-dark-card rounded-xl shadow-md p-6 border border-gray-200 dark:border-dark-border transition-colors">
            <h4 class="text-lg font-bold text-unitec-navy dark:text-white mb-4 border-b dark:border-dark-border pb-2">Tabla de Publicaciones - ${autor.nombre}</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm text-left border border-gray-200 dark:border-dark-border">
                    <thead class="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 uppercase border-b border-gray-200 dark:border-dark-border">
                        <tr>
                            <th class="px-4 py-3">Año</th>
                            <th class="px-4 py-3 w-1/2">Título</th>
                            <th class="px-4 py-3">Revista / Fuente</th>
                            <th class="px-4 py-3 text-center">Citas</th>
                            <th class="px-4 py-3 text-center">Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(autor.articulos && autor.articulos.length > 0) ? autor.articulos.map(art => `
                            <tr class="border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td class="px-4 py-3 align-top font-semibold dark:text-gray-200">${art.year}</td>
                                <td class="px-4 py-3 align-top text-gray-900 dark:text-gray-300">${art.title}</td>
                                <td class="px-4 py-3 align-top italic text-gray-600 dark:text-gray-400">${art.journal || art.docType || ''}</td>
                                <td class="px-4 py-3 align-top text-center font-bold text-ceutec-gold">${art.cites !== undefined ? art.cites : '-'}</td>
                                <td class="px-4 py-3 align-top text-center">
                                    ${art.link 
                                        ? `<a href="${art.link}" target="_blank" class="text-unitec-blue dark:text-blue-400 hover:underline font-medium">Scopus</a>` 
                                        : (art.doi ? `<a href="https://doi.org/${art.doi}" target="_blank" class="text-unitec-blue dark:text-blue-400 hover:underline font-medium">DOI</a>` : '-')}
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-500 dark:text-gray-400">No hay publicaciones registradas.</td></tr>'}
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
        if (typeof PptxGenJS === 'undefined') return alert('Librería PPTX no cargada aún');
        
        let pres = new PptxGenJS();
        pres.author = 'Admin UNITEC';
        pres.company = 'UNITEC / CEUTEC';
        
        // Slide 1: Portada
        let slide1 = pres.addSlide();
        slide1.background = { color: "002855" };
        slide1.addText("TITULO: " + autor.nombre, { 
            x:1, y:2, w:'80%', h:1, fontSize:32, color:"FFFFFF", bold:true, align:"center" 
        });
        slide1.addText("SUBTITULO: " + adminDateStr + " DE PARTE DEL ADMIN", { 
            x:1, y:3.5, w:'80%', h:1, fontSize:18, color:"FFC72C", align:"center" 
        });

        // Slide 2: Resumen
        let slide2 = pres.addSlide();
        slide2.addText("Resumen de Estadísticas", { x:0.5, y:0.5, w:'90%', fontSize:24, color:"002855", bold:true });
        
        let statsRows = [
            [{ text:"Métrica", options:{fill:"006FBA", color:"ffffff", bold:true} }, { text:"Valor", options:{fill:"006FBA", color:"ffffff", bold:true} }],
            ["Total Publicaciones", String(autor.stats.totalPubs)],
            ["Total Citas", String(autor.stats.totalCites)],
            ["Citas sin Autocitas", String(autor.stats.exclTotalCites !== undefined ? autor.stats.exclTotalCites : autor.stats.totalCites)],
            ["Promedio de Citas por Doc.", String(autor.stats.citePromedio !== undefined ? autor.stats.citePromedio.toFixed(2) : '-')],
            ["Países en Colaboración", String(autor.stats.redesColaboracion || '-')]
        ];
        slide2.addTable(statsRows, { x:1, y:1.5, w:8, rowH:0.5, fontSize:16, border:{pt:1, color:"CCCCCC"} });

        // Slide 3: Países Top
        if (autor.paisesColaboracion && Object.keys(autor.paisesColaboracion).length > 0) {
            let slide3 = pres.addSlide();
            slide3.addText("Top Colaboraciones por País", { x:0.5, y:0.5, w:'90%', fontSize:24, color:"002855", bold:true });
            
            let paisesArr = Object.entries(autor.paisesColaboracion).sort((a,b)=>b[1]-a[1]).slice(0, 10);
            let pRows = [[{ text:"País", options:{fill:"DA291C", color:"ffffff", bold:true} }, { text:"Documentos", options:{fill:"DA291C", color:"ffffff", bold:true} }]];
            
            paisesArr.forEach(p => pRows.push([p[0], String(p[1])]));
            slide3.addTable(pRows, { x:1, y:1.5, w:8, rowH:0.4, fontSize:14, border:{pt:1, color:"CCCCCC"} });
        }

        pres.writeFile({ fileName: `${autor.id}_Presentacion_SCOPUS.pptx` });
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
    document.getElementById('kpi-autores').textContent = autores.toLocaleString();
    document.getElementById('kpi-pubs').textContent = pubs.toLocaleString();
    document.getElementById('kpi-citas').textContent = citas.toLocaleString();
    document.getElementById('kpi-paises').textContent = paises.toLocaleString();
}
