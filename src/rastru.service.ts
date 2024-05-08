import { Inject, Injectable } from "@nestjs/common";
import {
  MODULE_OPTIONS_TOKEN,
  ResponseHandlerItem,
  SpanItem,
  Trace,
  TracingOptions,
} from "./rastru.module-definition";

@Injectable()
export class RastruService {
  private readonly _responseHandlers: ResponseHandlerItem[];

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private _options: TracingOptions) {
    this._responseHandlers = [
      {
        instanceType: Promise,
        instanceHandler: (
          instanceType: Promise<unknown>,
          resolve: (output: unknown) => void,
          reject: (error: unknown) => void,
        ): Promise<unknown> => {
          return instanceType
            .then((response: unknown) => {
              resolve(response);
              return response;
            })
            .catch((error: unknown) => {
              reject(error);
              throw error;
            });
        },
      },
      ...(Array.isArray(_options.responseHandlers)
        ? _options.responseHandlers
        : []),
    ];
  }

  isTraceEnabled(traceName: string): boolean {
    return typeof this._options.isTraceEnabled === "function"
      ? this._options.isTraceEnabled(traceName)
      : RastruService._defaultIsTraceEnableFn(traceName);
  }

  appendSpanToTrace(traceName: string, span: SpanItem): Trace {
    return this._options.appendSpanToTrace(traceName, span);
  }

  getOrCreateTrace(traceName: string): Trace {
    return this._options.getOrCreateTrace(traceName);
  }

  setTrace(traceName: string, trace: Trace): Trace {
    return this._options.setTrace(traceName, trace);
  }

  sanitizeInput(
    traceName: string,
    targetName: string,
    input: unknown[],
  ): unknown[] {
    return typeof this._options.sanitizeInput === "function"
      ? this._options.sanitizeInput(
          traceName,
          targetName,
          RastruService._deepClone(input),
        )
      : RastruService._defaultSanitizeInputFn(traceName, targetName, input);
  }

  sanitizeOutput(
    traceName: string,
    targetName: string,
    output: unknown,
  ): unknown {
    return typeof this._options.sanitizeOutput === "function"
      ? this._options.sanitizeOutput(
          traceName,
          targetName,
          RastruService._deepClone(output),
        )
      : RastruService._defaultSanitizeOutputFn(traceName, targetName, output);
  }

  handleResponse(
    response: unknown,
    resolve: (output: unknown) => void,
    reject: (error: unknown) => void,
    fallback: () => unknown,
  ): unknown {
    for (let i: number = 0; i < this._responseHandlers.length; i++) {
      const { instanceType, instanceHandler } = this._responseHandlers[i];
      if (response instanceof instanceType)
        return instanceHandler(response, resolve, reject);
    }

    return fallback();
  }

  dispatchTrace(traceName: string): void {
    return this._options.dispatchTrace(traceName);
  }

  private static _defaultIsTraceEnableFn(_traceName: string): boolean {
    return true;
  }

  private static _defaultSanitizeInputFn(
    _traceName: string,
    _targetName: string,
    input: unknown[],
  ): unknown[] {
    return input;
  }

  private static _defaultSanitizeOutputFn(
    _traceName: string,
    _targetName: string,
    output: unknown,
  ): unknown {
    return output;
  }

  private static _deepClone<Value>(value: Value): Value {
    return JSON.parse(JSON.stringify(value));
  }
}
