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
    const allScenarios = new Set();

    for(const indexLine of index.split("\n")) {
        const match = /^([^/]+)\/([^_]+)_(.+).json/.exec(indexLine);
        if(!match) continue;
        const testCase = match[2];
        const scenario = match[3];
        allScenarios.add(scenario);
        const date = match[1];
        const scenarios = provide(testCases, testCase, () => new Map());
        const dates = provide(scenarios, scenario, () => []);
        dates.push(date),
        dates.sort();
    }

    const caseSelect = document.querySelector("#case-select");
    const compareCaseSelect = document.querySelector("#compare-case-select");
    const scenarioSelect = document.querySelector("#scenario-select");
    const compareScenarioSelect = document.querySelector("#compare-scenario-select");
    const metricSelect = document.querySelector("#metric-select");
    const compareMetricSelect = document.querySelector("#compare-metric-select");

    const chart = new Chart("chart", {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0,
            scales: {
                yAxes: [{
                    ticks: {
                        // beginAtZero: true
                    }
                }]
            }
        }
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
        const oldDatasets = chart.data.datasets.reverse();
        const labelsSet = new Set();
        for(const ds of inputDatasets) {
            for(const entry of ds.entries) {
                labelsSet.add(entry.date);
            }
        }
        const labels = Array.from(labelsSet).sort();
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
            const datasetLow = Object.assign(oldDatasets.pop() || {}, {
                label: ds.name + " (low)",
                data: labels.map(label => {
                    const entry = ds.entries.find(entry => entry.date === label);
                    return entry && entry.data.low * scale(entry);
                }),
                ...style
            })
            const datasetHigh = Object.assign(oldDatasets.pop() || {}, {
                label: ds.name + " (high)",
                data: labels.map(label => {
                    const entry = ds.entries.find(entry => entry.date === label);
                    return entry && entry.data.high * scale(entry);
                }),
                ...style
            })
            datasets.push(datasetLow);
            datasets.push(datasetHigh);
            i++;
        }
        Object.assign(chart.data, {
            labels,
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