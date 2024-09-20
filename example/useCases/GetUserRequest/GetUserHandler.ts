import { Handler } from "../../../src/decorators/Handler";
import { IRequestHandler } from "../../../src/interfaces/IHandler";
import { GetUserQuery } from "./GetUserQuery";
import { GetUserQueryResponse } from "./GetUserResponse";


// Handler
@Handler()
export class GetUserQueryHandler implements IRequestHandler<GetUserQuery, GetUserQueryResponse> {
  async handle(request: GetUserQuery): Promise<GetUserQueryResponse> {
    return new GetUserQueryResponse(`Fetching user with id: ${request.userId}`);
  }
}