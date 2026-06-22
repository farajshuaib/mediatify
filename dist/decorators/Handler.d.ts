import "reflect-metadata";
/**
 * Marks a class as the handler for a given request type so it can be picked up
 * automatically by `Mediator.registerHandlers`.
 *
 * @param requestType the request class this handler is responsible for
 */
export declare function Handler(requestType: Function): (target: Function) => void;
export declare function getHandlerMetadata(target: Function): Function | undefined;
/**
 * Marks a class as a handler for a given notification type. Notifications may
 * have any number of handlers; every annotated handler is invoked when the
 * notification is published.
 *
 * @param notificationType the notification class this handler reacts to
 */
export declare function NotificationHandler(notificationType: Function): (target: Function) => void;
export declare function getNotificationHandlerMetadata(target: Function): Function | undefined;
