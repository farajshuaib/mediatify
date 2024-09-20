export interface IPipeline<TRequest, TResponse> {
    process(request: TRequest, next: () => Promise<TResponse>): Promise<TResponse>;
  }