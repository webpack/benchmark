# Webpack Benchmarker

## CLI Options

| Option       | Short | Description                          | Default                  |
| ------------ | ----- | ------------------------------------ | ------------------------ |
| `--bundlers` | `-b`  | Select bundlers to benchmark         | `["vite", "webpack"]`    |
| `--metrics`  | `-m`  | Choose metrics to collect            | `["build-time", "size"]` |
| `--reporter` | `-r`  | Choose output format                 | `"console"`              |
| `--fixtures` |       | Glob pattern for fixture directories | `"./fixtures/*"`         |
| `--verbose`  |       | Enable verbose logging               | `false`                  |
| `--silent`   |       | Suppress all output except errors    | `false`                  |

## Fixtures

Fixtures are test projects used to benchmark bundlers.

Each fixture should exist in `fixtures/[name]`, and have a `main.js` as an entrypoint.

## Extending the Benchmarker

### Adding a New Bundler

Create a new file in `src/bundlers/[bundler-name].mjs` that exports two functions:

```javascript
export async function build(fixture) { ... }
export async function clean(fixture) { ... }
```

### Adding a New Metric

Create a new file in `src/metrics/[metric-name].mjs` that default exports a class:

```javascript
export default class {
  name = "My Metric Name"; // Required

  start(options) { ... } // Optional

  stop(options) { ... } // Optional

  collect(options) { ... } // Required
}
```

### Adding a New Reporter

Create a new file in `src/reporters/[reporter-name].mjs` that default exports a function:

```javascript
export default async function report(results, options) { ... }
```

## Using with Git Repositories

To run a benchmark on a bundler directly from it's source, install it directly from it's repository, and benchmark like normal.

For example, to benchmark Webpack's bleeding edge, install it with:

```bash
yarn add webpack@https://github.com/webpack/webpack
```
