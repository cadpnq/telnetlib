const { Transform } = require('stream');
const { commands } = require('../constants');

class TelnetWriter extends Transform {
  constructor(socket, options) {
    super();
    this.socket = socket;
  }

  _transform(chunk, encoding, callback) {
    this.__write(chunk);
    callback();
  }

  __write(data) {
    if (!(data instanceof Buffer)) {
      data = Buffer.from(data);
    }

    if (data.includes(commands.IAC)) {
      const duplicatedData = [];
      for (const byte in data) {
        duplicatedData.push(byte);
        if (byte == commands.IAC) {
          duplicatedData.push(byte);
        }
      }
      data = duplicatedData;
    }

    this.__writeRaw(data);
  }

  __writeRaw(data) {
    if (!(data instanceof Buffer)) {
      data = Buffer.from(data);
    }

    this.push(data);
  }

  writeCommand(...command) {
    this.__writeRaw([commands.IAC, ...command]);
  }

  writeWill(option) {
    this.writeCommand(commands.WILL, option);
  }

  writeWont(option) {
    this.writeCommand(commands.WONT, option);
  }

  writeDo(option) {
    this.writeCommand(commands.DO, option);
  }

  writeDont(option) {
    this.writeCommand(commands.DONT, option);
  }

  writeSubnegotiation(option, data) {
    this.socket.socket.cork();
    this.writeCommand(commands.SB, option);
    if (data) {
      this.__write(data);
    }
    this.writeCommand(commands.SE);
    this.socket.socket.uncork();
  }
}

module.exports = TelnetWriter;
