const net = require('net');
const TelnetSocket = require('./TelnetSocket/TelnetSocket');
const constants = require('./constants');

function createServer(options, handler) {
  return net.createServer(options, (c) => {
    const telnet = new TelnetSocket(c, options);
    handler(telnet);
    telnet.negotiate()
    .catch((e) => {
      console.log(e);
    });
  });
}

function createConnection(options, handler) {
  const connection = net.createConnection(options, handler);
  const telnet = new TelnetSocket(connection, options);
  telnet.negotiate()
  .catch((e) => {
    console.log(e);
  });
  return telnet;
}

exports.createServer = createServer;
exports.createConnection = createConnection;
exports.options = constants.options;
exports.constants = constants;