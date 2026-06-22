import { INotification } from "../../src/interfaces/INotification";

// Notification (event) — can be handled by zero, one, or many handlers.
export class UserCreatedNotification implements INotification {
  constructor(public username: string, public email: string) {}
}
