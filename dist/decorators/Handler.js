"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = Handler;
exports.getHandlerMetadata = getHandlerMetadata;
require("reflect-metadata");
var Mediator_1 = require("../Mediator");
var HANDLER_METADATA_KEY = Symbol("handler");
function Handler() {
    return function (target) {
        var mediatorInstance = Mediator_1.Mediator.getInstance();
        var requestType = getHandlerMetadata(target);
        if (requestType) {
            var handlerInstance = target();
            mediatorInstance.registerHandler(target, handlerInstance);
        }
    };
}
// Function to retrieve metadata for the handler
function getHandlerMetadata(handlerClass) {
    // Implement a way to retrieve the request type if needed
    // For example, using a static property on the handler class
    return handlerClass.requestType;
}
