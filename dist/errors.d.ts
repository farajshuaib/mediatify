/**
 * Base class for every error thrown by mediatify.
 * Allows consumers to catch all library errors with a single `instanceof` check.
 */
export declare class MediatifyError extends Error {
    constructor(message: string);
}
/**
 * Thrown by `send` when no handler is registered for the request type.
 */
export declare class HandlerNotFoundError extends MediatifyError {
    readonly requestType: string;
    constructor(requestType: string);
}
/**
 * Thrown while scanning when a request type already has a handler and the
 * `onDuplicate` policy is set to `"error"`.
 */
export declare class DuplicateHandlerError extends MediatifyError {
    readonly requestType: string;
    constructor(requestType: string);
}
/**
 * Thrown when a discovered class is annotated as a handler but does not expose
 * a `handle` method.
 */
export declare class InvalidHandlerError extends MediatifyError {
    readonly handlerName: string;
    constructor(handlerName: string);
}
/**
 * Thrown when `registerHandlers` cannot resolve any existing directory from the
 * provided path/options.
 */
export declare class HandlersDirectoryNotFoundError extends MediatifyError {
    readonly handlersPath: string;
    constructor(handlersPath: string);
}
/**
 * Thrown when a handlers directory exists but contains no matching files.
 */
export declare class NoHandlerFilesFoundError extends MediatifyError {
    constructor();
}
