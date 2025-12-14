import { IRequestHandler } from "./IHandler";
import { HandlerConstructor } from "./HandlerConstructor";
export type DuplicateHandlerBehavior = "replace" | "skip" | "error";
export interface RegisterHandlersOptions {
    /**
     * Base directory that should be used to resolve relative handler paths.
     * Defaults to process.cwd() and falls back to the package directory.
     */
    baseDir?: string;
    /**
     * Glob pattern used when searching for handler files.
     * Defaults to all supported extensions (ts, js, mjs, cjs).
     */
    pattern?: string;
    /**
     * List of file extensions that should be considered when scanning for handlers.
     * Extensions can be provided with or without the leading dot.
     */
    extensions?: string[];
    /**
      * Glob patterns that should be ignored while scanning.
      */
    ignore?: string[];
    /**
     * Custom factory that can be used to instantiate handler classes
     * (for example when you need to inject dependencies).
     */
    handlerFactory?: (handler: HandlerConstructor<IRequestHandler<any, any>>) => IRequestHandler<any, any> | Promise<IRequestHandler<any, any>>;
    /**
     * Controls what happens when the same request type is registered more than once.
     * Defaults to replacing the existing handler.
     */
    onDuplicate?: DuplicateHandlerBehavior;
}
