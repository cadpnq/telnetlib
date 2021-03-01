const TelnetOption = require('./TelnetOption');

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
}

module.exports = SGA;