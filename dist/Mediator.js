"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mediator = void 0;
require("reflect-metadata");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
const Handler_1 = require("./decorators/Handler");
const errors_1 = require("./errors");
class Mediator {
    constructor() {
        this.handlers = new Map();
        this.notificationHandlers = new Map();
        this.pipelines = [];
    }
    static getInstance() {
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
    registerHandler(requestType, handler) {
        this.handlers.set(requestType, handler);
    }
    /**
     * Register a handler for a specific notification type. Unlike requests,
     * a notification may have any number of handlers; duplicates of the same
     * handler class are ignored so repeated scans stay idempotent.
     * @param notificationType the notification type to react to
     * @param handler the handler to invoke when the notification is published
     */
    registerNotificationHandler(notificationType, handler) {
        var _a;
        const handlers = (_a = this.notificationHandlers.get(notificationType)) !== null && _a !== void 0 ? _a : [];
        const alreadyRegistered = handlers.some((existing) => existing.constructor === handler.constructor);
        if (!alreadyRegistered) {
            handlers.push(handler);
        }
        this.notificationHandlers.set(notificationType, handlers);
    }
    /**
     * Register a pipeline to be executed before the handler
     * @param pipeline the pipeline to be executed
     */
    registerPipeline(pipeline) {
        this.pipelines.push(pipeline);
    }
    /**
     * Returns true when a handler is registered for the given request type.
     */
    hasHandler(requestType) {
        return this.handlers.has(requestType);
    }
    /**
     * Removes the handler registered for the given request type.
     * @returns true if a handler existed and was removed
     */
    unregisterHandler(requestType) {
        return this.handlers.delete(requestType);
    }
    /**
     * Removes all registered pipelines while keeping handlers intact.
     */
    clearPipelines() {
        this.pipelines.length = 0;
    }
    /**
     * Reset handlers, notification handlers and pipelines.
     * Mostly useful for testing scenarios.
     */
    reset() {
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
    async send(request) {
        const requestType = request.constructor.name;
        const handler = this.handlers.get(requestType);
        if (!handler) {
            throw new errors_1.HandlerNotFoundError(requestType);
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
    async publish(notification) {
        var _a;
        const notificationType = notification
            .constructor.name;
        const handlers = (_a = this.notificationHandlers.get(notificationType)) !== null && _a !== void 0 ? _a : [];
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
    async registerHandlers(handlersPathOrOptions = "", maybeOptions = {}) {
        var _a, _b;
        const { handlersPath, options } = this.normalizeHandlerArgs(handlersPathOrOptions, maybeOptions);
        const directories = this.resolveDirectories(handlersPath, options);
        if (!directories.length) {
            throw new errors_1.HandlersDirectoryNotFoundError(handlersPath);
        }
        const files = this.findHandlerFiles(directories, options);
        if (!files.length) {
            throw new errors_1.NoHandlerFilesFoundError();
        }
        const handlerFactory = (_a = options.handlerFactory) !== null && _a !== void 0 ? _a : ((HandlerClass) => new HandlerClass());
        const duplicateBehavior = (_b = options.onDuplicate) !== null && _b !== void 0 ? _b : "replace";
        for (const file of files) {
            const module = await Promise.resolve(`${file}`).then(s => __importStar(require(s)));
            for (const exported of Object.values(module)) {
                if (typeof exported !== "function") {
                    continue;
                }
                const requestType = (0, Handler_1.getHandlerMetadata)(exported);
                const notificationType = (0, Handler_1.getNotificationHandlerMetadata)(exported);
                if (!requestType && !notificationType) {
                    continue;
                }
                const HandlerClass = exported;
                const handlerInstance = await Promise.resolve(handlerFactory(HandlerClass));
                if (!handlerInstance ||
                    typeof handlerInstance.handle !==
                        "function") {
                    throw new errors_1.InvalidHandlerError(HandlerClass.name);
                }
                if (requestType &&
                    this.shouldRegisterHandler(requestType.name, duplicateBehavior)) {
                    this.registerHandler(requestType.name, handlerInstance);
                }
                if (notificationType) {
                    this.registerNotificationHandler(notificationType.name, handlerInstance);
                }
            }
        }
    }
    normalizeHandlerArgs(handlersPathOrOptions, maybeOptions) {
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
    resolveDirectories(handlersPath, options) {
        const dirs = new Set();
        const candidateDirs = [];
        if (handlersPath) {
            if (path.isAbsolute(handlersPath)) {
                candidateDirs.push(handlersPath);
            }
            else {
                if (options.baseDir) {
                    candidateDirs.push(path.resolve(options.baseDir, handlersPath));
                }
                candidateDirs.push(path.resolve(process.cwd(), handlersPath));
                candidateDirs.push(path.resolve(__dirname, handlersPath));
            }
        }
        else {
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
    findHandlerFiles(directories, options) {
        var _a, _b;
        const extensions = this.buildExtensions(options.extensions);
        const pattern = (_a = options.pattern) !== null && _a !== void 0 ? _a : `**/*.{${extensions.map((ext) => ext.replace(/^\./, "")).join(",")}}`;
        const ignore = (_b = options.ignore) !== null && _b !== void 0 ? _b : [];
        const files = new Set();
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
    buildExtensions(extensions) {
        if (!extensions || !extensions.length) {
            return [".ts", ".js", ".mjs", ".cjs"];
        }
        return extensions.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
    }
    shouldRegisterHandler(requestType, duplicateBehavior) {
        if (!this.handlers.has(requestType)) {
            return true;
        }
        if (duplicateBehavior === "replace") {
            return true;
        }
        if (duplicateBehavior === "skip") {
            return false;
        }
        throw new errors_1.DuplicateHandlerError(requestType);
    }
}
exports.Mediator = Mediator;
