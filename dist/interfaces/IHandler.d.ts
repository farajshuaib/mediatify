import { IRequest } from "./IRequest";
export interface IHandler<TRequest extends IRequest<TResponse>, TResponse> {
    handle(request: TRequest): Promise<TResponse>;
}
