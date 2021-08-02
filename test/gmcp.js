const telnetlib = require('../src/telnetlib');
const { GMCP } = telnetlib.options;

describe('GMCP', function () {
  let server, serverSocket, serverGMCP, client, clientGMCP;

  beforeEach(function (done) {
    server = telnetlib.createServer(
      {
        localOptions: [GMCP]
      },
      (c) => {
        serverSocket = c;
        serverGMCP = c.getOption(GMCP);
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
        remoteOptions: [GMCP]
      },
      () => {
        clientGMCP = client.getOption(GMCP);
      }
    );
  });

  afterEach(function () {
    client.end();
    server.close();
  });

  describe('package names', function () {
    let packageName, messageName;
    const dummyData = 42;

    afterEach('appropriate event should be raised', function (done) {
      let bothDone = false;
      clientGMCP.once(
        `gmcp/${packageName.toLowerCase()}.${messageName.toLowerCase()}`,
        (data) => {
          assert.equal(data, dummyData);
          if (bothDone) done();
          bothDone = true;
        }
      );
      clientGMCP.once(`gmcp`, (_packageName, _messageName, data) => {
        if (_packageName == packageName && _messageName == messageName) {
          assert.equal(data, dummyData);
          if (bothDone) done();
          bothDone = true;
        }
      });
      serverGMCP.send(packageName, messageName, dummyData);
    });

    messageName = 'derp';
    it('should support package simple names', function () {
      packageName = 'test';
    });

    it('should support package names with underscores', function () {
      packageName = '_test';
    });

    it('should support package names with hyphens', function () {
      packageName = 'te-st';
    });

    it('should support package names with numbers in them', function () {
      packageName = 'test42';
    });

    it('should support subpackages', function () {
      packageName = 'test.test';
    });
  });

  describe('data types', function () {
    let testData;

    afterEach('test data should match', function (done) {
      clientGMCP.once('gmcp/test.types', (data) => {
        assert.deepEqual(data, testData, 'test data was not the same');
        done();
      });
      serverGMCP.send('test', 'types', testData);
    });

    it('should handle strings', function () {
      testData = 'foobar';
    });

    it('should handle integers', function () {
      testData = 1;
    });

    it('should handle floats', function () {
      testData = 3.14;
    });

    it('should handle exponents', function () {
      testData = 62e5;
    });

    it('should handle negative numbers', function () {
      testData = -22;
    });

    it('should handle booleans', function () {
      testData = true;
    });

    it('should handle null', function () {
      testData = null;
    });

    it('should handle objects', function () {
      testData = { foo: 42, bar: 69 };
    });

    it('should handle arrays', function () {
      testData = [1, 2, 3, 4];
    });

    it('should handle messages with no data', function () {
      testData = undefined;
    });
  });
});
