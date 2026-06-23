import { Handler } from "../../../src/decorators/Handler";

// A request whose handler is intentionally broken (missing `handle`).
export class BrokenRequest {}

// Annotated as a handler but does NOT implement IRequestHandler.
@Handler(BrokenRequest)
export class BrokenHandler {
  // intentionally missing handle()
}
