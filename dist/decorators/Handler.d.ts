import 'reflect-metadata';
export declare function Handler(requestType: Function): (target: Function) => void;
export declare function getHandlerMetadata(target: Function): Function | undefined;
