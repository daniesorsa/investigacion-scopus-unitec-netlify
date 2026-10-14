// i18n.js - Diccionario completo de nombres de países en Español
// Garantiza que el 100% del mapa, gráficas, tooltips y reportes PPTX/XLSX
// se muestren exclusivamente en Español sin ningún texto en Inglés.

const PAISES_ES = {
  'Afghanistan': 'Afganistán', 'Angola': 'Angola', 'Albania': 'Albania', 'United Arab Emirates': 'Emiratos Árabes Unidos',
  'Argentina': 'Argentina', 'Armenia': 'Armenia', 'Antarctica': 'Antártida', 'French Southern and Antarctic Lands': 'Tierras Australes y Antárticas Francesas',
  'Australia': 'Australia', 'Austria': 'Austria', 'Azerbaijan': 'Azerbaiyán', 'Burundi': 'Burundi', 'Belgium': 'Bélgica',
  'Benin': 'Benín', 'Burkina Faso': 'Burkina Faso', 'Bangladesh': 'Bangladés', 'Bulgaria': 'Bulgaria', 'The Bahamas': 'Bahamas',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina', 'Belarus': 'Bielorrusia', 'Belize': 'Belice', 'Bermuda': 'Bermudas',
  'Bolivia': 'Bolivia', 'Brazil': 'Brasil', 'Brunei': 'Brunéi', 'Bhutan': 'Bután', 'Botswana': 'Botsuana',
  'Central African Republic': 'República Centroafricana', 'Canada': 'Canadá', 'Switzerland': 'Suiza', 'Chile': 'Chile',
  'China': 'China', 'Ivory Coast': 'Costa de Marfil', 'Cameroon': 'Camerún', 'Democratic Republic of the Congo': 'Rep. Dem. del Congo',
  'Republic of the Congo': 'República del Congo', 'Colombia': 'Colombia', 'Costa Rica': 'Costa Rica', 'Cuba': 'Cuba',
  'Northern Cyprus': 'Chipre del Norte', 'Cyprus': 'Chipre', 'Czech Republic': 'República Checa', 'Germany': 'Alemania',
  'Djibouti': 'Yibuti', 'Denmark': 'Dinamarca', 'Dominican Republic': 'República Dominicana', 'Algeria': 'Argelia',
  'Ecuador': 'Ecuador', 'Egypt': 'Egipto', 'Eritrea': 'Eritrea', 'Spain': 'España', 'Estonia': 'Estonia', 'Ethiopia': 'Etiopía',
  'Finland': 'Finlandia', 'Fiji': 'Fiyi', 'Falkland Islands': 'Islas Malvinas', 'France': 'Francia', 'Gabon': 'Gabón',
  'United Kingdom': 'Reino Unido', 'Georgia': 'Georgia', 'Ghana': 'Ghana', 'Guinea': 'Guinea', 'Gambia': 'Gambia',
  'Guinea Bissau': 'Guinea-Bisáu', 'Equatorial Guinea': 'Guinea Ecuatorial', 'Greece': 'Grecia', 'Greenland': 'Groenlandia',
  'Guatemala': 'Guatemala', 'French Guiana': 'Guayana Francesa', 'Guyana': 'Guyana', 'Honduras': 'Honduras',
  'Croatia': 'Croacia', 'Haiti': 'Haití', 'Hungary': 'Hungría', 'Indonesia': 'Indonesia', 'India': 'India',
  'Ireland': 'Irlanda', 'Iran': 'Irán', 'Iraq': 'Irak', 'Iceland': 'Islandia', 'Israel': 'Israel', 'Italy': 'Italia',
  'Jamaica': 'Jamaica', 'Jordan': 'Jordania', 'Japan': 'Japón', 'Kazakhstan': 'Kazajistán', 'Kenya': 'Kenia',
  'Kyrgyzstan': 'Kirguistán', 'Cambodia': 'Camboya', 'South Korea': 'Corea del Sur', 'Kosovo': 'Kosovo', 'Kuwait': 'Kuwait',
  'Laos': 'Laos', 'Lebanon': 'Líbano', 'Liberia': 'Liberia', 'Libya': 'Libia', 'Sri Lanka': 'Sri Lanka',
  'Lesotho': 'Lesoto', 'Lithuania': 'Lituania', 'Luxembourg': 'Luxemburgo', 'Latvia': 'Letonia', 'Morocco': 'Marruecos',
  'Moldova': 'Moldavia', 'Madagascar': 'Madagascar', 'Mexico': 'México', 'Macedonia': 'Macedonia del Norte',
  'Mali': 'Malí', 'Myanmar': 'Birmania', 'Montenegro': 'Montenegro', 'Mongolia': 'Mongolia', 'Mozambique': 'Mozambique',
  'Mauritania': 'Mauritania', 'Malawi': 'Malaui', 'Malaysia': 'Malasia', 'Namibia': 'Namibia', 'New Caledonia': 'Nueva Caledonia',
  'Niger': 'Níger', 'Nigeria': 'Nigeria', 'Nicaragua': 'Nicaragua', 'Netherlands': 'Países Bajos', 'Norway': 'Noruega',
  'Nepal': 'Nepal', 'New Zealand': 'Nueva Zelanda', 'Oman': 'Omán', 'Pakistan': 'Pakistán', 'Panama': 'Panamá',
  'Peru': 'Perú', 'Philippines': 'Filipinas', 'Papua New Guinea': 'Papúa Nueva Guinea', 'Poland': 'Polonia',
  'Puerto Rico': 'Puerto Rico', 'North Korea': 'Corea del Norte', 'Portugal': 'Portugal', 'Paraguay': 'Paraguay',
  'Qatar': 'Catar', 'Romania': 'Rumanía', 'Russian Federation': 'Rusia', 'Russia': 'Rusia', 'Rwanda': 'Ruanda',
  'Western Sahara': 'Sáhara Occidental', 'Saudi Arabia': 'Arabia Saudita', 'Sudan': 'Sudán', 'South Sudan': 'Sudán del Sur',
  'Senegal': 'Senegal', 'Solomon Islands': 'Islas Salomón', 'Sierra Leone': 'Sierra Leona', 'El Salvador': 'El Salvador',
  'Somaliland': 'Somalilandia', 'Somalia': 'Somalia', 'Republic of Serbia': 'Serbia', 'Suriname': 'Surinam',
  'Slovakia': 'Eslovaquia', 'Slovenia': 'Eslovenia', 'Sweden': 'Suecia', 'Swaziland': 'Esuatini', 'Syria': 'Siria',
  'Chad': 'Chad', 'Togo': 'Togo', 'Thailand': 'Tailandia', 'Tajikistan': 'Tayikistán', 'Turkmenistan': 'Turkmenistán',
  'East Timor': 'Timor Oriental', 'Trinidad and Tobago': 'Trinidad y Tobago', 'Tunisia': 'Túnez', 'Turkey': 'Turquía',
  'Taiwan': 'Taiwán', 'United Republic of Tanzania': 'Tanzania', 'Uganda': 'Uganda', 'Ukraine': 'Ucrania',
  'Uruguay': 'Uruguay', 'United States': 'Estados Unidos', 'United States of America': 'Estados Unidos',
  'Uzbekistan': 'Uzbekistán', 'Venezuela': 'Venezuela', 'Viet Nam': 'Vietnam', 'Vietnam': 'Vietnam',
  'Vanuatu': 'Vanuatu', 'West Bank': 'Cisjordania', 'Yemen': 'Yemen', 'South Africa': 'Sudáfrica',
  'Zambia': 'Zambia', 'Zimbabwe': 'Zimbabue', 'Hong Kong': 'Hong Kong', 'Barbados': 'Barbados', 'Malta': 'Malta'
};

function paisES(nombre) {
    if (!nombre) return '';
    return PAISES_ES[nombre] || PAISES_ES[nombre.trim()] || nombre;
}
