// i18n.js - Traducción de nombres de países (Scopus los entrega en inglés)
// Si aparece un país nuevo en los datos que no esté aquí, se mostrará en inglés:
// basta con agregarlo a este diccionario.

const PAISES_ES = {
    'Albania': 'Albania', 'Argentina': 'Argentina', 'Armenia': 'Armenia', 'Australia': 'Australia',
    'Austria': 'Austria', 'Barbados': 'Barbados', 'Belgium': 'Bélgica', 'Bolivia': 'Bolivia',
    'Brazil': 'Brasil', 'Canada': 'Canadá', 'Chile': 'Chile', 'China': 'China',
    'Colombia': 'Colombia', 'Costa Rica': 'Costa Rica', 'Croatia': 'Croacia', 'Cuba': 'Cuba',
    'Czech Republic': 'República Checa', 'Denmark': 'Dinamarca', 'Dominican Republic': 'República Dominicana',
    'Ecuador': 'Ecuador', 'Egypt': 'Egipto', 'El Salvador': 'El Salvador', 'Ethiopia': 'Etiopía',
    'Finland': 'Finlandia', 'France': 'Francia', 'Gabon': 'Gabón', 'Georgia': 'Georgia',
    'Germany': 'Alemania', 'Ghana': 'Ghana', 'Greece': 'Grecia', 'Guatemala': 'Guatemala',
    'Honduras': 'Honduras', 'Hong Kong': 'Hong Kong', 'Hungary': 'Hungría', 'Iceland': 'Islandia',
    'India': 'India', 'Indonesia': 'Indonesia', 'Iran': 'Irán', 'Ireland': 'Irlanda',
    'Israel': 'Israel', 'Italy': 'Italia', 'Jamaica': 'Jamaica', 'Japan': 'Japón',
    'Kazakhstan': 'Kazajistán', 'Kyrgyzstan': 'Kirguistán', 'Lebanon': 'Líbano', 'Luxembourg': 'Luxemburgo',
    'Malaysia': 'Malasia', 'Mexico': 'México', 'Mongolia': 'Mongolia', 'Morocco': 'Marruecos',
    'Nepal': 'Nepal', 'Netherlands': 'Países Bajos', 'New Zealand': 'Nueva Zelanda', 'Nicaragua': 'Nicaragua',
    'Nigeria': 'Nigeria', 'Norway': 'Noruega', 'Pakistan': 'Pakistán', 'Panama': 'Panamá',
    'Paraguay': 'Paraguay', 'Peru': 'Perú', 'Philippines': 'Filipinas', 'Poland': 'Polonia',
    'Portugal': 'Portugal', 'Puerto Rico': 'Puerto Rico', 'Russian Federation': 'Rusia', 'Saudi Arabia': 'Arabia Saudita',
    'Singapore': 'Singapur', 'Slovakia': 'Eslovaquia', 'Slovenia': 'Eslovenia', 'South Africa': 'Sudáfrica',
    'South Korea': 'Corea del Sur', 'Spain': 'España', 'Sri Lanka': 'Sri Lanka', 'Sudan': 'Sudán',
    'Sweden': 'Suecia', 'Switzerland': 'Suiza', 'Taiwan': 'Taiwán', 'Tajikistan': 'Tayikistán',
    'Thailand': 'Tailandia', 'Tunisia': 'Túnez', 'Turkey': 'Turquía', 'United Arab Emirates': 'Emiratos Árabes Unidos',
    'United Kingdom': 'Reino Unido', 'United States': 'Estados Unidos', 'Uruguay': 'Uruguay', 'Venezuela': 'Venezuela',
    'Viet Nam': 'Vietnam', 'Zambia': 'Zambia'
};

function paisES(nombre) {
    return PAISES_ES[nombre] || nombre;
}
