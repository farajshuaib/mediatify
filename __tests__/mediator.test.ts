import "reflect-metadata";
import * as path from "path";
import { Mediator } from "../src/Mediator";
import { IPipeline } from "../src/interfaces/IPipeline";
import { CreateUserCommand } from "../example/useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "../example/useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "../example/useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "../example/useCases/GetUserRequest/GetUserResponse";

const { JsPingRequest } = require("../example/jsHandlers/JsPingHandler");

class TrackingPipeline implements IPipeline<any, any> {
  constructor(
    private readonly label: string,
    private readonly events: string[]
  ) {}

  async process(_request: any, next: () => Promise<any>): Promise<any> {
    this.events.push(`${this.label}:before`);
    const response = await next();
    this.events.push(`${this.label}:after`);
    return response;
  }
}

describe("Mediator", () => {
  const mediator = Mediator.getInstance();
  const tsHandlersPath = path.join(__dirname, "../example/useCases");
  const jsHandlersPath = path.join(__dirname, "../example/jsHandlers");

  beforeEach(() => {
    mediator.reset();
  });

  it("should create a user successfully", async () => {
    await mediator.registerHandlers(tsHandlersPath);

    const response = await mediator.send<
      CreateUserCommand,
      CreateUserCommandResponse
    >(new CreateUserCommand("faraj", "farajshuaib@gmail.com"));

    expect(response.result).toBe(
      "User faraj created with email farajshuaib@gmail.com"
    );
  });

  it("should get user details successfully", async () => {
    await mediator.registerHandlers(tsHandlersPath);

    const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
      new GetUserQuery(1)
    );

    expect(response.result).toBe("Fetching user with id: 1");
  });

  it("should throw an error if no handler is found for the request type", async () => {
    await expect(
      mediator.send<CreateUserCommand, CreateUserCommandResponse>(
        new CreateUserCommand("faraj", "farajshuaib@gmail.com")
      )
    ).rejects.toThrow(
      "No handler found for request type: CreateUserCommand try registering the handler by using Handler() annotation"
    );
  });

  it("supports multiple pipeline executions without altering registration order", async () => {
    await mediator.registerHandlers(tsHandlersPath);
    const events: string[] = [];
    mediator.registerPipeline(new TrackingPipeline("first", events));
    mediator.registerPipeline(new TrackingPipeline("second", events));

    await mediator.send<GetUserQuery, GetUserQueryResponse>(new GetUserQuery(42));
    await mediator.send<GetUserQuery, GetUserQueryResponse>(new GetUserQuery(7));

    expect(events).toEqual([
      "first:before",
      "second:before",
      "second:after",
      "first:after",
      "first:before",
      "second:before",
      "second:after",
      "first:after",
    ]);
  });

  it("registers handlers defined in compiled JavaScript files", async () => {
    await mediator.registerHandlers(jsHandlersPath);

    const response = await mediator.send(new JsPingRequest("hello"));

    expect(response.result).toBe("pong:hello");
  });

  it("can enforce duplicate handler policies", async () => {
    await mediator.registerHandlers(tsHandlersPath);

    await expect(
      mediator.registerHandlers(tsHandlersPath, { onDuplicate: "error" })
    ).rejects.toThrow(
      'Handler for request type "CreateUserCommand" is already registered'
    );

    // Skip mode should ignore duplicates without throwing
    await expect(
      mediator.registerHandlers(tsHandlersPath, { onDuplicate: "skip" })
    ).resolves.toBeUndefined();
  });
});
