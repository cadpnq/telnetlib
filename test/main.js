const telnet = require('../index');

describe('createServer, createConnection', function() {
  it('should create a server and client and pass data between them', function(done) {
    const testData = 'Hello World!\r\n';
    const server = telnet.createServer({
      remoteOptions: [],
      localOptions: []
    }, (c) => {
      c.on('negotiated', () => {
        c.write(testData);
      });
    });
  
    server.listen(9001);

    const client = telnet.createConnection({
      host: '127.0.0.1',
      port: 9001,
      remoteOptions: [],
      localOptions: []
    }, () => {
      client.on('data', (data) => {
        client.end();
        server.close();
        assert.equal(data, testData, 'test data was not the same');
        done();
      });
    });
  });
});