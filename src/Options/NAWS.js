const TelnetOption = require('./TelnetOption');
const { optionState, where } = require('../constants');

class SGA extends TelnetOption {
  constructor(socket) {
    super(socket, 31);
  }

  subnegotiation(buffer) {
    const width = buffer.readInt16BE(0);
    const height = buffer.readInt16BE(2);
    this.socket.columns = width;
    this.socket.rows = height;
    this.socket.emit('resize');
    this.emit('resize', {width, height});
  }

  sendResize(width = 80, height = 24) {
    if (this.us != optionState.YES) return;

    const buffer = Buffer.alloc(4);
    buffer.writeInt16BE(width);
    buffer.writeInt16BE(height, 2);
    this.socket.writer.writeSubnegotiation(this.code, buffer);
  }
}

module.exports = SGA;