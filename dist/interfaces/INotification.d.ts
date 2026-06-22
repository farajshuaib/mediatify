/**
 * Marker interface for notifications (events) dispatched through `publish`.
 *
 * Unlike a request, a notification can be handled by zero, one, or many
 * `INotificationHandler`s and does not return a value.
 */
export interface INotification {
}
