const zlib = require('zlib');
const TelnetOption = require('./TelnetOption');
const { optionState, where } = require('../constants');

class MCCP extends TelnetOption {
  constructor(socket, code) {
    super(socket, 86);
    this.deflate = zlib.createDeflate({
      flush: zlib.constants.Z_SYNC_FLUSH,
    });
    this.inflate = zlib.createInflate({flush: zlib.constants.Z_SYNC_FLUSH});
    this.inflating = false;
  }

  enabled(at) {
    super.enabled(at);
    if (at == where.LOCAL) {
      this.socket.writer.writeSubnegotiation(this.code);
      this.socket.writer.unpipe(this.socket.socket);
      this.socket.writer.pipe(this.deflate).pipe(this.socket.socket);
    }
  }

  disabled(at) {
    super.disabled(at);
    if (at == where.LOCAL) {
      this.socket.writer.unpipe(this.deflate);
      this.socket.writer.pipe(this.socket.socket);
    }
  }

  subnegotiation(buffer) {
    if (this.him == optionState.YES && !this.inflating) {
      this.inflating = true;
      this.socket.socket.unpipe(this.socket.reader);
      this.socket.socket.pipe(this.inflate).pipe(this.socket.reader);
    }
  }
}

module.exports = MCCP;
