const telnetlib = require('../src/telnetlib');
const { NAWS } = telnetlib.options;

describe('NAWS', function () {
  let server, serverSocket, client, serverNAWS, clientNAWS;

  beforeEach(function (done) {
    server = telnetlib.createServer(
      {
        remoteOptions: [NAWS]
      },
      (c) => {
        serverSocket = c;
        c.on('negotiated', () => {
          serverNAWS = c.getOption(NAWS);
          done();
        });
      }
    );
    server.listen(9001);

    client = telnetlib.createConnection(
      {
        host: '127.0.0.1',
        port: 9001,
        localOptions: [NAWS]
      },
      () => {
        clientNAWS = client.getOption(NAWS);
      }
    );
  });

  afterEach(function () {
    client.end();
    server.close();
  });

  describe('resize events', function () {
    it('should send resize events', function (done) {
      const testWidth = 420;
      const testHeight = 69;

      serverNAWS.on('resize', ({ width, height }) => {
        assert.equal(width, testWidth, 'width did not match value sent');
        assert.equal(height, testHeight, 'height did not match value sent');
        done();
      });
      clientNAWS.sendResize(testWidth, testHeight);
    });
  });
});
