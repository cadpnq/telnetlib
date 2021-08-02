const TelnetOption = require('./TelnetOption');
const { where } = require('../constants');

class SGA extends TelnetOption {
  constructor(socket) {
    super(socket, 3);
  }

  enabled(at) {
    if (at == where.LOCAL) this.socket.reader.flushPolicy.endOfChunk = true;
  }

  disabled(at) {
    if (at == where.LOCAL) this.socket.reader.flushPolicy.endOfChunk = false;
  }
}

module.exports = SGA;
