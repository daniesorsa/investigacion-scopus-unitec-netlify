// charts.js - Lógica de Gráficas (ECharts)

let timelineChart;
let countriesChart;

const UNITEC_NAVY = '#002855';
const UNITEC_BLUE = '#006FBA';
const UNITEC_RED = '#DA291C';
const CEUTEC_GOLD = '#FFC72C';

function initCharts() {
    timelineChart = echarts.init(document.getElementById('timeline-chart'));
    countriesChart = echarts.init(document.getElementById('countries-chart'));

    // Responsive charts on window resize
    window.addEventListener('resize', () => {
        timelineChart.resize();
        countriesChart.resize();
    });
}

function updateTimelineChart(timelineData) {
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            data: ['Publicaciones', 'Citas']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: timelineData.years,
            axisLabel: {
                rotate: 45
            }
        },
        yAxis: [
            {
                type: 'value',
                name: 'Pubs',
                position: 'left',
                axisLine: {
                    show: true,
                    lineStyle: { color: UNITEC_BLUE }
                }
            },
            {
                type: 'value',
                name: 'Citas',
                position: 'right',
                axisLine: {
                    show: true,
                    lineStyle: { color: CEUTEC_GOLD }
                }
            }
        ],
        series: [
            {
                name: 'Publicaciones',
                type: 'bar',
                data: timelineData.publicaciones,
                itemStyle: { color: UNITEC_BLUE }
            },
            {
                name: 'Citas',
                type: 'line',
                yAxisIndex: 1,
                data: timelineData.citas,
                itemStyle: { color: CEUTEC_GOLD },
                lineStyle: { width: 3 },
                symbolSize: 8
            }
        ]
    };
    timelineChart.setOption(option);
}

function updateCountriesChart(paisesData) {
    // Sort and get top 10
    const sorted = Object.entries(paisesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reverse(); // reverse for horizontal bar chart

    const countries = sorted.map(item => item[0]);
    const counts = sorted.map(item => item[1]);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01]
        },
        yAxis: {
            type: 'category',
            data: countries
        },
        series: [
            {
                name: 'Colaboraciones',
                type: 'bar',
                data: counts,
                itemStyle: { color: UNITEC_RED },
                label: {
                    show: true,
                    position: 'right'
                }
            }
        ]
    };
    countriesChart.setOption(option);
}
