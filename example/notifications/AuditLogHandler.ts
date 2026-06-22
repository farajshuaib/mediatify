import { NotificationHandler } from "../../src/decorators/Handler";
import { INotificationHandler } from "../../src/interfaces/INotificationHandler";
import { UserCreatedNotification } from "./UserCreatedNotification";

// A second handler for the same notification — both run when published.
@NotificationHandler(UserCreatedNotification)
export class AuditLogHandler
  implements INotificationHandler<UserCreatedNotification>
{
  async handle(notification: UserCreatedNotification): Promise<void> {
    console.log(`Audit: user "${notification.username}" was created`);
  }
}
