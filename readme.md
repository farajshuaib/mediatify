# mediatify

A lightweight mediator implementation for TypeScript, inspired by ASP.NET Core MediatR, following the Command Query Responsibility Segregation (CQRS) pattern. This package helps to decouple request dispatching from request handling, allowing for better separation of concerns.

## Features

- CQRS pattern: Supports Commands and Queries in a single `IRequest` interface.
- Notifications: Publish events to many handlers at once with `@NotificationHandler` and `publish`.
- Handler Registration: Handlers are automatically registered by scanning project directories for annotated classes (supports `.ts`, `.js`, `.mjs`, `.cjs` out of the box).
- Pipeline Behavior: Supports pipeline behaviors (like logging, validation, etc.) that can be applied around requests.
- Singleton Mediator: A singleton mediator ensures all handlers are registered once and reused throughout the app.
- Typed Errors: Failures throw dedicated error classes (e.g. `HandlerNotFoundError`) that all extend `MediatifyError`.
- Testing Friendly: The mediator can be reset between tests so you can control which handlers are available per test case.
- Asynchronous Support: Fully supports async/await for request handling, notifications, and pipeline behaviors.

## Installation

You can install the package via npm:

```bash
npm install mediatify
```

```bash
yarn add mediatify
```

## Usage

### Example: CreateUserCommand

#### Step 1: Define the Command (Request, Response)

```ts
// core/useCase/createUser/CreateUserCommand.ts
export class CreateUserCommand implements IRequest<CreateUserCommandResponse> {
  constructor(public username: string, public email: string) {}
}

```

```ts
// core/useCase/createUser/CreateUserCommandResponse.ts
export class CreateUserCommandResponse {
  constructor(public result: User) {}
}
```

This `CreateUserCommand` will be used to create a new user, and the `CreateUserCommandResponse` contains the user model as a response.

#### Step 2: Define the Command Handler

```ts
// ore/useCase/createUser/CreateUserCommandHandler.ts
export class CreateUserCommandHandler implements IRequestHandler<CreateUserCommand, CreateUserCommandResponse> {

    constructor(@Inject(HttpClient) private httpClient: HttpClient) {}

    async handle(request: CreateUserCommand): Promise<CreateUserCommandResponse> {
        // Simulate user creation logic
        const response = await this.httpClient.post(API_URL, request);
        return new CreateUserResponse(response.data);
    }
}
```

The `CreateUserCommandHandler` is responsible for handling the `CreateUserCommand` and returning a new user object.

#### Step 3: Define a Pipeline (Optional)

Pipelines allow you to run custom logic before or after a request is handled:

```ts
// pipelines/LoggingPipeline.ts
import { IPipeline } from "mediatify";

export class LoggingPipeline<TRequest, TResponse> implements IPipeline<TRequest, TResponse> {
  async process(request: TRequest, next: () => Promise<TResponse>): Promise<TResponse> {
    console.log('Handling request:', request);
    const response = await next();
    console.log('response:' , response);
    return response;
  }
}
```

#### Step 4: Register Handlers and Pipelines

Handlers are automatically registered by scanning the project directories. Below is an example of registering the `CreateUserCommandHandler` and using the pipeline:

```ts
async function main() {
  const mediator = Mediator.getInstance();
  await mediator.registerHandlers("../core/useCases/");

  mediator.registerPipeline(new LoggingPipeline());


  // Send a request
  const request = new CreateUserCommand("faraj", "farajshuaib@gmail.com");

  const createUserCommandResponse = await mediator.send<CreateUserCommand,CreateUserCommandResponse>(request);
  

  console.log(createUserCommandResponse.result);

}

```

## Notifications (publish / subscribe)

Where a request has exactly one handler and returns a response, a **notification**
is an event that can be handled by zero, one, or many handlers and returns nothing.
Annotate handlers with `@NotificationHandler` and dispatch with `publish`:

```ts
// notifications/UserCreatedNotification.ts
import { INotification } from "mediatify";

export class UserCreatedNotification implements INotification {
  constructor(public username: string, public email: string) {}
}
```

```ts
// notifications/SendWelcomeEmailHandler.ts
import { NotificationHandler, INotificationHandler } from "mediatify";
import { UserCreatedNotification } from "./UserCreatedNotification";

@NotificationHandler(UserCreatedNotification)
export class SendWelcomeEmailHandler
  implements INotificationHandler<UserCreatedNotification>
{
  async handle(notification: UserCreatedNotification): Promise<void> {
    await sendEmail(notification.email);
  }
}
```

