# mediatify

A lightweight mediator implementation for TypeScript, inspired by ASP.NET Core MediatR, following the Command Query Responsibility Segregation (CQRS) pattern. This package helps to decouple request dispatching from request handling, allowing for better separation of concerns.

## Features

- CQRS pattern: Supports Commands and Queries in a single `IRequest` interface.
- Handler Registration: Handlers are automatically registered by scanning project directories for annotated classes.
- Pipeline Behavior: Supports pipeline behaviors (like logging, validation, etc.) that can be applied around requests.
- Singleton Mediator: A singleton mediator ensures all handlers are registered once and reused throughout the app.
- Asynchronous Support: Fully supports async/await for request handling and pipeline behaviors.

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
import { IPipeline } from 'mediator.ts';

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

## API

### Mediator Class

#### Methods

- `registerHandler(requestType: string, handler: IRequestHandler)`    Registers a handler for a specific request type.
- `registerPipeline(pipeline: IPipeline)` Registers a pipeline behavior to be applied to all requests.
- `send<TRequest extends IRequest<TResponse>, TResponse>(request: TRequest): Promise<TResponse>` Sends a request and invokes the corresponding handler, passing through the pipeline behaviors if registered.

### Annotations

Handlers are registered automatically by scanning the project files using the `@Handler` decorator.

### Pipeline

A pipeline is a function that processes a request before and/or after the handler is invoked.

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
