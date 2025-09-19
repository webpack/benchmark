export declare type Options = {
  bundlers: Array<string>;
  metrics: Array<string>;
  reporter: string;
  fixtures: string;
  verbose: boolean;
  silent: boolean;
  output: string;
};

export declare type BuildResult = {
  bundler: string;
  outputPath: string;
  buildResult: unknown;
};

export declare type MetricResult = {
  value: number;
  unit: "ms" | "bytes";
  displayName: string;
};

export declare type Bundler = {
  build(fixture: string, options: Options): Promise<BuildResult>;
  clean(fixture: string, options: Options): Promise<void>;
};

export declare class Metric {
  name: string;

  start(fixture: string, options: Options): Promise<void>;
  stop(fixture: string, options: Options): Promise<void>;
  collect(context: {
    buildResult: BuildResult;
    startTime: number;
    endTime: number;
    fixture: string;
    options: Options;
  }): Promise<MetricResult>;
}

export declare type Reporter = (
  results: Map<string, Map<string, Map<string, MetricResult[]>>>,
  options: Options,
) => Promise<void>;
