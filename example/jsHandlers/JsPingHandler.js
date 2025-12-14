const { Handler } = require("../../src/decorators/Handler");

class JsPingRequest {
  constructor(message) {
    this.message = message;
  }
}

class JsPingResponse {
  constructor(result) {
    this.result = result;
  }
}

class JsPingHandler {
  async handle(request) {
    return new JsPingResponse(`pong:${request.message}`);
  }
}

Handler(JsPingRequest)(JsPingHandler);

module.exports = {
  JsPingRequest,
  JsPingResponse,
  JsPingHandler,
};
