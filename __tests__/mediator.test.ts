import "reflect-metadata";
import { CreateUserCommand } from "../example/useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "../example/useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "../example/useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "../example/useCases/GetUserRequest/GetUserResponse";
import { Mediator } from "../src/Mediator";

describe("Mediator", () => {
  const mediator = Mediator.getInstance();

  beforeEach(async () => {
    await mediator.registerHandlers("../example/useCases/");
    
  });

  it("should create a user successfully", async () => {
    const createUserCommandResponse = await mediator.send<
      CreateUserCommand,
      CreateUserCommandResponse
    >(new CreateUserCommand("faraj", "farajshuaib@gmail.com"));

    console.log(createUserCommandResponse);

    expect(createUserCommandResponse.result).toBe(
      "User faraj created with email farajshuaib@gmail.com"
    );
  });

  it("should get user details successfully", async () => {
    const getUserQueryResponse = await mediator.send<
      GetUserQuery,
      GetUserQueryResponse
    >(new GetUserQuery(1));

    expect(getUserQueryResponse.result).toBe(`Fetching user with id: 1`);
  });
});
