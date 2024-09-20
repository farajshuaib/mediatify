// example/main.ts
import { Mediator } from "../src/Mediator";
import path from "path";
import { CreateUserCommand } from "./useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "./useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "./useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "./useCases/GetUserRequest/GetUserResponse";

async function main() {
  const mediator = Mediator.getInstance();

  // Send a request
  const createUserCommandResponse = await mediator.send<
    CreateUserCommand,
    CreateUserCommandResponse
  >(new CreateUserCommand("faraj", "faraj.shuaip97@gmail.com"));
  const getUserQueryResponse = await mediator.send<
    GetUserQuery,
    GetUserQueryResponse
  >(new GetUserQuery(1));

  console.log(createUserCommandResponse.result);

  console.log(getUserQueryResponse.result);
}

main().catch(console.error);
