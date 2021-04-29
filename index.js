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

    const formatTime = (value, maxValue) => {
        if(maxValue > 10000) return `${value / 1000} s`;
        return `${value} ms`;
    }
    const formatSize = (value, maxValue) => {
        if(maxValue > 10000000) return `${value / 1000000} MB`;
        if(maxValue > 10000) return `${value / 1000} kB`;
        return `${value} B`;
    }

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
                            return formatTime(value, values[0]);
                        },
                        beginAtZero: true
                    }
                }, {
                    id: 'size-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            return formatSize(value, values[0]);
                        },
                        beginAtZero: true
                    }
                }, {
                    id: 'memory-axis',
                    display: 'auto',
                    ticks: {
                        callback(value, index, values) {
                            return formatSize(value, values[0]);
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
    let confidence = false;
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
    document.querySelector("#confidence").addEventListener("change", e => {
        confidence = e.target.checked;
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
                const midFn = (entry) => (entry.data.low + entry.data.high) / 2;
                scale = (entry, fn) => old(entry, fn) / (midFn(lastEntry) * old(lastEntry, fn)) * 100
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
            const createData = fn => {
                let lastValidEntry;
                return allDates.slice().reverse().map(date => {
                    const outside = new Date(date).getTime() < min.getTime();
                    let entry = ds.entries.find(entry => entry.date === date);
                    if(outside && lastValidEntry && entry) entry = lastValidEntry;
                    const x = new Date(date);
                    if(entry) {
                        if(!lastValidEntry || !outside) lastValidEntry = entry;
                        const y = fn(entry) * scale(entry, fn);
                        return { x, y };
                    } else {
                        return { x, y: undefined };
                    }
                })
            }
            const createDataset = (label, data) => {
                return Object.assign(oldDatasets.pop() || {}, {
                    label,
                    yAxisID: percentage ? "percentage-axis" : sizeType ? "size-axis" : memoryType ? "memory-axis" : "time-axis",
                    data,
                    ...style
                })
            }
            // const createDataset = (label, fn, fn2) => {
            //     let lastValidEntry;
            //     let prevY;
            //     return Object.assign(oldDatasets.pop() || {}, {
            //         label,
            //         yAxisID: percentage ? "percentage-axis" : sizeType ? "size-axis" : memoryType ? "memory-axis" : "time-axis",
            //         data: allDates.slice().reverse().map(date => {
            //             const outside = new Date(date).getTime() < min.getTime();
            //             let entry = ds.entries.find(entry => entry.date === date);
            //             if(outside && lastValidEntry && entry) entry = lastValidEntry;
            //             const x = new Date(date);
            //             if(entry) {
            //                 if(!lastValidEntry || !outside) lastValidEntry = entry;
            //                 let y;
            //                 if(fn2) {
            //                     const yl = fn(entry) * scale(entry, fn);
            //                     const yh = fn2(entry) * scale(entry, fn2);
            //                     if(prevY === undefined) prevY = (yl + yh) / 2;
            //                     else if(prevY < yl) prevY = yl;
            //                     else if(prevY > yh) prevY = yh;
            //                     y = prevY * 0.9 + (yl + yh) * 0.05;
            //                     prevY = y;
            //                 } else {
            //                     y = fn(entry) * scale(entry, fn);
            //                 }
            //                 return { x, y };
            //             } else {
            //                 return { x, y: undefined };
            //             }
            //         }),
            //         ...style
            //     })
            // }
            const dataLow = createData(entry => entry.data.low);
            const dataHigh = createData(entry => entry.data.high);
            if(confidence) {
                const datasetLow = createDataset(ds.name + " (low)", dataLow);
                const datasetHigh = createDataset(ds.name + " (high)", dataHigh);
                datasets.push(datasetLow);
                datasets.push(datasetHigh);
            } else {
                const smooth = (direction) => {
                    if(direction) {
                        dataLow.reverse();
                        dataHigh.reverse();
                    }
                    let y;
                    const result = dataLow.map((low, i) => {
                        const high = dataHigh[i];
                        const yl = low.y;
                        const yh = high.y;
                        if(yl === undefined) {
                            return {
                                x: low.x,
                                y: undefined
                            };
                        }
                        if(y === undefined) y = (yl + yh) / 2;
                        else if(y < yl) y = yl;
                        else if(y > yh) y = yh;
                        return {
                            x: low.x,
                            y
                        };
                    })
                    if(direction) {
                        result.reverse();
                        dataLow.reverse();
                        dataHigh.reverse();
                    }
                    return result;
                }
                const data1 = smooth(true);
                const data2 = smooth(false);
                const dataset1 = createDataset(ds.name + " (>>)", data1);
                const dataset2 = createDataset(ds.name + " (<<)", data2);
                datasets.push(dataset1);
                datasets.push(dataset2);
            }
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
        const metrics = new Map();
        const entries = (await Promise.all(dates.map(async date => {
            const data = await loadFile(`results/${date}/${testCase}_${scenario}.json`);
            for(const m of Object.keys(data)) {
                metrics.set(m, data[m].median);
            }
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

        const metrics = new Map();
        const compareMetrics = new Map();

        const addToMetrics = (metrics, rawMetrics) => {
            for(const [key, value] of rawMetrics) {
                let entry = metrics.get(key);
                if(entry === undefined) {
                    metrics.set(key, entry = {
                        sum: 0,
                        count: 0
                    });
                }
                entry.sum += value;
                entry.count++;
            }
        }

        const scenario = scenarioSelect.value;
        const metric = metricSelect.value;
        const compareTestCase = compareCaseSelect.value;
        const compareScenario = compareScenarioSelect.value;
        const compareMetric = compareMetricSelect.value;

        for(const testCase of caseSelect.value === "all" ? testCases.keys() : [caseSelect.value]) {
            const data = await loadData(testCase, scenario, metric);
            if(ctx.cancelled) return;
            if(data) {
                addToMetrics(metrics, data.metrics);
            }
            if(data && data.datasets) {
                data.datasets.forEach(chartIt);
            }

            if(caseSelect.value !== "all") {
                const compareData = await loadData(compareTestCase || testCase, compareScenario || scenario, compareMetric || metric);
                if(ctx.cancelled) return;
                if(compareData) {
                    addToMetrics(compareMetrics, compareData.metrics);
                }
                if((compareTestCase || compareScenario || compareMetric) && compareData && compareData.metrics.has(compareMetric || metric) && compareData.datasets) {
                    compareData.datasets.forEach(chartIt);
                }
            }
        }

        const updateSelect = (metricSelect, metrics, metric, includeDash = false) => {
            if(metrics.size === 0) return;
            while(metricSelect.hasChildNodes()) metricSelect.removeChild(metricSelect.firstChild);
            const sortedMetrics = Array.from(metrics, ([name, entry]) => [
                name,
                name.endsWith(" size") ? "Size" : name.endsWith(" memory") ? "Memory" : "Performance",
                entry.sum / entry.count
            ]).sort(([, ga, a], [, gb, b]) => {
                if(ga < gb) return -1;
                if(ga > gb) return 1;
                return b - a;
            });
            if(includeDash) {
                const option = document.createElement("option");
                option.innerText = "-";
                option.value = "";
                metricSelect.appendChild(option);
            }
            const groups = new Map();
            for(const [metric, groupName, value] of sortedMetrics) {
                let group = groups.get(groupName);
                if(!group) {
                    group = document.createElement("optgroup");
                    group.label = groupName;
                    metricSelect.appendChild(group);
                    groups.set(groupName, group);
                }
                const option = document.createElement("option");
                const format = groupName === "Performance" ? formatTime : formatSize;
                option.innerText = `${metric} (${format(+value.toPrecision(4), value)})`
                option.value = metric;
                group.appendChild(option);
            }
            metricSelect.value = metric;
            const fallbackValue = includeDash ? "" : "stats";
            if(!metrics.has(metric) && metric !== fallbackValue) {
                metricSelect.value = fallbackValue;
                update();
                return;
            }
        }
        updateSelect(metricSelect, metrics, metric);
        updateSelect(compareMetricSelect, compareMetrics, compareMetric, true);

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