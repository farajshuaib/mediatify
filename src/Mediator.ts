import { IRequestHandler } from "./interfaces/IHandler";
import { IRequest } from "./interfaces/IRequest";

export class Mediator {
  private handlers: Map<string, IRequestHandler<any, any>> = new Map();

  // Singleton instance
  private static instance: Mediator;

  private constructor() {}

  public static getInstance(): Mediator {
    if (!Mediator.instance) {
      Mediator.instance = new Mediator();
    }
    return Mediator.instance;
  }

  // Register Command or Query Handlers
  registerHandler<TRequest extends IRequest<TResponse>, TResponse>(
    handler: IRequestHandler<TRequest, TResponse>
  ) {
    const requestType = handler.constructor.name;
    this.handlers.set(requestType, handler);
  }

  async send<TRequest extends IRequest<TResponse>, TResponse>(
    request: TRequest
  ): Promise<TResponse> {
    const requestType = request.constructor.name;
    const handler = this.handlers.get(requestType);

    if (!handler) {
      throw new Error(
        `No handler found for request type: ${requestType} try registering the handler by using Handler() decorator`
      );
    }

    return await handler.handle(request);
  }
}
