const TelnetOption = require('./TelnetOption');

class GMCP extends TelnetOption {
  constructor(socket) {
    super(socket, 201);
  }

  subnegotiation(buffer) {
    try {
      let [, name, data] = buffer
        .toString()
        .match(/([a-z_][\w-_]*(?:\.[a-z_][\w-_]*)+)\s*(.*)?/i);
      name = name.toLowerCase();
      let [, packageName, messageName] = name.match(/(.*)\.(.*)/);

      if (data) {
        data = JSON.parse(data.replace(/\x1b/g, '\\u001b'));
      }
      this.emit(`gmcp/${name}`, data);
      this.emit('gmcp', packageName, messageName, data);
    } catch (err) {
      this.emit('error', err);
    }
  }

  send(packageName, messageName, data) {
    let message = `${packageName.toLowerCase()}.${messageName.toLowerCase()}`;

    if (data !== undefined) {
      message += ` ${JSON.stringify(data)}`;
    }

    this.socket.writer.writeSubnegotiation(this.code, message);
  }
}

module.exports = GMCP;
