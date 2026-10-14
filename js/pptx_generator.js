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
    const promedioCites = autor.stats.citePromedio !== undefined ? autor.stats.citePromedio.toFixed(2) : '0.00';
    const redesCount = autor.stats.redesColaboracion || Object.keys(autor.paisesColaboracion || {}).length;

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

    // Tasa de efectividad de citación (% de artículos con al menos 1 cita)
    const pubsConCitas = articulos.filter(a => (a.cites || 0) > 0).length;
    const tasaConversion = totalPubs > 0 ? Math.round((pubsConCitas / totalPubs) * 100) : 0;

    // 3. Generar imagen del gráfico anual personalizado para la Diapositiva 4
    try {
        const chartBase64 = renderAnnualChartCanvas(autor, globalData);
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

        // Reemplazos específicos por diapositiva
        if (s === 1) {
            xml = xml.replace(/Kevin Mejía Rivera \(Rivera K\.M\.\)/g, escapeXml(autor.nombre));
            xml = xml.replace(/ID: 57216847118/g, `ID: ${escapeXml(autor.id)}`);
            xml = xml.replace(/UNITEC • Escuela de Arte y Diseño/g, `UNITEC / CEUTEC • Facultad ${escapeXml(autor.facultad)}`);
            xml = xml.replace(/ARCHIVO: Mejia_Kevin_2026-08-29\.xlsx/g, `REPORTE: ${escapeXml(autor.id)} • ADMIN ${adminDateStr}`);
        } else if (s === 2) {
            // Reemplazo de los 4 números de KPIs principales
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
        } else if (s === 3) {
            xml = xml.replace(/Producción Científica y Métricas Descriptivas Anuales/g, `Producción y Métricas: ${escapeXml(autor.nombre)}`);
        } else if (s === 4) {
            xml = xml.replace(/Comportamiento de Métricas Anuales \(Año 2019\)/g, `Comportamiento Anual: ${escapeXml(autor.nombre)} (${autor.anioInicio || 2006} - ${autor.anioFin || 2026})`);
        } else if (s === 5) {
            xml = xml.replace(/Producción y Citas \(Año 2019\)/g, `Producción Total (${escapeXml(autor.nombre)})`);
            xml = xml.replace(/Relación 1\.0 citas por publicación/g, `Promedio de ${promedioCites} citas por publicación`);
            xml = xml.replace(/Año activo único registrado/g, `Total: ${totalPubs} publicaciones y ${totalCites} citas`);
            xml = xml.replace(/1 Cita/g, topArt ? `${topArt.cites} ${topArt.cites === 1 ? 'Cita' : 'Citas'}` : '0 Citas');
            if (topArt) {
                xml = xml.replace(/Digital heritage: An inventory of scientific journals in Honduras \(Año 2019\)/g, `${escapeXml(topArt.title)} (${topArt.year})`);
            }
        } else if (s === 6) {
            xml = xml.replace(/100%/g, `${tasaConversion}%`);
            xml = xml.replace(/Tasa de Conversión de Publicación a Cita Registrada/g, `Efectividad de Citación: ${tasaConversion}% con Citas`);
            xml = xml.replace(/El documento indexado en IEEE CONCAPAN 2019 mantiene citación activa verificada e índice h equivalente a 1\./g,
                `El investigador registra ${totalPubs} publicaciones y ${totalCites} citas totales en Scopus con un promedio de ${promedioCites} citas por documento.`);
        } else if (s === 7) {
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
        } else if (s === 8) {
            xml = xml.replace(/Palabras clave exactas: Analytics • Business Intelligence • Data Analysis • Databases • Digital Heritage • ICT • Inventory • Tableau/g,
                `Líneas de Investigación y Áreas Temáticas: Facultad ${escapeXml(autor.facultad)} • UNITEC / CEUTEC`);
        } else if (s === 9) {
            xml = xml.replace(/Kevin Mejía Rivera/g, escapeXml(autor.nombre));
            xml = xml.replace(/Escuela de Arte y Diseño, UNITEC Tegucigalpa\./g, `Facultad ${escapeXml(autor.facultad)}, UNITEC / CEUTEC Tegucigalpa.`);
        } else if (s === 10) {
            xml = xml.replace(/Sin Colaboraciones Registradas/g, escapeXml(paisesStr));
            xml = xml.replace(/Media \(Promedio\): 0 colaboraciones externas por publicación\./g, `Redes de colaboración: ${redesCount} vínculos institucionales registrados.`);
            xml = xml.replace(/Sede Institucional: 100% afiliación UNITEC Tegucigalpa\./g, `Afiliación Institucional: UNITEC / CEUTEC (Facultad ${escapeXml(autor.facultad)}).`);
        }

        // Inyectar transición suave de diapositiva
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
function renderAnnualChartCanvas(autor, globalData) {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título institucional
    ctx.font = 'bold 28px Montserrat, sans-serif';
    ctx.fillStyle = '#002855';
    ctx.fillText(`Evolución Histórica: ${autor.nombre}`, 60, 60);

    ctx.font = '16px Montserrat, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Producción Científica vs. Citas Totales por Año (Facultad ${autor.facultad})`, 60, 95);

    // Datos anuales
    const years = globalData && globalData.timelineGlobal && globalData.timelineGlobal.years 
        ? globalData.timelineGlobal.years 
        : [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

    const pubs = (autor.stats.pubsPerYear || []).slice(0, years.length);
    const cites = (autor.stats.citesPerYear || []).slice(0, years.length);

    const maxVal = Math.max(...pubs, ...cites, 5);

    const chartX = 100;
    const chartY = 140;
    const chartW = 1080;
    const chartH = 480;

    // Ejes y líneas guía
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = chartY + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px Montserrat, sans-serif';
        const labelVal = Math.round(maxVal - (maxVal / 5) * i);
        ctx.fillText(labelVal.toString(), chartX - 45, y + 4);
    }

    const colW = chartW / years.length;

    // Barras de publicaciones (Azul UNITEC #006FBA)
    pubs.forEach((val, idx) => {
        if (val > 0) {
            const barH = (val / maxVal) * chartH;
            const x = chartX + idx * colW + colW * 0.15;
            const y = chartY + chartH - barH;
            const w = colW * 0.4;

            ctx.fillStyle = '#006FBA';
            ctx.fillRect(x, y, w, barH);
        }
    });

    // Línea de citas (Dorado CEUTEC / Ámbar #D97706)
    ctx.beginPath();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    cites.forEach((val, idx) => {
        const x = chartX + idx * colW + colW * 0.5;
        const y = chartY + chartH - (val / maxVal) * chartH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Puntos de citas
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
    });

    // Etiquetas de años en el eje X
    ctx.fillStyle = '#475569';
    ctx.font = '12px Montserrat, sans-serif';
    years.forEach((yr, idx) => {
        const x = chartX + idx * colW + colW * 0.2;
        ctx.fillText(yr.toString().slice(2), x, chartY + chartH + 30);
    });

    // Leyenda institucional
    ctx.fillStyle = '#006FBA';
    ctx.fillRect(chartX + 350, chartY + chartH + 60, 20, 12);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 14px Montserrat, sans-serif';
    ctx.fillText('Publicaciones (UNITEC)', chartX + 380, chartY + chartH + 71);

    ctx.fillStyle = '#FFC72C';
    ctx.beginPath();
    ctx.arc(chartX + 600, chartY + chartH + 66, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E293B';
    ctx.fillText('Citas Totales (CEUTEC)', chartX + 615, chartY + chartH + 71);

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.replace(/^data:image\/png;base64,/, '');
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
