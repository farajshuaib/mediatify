"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = Handler;
exports.getHandlerMetadata = getHandlerMetadata;
require("reflect-metadata");
const HANDLER_METADATA_KEY = Symbol('handler');
function Handler(requestType) {
    return function (target) {
        Reflect.defineMetadata(HANDLER_METADATA_KEY, requestType, target);
    };
}
function getHandlerMetadata(target) {
    return Reflect.getMetadata(HANDLER_METADATA_KEY, target);
}
