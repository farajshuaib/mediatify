import "reflect-metadata";
import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";
import * as path from "path";
import * as glob from "glob";
import { getHandlerMetadata } from "./decorators/Handler";
import { HandlerConstructor } from "./interfaces/HandlerConstructor";
import { IPipeline } from "./interfaces/IPipeline";
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

    // Execute pipelines in sequence
    let result = next;
    this.pipelines.reverse().forEach((pipeline) => {
      const current = result;
      result = () => pipeline.process(request, current);
    });

    return await result();
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
  public async registerHandlers(handlersPath: string = ""): Promise<void> {
    // Find all .ts files in the specified directory and load them
    const dires = path.resolve(__dirname, handlersPath);

    const files = glob.sync("**/*.ts", { cwd: dires, absolute: true });

    if (files.length === 0) {
      throw new Error("No ts files found in the specified directory");
    }

    for (const file of files) {
      // Dynamically import the handler module
      const module = await import(file);

      // Iterate through all exports to find handler classes
      for (const exported of Object.values(module)) {
        if (typeof exported == "function") {
          const requestType = getHandlerMetadata(exported);

          if (requestType) {
            const HandlerClass = exported as HandlerConstructor<any>;

            const handlerInstance = new HandlerClass();
            this.registerHandler(requestType.name, handlerInstance);
          }
        }
      }
    }
  }
}
