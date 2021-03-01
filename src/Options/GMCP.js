const TelnetOption = require('./TelnetOption');

class GMCP extends TelnetOption {
  constructor(socket) {
    super(socket, 201);
  }

  subnegotiation(buffer) {
    let [, name, data] = buffer.toString().match(/([a-z_][\w-]*(?:\.[a-z_][\w_-]*)+)\s*(.*)?/i);
    name = name.toLowerCase();
    if (data) {
      data = JSON.parse(data);
    }
    this.emit(`gmcp/${name}`, data);
    this.emit('gmcp', name, data);
  }

  send(name, data) {
    this.socket.writer.writeSubnegotiation(this.code, `${name} ${JSON.stringify(data)}`);
  }
}

module.exports = GMCP;