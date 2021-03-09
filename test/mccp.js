const telnetlib = require('../index');
const { where } = telnetlib.constants;
const { MCCP } = telnetlib.options;

describe('MCCP', function() {
  let server, serverSocket, serverMCCP, client, clientMCCP;
  let serverLocal = [],
      serverRemote = [],
      clientLocal = [],
      clientRemote = [];

  beforeEach(function(done) {
    server = telnetlib.createServer({
      localOptions: serverLocal,
      remoteOptions: serverRemote
    }, (c) => {
      serverSocket = c;
      serverMCCP = c.getOption(MCCP);
      c.on('negotiated', () => {
        done();
      });
    });
    server.listen(9001);

    client = telnetlib.createConnection({
      host: '127.0.0.1',
      port: 9001,
      localOptions: clientLocal,
      remoteOptions: clientRemote
    }, () => {
      clientMCCP = client.getOption(MCCP);
    });
  });

  afterEach(function() {
    client.end();
    server.close();
  });

  serverLocal = [MCCP];
  clientRemote = [MCCP];
  describe('server-to-client compression', function() {
    it('should pass compressed data from the server to the client', function(done) {
      const testData = 'foobar\r\n';
      client.once('data', (data) => {
        assert.equal(data, testData, 'test data was not the same');
        done();
      });
      serverSocket.write(testData);
    });
  });
  
  serverLocal = [];
  serverRemote = [MCCP];
  clientLocal = [MCCP];
  clientRemote = [];
  describe('client-to-server compression', function() {
    it('should pass compressed data from the client to the server', function(done) {
      const testData = 'foobar\r\n';
      serverSocket.once('data', (data) => {
        assert.equal(data, testData, 'test data was not the same');
        done();
      });
      client.write(testData);
    });
  });

  serverLocal = [MCCP];
  serverRemote = [MCCP];
  clientLocal = [MCCP];
  clientRemote = [MCCP];
  describe('bidirectional compression', function() {
    it('should pass compressed data between the server and client', function(done) {
      const testData = 'foobar\r\n';
      let otherDone = false;
      serverSocket.once('data', (data) => {
        assert.equal(data, testData, 'test data was not the same');
        if (otherDone) done();
        otherDone = true;
      });
      client.once('data', (data) => {
        assert.equal(data, testData, 'test data was not the same');
        if (otherDone) done();
        otherDone = true;
      });
      serverSocket.write(testData);
      client.write(testData);
    });
  });

  serverLocal = [MCCP];
  serverRemote = [];
  clientLocal = [];
  clientRemote = [MCCP];
  describe('compression downgrading', function() {
    it('should handle downgrading compression by sending a Z_FINISH', function(done) {
      const stage1 = 'stage 1\r\n',
            stage2 = 'stage 2\r\n',
            stage3 = 'stage 3\r\n',
            stage4 = 'stage 4\r\n',
            stage5 = 'stage 5\r\n';
      serverSocket.on('data', (data) => {
        data = data.toString();
        switch(data) {
          case stage2:
            serverMCCP.endCompression(() => {
              serverSocket.write(stage3);
            });
            break;
          case stage4:
            serverSocket.write(stage5);
        }
      });
      client.on('disable', (code, at) => {
        if (code == MCCP && at == where.REMOTE) {
          client.write(stage4);
        }
      });
      client.on('data', (data) => {
        data = data.toString();
        switch(data) {
          case stage1:
            client.write(stage2);
            break;
          // // we never get this because the inflate transform will eat it
          // case stage3:
          //   client.write(stage4);
          //   break;
          case stage5:
            done();
        }
      });
      serverSocket.write(stage1);
    });
  });
});