```ts
// Notification handlers are discovered by registerHandlers just like request handlers.
await mediator.registerHandlers("./useCases");

// Every handler registered for UserCreatedNotification runs (concurrently).
await mediator.publish(new UserCreatedNotification("faraj", "faraj@example.com"));
```

Publishing a notification with no registered handlers is a no-op. Notifications do
not pass through request pipelines.

## API

### Mediator Class

#### Methods

- `reset()` Resets the registered handlers, notification handlers and pipelines. Helpful inside unit tests.
- `registerHandler(requestType: string, handler: IRequestHandler)` Registers a handler for a specific request type.
- `registerNotificationHandler(notificationType: string, handler: INotificationHandler)` Registers a handler for a notification type (duplicate handler classes are ignored).
- `registerPipeline(pipeline: IPipeline)` Registers a pipeline behavior to be applied to all requests.
- `clearPipelines()` Removes all registered pipelines while keeping handlers intact.
- `hasHandler(requestType: string): boolean` Returns whether a handler is registered for a request type.
- `unregisterHandler(requestType: string): boolean` Removes the handler for a request type; returns whether one existed.
- `send<TRequest extends IRequest<TResponse>, TResponse>(request: TRequest): Promise<TResponse>` Sends a request and invokes the corresponding handler, passing through the pipeline behaviors if registered.
- `publish<TNotification extends INotification>(notification: TNotification): Promise<void>` Publishes a notification to every registered handler.
- `registerHandlers(pathOrOptions?: string | RegisterHandlersOptions, options?: RegisterHandlersOptions)` Scans a directory for annotated request and notification handlers and registers them automatically.

#### `registerHandlers` Options

`registerHandlers` can accept either a directory path or an options object (or both).  
The available options are:

| Option | Description |
| --- | --- |
| `baseDir` | Overrides the base directory used to resolve a relative handlers path (defaults to `process.cwd()` with a fallback to the package directory). |
| `pattern` | Custom glob pattern for handler discovery. If omitted the mediator looks for `.ts`, `.js`, `.mjs` and `.cjs` files. |
| `extensions` | Explicit list of extensions that should be scanned. |
| `ignore` | Glob patterns that should be ignored while scanning. |
| `handlerFactory` | Function that receives the handler constructor and returns an instance. Useful for wiring your own dependency injection container. |
| `onDuplicate` | How to behave when the same request type is discovered twice. Accepts `"replace"` (default), `"skip"` or `"error"`. |

```ts
const mediator = Mediator.getInstance();
await mediator.registerHandlers("./build/useCases", {
  baseDir: __dirname,
  onDuplicate: "skip",
  handlerFactory: (HandlerClass) => container.resolve(HandlerClass),
});
```

### Annotations

Handlers are registered automatically by scanning the project files using the `@Handler` decorator (for requests) and `@NotificationHandler` decorator (for notifications). Both TypeScript source files and already-compiled JavaScript files will be discovered by default.

### Errors

All errors thrown by the library extend `MediatifyError`, so you can catch them with a single `instanceof MediatifyError` check, or narrow to a specific type:

| Error | Thrown when |
| --- | --- |
| `HandlerNotFoundError` | `send` is called with a request type that has no registered handler. |
| `DuplicateHandlerError` | A request type is discovered twice and `onDuplicate` is `"error"`. |
| `InvalidHandlerError` | An annotated class does not implement a `handle` method. |
| `HandlersDirectoryNotFoundError` | `registerHandlers` cannot resolve the provided directory. |
| `NoHandlerFilesFoundError` | The resolved directory contains no matching files. |

### Pipeline

A pipeline is a function that processes a request before and/or after the handler is invoked. Pipelines are executed in the order they are registered and can now safely be reused across requests without worrying about registration order being mutated.

```ts
interface IPipeline<TRequest, TResponse> {
  process(request: TRequest, next: () => Promise<TResponse>): Promise<TResponse>;
}
```

## Inspired by

This package is heavily inspired by the MediatR library in ASP.NET Core, which implements the mediator pattern in .NET.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Run the tests (`yarn test`).
5. Commit your changes (`git commit -am 'Add new feature'`).
6. Push to the branch (`git push origin feature-branch`).
7. Create a new Pull Request.
8. Get your changes reviewed.

## License

This project is licensed under the MIT License.
