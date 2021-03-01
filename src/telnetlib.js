const net = require('net');
const tls = require('tls');
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

function createSecureServer(options, handler) {
  return tls.createServer(options, (c) => {
    const telnet = new TelnetSocket(c, options);
    handler(telnet);
    telnet.negotiate()
    .catch((e) => {
      console.log(e);
    });
  });
}

function createSecureConnection(options, handler) {
  const connection = tls.connect(options, handler);
  const telnet = new TelnetSocket(connection, options);
  telnet.negotiate()
  .catch((e) => {
    console.log(e);
  });
  return telnet;
}

exports.createServer = createServer;
exports.createConnection = createConnection;
exports.createSecureServer = createSecureServer;
exports.createSecureConnection = createSecureConnection;
exports.options = constants.options;
exports.constants = constants;