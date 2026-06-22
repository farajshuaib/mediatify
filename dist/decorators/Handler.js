"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = Handler;
exports.getHandlerMetadata = getHandlerMetadata;
exports.NotificationHandler = NotificationHandler;
exports.getNotificationHandlerMetadata = getNotificationHandlerMetadata;
require("reflect-metadata");
const HANDLER_METADATA_KEY = Symbol("mediatify:handler");
const NOTIFICATION_HANDLER_METADATA_KEY = Symbol("mediatify:notification-handler");
/**
 * Marks a class as the handler for a given request type so it can be picked up
 * automatically by `Mediator.registerHandlers`.
 *
 * @param requestType the request class this handler is responsible for
 */
function Handler(requestType) {
    return function (target) {
        Reflect.defineMetadata(HANDLER_METADATA_KEY, requestType, target);
    };
}
function getHandlerMetadata(target) {
    return Reflect.getMetadata(HANDLER_METADATA_KEY, target);
}
/**
 * Marks a class as a handler for a given notification type. Notifications may
 * have any number of handlers; every annotated handler is invoked when the
 * notification is published.
 *
 * @param notificationType the notification class this handler reacts to
 */
function NotificationHandler(notificationType) {
    return function (target) {
        Reflect.defineMetadata(NOTIFICATION_HANDLER_METADATA_KEY, notificationType, target);
    };
}
function getNotificationHandlerMetadata(target) {
    return Reflect.getMetadata(NOTIFICATION_HANDLER_METADATA_KEY, target);
}
