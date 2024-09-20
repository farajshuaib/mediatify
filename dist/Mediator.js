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
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
const Handler_1 = require("./decorators/Handler");
class Mediator {
    constructor() {
        this.handlers = new Map();
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
     * Register a pipeline to be executed before the handler
     * @param pipeline the pipeline to be executed
     */
    registerPipeline(pipeline) {
        this.pipelines.push(pipeline);
    }
    /**
     *
     * @param request the request object to be sent to the handler
     * @returns  the response object from the handler
     * @throws an error if no handler is found for the request type or if the handler does not implement IRequestHandler interface so make sure to register all handlers before sending a request
     */
    async send(request) {
        const requestType = request.constructor.name;
        const handler = this.handlers.get(requestType);
        if (!handler) {
            throw new Error(`No handler found for request type: ${requestType} try registering the handler by using Handler() annotation`);
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
    async registerHandlers(handlersPath = "") {
        // Find all .ts files in the specified directory and load them
        const dires = path.resolve(__dirname, handlersPath);
        const files = glob.sync("**/*.ts", { cwd: dires, absolute: true });
        if (files.length === 0) {
            throw new Error("No ts files found in the specified directory");
        }
        for (const file of files) {
            // Dynamically import the handler module
            const module = await Promise.resolve(`${file}`).then(s => __importStar(require(s)));
            // Iterate through all exports to find handler classes
            for (const exported of Object.values(module)) {
                if (typeof exported == "function") {
                    const requestType = (0, Handler_1.getHandlerMetadata)(exported);
                    if (requestType) {
                        const HandlerClass = exported;
                        const handlerInstance = new HandlerClass();
                        this.registerHandler(requestType.name, handlerInstance);
                    }
                }
            }
        }
    }
}
exports.Mediator = Mediator;
