const zlib = require('zlib');
const { Z_SYNC_FLUSH, Z_FINISH } = zlib.constants;
const TelnetOption = require('./TelnetOption');
const { optionState, where, reason } = require('../constants');

class MCCP extends TelnetOption {
  deflating = false;
  inflating = false; 

  constructor(socket, code) {
    super(socket, 86);
    this.deflate = zlib.createDeflate({flush: Z_SYNC_FLUSH});
    this.inflate = zlib.createInflate({flush: Z_SYNC_FLUSH});
  }

  enabled(at) {
    if (at == where.LOCAL) {
      this.socket.writer.writeSubnegotiation(this.code);
      this.socket.writer.unpipe(this.socket.socket);
      this.socket.writer.pipe(this.deflate).pipe(this.socket.socket);
      this.deflating = true;
    }
  }

  disabled(at) {
    if (at == where.LOCAL) {
      this._endCompression();
    }
  }

  subnegotiation(buffer) {
    if (this.him == optionState.YES && !this.inflating) {
      this.inflating = true;
      this.inflate.once('end', () => {
        this.socket.reader.unpipe(this.inflate);
        this.socket.socket.pipe(this.socket.reader);
        this.inflating = false;
        this.him = optionState.NO;
      });

      this.socket.socket.unpipe(this.socket.reader);
      this.socket.socket.pipe(this.inflate, { end: false }).pipe(this.socket.reader, { end: false });
    }
  }

  _endCompression(callback = () => {}) {
    if (this.us == optionState.YES && this.deflating == true) {
      this.socket.writer.cork();
      this.deflate.flush(Z_FINISH, () => {
        this.socket.writer.unpipe(this.deflate);
        this.socket.writer.pipe(this.socket.socket);
        this.deflating = false;
        this.socket.writer.uncork();
        callback();
      });
    }
  }

  endCompression(callback = () => {}) {
    this._endCompression(() => {
      this.us == optionState.NO;
      callback();
    });
  }
}

module.exports = MCCP;