import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";
import { getHandlerMetadata } from "./decorators/Handler";
import { HandlerConstructor } from "./interfaces/HandlerConstructor";
import { IPipeline } from "./interfaces/IPipeline";
import {
  DuplicateHandlerBehavior,
  RegisterHandlersOptions,
} from "./interfaces/RegisterHandlersOptions";

export class Mediator {
  private handlers: Map<string, IRequestHandler<any, any>> = new Map();
  private pipelines: Array<IPipeline<any, any>> = [];

  // Singleton instance
  private static instance: Mediator;

  private constructor() {}

  public static getInstance(): Mediator {
    if (!Mediator.instance) {
      Mediator.instance = new Mediator();
    }
    return Mediator.instance;
  }

  /**
   * Register a handler for a specific request type to be handled by the mediator
   * * all handlers should implement IRequestHandler interface
   * * all handlers should be registered before sending a request
   * * all handlers should be registered with the request type name
   * @ all handlers are registered via registerHandlers method by using Handler() annotation from decorators/Handler.ts file, so you do not need to register them manually unless you want to register them manually
   * @param requestType the request type to be handled
   * @param handler the handler for the request type
   */
  public registerHandler<TRequest extends IRequest<TResponse>, TResponse>(
    requestType: string,
    handler: IRequestHandler<TRequest, TResponse>
  ): void {
    this.handlers.set(requestType, handler);
  }

  /**
   * Register a pipeline to be executed before the handler
   * @param pipeline the pipeline to be executed
   */
  registerPipeline<TRequest, TResponse>(
    pipeline: IPipeline<TRequest, TResponse>
  ) {
    this.pipelines.push(pipeline);
  }

  /**
   * Reset handlers and pipelines.
   * Mostly useful for testing scenarios.
   */
  public reset(): void {
    this.handlers.clear();
    this.pipelines.length = 0;
  }

  /**
   *
   * @param request the request object to be sent to the handler
   * @returns  the response object from the handler
   * @throws an error if no handler is found for the request type or if the handler does not implement IRequestHandler interface so make sure to register all handlers before sending a request
   */
  public async send<TRequest extends IRequest<TResponse>, TResponse>(
    request: TRequest
  ): Promise<TResponse> {
    const requestType = request.constructor.name;

    const handler: IRequestHandler<TRequest, TResponse> | undefined =
      this.handlers.get(requestType);

    if (!handler) {
      throw new Error(
        `No handler found for request type: ${requestType} try registering the handler by using Handler() annotation`
      );
    }

    const next = () => handler.handle(request);

    // Execute pipelines in the order they were registered without mutating the original array
    const pipelines = [...this.pipelines];
    let invoke = next;
    for (let index = pipelines.length - 1; index >= 0; index -= 1) {
      const pipeline = pipelines[index];
      const current = invoke;
      invoke = () => pipeline.process(request, current);
    }

    return await invoke();
  }

