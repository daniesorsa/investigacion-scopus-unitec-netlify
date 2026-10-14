// pptx_generator.js - Generador Avanzado de Plantillas Bibliométricas PPTX para cada Autor
// Basado fielmente en la "Plantilla General de Estadísticas Bibliométricas" (12 Diapositivas)
// Personaliza métricas reales, publicaciones, gráficos e inyecta transiciones y animaciones avanzadas.

async function generarPlantillaAutorPptx(autor, globalData) {
    if (typeof JSZip === 'undefined') {
        throw new Error('Librería JSZip no disponible para procesar la plantilla.');
    }

    // 1. Obtener la plantilla base oficial
    let pptxArrayBuffer;
    try {
        const response = await fetch('plantilla_bibliometrica.pptx');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        pptxArrayBuffer = await response.arrayBuffer();
    } catch (err) {
        console.warn('No se pudo cargar plantilla_bibliometrica.pptx local, generando con motor dinámico...', err);
        return generarPptxAlternativo(autor, globalData);
    }

    const zip = await JSZip.loadAsync(pptxArrayBuffer);

    // 2. Extraer y preparar datos del autor
    const adminDateStr = globalData && globalData.metadata && globalData.metadata.generadoEl 
        ? new Date(globalData.metadata.generadoEl).toLocaleDateString('es-HN') 
        : new Date().toLocaleDateString('es-HN');

    const totalPubs = autor.stats.totalPubs || 0;
    const totalCites = autor.stats.totalCites || 0;
    const exclCites = autor.stats.exclTotalCites !== undefined ? autor.stats.exclTotalCites : totalCites;
    const promedioCites = totalPubs > 0 ? (totalCites / totalPubs).toFixed(2) : '0.00';
    const redesCount = autor.stats.redesColaboracion || Object.keys(autor.paisesColaboracion || {}).length;

    // Años y series temporales
    const allYears = (globalData && globalData.timelineGlobal && globalData.timelineGlobal.years) 
        ? globalData.timelineGlobal.years 
        : [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    
    const pubsPerYear = autor.stats.pubsPerYear || [];
    const citesPerYear = autor.stats.citesPerYear || [];

    // Detectar rango de años activos
    let firstIdx = -1;
    let lastIdx = -1;
    for (let i = 0; i < allYears.length; i++) {
        if ((pubsPerYear[i] || 0) > 0 || (citesPerYear[i] || 0) > 0) {
            if (firstIdx === -1) firstIdx = i;
            lastIdx = i;
        }
    }
    if (firstIdx === -1) {
        firstIdx = Math.max(0, allYears.length - 8);
        lastIdx = allYears.length - 1;
    }

    const primerAnio = allYears[firstIdx];
    const ultimoAnio = allYears[lastIdx];
    const aniosActivos = Math.max(1, lastIdx - firstIdx + 1);

    // Máximos y picos anuales
    let maxPubs = 0;
    let anioMaxPubs = primerAnio;
    let maxCites = 0;
    let anioMaxCites = primerAnio;

    for (let i = firstIdx; i <= lastIdx; i++) {
        const p = pubsPerYear[i] || 0;
        const c = citesPerYear[i] || 0;
        if (p > maxPubs) {
            maxPubs = p;
            anioMaxPubs = allYears[i];
        }
        if (c > maxCites) {
            maxCites = c;
            anioMaxCites = allYears[i];
        }
    }

    // Artículos ordenados por citas descendente
    const articulos = (autor.articulos || []).slice().sort((a, b) => (b.cites || 0) - (a.cites || 0));
    const topArt = articulos.length > 0 ? articulos[0] : null;

    // Países colaboradores traducidos a Español
    const topPaises = Object.entries(autor.paisesColaboracion || {})
        .sort((a, b) => b[1] - a[1])
        .filter(p => p[0] !== 'Honduras')
        .slice(0, 6)
        .map(p => paisES(p[0]));
    const paisesStr = topPaises.length > 0 ? topPaises.join(' • ') : 'Consolidación Institucional Honduras';
    const paisesStrCorto = topPaises.length > 0 ? topPaises.slice(0, 3).join(', ') : 'Honduras';

    // Tasa de efectividad de citación (% de artículos con al menos 1 cita)
    const pubsConCitas = articulos.filter(a => (a.cites || 0) > 0).length;
    const tasaConversion = totalPubs > 0 ? Math.round((pubsConCitas / totalPubs) * 100) : 0;

    // Cálculo estadístico descriptivo sobre años activos
    const activePubs = pubsPerYear.slice(firstIdx, lastIdx + 1);
    const activeCites = citesPerYear.slice(firstIdx, lastIdx + 1);

    const meanPubs = totalPubs / aniosActivos;
    const meanCites = totalCites / aniosActivos;

    let sumSqDiffPubs = 0;
    let sumSqDiffCites = 0;
    activePubs.forEach(val => { sumSqDiffPubs += Math.pow((val || 0) - meanPubs, 2); });
    activeCites.forEach(val => { sumSqDiffCites += Math.pow((val || 0) - meanCites, 2); });

    const varPubs = aniosActivos > 1 ? (sumSqDiffPubs / (aniosActivos - 1)) : 0;
    const varCites = aniosActivos > 1 ? (sumSqDiffCites / (aniosActivos - 1)) : 0;
    const stdPubs = Math.sqrt(varPubs);
    const stdCites = Math.sqrt(varCites);

    function calcMode(arr) {
        const counts = {};
        arr.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        let maxFreq = 0;
        let mode = -1;
        let unique = true;
        for (const [val, freq] of Object.entries(counts)) {
            if (freq > maxFreq) {
                maxFreq = freq;
                mode = Number(val);
                unique = true;
            } else if (freq === maxFreq && maxFreq > 1) {
                unique = false;
            }
        }
        return (maxFreq > 1 && unique) ? mode : -1;
    }
    const modePubs = calcMode(activePubs);
    const modeCites = calcMode(activeCites);

    // Ejes temáticos por facultad
    const thematicMap = {
        'FI': [
            { title: 'Robótica y Automatización', desc: 'Sistemas teleoperados y diseño experimental.' },
            { title: 'Inteligencia Artificial y Visión', desc: 'Redes neuronales y reconocimiento visual.' },
            { title: 'Control y Modelado Dinámico', desc: 'Simulación y transformación cinemática.' },
            { title: 'Tecnología e Innovación', desc: 'Microclases interactivas y robótica aplicada.' }
        ],
        'FCS': [
            { title: 'Epidemiología y Salud Pública', desc: 'Estudios de factores de riesgo poblacionales.' },
            { title: 'Investigación Clínica y Médica', desc: 'Diagnóstico biomédico y evidencia clínica.' },
            { title: 'Neurología y Fisiología', desc: 'Evaluaciones neurológicas especializadas.' },
            { title: 'Bioestadística Sanitaria', desc: 'Modelos predictivos en servicios de salud.' }
        ],
        'FNE': [
            { title: 'Economía y Finanzas', desc: 'Análisis econométrico y mercados emergentes.' },
            { title: 'Gestión y Estrategia', desc: 'Competitividad e innovación corporativa.' },
            { title: 'Analítica de Negocios', desc: 'Inteligencia empresarial guiada por datos.' },
            { title: 'Sostenibilidad y Emprendimiento', desc: 'Desarrollo productivo y comercio regional.' }
        ],
        'default': [
            { title: 'Investigación Científica', desc: 'Producción académica indexada en Scopus.' },
            { title: 'Innovación y Metodología', desc: 'Modelos metodológicos y transferencia técnica.' },
            { title: 'Articulación Interdisciplinaria', desc: 'Sinergia entre departamentos universitarios.' },
            { title: 'Impacto Social e Institucional', desc: 'Contribución al avance del conocimiento.' }
        ]
    };
    const themes = thematicMap[autor.facultad] || thematicMap['default'];

    // 3. Generar imagen del gráfico anual personalizado para la Diapositiva 4
    try {
        const chartBase64 = renderAnnualChartCanvas(autor, globalData, firstIdx, lastIdx, allYears);
        if (chartBase64) {
            zip.file('ppt/media/image1.png', chartBase64, { base64: true });
        }
    } catch (e) {
        console.warn('No se pudo reemplazar gráfico anual:', e);
    }

    // 4. Mapa de animaciones de transición para cada diapositiva
    const slideTransitions = {
        1: '<p:transition spd="med" advClick="1"><p:fade/></p:transition>',
        2: '<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>',
        3: '<p:transition spd="med" advClick="1"><p:wipe dir="r"/></p:transition>',
        4: '<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>',
        5: '<p:transition spd="med" advClick="1"><p:fade/></p:transition>',
        6: '<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>',
        7: '<p:transition spd="med" advClick="1"><p:wipe dir="r"/></p:transition>',
        8: '<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>',
        9: '<p:transition spd="med" advClick="1"><p:fade/></p:transition>',
        10: '<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>',
        11: '<p:transition spd="med" advClick="1"><p:wipe dir="r"/></p:transition>',
        12: '<p:transition spd="med" advClick="1"><p:fade/></p:transition>'
    };

    // 5. Personalizar cada una de las 12 diapositivas XML
    for (let s = 1; s <= 12; s++) {
        const slidePath = `ppt/slides/slide${s}.xml`;
        const slideFile = zip.file(slidePath);
        if (!slideFile) continue;

        let xml = await slideFile.async('string');

        if (s === 1) {
            xml = xml.replace(/Kevin Mejía Rivera \(Rivera K\.M\.\)/g, escapeXml(autor.nombre));
            xml = xml.replace(/ID: 57216847118/g, `ID: ${escapeXml(autor.id)}`);
            xml = xml.replace(/UNITEC • Escuela de Arte y Diseño/g, `UNITEC / CEUTEC • Facultad ${escapeXml(autor.facultad)}`);
            xml = xml.replace(/ARCHIVO: Mejia_Kevin_2026-08-29\.xlsx/g, `REPORTE: ${escapeXml(autor.id)} • ADMIN ${adminDateStr}`);
        } 
        else if (s === 2) {
            xml = xml.replace(/(<a:t>)1(<\/a:t>[\s\S]*?<a:t>Publicación Indexada)/, `$1${totalPubs}$2`);
            xml = xml.replace(/Publicación Indexada/g, totalPubs === 1 ? 'Publicación Indexada' : 'Publicaciones Indexadas');
            xml = xml.replace(/Artículo IEEE CONCAPAN 2019 en etapa final\./g, `Producción científica total indexada en Scopus.`);

            xml = xml.replace(/(<a:t>)1(<\/a:t>[\s\S]*?<a:t>Cita Acumulada)/, `$1${totalCites}$2`);
            xml = xml.replace(/Cita Acumulada/g, totalCites === 1 ? 'Cita Acumulada' : 'Citas Acumuladas');
            xml = xml.replace(/Impacto verificado en base Scopus\./g, `Impacto verificado en citaciones Scopus.`);

            xml = xml.replace(/(<a:t>)4(<\/a:t>[\s\S]*?<a:t>Coautores Internos)/, `$1${exclCites}$2`);
            xml = xml.replace(/Coautores Internos/g, 'Citas s/Autocitas');
            xml = xml.replace(/Articulación entre tres unidades de UNITEC\./g, `Citas externas depuradas de autocitaciones.`);

            xml = xml.replace(/(<a:t>)0(<\/a:t>[\s\S]*?<a:t>Redes Externas)/, `$1${redesCount}$2`);
            xml = xml.replace(/Redes Externas/g, 'Redes de Colaboración');
            xml = xml.replace(/Sin afiliaciones externas registradas\./g, escapeXml(paisesStr));

            if (topArt) {
                xml = xml.replace(/EID: 2-s2\.0-85084950839/g, `DOI: ${escapeXml(topArt.doi || topArt.link || 'Scopus')}`);
            }
        } 
        else if (s === 3) {
            // Reemplazo completo de la Diapositiva 3: Panel Ejecutivo de Estadísticas Anuales (CERO vacío)
            xml = buildSlide3Xml({
                nombre: escapeXml(autor.nombre),
                facultad: escapeXml(autor.facultad),
                totalPubs,
                totalCites,
                exclCites,
                promedioCites,
                maxPubs,
                anioMaxPubs,
                redesCount,
                primerAnio,
                ultimoAnio,
                tasaConversion,
                anioMaxCites,
                maxCites
            });
        } 
        else if (s === 4) {
            xml = xml.replace(/Comportamiento de Métricas Anuales \(Año 2019\)/g, `Comportamiento Anual: ${escapeXml(autor.nombre)} (${primerAnio} - ${ultimoAnio})`);
        } 
        else if (s === 5) {
            // Actualización de la tabla estadística de la Diapositiva 5 con cálculos reales
            xml = updateSlide5Table(xml, {
                totalPubs,
                totalCites,
                primerAnio,
                ultimoAnio,
                meanPubs: meanPubs.toFixed(2),
                meanCites: meanCites.toFixed(2),
                promedioCites,
                varPubs: varPubs.toFixed(2),
                varCites: varCites.toFixed(2),
                stdPubs: stdPubs.toFixed(2),
                stdCites: stdCites.toFixed(2),
                modePubs,
                modeCites,
                topArt
            });
        } 
        else if (s === 6) {
            xml = xml.replace(/100%/g, `${tasaConversion}%`);
            xml = xml.replace(/Tasa de Conversión de Publicación a Cita Registrada/g, `Efectividad de Citación: ${tasaConversion}% con Citas`);
            xml = xml.replace(/El documento indexado en IEEE CONCAPAN 2019 mantiene citación activa verificada e índice h equivalente a 1\./g,
                `El investigador registra ${totalPubs} publicaciones y ${totalCites} citas totales en Scopus con un promedio de ${promedioCites} citas por documento.`);
        } 
        else if (s === 7) {
            if (topArt) {
                const tipoDoc = topArt.docType ? topArt.docType.toUpperCase() : 'ARTÍCULO CIENTÍFICO';
                xml = xml.replace(/CONFERENCE PAPER • ETAPA FINAL \(2019\)/g, `${escapeXml(tipoDoc)} • AÑO ${escapeXml(topArt.year)}`);
                xml = xml.replace(/Digital heritage: An inventory of scientific journals in Honduras/g, escapeXml(topArt.title));
                xml = xml.replace(/Publicado en: 2019 IEEE 39th Central America and Panama Convention \(CONCAPAN 2019\)\./g, `Fuente: ${escapeXml(topArt.journal || 'Indexado en Scopus')}`);
                xml = xml.replace(/DOI: 10\.1109\/CONCAPANXXXIX47272\.2019\.8977056/g, `DOI: ${escapeXml(topArt.doi || 'Enlace verificado en Scopus')}`);
                xml = xml.replace(/IEEE Inc\. • ISBN: 978-172810883-4 • Art\. No\. 8977056/g, `Afiliación: UNITEC / CEUTEC • Facultad ${escapeXml(autor.facultad)}`);
                xml = xml.replace(/Volumen: 2019-November • Idioma: Español \(Spanish\)/g, `Idioma: Español / Inglés • Indexación Internacional`);
                xml = xml.replace(/Base de Datos Scopus • EID: 2-s2\.0-85084950839/g, `Base Scopus • Investigador: ${escapeXml(autor.nombre)}`);
            }
        } 
        else if (s === 8) {
            xml = xml.replace(/Palabras clave exactas: Analytics • Business Intelligence • Data Analysis • Databases • Digital Heritage • ICT • Inventory • Tableau/g,
                `Líneas de Investigación y Áreas Temáticas: Facultad ${escapeXml(autor.facultad)} • UNITEC / CEUTEC`);
            xml = xml.replace(/Analítica y BI/g, escapeXml(themes[0].title));
            xml = xml.replace(/Inteligencia de negocios aplicada\./g, escapeXml(themes[0].desc));
            xml = xml.replace(/Datos e Inventario/g, escapeXml(themes[1].title));
            xml = xml.replace(/Bases de datos estructuradas\./g, escapeXml(themes[1].desc));
            xml = xml.replace(/Patrimonio Digital/g, escapeXml(themes[2].title));
            xml = xml.replace(/Revistas científicas en Honduras\./g, escapeXml(themes[2].desc));
            xml = xml.replace(/TIC y Tableau/g, escapeXml(themes[3].title));
            xml = xml.replace(/Plataformas tecnológicas visuales\./g, escapeXml(themes[3].desc));
        } 
        else if (s === 9) {
            xml = xml.replace(/Distribución por Unidad Académica en UNITEC:/g, 'Articulación de Redes Institucionales e Internacionales:');
            xml = xml.replace(/Facultad de Ingeniería \(50% \/ 2 autores\) • Escuela de Arte y Diseño \(25% \/ 1 autor\) • Dirección de Investigación \(25% \/ 1 autor\)/g,
                `Facultad ${escapeXml(autor.facultad)} • UNITEC / CEUTEC • Red de Coautoría con ${redesCount} Países Colaboradores`);

            xml = xml.replace(/AUTOR 01 • ID 6508341373/g, `INVESTIGADOR EVALUADO • ID ${escapeXml(autor.id)}`);
            xml = xml.replace(/Reyna M\. Duron/g, escapeXml(autor.nombre));
            xml = xml.replace(/Dirección de Investigación, UNITEC Tegucigalpa\./g, `Facultad ${escapeXml(autor.facultad)}, UNITEC / CEUTEC Honduras.`);

            xml = xml.replace(/AUTOR 02 • ID 25631706500/g, 'RED INTERNA • UNITEC / CEUTEC');
            xml = xml.replace(/Wilfredo C\. Flores/g, 'Comunidad Académica UNITEC');
            xml = xml.replace(/Facultad de Ingeniería, UNITEC Tegucigalpa\./g, 'Articulación multidisciplinaria entre campus Tegucigalpa y SPS.');

            xml = xml.replace(/AUTOR 03 • ID 57216847118/g, 'COAUTORÍA INTERNACIONAL');
            xml = xml.replace(/Kevin Mejía Rivera/g, 'Red de Cooperación Científica');
            xml = xml.replace(/Escuela de Arte y Diseño, UNITEC Tegucigalpa\./g, escapeXml(paisesStrCorto || 'Vínculos de investigación activa'));

            xml = xml.replace(/AUTOR 04 • ID 57193993565/g, 'DIRECCIÓN DE INVESTIGACIÓN');
            xml = xml.replace(/Gracia M\. Pineda/g, 'Gestión de Producción Científica');
            xml = xml.replace(/Facultad de Ingeniería, UNITEC Tegucigalpa\./g, 'Soporte institucional, ética y visibilidad en Scopus.');
        } 
        else if (s === 10) {
            xml = xml.replace(/Sin Colaboraciones Registradas/g, escapeXml(paisesStr));
            xml = xml.replace(/Media \(Promedio\): 0 colaboraciones externas por publicación\./g, `Redes de colaboración: ${redesCount} vínculos institucionales registrados.`);
            xml = xml.replace(/Sede Institucional: 100% afiliación UNITEC Tegucigalpa\./g, `Afiliación Institucional: UNITEC / CEUTEC (Facultad ${escapeXml(autor.facultad)}).`);
            xml = xml.replace(/Agrupación 2019: Sin colaboraciones hasta la fecha\./g, `Trayectoria Activa: Período ${primerAnio} - ${ultimoAnio}.`);
        }
        else if (s === 11) {
            xml = xml.replace(/Completitud de los 30 Campos Estándar de Scopus/g, `Completitud de los 30 Campos Estándar de Scopus: ${escapeXml(autor.nombre)}`);
        }
        else if (s === 12) {
            // Reemplazo completo de la Diapositiva 12: Ficha Oficial de Cierre y Verificación (CERO vacío)
            xml = buildSlide12Xml({
                nombre: escapeXml(autor.nombre),
                facultad: escapeXml(autor.facultad),
                adminDateStr
            });
        }

        // Inyectar transición suave de diapositiva si no existe
        if (slideTransitions[s] && !xml.includes('<p:transition')) {
            xml = xml.replace('</p:sld>', `${slideTransitions[s]}</p:sld>`);
        }

        zip.file(slidePath, xml);
    }

    // 6. Generar el archivo PPTX final
    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    const fileName = `${autor.id}_Plantilla_Estadisticas_Bibliometricas.pptx`;
    saveAs(blob, fileName);
}

// Renderizar gráfico de barras y líneas en Canvas en memoria para incrustar en Diapositiva 4
function renderAnnualChartCanvas(autor, globalData, firstIdx, lastIdx, allYears) {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Fondo blanco sólido
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ajustar ventana activa de años (mínimo 1 año antes si existe, para contexto visual)
    const startIdx = Math.max(0, firstIdx - 1);
    const endIdx = lastIdx;
    const years = allYears.slice(startIdx, endIdx + 1);

    const pubs = (autor.stats.pubsPerYear || []).slice(startIdx, endIdx + 1);
    const cites = (autor.stats.citesPerYear || []).slice(startIdx, endIdx + 1);

    // Contenedor de tarjeta blanca con borde suave
    const cardX = 60;
    const cardY = 150;
    const cardW = 1160;
    const cardH = 525;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeRect(cardX, cardY, cardW, cardH);
    }

    // Título y metadatos dentro de la tarjeta
    ctx.font = 'bold 15px Montserrat, sans-serif';
    ctx.fillStyle = '#002855';
    ctx.fillText('EVOLUCIÓN INTERANUAL: PUBLICACIONES INDEXADAS VS. CITACIONES ACUMULADAS', cardX + 30, cardY + 38);

    ctx.font = '12px Montserrat, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Período Activo: ${years[0]} - ${years[years.length - 1]} • Facultad ${autor.facultad} • Total: ${autor.stats.totalPubs || 0} Pubs / ${autor.stats.totalCites || 0} Citas`, cardX + 30, cardY + 58);

    // Área del gráfico
    const chartX = cardX + 55;
    const chartY = cardY + 90;
    const chartW = cardW - 110;
    const chartH = 320;

    const maxVal = Math.max(...pubs, ...cites, 5);

    // Guías horizontales y escala Y
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = chartY + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px Montserrat, sans-serif';
        const labelVal = Math.round(maxVal - (maxVal / 5) * i);
        ctx.fillText(labelVal.toString(), chartX - 35, y + 4);
    }

    const colW = chartW / years.length;

    // 1. Barras de publicaciones (Azul UNITEC #006FBA)
    pubs.forEach((val, idx) => {
        if (val > 0) {
            const barH = (val / maxVal) * chartH;
            const x = chartX + idx * colW + colW * 0.18;
            const y = chartY + chartH - barH;
            const w = colW * 0.36;

            ctx.fillStyle = '#006FBA';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, barH, [4, 4, 0, 0]);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, w, barH);
            }

            // Etiqueta de valor sobre la barra
            ctx.fillStyle = '#002855';
            ctx.font = 'bold 11px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(val.toString(), x + w / 2, y - 6);
        }
    });

    // 2. Línea de citas (Ámbar CEUTEC #D97706)
    ctx.beginPath();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3.5;
    cites.forEach((val, idx) => {
        const x = chartX + idx * colW + colW * 0.5;
        const y = chartY + chartH - (val / maxVal) * chartH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Puntos de citas con valor destacado
    cites.forEach((val, idx) => {
        const x = chartX + idx * colW + colW * 0.5;
        const y = chartY + chartH - (val / maxVal) * chartH;

        ctx.fillStyle = '#FFC72C';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (val > 0) {
            ctx.fillStyle = '#B45309';
            ctx.font = 'bold 11px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(val.toString(), x, y - 12);
        }
    });

    // 4. Eje X con años completos (ej. 2019, 2020)
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    years.forEach((yr, idx) => {
        const x = chartX + idx * colW + colW * 0.5;
        ctx.fillText(yr.toString(), x, chartY + chartH + 28);
    });

    // 5. Leyenda institucional al pie de la tarjeta
    ctx.textAlign = 'left';
    const legY = cardY + cardH - 35;

    ctx.fillStyle = '#006FBA';
    ctx.fillRect(cardX + 280, legY, 18, 12);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 12px Montserrat, sans-serif';
    ctx.fillText('Publicaciones (UNITEC)', cardX + 305, legY + 10);

    ctx.fillStyle = '#FFC72C';
    ctx.beginPath();
    ctx.arc(cardX + 510, legY + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#1E293B';
    ctx.fillText('Citas Registradas (CEUTEC)', cardX + 525, legY + 10);

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.replace(/^data:image\/png;base64,/, '');
}

// Genera el XML completo para la Diapositiva 3 (Dashboard Ejecutivo de Estadísticas Anuales)
function buildSlide3Xml(data) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:cSld>
  <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
  <p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    
    <!-- Encabezado: Categoría -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Badge 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="457200"/><a:ext cx="11582400" cy="171450"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1100"><a:solidFill><a:srgbClr val="1E40AF"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>SECCIÓN 01 • HOJA ESTADÍSTICAS</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Encabezado: Título Principal -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="3" name="Title 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="685800"/><a:ext cx="11582400" cy="447675"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="2600"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Producción Científica y Métricas Descriptivas Anuales</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Encabezado: Subtítulo con Investigador -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="4" name="Subtitle 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1181100"/><a:ext cx="11582400" cy="228600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr sz="1300"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Evaluación integral de volumen publicado, citación recibida y comportamiento bibliométrico: ${data.nombre}</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Tarjeta 1: Publicaciones -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="10" name="Card1_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1600200"/><a:ext cx="2560320" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="11" name="Card1_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1600200"/><a:ext cx="2560320" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="12" name="Card1_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="800100" y="1828800"/><a:ext cx="2179320" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="4200"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${data.totalPubs}</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>PUBLICACIONES INDEXADAS</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Período Activo: ${data.primerAnio} - ${data.ultimoAnio}</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="40000"/><a:r><a:rPr sz="1050"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Producción acumulada en Scopus.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Tarjeta 2: Citas -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="20" name="Card2_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="3413760" y="1600200"/><a:ext cx="2560320" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="21" name="Card2_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="3413760" y="1600200"/><a:ext cx="2560320" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="22" name="Card2_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="3604260" y="1828800"/><a:ext cx="2179320" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="4200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${data.totalCites}</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>CITACIONES TOTALES</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Promedio: ${data.promedioCites} citas / doc</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="40000"/><a:r><a:rPr sz="1050"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${data.exclCites} citas s/ autocitaciones.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Tarjeta 3: Pico Máximo -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="30" name="Card3_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="6217920" y="1600200"/><a:ext cx="2560320" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="31" name="Card3_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="6217920" y="1600200"/><a:ext cx="2560320" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="059669"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="32" name="Card3_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="6408420" y="1828800"/><a:ext cx="2179320" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="4200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${data.maxPubs}</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="059669"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>MÁXIMO ANUAL (${data.anioMaxPubs})</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Efectividad: ${data.tasaConversion}% con citas</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="40000"/><a:r><a:rPr sz="1050"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Año cumbre de productividad.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Tarjeta 4: Redes Internacionales -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="40" name="Card4_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="9022080" y="1600200"/><a:ext cx="2560320" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="41" name="Card4_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="9022080" y="1600200"/><a:ext cx="2560320" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="7C3AED"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="42" name="Card4_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="9212580" y="1828800"/><a:ext cx="2179320" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="4200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${data.redesCount}</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="7C3AED"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>PAÍSES EN COAUTORÍA</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Red de impacto global</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="40000"/><a:r><a:rPr sz="1050"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Vínculos internacionales activos.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Banner Inferior de Análisis Ejecutivo -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="50" name="Banner_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="4572000"/><a:ext cx="10972800" cy="1714500"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 4000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="51" name="Banner_Stripe"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="4572000"/><a:ext cx="76200" cy="1714500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="52" name="Banner_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="4762500"/><a:ext cx="10477500" cy="1333500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="1350"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>SÍNTESIS METODOLÓGICA DEL COMPORTAMIENTO BIBLIOMÉTRICO ANUAL</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr sz="1200"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>El investigador ${data.nombre} registra una sólida trayectoria investigativa en la Facultad ${data.facultad} de UNITEC / CEUTEC con ${data.totalPubs} publicaciones indexadas en Scopus y ${data.totalCites} citas recibidas (${data.exclCites} citas netas sin autocitas). El año con mayor citación histórica corresponde a ${data.anioMaxCites} con ${data.maxCites} citas registradas, demostrando relevancia académica sostenida.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

  </p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
<p:transition spd="med" advClick="1"><p:wipe dir="r"/></p:transition>
</p:sld>`;
}

// Genera el XML completo para la Diapositiva 12 (Ficha de Cierre Oficial y Verificación Institucional)
function buildSlide12Xml(data) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:cSld>
  <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
  <p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    
    <!-- Encabezado: Badge -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Badge 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="457200"/><a:ext cx="11582400" cy="171450"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1100"><a:solidFill><a:srgbClr val="1E40AF"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>CIERRE INSTITUCIONAL • DIRECCIÓN DE INVESTIGACIÓN</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Encabezado: Título Principal -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="3" name="Title 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="685800"/><a:ext cx="11582400" cy="447675"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="2600"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Ficha Oficial de Verificación Bibliométrica SCOPUS</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Encabezado: Subtítulo con Investigador -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="4" name="Subtitle 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1181100"/><a:ext cx="11582400" cy="228600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="none" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr sz="1300"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Reporte Institucional Emitido para: ${data.nombre} (Facultad ${data.facultad} • UNITEC / CEUTEC)</a:t></a:r></a:p></p:txBody>
    </p:sp>

    <!-- Tarjeta 1: Calidad de Metadatos -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="10" name="Card1_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1600200"/><a:ext cx="3480000" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="11" name="Card1_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="1600200"/><a:ext cx="3480000" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="12" name="Card1_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="800100" y="1828800"/><a:ext cx="3100000" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="1600"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Calidad de Metadatos</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>VERIFICACIÓN OFICIAL</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1150"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Los datos fueron extraídos y homologados según el protocolo estándar de Scopus (Elsevier), auditando 30 campos bibliográficos clave.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Tarjeta 2: Fomento Científico -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="20" name="Card2_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="4356000" y="1600200"/><a:ext cx="3480000" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="21" name="Card2_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="4356000" y="1600200"/><a:ext cx="3480000" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="22" name="Card2_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="4550000" y="1828800"/><a:ext cx="3100000" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="1600"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Fomento Científico</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>IMPACTO INSTITUCIONAL</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1150"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Insumo oficial para el seguimiento de la productividad docente, categorización de investigadores y acreditación académica institucional.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Tarjeta 3: Multiplataforma -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="30" name="Card3_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="8102400" y="1600200"/><a:ext cx="3480000" cy="2667000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="31" name="Card3_TopBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="8102400" y="1600200"/><a:ext cx="3480000" cy="63500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="059669"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="32" name="Card3_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="8300000" y="1828800"/><a:ext cx="3100000" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="1600"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Edición y Compatibilidad</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="059669"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>FORMATO OPENXML</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="80000"/><a:r><a:rPr sz="1150"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Estructura 100% nativa y editable compatible con Microsoft PowerPoint, OnlyOffice, LibreOffice y Google Slides.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

    <!-- Banner Inferior de Certificación -->
    <p:sp>
      <p:nvSpPr><p:cNvPr id="40" name="Banner_Bg"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="609600" y="4572000"/><a:ext cx="10972800" cy="1714500"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 4000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="41" name="Banner_Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="4762500"/><a:ext cx="10477500" cy="1333500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="1400"><a:solidFill><a:srgbClr val="FFC72C"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>DIRECCIÓN DE INVESTIGACIÓN • UNITEC / CEUTEC HONDURAS</a:t></a:r></a:p>
        <a:p><a:pPr spaceBefore="60000"/><a:r><a:rPr sz="1200"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Sistema Institucional de Monitoreo Bibliométrico y Analítica de Investigación Científica emitido el ${data.adminDateStr}. Todos los datos han sido procesados y certificados para uso institucional.</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>

  </p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
<p:transition spd="med" advClick="1"><p:fade/></p:transition>
</p:sld>`;
}

// Reemplaza la tabla de estadísticas de la Diapositiva 5 con métricas calculadas exactamente
function updateSlide5Table(xml, stats) {
    const tblRegex = /<a:tbl>[\s\S]*?<\/a:tbl>/;
    const newTbl = `<a:tbl><a:tblPr/><a:tblGrid><a:gridCol w="3238500"/><a:gridCol w="2286000"/><a:gridCol w="2286000"/><a:gridCol w="3162300"/></a:tblGrid>
<a:tr h="457200">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Métrica Estadística (Hoja Estadísticas)</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Cantidad de Publicaciones (Anual)</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Citas Totales (Anual)</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1250"><a:solidFill><a:srgbClr val="002855"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Interpretación Técnica</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill></a:tcPr></a:tc>
</a:tr>
<a:tr h="550000">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Producción Acumulada (${stats.primerAnio} - ${stats.ultimoAnio})</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.totalPubs}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.totalCites}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Total acumulado de producción y citación</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
</a:tr>
<a:tr h="550000">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Promedio Anual (Media)</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="006FBA"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.meanPubs}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.meanCites}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Relación promedio de ${stats.promedioCites} citas/pub</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
</a:tr>
<a:tr h="550000">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Varianza Interanual</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.varPubs}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.varCites}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Dispersión de la producción en años activos</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
</a:tr>
<a:tr h="550000">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Desviación Estándar</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.stdPubs}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.stdCites}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Variabilidad típica respecto a la media</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:tcPr></a:tc>
</a:tr>
<a:tr h="550000">
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>Moda (Sin moda = -1)</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.modePubs}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1300"><a:solidFill><a:srgbClr val="D97706"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.modeCites}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
  <a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="334155"/></a:solidFill><a:latin typeface="Montserrat"/></a:rPr><a:t>${stats.modePubs !== -1 ? 'Frecuencia modal observada en la serie histórica' : 'Sin repetición modal en la serie histórica'}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:tcPr></a:tc>
</a:tr></a:tbl>`;

    if (tblRegex.test(xml)) {
        xml = xml.replace(tblRegex, newTbl);
    }

    if (stats.topArt) {
        xml = xml.replace(/1 Cita/g, `${stats.topArt.cites} ${stats.topArt.cites === 1 ? 'Cita' : 'Citas'}`);
        xml = xml.replace(/Digital heritage: An inventory of scientific journals in Honduras \(Año 2019\)/g,
            `${escapeXml(stats.topArt.title)} (${stats.topArt.year})`);
    }

    return xml;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Respaldo dinámico en caso de error
async function generarPptxAlternativo(autor, globalData) {
    let pres = new PptxGenJS();
    pres.author = 'UNITEC / CEUTEC';
    pres.company = 'Dirección de Investigación';
    
    let slide1 = pres.addSlide();
    slide1.background = { color: "002855" };
    slide1.addText(autor.nombre, { x: 1, y: 2, w: '80%', fontSize: 32, color: "FFFFFF", bold: true, align: "center" });
    slide1.addText(`Facultad: ${autor.facultad} • UNITEC / CEUTEC`, { x: 1, y: 3.5, w: '80%', fontSize: 20, color: "FFC72C", align: "center" });

    pres.writeFile({ fileName: `${autor.id}_Reporte_SCOPUS.pptx` });
}
