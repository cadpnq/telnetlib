const net = require('net');
const TelnetSocket = require('./TelnetSocket/TelnetSocket');
const constants = require('./constants');
const { defineOption, TelnetOption } = require('./options');

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
exports.defineOption = defineOption;
exports.TelnetOption = TelnetOption;
exports.options = constants.options;
exports.constants = constants;