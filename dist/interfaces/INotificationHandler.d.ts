import { INotification } from "./INotification";
/**
 * Handles a notification published through the mediator.
 *
 * Multiple handlers can be registered for the same notification type; they are
 * all invoked when the notification is published.
 */
export interface INotificationHandler<TNotification extends INotification = INotification> {
    handle(notification: TNotification): Promise<void>;
}
