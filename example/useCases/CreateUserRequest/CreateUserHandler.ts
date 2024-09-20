import { Handler } from "../../../src/decorators/Handler";
import { IRequestHandler } from "../../../src/interfaces/IHandler";
import { CreateUserCommand } from "./CreateUserCommand";
import { CreateUserCommandResponse } from "./CreateUserResponse";

// Handler
@Handler(CreateUserCommand)
export class CreateUserCommandHandler implements IRequestHandler<CreateUserCommand, CreateUserCommandResponse> {
  async handle(request: CreateUserCommand): Promise<CreateUserCommandResponse> {
    return new CreateUserCommandResponse(`User ${request.username} created with email ${request.email}`);
  }
}