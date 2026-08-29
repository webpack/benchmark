# webpack/benchmark

> [!IMPORTANT]
> **This repository is deprecated.** Performance measurement for webpack now
> lives in [webpack/webpack](https://github.com/webpack/webpack). Nothing here
> runs on a schedule any more, and the results are a frozen archive.

Long-horizon build measurements for webpack: real applications, installed with
their dependencies as of a given date, built with the webpack of that same date.
The historical results are plotted at <https://webpack.github.io/benchmark/>.

## Where measurement happens now

`.github/workflows/benchmarks.yml` in webpack/webpack runs the cases in
`test/benchmarkCases/` through [CodSpeed](https://codspeed.io/webpack/webpack)
on every pull request and every push to `main`, in both simulation and memory
mode. That is where a regression is caught and where the trend is tracked; this
repository never gated anything.

The scenarios it carried that webpack/webpack lacked — a loader in the pipeline,
a cold persistent cache, and HMR — have been ported into `test/benchmarkCases/`
there.

## What is kept, and why

The `gh-pages` branch holds ~77k measurements of webpack releases going back to
2020, each against the npm ecosystem as it stood at the time. CodSpeed cannot
reconstruct that: it knows only the commits it has measured since it was
enabled, and it does not build real applications. **That archive stays as it
is** — please do not rewrite or delete the branch.

## Why the schedule was switched off

A cron measured a random missing data point every 30 minutes, for over 16,000
runs. Roughly two in five ended in a build failure: the cases pin
`dependenciesDate` for their `dependencies` but leave dev dependencies floating,
so `rome` resolves `typescript` and `ts-loader` to a compiler that rejects the
case's own `tsconfig.json` (`TS5107: Option 'moduleResolution=node10' is
deprecated`). The newest data point ended up older than the historic ones the
cron kept backfilling.

## Running something by hand

Every workflow is still available through **Run workflow** in the Actions tab —
`compare.yml` takes two versions or dates. Reviving any schedule means pinning
each case's dev dependencies first.
