const telnetlib = require('../src/telnetlib');
const { optionState } = telnetlib.constants;

telnetlib.defineOption('TESTOP', 69);

const { TESTOP } = telnetlib.options;

describe('option negotiation', function () {
  let server, serverSocket, serverTESTOP, client, clientTESTOP;
  let serverLocal = [],
    serverRemote = [],
    clientLocal = [],
    clientRemote = [];

  beforeEach(function (done) {
    server = telnetlib.createServer(
      {
        localOptions: serverLocal,
        remoteOptions: serverRemote
      },
      (c) => {
        serverSocket = c;
        serverTESTOP = c.getOption(TESTOP);
        c.on('negotiated', () => {
          done();
        });
      }
    );
    server.listen(9001);

    client = telnetlib.createConnection(
      {
        host: '127.0.0.1',
        port: 9001,
        localOptions: clientLocal,
        remoteOptions: clientRemote
      },
      () => {
        clientTESTOP = client.getOption(TESTOP);
      }
    );
  });

  afterEach(function () {
    client.end();
    server.close();
  });

  serverLocal = [TESTOP];
  serverRemote = [];
  clientLocal = [];
  clientRemote = [];
  describe('failed negotiation: server requests local, client denies', function () {
    it('should not be enabled', function () {
      assert(serverTESTOP.us, optionState.NO, 'option was not disabled');
      assert(clientTESTOP.him, optionState.NO, 'option was not disabled');
    });
  });

  serverLocal = [];
  serverRemote = [TESTOP];
  clientLocal = [];
  clientRemote = [];
  describe('failed negotiation: server requests remote, client denies', function () {
    it('should not be enabled', function () {
      assert(serverTESTOP.him, optionState.NO, 'option was not disabled');
      assert(clientTESTOP.us, optionState.NO, 'option was not disabled');
    });
  });

  serverLocal = [TESTOP];
  serverRemote = [];
  clientLocal = [];
  clientRemote = [TESTOP];
  describe('successful negotiation: server requests local', function () {
    it('should be enabled', function () {
      assert(serverTESTOP.us, optionState.YES, 'option was not enabeld');
      assert(clientTESTOP.him, optionState.YES, 'option was not enabled');
    });
  });

  serverLocal = [];
  serverRemote = [TESTOP];
  clientLocal = [TESTOP];
  clientRemote = [];
  describe('successful negotiation: server requests remote', function () {
    it('should be enabled', function () {
      assert(serverTESTOP.him, optionState.YES, 'option was not enabeld');
      assert(clientTESTOP.us, optionState.YES, 'option was not enabled');
    });
  });

  // TODO: add tests covering cases that an RFC1143 compliant library would never send, but is able to handle receiving.
});
