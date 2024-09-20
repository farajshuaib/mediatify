import { IRequest } from './interfaces/IRequest';
import { IPipeline } from './interfaces/IPipeline';
export declare class Mediator {
    private handlers;
    private pipelines;
    private static instance;
    private constructor();
    static getInstance(): Mediator;
    registerHandler<TRequest, TResponse>(handlerClass: Function, handlerInstance: any): void;
    registerPipeline<TRequest, TResponse>(pipeline: IPipeline<TRequest, TResponse>): void;
    send<TRequest extends IRequest<TResponse>, TResponse>(request: TRequest): Promise<TResponse>;
}
