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
                    ticks: {
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

    document.querySelector("#relative").addEventListener("change", e => {
        const axisTicks = chart.options.scales.yAxes[0].ticks;
        axisTicks.beginAtZero = !e.target.checked;
        chart.update();
    });
    document.querySelector("#recent").addEventListener("change", e => {
        const axisTicks = chart.options.scales.xAxes[0].ticks;
        axisTicks.min = e.target.checked ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000): new Date("2020-01-01");
        update();
    });

    while(caseSelect.hasChildNodes()) caseSelect.removeChild(caseSelect.firstChild);
    for(const testCase of testCases.keys()) {
        const option = document.createElement("option");
        option.innerText = option.value = testCase;
        caseSelect.appendChild(option);
        compareCaseSelect.appendChild(option.cloneNode(true));
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
            if(isNaN(base)) continue;
            const scale = /( size| memory)$/.test(ds.name) ? () => 1 : entry => base / entry.data.base;
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
                    data: allDates.slice().reverse().map(date => {
                        const outside = new Date(date).getTime() < min.getTime();
                        let entry = ds.entries.find(entry => entry.date === date);
                        if(outside && lastValidEntry && entry) entry = lastValidEntry;
                        const x = new Date(date);
                        if(entry) {
                            if(!lastValidEntry || !outside) lastValidEntry = entry;
                            return { x, y: fn(entry) * scale(entry) };
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
            return await (await fetch(filename)).json();
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
        const entries = await Promise.all(dates.map(async date => {
            const data = await loadFile(`results/${date}/${testCase}_${scenario}.json`);
            for(const m of Object.keys(data)) metrics.add(m)
            return {
                date,
                data: data[metric]
            };
        }));
        return {
            datasets: [{ name: `${testCase} ${scenario} ${metric}`, entries}],
            metrics
        }
    }
    
    const update = enqueued(async (ctx) => {
        const testCase = caseSelect.value;
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

        updateChart([
            ...data && data.datasets || [],
            ...(compareTestCase || compareScenario || compareMetric) && compareData && compareData.metrics.has(compareMetric || metric) && compareData.datasets || []
        ]);
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