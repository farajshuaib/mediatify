import "reflect-metadata";
import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";
import { INotification } from "./interfaces/INotification";
import { INotificationHandler } from "./interfaces/INotificationHandler";
import { IPipeline } from "./interfaces/IPipeline";
import { RegisterHandlersOptions } from "./interfaces/RegisterHandlersOptions";
export declare class Mediator {
    private handlers;
    private notificationHandlers;
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
     * Register a handler for a specific notification type. Unlike requests,
     * a notification may have any number of handlers; duplicates of the same
     * handler class are ignored so repeated scans stay idempotent.
     * @param notificationType the notification type to react to
     * @param handler the handler to invoke when the notification is published
     */
    registerNotificationHandler<TNotification extends INotification>(notificationType: string, handler: INotificationHandler<TNotification>): void;
    /**
     * Register a pipeline to be executed before the handler
     * @param pipeline the pipeline to be executed
     */
    registerPipeline<TRequest, TResponse>(pipeline: IPipeline<TRequest, TResponse>): void;
    /**
     * Returns true when a handler is registered for the given request type.
     */
    hasHandler(requestType: string): boolean;
    /**
     * Removes the handler registered for the given request type.
     * @returns true if a handler existed and was removed
     */
    unregisterHandler(requestType: string): boolean;
    /**
     * Removes all registered pipelines while keeping handlers intact.
     */
    clearPipelines(): void;
    /**
     * Reset handlers, notification handlers and pipelines.
     * Mostly useful for testing scenarios.
     */
    reset(): void;
    /**
     *
     * @param request the request object to be sent to the handler
     * @returns  the response object from the handler
     * @throws HandlerNotFoundError if no handler is registered for the request type, so make sure to register all handlers before sending a request
     */
    send<TRequest extends IRequest<TResponse>, TResponse>(request: TRequest): Promise<TResponse>;
    /**
     * Publish a notification to every handler registered for its type.
     * Handlers run concurrently; if any handler rejects, the returned promise
     * rejects. Publishing a notification with no handlers is a no-op.
     * @param notification the notification object to dispatch
     */
    publish<TNotification extends INotification>(notification: TNotification): Promise<void>;
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
    registerHandlers(handlersPathOrOptions?: string | RegisterHandlersOptions, maybeOptions?: RegisterHandlersOptions): Promise<void>;
    private normalizeHandlerArgs;
    private resolveDirectories;
    private findHandlerFiles;
    private buildExtensions;
    private shouldRegisterHandler;
}
