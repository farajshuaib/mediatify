import { IPipeline } from "../../src/interfaces/IPipeline";

export class LoggingPipeline<TRequest, TResponse>
  implements IPipeline<TRequest, TResponse>
{
  async process(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse> {
    console.log("Before handling request", request);
    const result = await next();
    console.log("After handling request", result);
    return result;
  }
}
