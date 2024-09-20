import { IRequest } from 'mediator.ts/src/interfaces/IRequest';
import { CreateUserCommandResponse } from './CreateUserResponse';

// Request (Command or Query)
export class CreateUserCommand implements IRequest<CreateUserCommandResponse> {
  constructor(public username: string, public email: string) {}
}