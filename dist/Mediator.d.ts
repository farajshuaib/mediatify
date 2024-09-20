import "reflect-metadata";
import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";
import { IPipeline } from "./interfaces/IPipeline";
export declare class Mediator {
    private handlers;
    private pipelines;
    private static instance;
    private constructor();
    static getInstance(): Mediator;
    /**
     * Register a handler for a specific request type to be handled by the mediator
     * * all handlers should implement IRequestHandler interface
     * * all handlers should be registered before sending a request
     * * all handlers should be registered with the request type name
     * @ all handlers are registered via registerHandlers method by using Handler() annotation from decorators/Handler.ts file, so you do not need to register them manually unless you want to register them manually
     * @param requestType the request type to be handled
     * @param handler the handler for the request type
     */
    registerHandler<TRequest extends IRequest<TResponse>, TResponse>(requestType: string, handler: IRequestHandler<TRequest, TResponse>): void;
    /**
     * Register a pipeline to be executed before the handler
     * @param pipeline the pipeline to be executed
     */
    registerPipeline<TRequest, TResponse>(pipeline: IPipeline<TRequest, TResponse>): void;
    /**
     *
     * @param request the request object to be sent to the handler
     * @returns  the response object from the handler
     * @throws an error if no handler is found for the request type or if the handler does not implement IRequestHandler interface so make sure to register all handlers before sending a request
     */
    send<TRequest extends IRequest<TResponse>, TResponse>(request: TRequest): Promise<TResponse>;
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
    registerHandlers(handlersPath?: string): Promise<void>;
}
