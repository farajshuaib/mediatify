import { IRequest } from "../../../src/interfaces/IRequest";
import { GetUserQueryResponse } from "./GetUserResponse";

export class GetUserQuery implements IRequest<GetUserQueryResponse> {
    constructor(public userId: number) {}
  }
