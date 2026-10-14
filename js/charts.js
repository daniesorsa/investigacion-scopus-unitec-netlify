// charts.js - Lógica de Gráficas (ECharts)

let timelineChart;
let countriesChart;
let lastTimelineData = null;
let lastPaisesData = null;

const UNITEC_NAVY = '#002855';
const UNITEC_BLUE = '#006FBA';
const UNITEC_RED = '#DA291C';
const CEUTEC_GOLD = '#FFC72C';

// Paleta de texto según el tema (evita textos ilegibles en modo oscuro)
function chartTheme() {
    const dark = document.documentElement.classList.contains('dark');
    return {
        text: dark ? '#E5E7EB' : '#374151',
        muted: dark ? '#9CA3AF' : '#6B7280',
        grid: dark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        tooltipBg: dark ? '#1F2937' : '#FFFFFF',
        tooltipBorder: dark ? '#374151' : '#E5E7EB',
        blue: dark ? '#60A5FA' : UNITEC_BLUE,
        gold: dark ? CEUTEC_GOLD : '#D97706',
        red: dark ? '#F87171' : UNITEC_RED
    };
}

function baseTooltip(t, trigger, pointer) {
    return {
        trigger,
        axisPointer: { type: pointer },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text, fontFamily: 'Montserrat' }
    };
}

function initCharts() {
    const common = { renderer: 'canvas' };
    timelineChart = echarts.init(document.getElementById('timeline-chart'), null, common);
    countriesChart = echarts.init(document.getElementById('countries-chart'), null, common);

    window.addEventListener('resize', () => {
        timelineChart.resize();
        countriesChart.resize();
    });
}

function updateTimelineChart(timelineData) {
    lastTimelineData = timelineData;
    const t = chartTheme();
    const option = {
        textStyle: { fontFamily: 'Montserrat' },
        animationDuration: 900,
        animationDurationUpdate: 700,
        animationEasing: 'cubicOut',
        animationDelay: idx => idx * 30,
        tooltip: baseTooltip(t, 'axis', 'cross'),
        legend: { data: ['Publicaciones', 'Citas'], textStyle: { color: t.text } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: timelineData.years,
            axisLabel: { rotate: 45, color: t.muted },
            axisLine: { lineStyle: { color: t.grid } }
        },
        yAxis: [
            {
                type: 'value', name: 'Publicaciones', position: 'left',
                nameTextStyle: { color: t.muted },
                axisLabel: { color: t.muted },
                splitLine: { lineStyle: { color: t.grid } },
                axisLine: { show: true, lineStyle: { color: t.blue } }
            },
            {
                type: 'value', name: 'Citas', position: 'right',
                nameTextStyle: { color: t.muted },
                axisLabel: { color: t.muted },
                splitLine: { show: false },
                axisLine: { show: true, lineStyle: { color: t.gold } }
            }
        ],
        series: [
            {
                name: 'Publicaciones',
                type: 'bar',
                data: timelineData.publicaciones,
                itemStyle: { color: t.blue, borderRadius: [4, 4, 0, 0] },
                emphasis: { focus: 'series' }
            },
            {
                name: 'Citas',
                type: 'line',
                smooth: true,
                yAxisIndex: 1,
                data: timelineData.citas,
                itemStyle: { color: t.gold },
                lineStyle: { width: 3 },
                areaStyle: { color: t.gold, opacity: 0.12 },
                symbolSize: 7
            }
        ]
    };
    timelineChart.setOption(option, true);
}

function updateCountriesChart(paisesData) {
    lastPaisesData = paisesData;
    const t = chartTheme();
    const sorted = Object.entries(paisesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reverse(); // invertido para barras horizontales

    const countries = sorted.map(item => paisES(item[0]));
    const counts = sorted.map(item => item[1]);

    const option = {
        textStyle: { fontFamily: 'Montserrat' },
        animationDuration: 900,
        animationDurationUpdate: 700,
        animationEasing: 'cubicOut',
        animationDelay: idx => (counts.length - idx) * 50,
        tooltip: baseTooltip(t, 'axis', 'shadow'),
        grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01],
            axisLabel: { color: t.muted },
            splitLine: { lineStyle: { color: t.grid } }
        },
        yAxis: {
            type: 'category',
            data: countries,
            axisLabel: { color: t.text },
            axisLine: { lineStyle: { color: t.grid } }
        },
        series: [
            {
                name: 'Colaboraciones',
                type: 'bar',
                data: counts,
                itemStyle: { color: t.red, borderRadius: [0, 4, 4, 0] },
                label: {
                    show: true,
                    position: 'right',
                    color: t.text,
                    fontWeight: 600,
                    // Sin contorno: ECharts lo agrega por defecto y se veía mal
                    textBorderWidth: 0,
                    textShadowBlur: 0
                }
            }
        ]
    };
    countriesChart.setOption(option, true);
}

// Repinta las gráficas con la paleta del tema actual
function refreshChartsTheme() {
    if (lastTimelineData) updateTimelineChart(lastTimelineData);
    if (lastPaisesData) updateCountriesChart(lastPaisesData);
}
