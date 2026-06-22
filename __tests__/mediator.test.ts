import "reflect-metadata";
import * as path from "path";
import {
  Mediator,
  IPipeline,
  INotificationHandler,
  HandlerNotFoundError,
  DuplicateHandlerError,
} from "../src";
import { CreateUserCommand } from "../example/useCases/CreateUserRequest/CreateUserCommand";
import { CreateUserCommandResponse } from "../example/useCases/CreateUserRequest/CreateUserResponse";
import { GetUserQuery } from "../example/useCases/GetUserRequest/GetUserQuery";
import { GetUserQueryResponse } from "../example/useCases/GetUserRequest/GetUserResponse";
import { UserCreatedNotification } from "../example/notifications/UserCreatedNotification";

const { JsPingRequest } = require("../example/jsHandlers/JsPingHandler");

interface JsPingResponse {
  result: string;
}

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
  const notificationsPath = path.join(__dirname, "../example/notifications");

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
    ).rejects.toThrow(HandlerNotFoundError);

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

    const response = await mediator.send<any, JsPingResponse>(
      new JsPingRequest("hello")
    );

    expect(response.result).toBe("pong:hello");
  });

  it("can enforce duplicate handler policies", async () => {
    await mediator.registerHandlers(tsHandlersPath);

    await expect(
      mediator.registerHandlers(tsHandlersPath, { onDuplicate: "error" })
    ).rejects.toThrow(DuplicateHandlerError);

    // Skip mode should ignore duplicates without throwing
    await expect(
      mediator.registerHandlers(tsHandlersPath, { onDuplicate: "skip" })
    ).resolves.toBeUndefined();
  });

  it("exposes handler introspection helpers", async () => {
    expect(mediator.hasHandler("CreateUserCommand")).toBe(false);

    await mediator.registerHandlers(tsHandlersPath);
    expect(mediator.hasHandler("CreateUserCommand")).toBe(true);

    expect(mediator.unregisterHandler("CreateUserCommand")).toBe(true);
    expect(mediator.hasHandler("CreateUserCommand")).toBe(false);
    expect(mediator.unregisterHandler("CreateUserCommand")).toBe(false);
  });

  describe("notifications", () => {
    it("publishes a notification to every registered handler", async () => {
      await mediator.registerHandlers(notificationsPath);

      const handled: string[] = [];
      mediator.registerNotificationHandler<UserCreatedNotification>(
        "UserCreatedNotification",
        {
          async handle(notification) {
            handled.push(`probe:${notification.username}`);
          },
        }
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      // The two discovered handlers plus the manually registered probe all run.
      expect(handled).toContain("probe:faraj");
      expect(handled).toHaveLength(1);
    });

    it("runs all discovered handlers for a notification", async () => {
      const order: string[] = [];

      class FirstHandler
        implements INotificationHandler<UserCreatedNotification>
      {
        async handle(): Promise<void> {
          order.push("first");
        }
      }
      class SecondHandler
        implements INotificationHandler<UserCreatedNotification>
      {
        async handle(): Promise<void> {
          order.push("second");
        }
      }

      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        new FirstHandler()
      );
      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        new SecondHandler()
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      expect(order).toEqual(["first", "second"]);
    });

    it("is a no-op when no handlers are registered for a notification", async () => {
      await expect(
        mediator.publish(new UserCreatedNotification("nobody", "n@x.com"))
      ).resolves.toBeUndefined();
    });

    it("ignores duplicate handler classes on repeated scans", async () => {
      await mediator.registerHandlers(notificationsPath);
      await mediator.registerHandlers(notificationsPath);

      const handled: string[] = [];
      mediator.registerNotificationHandler<UserCreatedNotification>(
        "UserCreatedNotification",
        {
          async handle(notification) {
            handled.push(notification.username);
          },
        }
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      // Only the probe handler tracks into `handled`; the assertion proves the
      // two discovered handlers were not duplicated into four by the second scan.
      expect(handled).toEqual(["faraj"]);
    });
  });
});
