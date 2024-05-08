import {
  ConfigurableModuleBuilder,
  ConfigurableModuleHost,
  DynamicModule,
  Type,
} from "@nestjs/common";

type TracingExtras = {
  isGlobal: boolean;
};

export type SpanItem = {
  targetName: string;
  startTime: string;
  endTime: string | null;
  spanTime: number;
  params: unknown[];
  response: unknown;
};

export type Trace = {
  traceId: string;
  traceName: string;
  spans: SpanItem[];
};

export type ResponseHandlerItem<R = unknown, T extends Type<R> = Type<R>> = {
  instanceType: T;
  instanceHandler: (
    type: R,
    resolve: (output: unknown) => void,
    reject: (error: unknown) => void,
  ) => R;
};

export type TracingOptions = {
  // Whether to trace the spans or not
  isTraceEnabled?: (traceName: string) => boolean;

  // Tracing Continuation Storage
  appendSpanToTrace: (traceName: string, span: SpanItem) => Trace;
  getOrCreateTrace: (traceName: string) => Trace;
  setTrace: (traceName: string, trace: Trace) => Trace;

  // Sanitize
  sanitizeInput?: (
    traceName: string,
    targetName: string,
    input: unknown[],
  ) => unknown[];
  sanitizeOutput?: (
    traceName: string,
    targetName: string,
    output: unknown,
  ) => unknown;

  // Trace dispatcher
  dispatchTrace: (traceName: string) => void;

  // Response handlers
  responseHandlers?: ResponseHandlerItem[];
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
}: ConfigurableModuleHost<TracingOptions, "forRoot"> =
  new ConfigurableModuleBuilder<TracingOptions>()
    .setClassMethodName("forRoot")
    .setExtras(
      {
        isGlobal: true,
      },
      (definition: DynamicModule, extras: TracingExtras) => ({
        ...definition,
        global: extras.isGlobal,
      }),
    )
    .build();
