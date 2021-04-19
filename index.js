(async() => {
    const provide = (map, key, computer) => {
        const value = map.get(key);
        if (value !== undefined) return value;
        const newValue = computer();
        map.set(key, newValue);
        return newValue;
    };

    const enqueued = fn => {
        let promise = Promise.resolve();
        let lastContext = { cancelled: false };
        return () => {
            lastContext.cancelled = true;
            lastContext = { cancelled: false };
            promise = promise.then(() => fn(lastContext)).catch(e => console.error(e.stack));
        }
    }

    const index = await (await fetch("results/index.txt")).text();

    const testCases = new Map();
    const allScenariosSet = new Set();
    const allDatesSet = new Set();

    for(const indexLine of index.split("\n")) {
        const match = /^([^/]+)\/([^_]+)_(.+).json/.exec(indexLine);
        if(!match) continue;
        const testCase = match[2];
        const scenario = match[3];
        allScenariosSet.add(scenario);
        const date = match[1];
        const scenarios = provide(testCases, testCase, () => new Map());
        const dates = provide(scenarios, scenario, () => []);
        dates.push(date),
        dates.sort();
        allDatesSet.add(date);
    }

    const allDates = Array.from(allDatesSet).sort();
    const allScenarios = Array.from(allScenariosSet).sort();

    const caseSelect = document.querySelector("#case-select");
    const compareCaseSelect = document.querySelector("#compare-case-select");
    const scenarioSelect = document.querySelector("#scenario-select");
    const compareScenarioSelect = document.querySelector("#compare-scenario-select");
    const metricSelect = document.querySelector("#metric-select");
    const compareMetricSelect = document.querySelector("#compare-metric-select");

    const chart = new Chart("chart", {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0,
            spanGaps: true,
            scales: {
                yAxes: [{
                    id: 'time-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            if(values[0] > 10000) return `${value / 1000} s`;
                            return `${value} ms`;
                        },
                        beginAtZero: true
                    }
                }, {
                    id: 'size-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            if(values[0] > 10000000) return `${value / 1000000} MB`;
                            if(values[0] > 10000) return `${value / 1000} kB`;
                            return `${value} B`;
                        },
                        beginAtZero: true
                    }
                }, {
                    id: 'memory-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            if(values[0] > 10000000) return `${value / 1000000} MB`;
                            if(values[0] > 10000) return `${value / 1000} kB`;
                            return `${value} B`;
                        },
                        beginAtZero: true
                    }
                }, {
                    id: 'percentage-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            if(value < 100) return `${value} %`;
                            if(value > 100) return `+${value - 100} %`;
                            return `current`;
                        },
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    type: 'time',
                    ticks: {
                        min: new Date("2020-01-01"),
                        max: new Date()
                    },
                    time: {
                        unit: 'day'
                    }
                }]
            }
        }
    });

    let percentage = false;
    document.querySelector("#relative").addEventListener("change", e => {
        for(const axis of chart.options.scales.yAxes) {
            axis.ticks.beginAtZero = !e.target.checked;
        }
        chart.update();
    });
    document.querySelector("#recent").addEventListener("change", e => {
        const axisTicks = chart.options.scales.xAxes[0].ticks;
        axisTicks.min = e.target.checked ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000): new Date("2020-01-01");
        update();
    });
    document.querySelector("#percentage").addEventListener("change", e => {
        percentage = e.target.checked;
        update();
    });

    while(caseSelect.hasChildNodes()) caseSelect.removeChild(caseSelect.firstChild);
    for(const testCase of testCases.keys()) {
        const option = document.createElement("option");
        option.innerText = option.value = testCase;
        caseSelect.appendChild(option);
        compareCaseSelect.appendChild(option.cloneNode(true));
    }
    {
        const option = document.createElement("option");
        option.innerText = option.value = "all";
        caseSelect.appendChild(option);
    }

    while(scenarioSelect.hasChildNodes()) scenarioSelect.removeChild(scenarioSelect.firstChild);
    for(const scenario of allScenarios) {
        const option = document.createElement("option");
        option.innerText = option.value = scenario;
        scenarioSelect.appendChild(option);
        compareScenarioSelect.appendChild(option.cloneNode(true));
    }

    const updateChart = (inputDatasets) => {
        const datasets = [];
        const min = chart.options.scales.xAxes[0].ticks.min;
        const oldDatasets = chart.data.datasets.reverse();
        let i = 0;
        for(const ds of inputDatasets) {
            const base = ds.entries.reduce((sum, entry) => sum + (entry.data && entry.data.base), 0) / ds.entries.length;
            const lastEntry = ds.entries[ds.entries.length - 1];
            if(isNaN(base)) continue;
            const sizeType = / size$/.test(ds.name)
            const memoryType = / memory$/.test(ds.name)
            let scale = sizeType || memoryType ? () => 1 : entry => base / entry.data.base;
            if(percentage) {
                const old = scale;
                scale = (entry, fn) => old(entry, fn) / (fn(lastEntry) * old(lastEntry, fn)) * 100
            }
            const style = {
                cubicInterpolationMode: "monotone",
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ][i % 6],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ][i % 6],
                borderWidth: 1
            }
            const createDataset = (label, fn) => {
                let lastValidEntry;
                return Object.assign(oldDatasets.pop() || {}, {
                    label,
                    yAxisID: percentage ? "percentage-axis" : sizeType ? "size-axis" : memoryType ? "memory-axis" : "time-axis",
                    data: allDates.slice().reverse().map(date => {
                        const outside = new Date(date).getTime() < min.getTime();
                        let entry = ds.entries.find(entry => entry.date === date);
                        if(outside && lastValidEntry && entry) entry = lastValidEntry;
                        const x = new Date(date);
                        if(entry) {
                            if(!lastValidEntry || !outside) lastValidEntry = entry;
                            return { x, y: fn(entry) * scale(entry, fn) };
                        } else {
                            return { x, y: undefined };
                        }
                    }),
                    ...style
                })
            }
            const datasetLow = createDataset(ds.name + " (low)", entry => entry.data.low);
            const datasetHigh = createDataset(ds.name + " (high)", entry => entry.data.high);
            datasets.push(datasetLow);
            datasets.push(datasetHigh);
            i++;
        }
        Object.assign(chart.data, {
            datasets
        });
        chart.update();
    }

    const cache = new Map();
    const loadFile = (filename) => {
        const cacheEntry = cache.get(filename);
        if(cacheEntry) return cacheEntry;
        const promise = (async () => {
            const data = await (await fetch(filename)).json();
            let totalSize = { base: 0, low: 0, high: 0 };
            let totalGzipSize = { base: 0, low: 0, high: 0 };
            const add = (a, b) => {
                a.base += b.base;
                a.low += b.low;
                a.high += b.high;
            }
            for(const key of Object.keys(data)) {
                if(key.endsWith("gzip size")) {
                    add(totalGzipSize, data[key]);
                } else if(key.endsWith(" size")) {
                    add(totalSize, data[key]);
                }
            }
            data["total size"] = totalSize;
            data["total gzip size"] = totalGzipSize;
            return data;
        })();
        cache.set(filename, promise);
        return promise;
    }

    const loadData = async (testCase, scenario, metric) => {
        const scenarios = testCases.get(testCase);
        if(!scenarios) return;
        const dates = scenarios.get(scenario);
        if(!dates) return;
        const metrics = new Set();
        const entries = (await Promise.all(dates.map(async date => {
            const data = await loadFile(`results/${date}/${testCase}_${scenario}.json`);
            for(const m of Object.keys(data)) metrics.add(m)
            return {
                date,
                data: data[metric]
            };
        }))).filter(entry => entry.data !== undefined);
        return {
            datasets: [{ name: `${testCase} ${scenario} ${metric}`, entries}],
            metrics
        }
    }
    
    const update = enqueued(async (ctx) => {
        const datasetsForChart = [];
        const chartIt = ds => datasetsForChart.push(ds);

        for(const testCase of caseSelect.value === "all" ? testCases.keys() : [caseSelect.value]) {
            const scenario = scenarioSelect.value;
            const metric = metricSelect.value;
            const data = await loadData(testCase, scenario, metric);
            if(ctx.cancelled) return;
            if(data) {
                while(metricSelect.hasChildNodes()) metricSelect.removeChild(metricSelect.firstChild);
                for(const metric of data.metrics) {
                    const option = document.createElement("option");
                    option.innerText = option.value = metric;
                    metricSelect.appendChild(option);
                }
                metricSelect.value = metric;
                if(!data.metrics.has(metric) && metric !== "stats") {
                    metricSelect.value = "stats";
                    update();
                    return;
                }
            }
            if(data && data.datasets) {
                data.datasets.forEach(chartIt);
            }

            if(caseSelect.value !== "all") {
                const compareTestCase = compareCaseSelect.value;
                const compareScenario = compareScenarioSelect.value;
                const compareMetric = compareMetricSelect.value;
                const compareData = await loadData(compareTestCase || testCase, compareScenario || scenario, compareMetric || metric);
                if(ctx.cancelled) return;
                if(compareData) {
                    while(compareMetricSelect.hasChildNodes()) compareMetricSelect.removeChild(compareMetricSelect.firstChild);
                    const option = document.createElement("option");
                    option.innerText = "-";
                    option.value = "";
                    compareMetricSelect.appendChild(option);
                    for(const metric of compareData.metrics) {
                        const option = document.createElement("option");
                        option.innerText = option.value = metric;
                        compareMetricSelect.appendChild(option);
                    }
                    compareMetricSelect.value = compareMetric;
                    if(!compareData.metrics.has(compareMetric) && compareMetric) {
                        compareMetricSelect.value = "";
                        update();
                        return;
                    }
                }
                if((compareTestCase || compareScenario || compareMetric) && compareData && compareData.metrics.has(compareMetric || metric) && compareData.datasets) {
                    compareData.datasets.forEach(chartIt);
                }
            }
        }

        updateChart(datasetsForChart);
    });
    
    caseSelect.addEventListener("change", update);
    compareCaseSelect.addEventListener("change", update);
    scenarioSelect.addEventListener("change", update);
    compareScenarioSelect.addEventListener("change", update);
    metricSelect.addEventListener("change", update);
    compareMetricSelect.addEventListener("change", update);
    update();
})().catch(err => {
    document.body.innerText = err.stack;
});