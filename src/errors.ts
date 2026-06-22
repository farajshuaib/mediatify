/**
 * Base class for every error thrown by mediatify.
 * Allows consumers to catch all library errors with a single `instanceof` check.
 */
export class MediatifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore the prototype chain (required when targeting ES5/ES2017 with
    // transpiled classes) so `instanceof` keeps working.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown by `send` when no handler is registered for the request type.
 */
export class HandlerNotFoundError extends MediatifyError {
  constructor(public readonly requestType: string) {
    super(
      `No handler found for request type: ${requestType} try registering the handler by using Handler() annotation`
    );
  }
}

/**
 * Thrown while scanning when a request type already has a handler and the
 * `onDuplicate` policy is set to `"error"`.
 */
export class DuplicateHandlerError extends MediatifyError {
  constructor(public readonly requestType: string) {
    super(`Handler for request type "${requestType}" is already registered`);
  }
}

/**
 * Thrown when a discovered class is annotated as a handler but does not expose
 * a `handle` method.
 */
export class InvalidHandlerError extends MediatifyError {
  constructor(public readonly handlerName: string) {
    super(`Handler ${handlerName} does not implement IRequestHandler interface`);
  }
}

/**
 * Thrown when `registerHandlers` cannot resolve any existing directory from the
 * provided path/options.
 */
export class HandlersDirectoryNotFoundError extends MediatifyError {
  constructor(public readonly handlersPath: string) {
    super(`Unable to resolve handlers directory using path "${handlersPath}".`);
  }
}

/**
 * Thrown when a handlers directory exists but contains no matching files.
 */
export class NoHandlerFilesFoundError extends MediatifyError {
  constructor() {
    super("No handler files found in the specified directory");
  }
}
