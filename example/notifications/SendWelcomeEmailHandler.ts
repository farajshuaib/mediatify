import { NotificationHandler } from "../../src/decorators/Handler";
import { INotificationHandler } from "../../src/interfaces/INotificationHandler";
import { UserCreatedNotification } from "./UserCreatedNotification";

@NotificationHandler(UserCreatedNotification)
export class SendWelcomeEmailHandler
  implements INotificationHandler<UserCreatedNotification>
{
  async handle(notification: UserCreatedNotification): Promise<void> {
    console.log(`Sending welcome email to ${notification.email}`);
  }
}
