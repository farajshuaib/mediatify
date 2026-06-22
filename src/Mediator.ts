import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";
import { INotification } from "./interfaces/INotification";
import { INotificationHandler } from "./interfaces/INotificationHandler";
import {
  getHandlerMetadata,
  getNotificationHandlerMetadata,
} from "./decorators/Handler";
import { HandlerConstructor } from "./interfaces/HandlerConstructor";
import { IPipeline } from "./interfaces/IPipeline";
import {
  DuplicateHandlerBehavior,
  RegisterHandlersOptions,
} from "./interfaces/RegisterHandlersOptions";
import {
  DuplicateHandlerError,
  HandlerNotFoundError,
  HandlersDirectoryNotFoundError,
  InvalidHandlerError,
  NoHandlerFilesFoundError,
} from "./errors";

export class Mediator {
  private handlers: Map<string, IRequestHandler<any, any>> = new Map();
  private notificationHandlers: Map<string, INotificationHandler<any>[]> =
    new Map();
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
   * Register a handler for a specific notification type. Unlike requests,
   * a notification may have any number of handlers; duplicates of the same
   * handler class are ignored so repeated scans stay idempotent.
   * @param notificationType the notification type to react to
   * @param handler the handler to invoke when the notification is published
   */
  public registerNotificationHandler<TNotification extends INotification>(
    notificationType: string,
    handler: INotificationHandler<TNotification>
  ): void {
    const handlers = this.notificationHandlers.get(notificationType) ?? [];
    const alreadyRegistered = handlers.some(
      (existing) => existing.constructor === handler.constructor
    );

    if (!alreadyRegistered) {
      handlers.push(handler);
    }

    this.notificationHandlers.set(notificationType, handlers);
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
   * Returns true when a handler is registered for the given request type.
   */
  public hasHandler(requestType: string): boolean {
    return this.handlers.has(requestType);
  }

  /**
   * Removes the handler registered for the given request type.
   * @returns true if a handler existed and was removed
   */
  public unregisterHandler(requestType: string): boolean {
    return this.handlers.delete(requestType);
  }

  /**
   * Removes all registered pipelines while keeping handlers intact.
   */
  public clearPipelines(): void {
    this.pipelines.length = 0;
  }

  /**
   * Reset handlers, notification handlers and pipelines.
   * Mostly useful for testing scenarios.
   */
  public reset(): void {
    this.handlers.clear();
    this.notificationHandlers.clear();
    this.pipelines.length = 0;
  }

  /**
   *
   * @param request the request object to be sent to the handler
   * @returns  the response object from the handler
   * @throws HandlerNotFoundError if no handler is registered for the request type, so make sure to register all handlers before sending a request
   */
  public async send<TRequest extends IRequest<TResponse>, TResponse>(
    request: TRequest
  ): Promise<TResponse> {
    const requestType = request.constructor.name;

    const handler: IRequestHandler<TRequest, TResponse> | undefined =
      this.handlers.get(requestType);

    if (!handler) {
      throw new HandlerNotFoundError(requestType);
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
   * Publish a notification to every handler registered for its type.
   * Handlers run concurrently; if any handler rejects, the returned promise
   * rejects. Publishing a notification with no handlers is a no-op.
   * @param notification the notification object to dispatch
   */
  public async publish<TNotification extends INotification>(
    notification: TNotification
  ): Promise<void> {
    const notificationType = (notification as { constructor: Function })
      .constructor.name;

    const handlers = this.notificationHandlers.get(notificationType) ?? [];

    await Promise.all(handlers.map((handler) => handler.handle(notification)));
  }

  /**
   * register all handlers from a specified directory
   * @param {string?} handlersPath - A specified directory path you make your usecases at.
   *    * if you did not specify the directory path, it will search for handlers from the src directory.

   * @example
   * const mediator = Mediator.getInstance();
   * mediator.loadHandlers("core/useCases");
   * @returns {Promise<void>}
   * @throws HandlersDirectoryNotFoundError, NoHandlerFilesFoundError, InvalidHandlerError or DuplicateHandlerError. Make sure handlers are annotated with @Handler (or @NotificationHandler) before registering them.
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
      throw new HandlersDirectoryNotFoundError(handlersPath);
    }

    const files = this.findHandlerFiles(directories, options);

    if (!files.length) {
      throw new NoHandlerFilesFoundError();
    }

    const handlerFactory =
      options.handlerFactory ??
      ((HandlerClass: HandlerConstructor<IRequestHandler<any, any>>) =>
        new HandlerClass());
    const duplicateBehavior = options.onDuplicate ?? "replace";

    for (const file of files) {
      const module = await import(file);

      for (const exported of Object.values(module)) {
        if (typeof exported !== "function") {
          continue;
        }

        const requestType = getHandlerMetadata(exported);
        const notificationType = getNotificationHandlerMetadata(exported);

        if (!requestType && !notificationType) {
          continue;
        }

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
          throw new InvalidHandlerError(HandlerClass.name);
        }

        if (
          requestType &&
          this.shouldRegisterHandler(requestType.name, duplicateBehavior)
        ) {
          this.registerHandler(requestType.name, handlerInstance);
        }

        if (notificationType) {
          this.registerNotificationHandler(
            notificationType.name,
            handlerInstance as INotificationHandler<any>
          );
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

    throw new DuplicateHandlerError(requestType);
  }
}