  /**
   * register all handlers from a specified directory
   * @param {string?} handlersPath - A specified directory path you make your usecases at.
   *    * if you did not specify the directory path, it will search for handlers from the src directory.

   * @example
   * const mediator = Mediator.getInstance();
   * mediator.loadHandlers("core/useCases");
   * @returns {Promise<void>}
   * @throws an error if no handler is found for the request type or if the handler does not implement IRequestHandler interface or the handlers doesn't annotated with @Handler annotation so make sure to annotate the hanlders with @Handler annotation before registering them
   */
  public async registerHandlers(
    handlersPathOrOptions: string | RegisterHandlersOptions = "",
    maybeOptions: RegisterHandlersOptions = {}
  ): Promise<void> {
    const { handlersPath, options } = this.normalizeHandlerArgs(
      handlersPathOrOptions,
      maybeOptions
    );
    const directories = this.resolveDirectories(handlersPath, options);

    if (!directories.length) {
      throw new Error(
        `Unable to resolve handlers directory using path "${handlersPath}".`
      );
    }

    const files = this.findHandlerFiles(directories, options);

    if (!files.length) {
      throw new Error("No handler files found in the specified directory");
    }

    const handlerFactory =
      options.handlerFactory ??
      ((HandlerClass: HandlerConstructor<IRequestHandler<any, any>>) =>
        new HandlerClass());
    const duplicateBehavior = options.onDuplicate ?? "replace";

    for (const file of files) {
      const module = await import(file);

      for (const exported of Object.values(module)) {
        if (typeof exported === "function") {
          const requestType = getHandlerMetadata(exported);

          if (requestType) {
            const HandlerClass = exported as HandlerConstructor<
              IRequestHandler<any, any>
            >;
            const handlerInstance = await Promise.resolve(
              handlerFactory(HandlerClass)
            );

            if (
              !handlerInstance ||
              typeof (handlerInstance as IRequestHandler<any, any>).handle !==
                "function"
            ) {
              throw new Error(
                `Handler ${HandlerClass.name} does not implement IRequestHandler interface`
              );
            }

            if (
              this.shouldRegisterHandler(requestType.name, duplicateBehavior)
            ) {
              this.registerHandler(requestType.name, handlerInstance);
            }
          }
        }
      }
    }
  }

  private normalizeHandlerArgs(
    handlersPathOrOptions: string | RegisterHandlersOptions,
    maybeOptions: RegisterHandlersOptions
  ): { handlersPath: string; options: RegisterHandlersOptions } {
    if (typeof handlersPathOrOptions === "string") {
      return {
        handlersPath: handlersPathOrOptions,
        options: maybeOptions,
      };
    }

    return {
      handlersPath: "",
      options: handlersPathOrOptions,
    };
  }

  private resolveDirectories(
    handlersPath: string,
    options: RegisterHandlersOptions
  ): string[] {
    const dirs = new Set<string>();
    const candidateDirs: string[] = [];

    if (handlersPath) {
      if (path.isAbsolute(handlersPath)) {
        candidateDirs.push(handlersPath);
      } else {
        if (options.baseDir) {
          candidateDirs.push(path.resolve(options.baseDir, handlersPath));
        }
        candidateDirs.push(path.resolve(process.cwd(), handlersPath));
        candidateDirs.push(path.resolve(__dirname, handlersPath));
      }
    } else {
      if (options.baseDir) {
        candidateDirs.push(options.baseDir);
      }
      candidateDirs.push(__dirname);
    }

    candidateDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        dirs.add(dir);
      }
    });

    return Array.from(dirs);
  }

  private findHandlerFiles(
    directories: string[],
    options: RegisterHandlersOptions
  ): string[] {
    const extensions = this.buildExtensions(options.extensions);
    const pattern =
      options.pattern ??
      `**/*.{${extensions.map((ext) => ext.replace(/^\./, "")).join(",")}}`;
    const ignore = options.ignore ?? [];

    const files = new Set<string>();

    directories.forEach((directory) => {
      glob
        .sync(pattern, { cwd: directory, absolute: true, ignore })
        .forEach((file) => {
          if (!file.endsWith(".d.ts")) {
            files.add(file);
          }
        });
    });

    return Array.from(files);
  }

  private buildExtensions(extensions?: string[]): string[] {
    if (!extensions || !extensions.length) {
      return [".ts", ".js", ".mjs", ".cjs"];
    }

    return extensions.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
  }

  private shouldRegisterHandler(
    requestType: string,
    duplicateBehavior: DuplicateHandlerBehavior
  ): boolean {
    if (!this.handlers.has(requestType)) {
      return true;
    }

    if (duplicateBehavior === "replace") {
      return true;
    }

    if (duplicateBehavior === "skip") {
      return false;
    }

    throw new Error(
      `Handler for request type "${requestType}" is already registered`
    );
  }
}
