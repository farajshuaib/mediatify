import 'reflect-metadata';

const HANDLER_METADATA_KEY = Symbol('handler');

export function Handler(requestType: Function) {
  return function (target: Function) {
    Reflect.defineMetadata(HANDLER_METADATA_KEY, requestType, target);
  };
}

export function getHandlerMetadata(target: Function): Function | undefined {
  return Reflect.getMetadata(HANDLER_METADATA_KEY, target);
}