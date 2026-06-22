// example/main.ts
import { Mediator } from "../src";
import { LoggingPipeline } from "./pipeline/LoggingPipeline";
import { CreateUserCommand } from "./useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "./useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "./useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "./useCases/GetUserRequest/GetUserResponse";
import { UserCreatedNotification } from "./notifications/UserCreatedNotification";

async function main() {
  const mediator = Mediator.getInstance();
  // Scan the whole example directory for both request and notification handlers.
  await mediator.registerHandlers(__dirname);

  mediator.registerPipeline(new LoggingPipeline());

  // Send a request (single handler, returns a response)
  const createUserCommandResponse = await mediator.send<
    CreateUserCommand,
    CreateUserCommandResponse
  >(new CreateUserCommand("faraj", "farajshuaib@gmail.com"));
  const getUserQueryResponse = await mediator.send<
    GetUserQuery,
    GetUserQueryResponse
  >(new GetUserQuery(1));

  console.log(createUserCommandResponse.result);
  console.log(getUserQueryResponse.result);

  // Publish a notification (fans out to every registered handler)
  await mediator.publish(
    new UserCreatedNotification("faraj", "farajshuaib@gmail.com")
  );
}

main().catch(console.error);
