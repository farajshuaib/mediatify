import "reflect-metadata";

const HANDLER_METADATA_KEY = Symbol("mediatify:handler");
const NOTIFICATION_HANDLER_METADATA_KEY = Symbol(
  "mediatify:notification-handler"
);

/**
 * Marks a class as the handler for a given request type so it can be picked up
 * automatically by `Mediator.registerHandlers`.
 *
 * @param requestType the request class this handler is responsible for
 */
export function Handler(requestType: Function) {
  return function (target: Function) {
    Reflect.defineMetadata(HANDLER_METADATA_KEY, requestType, target);
  };
}

export function getHandlerMetadata(target: Function): Function | undefined {
  return Reflect.getMetadata(HANDLER_METADATA_KEY, target);
}

/**
 * Marks a class as a handler for a given notification type. Notifications may
 * have any number of handlers; every annotated handler is invoked when the
 * notification is published.
 *
 * @param notificationType the notification class this handler reacts to
 */
export function NotificationHandler(notificationType: Function) {
  return function (target: Function) {
    Reflect.defineMetadata(
      NOTIFICATION_HANDLER_METADATA_KEY,
      notificationType,
      target
    );
  };
}

export function getNotificationHandlerMetadata(
  target: Function
): Function | undefined {
  return Reflect.getMetadata(NOTIFICATION_HANDLER_METADATA_KEY, target);
}
