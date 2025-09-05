import { Inject } from "@nestjs/common";
import { SpanItem, Trace } from "./rastru.module-definition";
import { RastruService } from "./rastru.service";

type Fn = (...args: unknown[]) => unknown;

export function Span(traceName: string): MethodDecorator {
  const injectTrace = Inject(RastruService);

  return ((
    target: object,
    _property: unknown,
    descriptor: TypedPropertyDescriptor<Fn>,
  ) => {
    injectTrace(target, "__span_decorator_rastru__");

    const originalMethod = descriptor.value;
    const targetName = `${target.constructor.name}.${originalMethod.name}`;
    const wrappedMethod = function (...args: unknown[]): unknown {
      const srv: RastruService = this.__span_decorator_rastru__;

      if (!srv || !srv.isTraceEnabled(traceName))
        return originalMethod.apply(this, args);

      let trace: Trace;

      try {
        srv.getOrCreateTrace(traceName);

        trace = srv.appendSpanToTrace(traceName, {
          targetName: targetName,
          startTime: new Date().toISOString(),
          endTime: null,
          spanTime: null,
          isSuccess: false,
          params: srv.sanitizeInput(traceName, targetName, args),
          response: undefined,
        });
      } catch (_error) {
        // Noop
      }

      if (!trace) return originalMethod.apply(this, args);

      const spanIndex = trace.spans.length - 1;
      const spanStartTime = process.hrtime.bigint();

      let response: unknown;
      let error: unknown;

      try {
        response = originalMethod.apply(this, args);
      } catch (exception) {
        error = exception;
      }

      return srv.handleResponse(
        response,
        (output: unknown) =>
          finishSpan(
            srv,
            traceName,
            trace,
            spanIndex,
            spanStartTime,
            output,
            undefined,
          ),
        (error: unknown) =>
          finishSpan(
            srv,
            traceName,
            trace,
            spanIndex,
            spanStartTime,
            undefined,
            error,
          ),
        () => {
          finishSpan(
            srv,
            traceName,
            trace,
            spanIndex,
            spanStartTime,
            response,
            error,
          );
          if (error) throw error;
          return response;
        },
      );
    };

    Object.defineProperty(wrappedMethod, 'name', {
      value: originalMethod.name,
      configurable: true
    });

    Object.setPrototypeOf(wrappedMethod, Object.getPrototypeOf(originalMethod));
    
    descriptor.value = wrappedMethod;

    return descriptor;
  }) as MethodDecorator;
}

function finishSpan(
  srv: RastruService,
  traceName: string,
  trace: Trace,
  spanIndex: number,
  spanStartTime: bigint,
  response: unknown,
  error: unknown,
): Trace {
  try {
    const targetName = trace.spans[spanIndex].targetName;

    trace.spans[spanIndex].endTime = new Date().toISOString();
    trace.spans[spanIndex].spanTime = Number(
      process.hrtime.bigint() - spanStartTime,
    );

    if (typeof error !== "undefined" && error instanceof Error) {
      trace.spans[spanIndex].response = {
        name: error.name,
        message: error.message,
      };
    } else if (typeof error !== "undefined") {
      trace.spans[spanIndex].response = `<${(typeof error).toUpperCase()}>`;
    } else {
      trace.spans[spanIndex].isSuccess = true;
      trace.spans[spanIndex].response = srv.sanitizeOutput(
        traceName,
        targetName,
        response,
      );
    }

    const nextTrace = srv.setTrace(traceName, trace);

    if (nextTrace.spans.every((span: SpanItem) => span.endTime !== null))
      srv.dispatchTrace(traceName);

    return nextTrace;
  } catch (_error) {
    return null;
  }
}
