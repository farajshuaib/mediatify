// example/main.ts
import { Mediator } from "../src/Mediator";
import { LoggingPipeline } from "./pipeline/LoggingPipeline";
import { CreateUserCommand } from "./useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "./useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "./useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "./useCases/GetUserRequest/GetUserResponse";

async function main() {
  const mediator = Mediator.getInstance();
  await mediator.registerHandlers("../example/useCases/");

  mediator.registerPipeline(new LoggingPipeline());


  // Send a request
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
}

main().catch(console.error);
