"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoHandlerFilesFoundError = exports.HandlersDirectoryNotFoundError = exports.InvalidHandlerError = exports.DuplicateHandlerError = exports.HandlerNotFoundError = exports.MediatifyError = void 0;
/**
 * Base class for every error thrown by mediatify.
 * Allows consumers to catch all library errors with a single `instanceof` check.
 */
class MediatifyError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
        // Restore the prototype chain (required when targeting ES5/ES2017 with
        // transpiled classes) so `instanceof` keeps working.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.MediatifyError = MediatifyError;
/**
 * Thrown by `send` when no handler is registered for the request type.
 */
class HandlerNotFoundError extends MediatifyError {
    constructor(requestType) {
        super(`No handler found for request type: ${requestType} try registering the handler by using Handler() annotation`);
        this.requestType = requestType;
    }
}
exports.HandlerNotFoundError = HandlerNotFoundError;
/**
 * Thrown while scanning when a request type already has a handler and the
 * `onDuplicate` policy is set to `"error"`.
 */
class DuplicateHandlerError extends MediatifyError {
    constructor(requestType) {
        super(`Handler for request type "${requestType}" is already registered`);
        this.requestType = requestType;
    }
}
exports.DuplicateHandlerError = DuplicateHandlerError;
/**
 * Thrown when a discovered class is annotated as a handler but does not expose
 * a `handle` method.
 */
class InvalidHandlerError extends MediatifyError {
    constructor(handlerName) {
        super(`Handler ${handlerName} does not implement IRequestHandler interface`);
        this.handlerName = handlerName;
    }
}
exports.InvalidHandlerError = InvalidHandlerError;
/**
 * Thrown when `registerHandlers` cannot resolve any existing directory from the
 * provided path/options.
 */
class HandlersDirectoryNotFoundError extends MediatifyError {
    constructor(handlersPath) {
        super(`Unable to resolve handlers directory using path "${handlersPath}".`);
        this.handlersPath = handlersPath;
    }
}
exports.HandlersDirectoryNotFoundError = HandlersDirectoryNotFoundError;
/**
 * Thrown when a handlers directory exists but contains no matching files.
 */
class NoHandlerFilesFoundError extends MediatifyError {
    constructor() {
        super("No handler files found in the specified directory");
    }
}
exports.NoHandlerFilesFoundError = NoHandlerFilesFoundError;
