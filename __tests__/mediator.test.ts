import "reflect-metadata";
import * as path from "path";
import {
  Mediator,
  IPipeline,
  INotificationHandler,
  MediatifyError,
  HandlerNotFoundError,
  DuplicateHandlerError,
  InvalidHandlerError,
  HandlersDirectoryNotFoundError,
  NoHandlerFilesFoundError,
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

/** Collects every notification it receives into a shared array. */
function probe(sink: string[]): INotificationHandler<UserCreatedNotification> {
  return {
    async handle(notification) {
      sink.push(notification.username);
    },
  };
}

describe("Mediator", () => {
  const mediator = Mediator.getInstance();
  const tsHandlersPath = path.join(__dirname, "../example/useCases");
  const jsHandlersPath = path.join(__dirname, "../example/jsHandlers");
  const notificationsPath = path.join(__dirname, "../example/notifications");
  const invalidHandlersPath = path.join(__dirname, "fixtures/invalid");

  beforeEach(() => {
    mediator.reset();
  });

  describe("getInstance", () => {
    it("always returns the same singleton instance", () => {
      expect(Mediator.getInstance()).toBe(mediator);
      expect(Mediator.getInstance()).toBe(Mediator.getInstance());
    });
  });

  describe("send", () => {
    it("creates a user successfully", async () => {
      await mediator.registerHandlers(tsHandlersPath);

      const response = await mediator.send<
        CreateUserCommand,
        CreateUserCommandResponse
      >(new CreateUserCommand("faraj", "farajshuaib@gmail.com"));

      expect(response.result).toBe(
        "User faraj created with email farajshuaib@gmail.com"
      );
    });

    it("gets user details successfully", async () => {
      await mediator.registerHandlers(tsHandlersPath);

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(1)
      );

      expect(response.result).toBe("Fetching user with id: 1");
    });

    it("invokes a manually registered handler", async () => {
      mediator.registerHandler<GetUserQuery, GetUserQueryResponse>(
        "GetUserQuery",
        {
          async handle(request) {
            return new GetUserQueryResponse(`manual:${request.userId}`);
          },
        }
      );

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(5)
      );

      expect(response.result).toBe("manual:5");
    });

    it("registers handlers defined in compiled JavaScript files", async () => {
      await mediator.registerHandlers(jsHandlersPath);

      const response = await mediator.send<any, JsPingResponse>(
        new JsPingRequest("hello")
      );

      expect(response.result).toBe("pong:hello");
    });

    it("throws HandlerNotFoundError when no handler is registered", async () => {
      const error = await mediator
        .send<CreateUserCommand, CreateUserCommandResponse>(
          new CreateUserCommand("faraj", "farajshuaib@gmail.com")
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(HandlerNotFoundError);
      expect(error).toBeInstanceOf(MediatifyError);
      expect(error.requestType).toBe("CreateUserCommand");
      expect(error.name).toBe("HandlerNotFoundError");
      expect(error.message).toBe(
        "No handler found for request type: CreateUserCommand try registering the handler by using Handler() annotation"
      );
    });
  });

  describe("pipelines", () => {
    it("executes multiple pipelines without altering registration order", async () => {
      await mediator.registerHandlers(tsHandlersPath);
      const events: string[] = [];
      mediator.registerPipeline(new TrackingPipeline("first", events));
      mediator.registerPipeline(new TrackingPipeline("second", events));

      await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(42)
      );
      await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(7)
      );

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

    it("lets a pipeline transform the handler response", async () => {
      await mediator.registerHandlers(tsHandlersPath);
      mediator.registerPipeline({
        async process(_request, next) {
          const response = (await next()) as GetUserQueryResponse;
          return new GetUserQueryResponse(response.result.toUpperCase());
        },
      });

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(1)
      );

      expect(response.result).toBe("FETCHING USER WITH ID: 1");
    });

    it("lets a pipeline short-circuit without invoking the handler", async () => {
      let handlerCalled = false;
      mediator.registerHandler<GetUserQuery, GetUserQueryResponse>(
        "GetUserQuery",
        {
          async handle() {
            handlerCalled = true;
            return new GetUserQueryResponse("from-handler");
          },
        }
      );
      mediator.registerPipeline({
        async process() {
          return new GetUserQueryResponse("short-circuited");
        },
      });

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(1)
      );

      expect(response.result).toBe("short-circuited");
      expect(handlerCalled).toBe(false);
    });

    it("clearPipelines removes pipelines but keeps handlers", async () => {
      await mediator.registerHandlers(tsHandlersPath);
      const events: string[] = [];
      mediator.registerPipeline(new TrackingPipeline("p", events));

      mediator.clearPipelines();
      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(1)
      );

      expect(events).toEqual([]);
      expect(response.result).toBe("Fetching user with id: 1");
      expect(mediator.hasHandler("GetUserQuery")).toBe(true);
    });
  });

  describe("registerHandlers discovery", () => {
    it("accepts an options-only object using baseDir", async () => {
      await mediator.registerHandlers({ baseDir: tsHandlersPath });

      expect(mediator.hasHandler("CreateUserCommand")).toBe(true);
      expect(mediator.hasHandler("GetUserQuery")).toBe(true);
    });

    it("uses a custom handlerFactory for instantiation", async () => {
      const built: string[] = [];
      await mediator.registerHandlers(tsHandlersPath, {
        handlerFactory: (HandlerClass) => {
          built.push(HandlerClass.name);
          return new HandlerClass();
        },
      });

      expect(built).toEqual(
        expect.arrayContaining([
          "CreateUserCommandHandler",
          "GetUserQueryHandler",
        ])
      );

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(1)
      );
      expect(response.result).toBe("Fetching user with id: 1");
    });

    it("supports an async handlerFactory", async () => {
      await mediator.registerHandlers(tsHandlersPath, {
        handlerFactory: async (HandlerClass) => new HandlerClass(),
      });

      const response = await mediator.send<GetUserQuery, GetUserQueryResponse>(
        new GetUserQuery(9)
      );
      expect(response.result).toBe("Fetching user with id: 9");
    });

    it("honours ignore patterns", async () => {
      await mediator.registerHandlers(tsHandlersPath, {
        ignore: ["**/CreateUserHandler.ts"],
      });

      expect(mediator.hasHandler("CreateUserCommand")).toBe(false);
      expect(mediator.hasHandler("GetUserQuery")).toBe(true);
    });
  });

  describe("registerHandlers duplicate policies", () => {
    it("replaces an existing handler by default", async () => {
      mediator.registerHandler<CreateUserCommand, CreateUserCommandResponse>(
        "CreateUserCommand",
        {
          async handle() {
            return new CreateUserCommandResponse("stub");
          },
        }
      );

      await mediator.registerHandlers(tsHandlersPath); // default: "replace"

      const response = await mediator.send<
        CreateUserCommand,
        CreateUserCommandResponse
      >(new CreateUserCommand("faraj", "farajshuaib@gmail.com"));
      expect(response.result).toBe(
        "User faraj created with email farajshuaib@gmail.com"
      );
    });

    it("skips duplicates without throwing", async () => {
      await mediator.registerHandlers(tsHandlersPath);

      await expect(
        mediator.registerHandlers(tsHandlersPath, { onDuplicate: "skip" })
      ).resolves.toBeUndefined();
    });

    it("throws DuplicateHandlerError when configured to error", async () => {
      await mediator.registerHandlers(tsHandlersPath);

      const error = await mediator
        .registerHandlers(tsHandlersPath, { onDuplicate: "error" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateHandlerError);
      expect(error).toBeInstanceOf(MediatifyError);
      // Either discovered handler may be hit first depending on scan order.
      expect(["CreateUserCommand", "GetUserQuery"]).toContain(
        error.requestType
      );
      expect(error.message).toBe(
        `Handler for request type "${error.requestType}" is already registered`
      );
    });
  });

  describe("registerHandlers errors", () => {
    it("throws HandlersDirectoryNotFoundError for a missing directory", async () => {
      const missing = path.join(__dirname, "does/not/exist");

      const error = await mediator.registerHandlers(missing).catch((e) => e);

      expect(error).toBeInstanceOf(HandlersDirectoryNotFoundError);
      expect(error.handlersPath).toBe(missing);
    });

    it("throws NoHandlerFilesFoundError when nothing matches", async () => {
      const error = await mediator
        .registerHandlers(tsHandlersPath, { extensions: ["mdx"] })
        .catch((e) => e);

      expect(error).toBeInstanceOf(NoHandlerFilesFoundError);
    });

    it("throws InvalidHandlerError when a handler lacks handle()", async () => {
      const error = await mediator
        .registerHandlers(invalidHandlersPath)
        .catch((e) => e);

      expect(error).toBeInstanceOf(InvalidHandlerError);
      expect(error.handlerName).toBe("BrokenHandler");
    });
  });

  describe("introspection helpers", () => {
    it("reports and removes handlers", async () => {
      expect(mediator.hasHandler("CreateUserCommand")).toBe(false);

      await mediator.registerHandlers(tsHandlersPath);
      expect(mediator.hasHandler("CreateUserCommand")).toBe(true);

      expect(mediator.unregisterHandler("CreateUserCommand")).toBe(true);
      expect(mediator.hasHandler("CreateUserCommand")).toBe(false);
      expect(mediator.unregisterHandler("CreateUserCommand")).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears handlers, pipelines and notification handlers", async () => {
      const calls: string[] = [];
      await mediator.registerHandlers(tsHandlersPath);
      mediator.registerPipeline(new TrackingPipeline("p", []));
      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        probe(calls)
      );

      mediator.reset();

      expect(mediator.hasHandler("CreateUserCommand")).toBe(false);
      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));
      expect(calls).toEqual([]); // notification handler was cleared
    });
  });

  describe("notifications", () => {
    it("runs every discovered handler for a notification", async () => {
      await mediator.registerHandlers(notificationsPath);

      const calls: string[] = [];
      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        probe(calls)
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      // The probe runs alongside the two discovered handlers.
      expect(calls).toEqual(["faraj"]);
    });

    it("runs manually registered handlers in registration order", async () => {
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

    it("is a no-op when no handlers are registered", async () => {
      await expect(
        mediator.publish(new UserCreatedNotification("nobody", "n@x.com"))
      ).resolves.toBeUndefined();
    });

    it("rejects when a notification handler throws", async () => {
      mediator.registerNotificationHandler("UserCreatedNotification", {
        async handle() {
          throw new Error("boom");
        },
      });

      await expect(
        mediator.publish(new UserCreatedNotification("faraj", "f@x.com"))
      ).rejects.toThrow("boom");
    });

    it("deduplicates handlers of the same class", async () => {
      const calls: string[] = [];
      class DupHandler
        implements INotificationHandler<UserCreatedNotification>
      {
        async handle(): Promise<void> {
          calls.push("dup");
        }
      }

      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        new DupHandler()
      );
      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        new DupHandler()
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      expect(calls).toEqual(["dup"]);
    });

    it("ignores duplicate handler classes across repeated scans", async () => {
      await mediator.registerHandlers(notificationsPath);
      await mediator.registerHandlers(notificationsPath);

      const calls: string[] = [];
      mediator.registerNotificationHandler(
        "UserCreatedNotification",
        probe(calls)
      );

      await mediator.publish(new UserCreatedNotification("faraj", "f@x.com"));

      // Only the probe tracks into `calls`; proves the scan did not duplicate
      // the two discovered handlers into four.
      expect(calls).toEqual(["faraj"]);
    });
  });
});
