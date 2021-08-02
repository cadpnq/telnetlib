# telnetlib

A simple Node.js telnet server/client library. It provides an interface similar to the standard net module (viz. `createServer` and `createConnection`) while abstracting option negotiation and providing handlers for some common options.

![Codacy grade](https://img.shields.io/codacy/grade/478d585bd8514d4786c315699b575512?style=plastic) ![Codacy coverage](https://img.shields.io/codacy/coverage/478d585bd8514d4786c315699b575512?style=plastic) ![npm](https://img.shields.io/npm/v/telnetlib?style=plastic) ![GitHub](https://img.shields.io/github/license/cadpnq/telnetlib?style=plastic)

## Simple Example

This example is a server that, once option negotiation finishes, says hello world to the client and then echos anything it receives back to the client. The client portion simply echos anything back to the server.

### Server

```js
const telnetlib = require('telnetlib');

const server = telnetlib.createServer({}, (c) => {
  c.on('negotiated', () => {
    c.write('Hello World!');
  });

  c.on('data', (data) => {
    c.write(data);
  });
});

server.listen(9001);
```

### Client

```js
const telnetlib = require('telnetlib');

const client = telnetlib.createConnection(
  {
    host: '127.0.0.1',
    port: 9001
  },
  () => {
    client.on('data', (data) => {
      client.write(data);
    });
  }
);
```

## Features

- [RFC1143 option negotiation](https://tools.ietf.org/html/rfc1143)
- Telnet option handlers for:
  - [SGA](https://tools.ietf.org/html/rfc858)
  - [NAWS](https://tools.ietf.org/html/rfc1073)
  - [GMCP](https://www.gammon.com.au/gmcp)
  - [MCCP2](https://www.gammon.com.au/mccp/protocol.html)

## Reference

### `telnetlib.createServer(options, handler)`

- `options` _Object_
  - `remoteOptions` _Array_ Option codes we want enabled remotely
  - `localOptions` _Array_ Option codes we want enabled locally
  - `receiveBuffermax` _integer_ How large the receive buffer is
  - `subnegotiationBufferMax` _integer_ How large the subnegotiation buffer is
- `handler` _Function_ listener for the `connection` event.

Creates a new telnet server.

### `telnetlib.createConnection(options, handler)`

- `options` _Object_
  - `host` _String_ Host the socket should connect to
  - `port` _Integer_ Port the socket should connect to
  - `remoteOptions` _Array_ Option codes we want enabled remotely
  - `localOptions` _Array_ Option codes we want enabled locally
  - `receiveBuffermax` _integer_ How large the receive buffer is
  - `subnegotiationBufferMax` _integer_ How large the subnegotiation buffer is
- `handler` _Function_ listener for the `connect` event.

A factory function which creates a `net.Socket`, wraps it in a `TelnetSocket`, initiates option negotiation, and returns the `TelnetSocket`.

### `telnetlib.defineOption(name, code[, handler])`

- `name` _String_ The name of the telnet option.
- `code` _Integer_ The telnet option code
- `handler` _TelnetOption_ Optional class that manages option

Register an option handler with the library.

### Class: `telnetlib.TelnetSocket`

- Extends: _Stream.Stream_

This class wraps a socket and manages object negotiation.

### `new telnetlib.TelnetSocket(socket[, options])`

- `socket` _net.Socket_ Socket object to wrap
- `options` _Object_
  - `remoteOptions` _Array_ Option codes we want enabled remotely
  - `localOptions` _Array_ Option codes we want enabled locally
  - `receiveBuffermax` _integer_ How large the receive buffer is
  - `subnegotiationBufferMax` _integer_ How large the subnegotiation buffer is

#### Event: `negotiated`

Emitted when all option negotiations have been settled either through (dis)agreement or timeout.

#### Event: `enable`

- `optionCode` _integer_ telnet option code
- `at` _String_ value indicating where the option was enabled. Either `'LOCAL'` or `'REMOTE'`

Emitted when an option is enabled.

#### Event: `disable`

- `optionCode` _integer_ telnet option code
- `at` _String_ value indicating where the option was disabled. Either `'LOCAL'` or `'REMOTE'`

Emitted when an option is disabled.

#### `TelnetSocket.enableRemote(option[, timeout])`

- `option` - _integer_ telnet option code
- `timeout` - _integer_ timeout in milliseconds
- Returns: _Promise_

Request that an option be enabled remotely.

#### `TelnetSocket.disableRemote(option[, timeout])`

- `option` - _integer_ telnet option code
- `timeout` - _integer_ timeout in milliseconds
- Returns: _Promise_

Request that an option be disabled remotely.

#### `TelnetSocket.enableLocal(option[, timeout])`

- `option` - _integer_ telnet option code
- `timeout` - _integer_ timeout in milliseconds
- Returns: _Promise_

Request that an option be enabled locally.

#### `TelnetSocket.disableLocal(option[, timeout])`

- `option` - _integer_ telnet option code
- `timeout` - _integer_ timeout in milliseconds
- Returns: _Promise_

Request that an option be disabled locally.

#### `TelnetSocket.getOption(code)`

- `code` - _integer_ telnet option code
- Returns: _TelnetOption_

Get the handler for the specified option.

### Class: `telnetlib.TelnetOption`

This is the base class for option handlers.

#### `enabled(at)`

- `at` _String_ value indicating where option was enabled. Either `'LOCAL'` or `'REMOTE'`

Called whenever the option is enabled. Intended to be overridden by subclasses.

#### `disabled(at)`

- `at` _String_ value indicating where option was disabled. Either `'LOCAL'` or `'REMOTE'`

Called whenever the option is disabled. Intended to be overridden by subclasses.

#### `subnegotiation(buffer)`

- `buffer` _Buffer_ contents of the subnegotiation

Called when a subnegotiation is received for an option. Intended to be overridden by subclasses.

### Class: `GMCP`

- Extends: `telnetlib.TelnetOption`

This class handles sending and receiving GMCP message.

#### Event: `gmcp`

- `packageName` _String_ the name of the package the message belongs to
- `messageName` _String_ the name of the message
- `data` _String_ | _Number_ | _Boolean_ | _Object_ | _Array_ The message data

Emitted when a GMCP message is received. `packageName` and `messageName` are normalized to lower case.

#### Event: `gmcp/<name>`

- `data` _String_ | _Number_ | _Boolean_ | _Object_ | _Array_ The message data

As above, but instead of having `packageName` and `messageName` values they are included in the event name.

#### `send(packageName, messageName[, data])`

- `packageName` _String_ the name of the package
- `messageName` _String_ the name of the message
- `data` _String_ | _Number_ | _Boolean_ | _Object_ | _Array_ The message data

Send a GMCP message.

### Class: `MCCP`

- Extends: `telnetlib.TelnetOption`

This class handles MCCP2 compression.

#### `endCompression([callback])`

- `callback` _Function_ optional callback

Only valid when MCCP is enabled locally. Sends a `Z_FINISH` flush and forces MCCP off locally.

### Class: `NAWS`

- Extends: `telnetlib.TelnetOption`

This class handles sending and receiving window resize events.

#### Event: `resize`

- `data` _Object_
- `width` _Integer_ The width reported by the client.
  - `height` _Integer_ The height reported by the client.

Event emitted when a resize subnegotiation is received.

#### `sendResize([width[, height]])`

- `width` _Integer_ The width to send. **Default:** 80
- `height` _Integer_ The height to send. **Default:** 24

Send a resize subnegotiation.

## Extending

The main reason to extend this library would be to add additional option handlers. This can be easily done by subclassing `TelnetOption` and registering it with the library using `telnetlib.defineOption` before creating a server or client. As in:

```js
const telnetlib = require('telnetlib');
const { where } = telnetlib.constants;

const ourOptionCode = 123;
class Something extends telnetlib.TelnetOption {
  constructor(socket, code) {
    super(socket, ourOptionCode);
  }

  enabled(at) {
    if (at == where.LOCAL) console.log('this option was enabled locally');
  }

  disabled(at) {
    if (at == where.LOCAL) console.log('this option was disabled locally');
  }

  subnegotiation(buffer) {}
}

telnetlib.defineOption('Something', ourOptionCode, Something);
```

## Advanced Examples

### GMCP

This is similar to the simple example above, but instead of sending normal text back and forth across the connection, the same thing is done with GMCP messages.

#### Server

```js
const telnetlib = require('telnetlib');
const { GMCP } = telnetlib.options;

const server = telnetlib.createServer(
  {
    localOptions: [GMCP]
  },
  (c) => {
    const gmcp = c.getOption(GMCP);
    c.on('negotiated', () => {
      gmcp.send('herp', 'derp', 42);
    });

    gmcp.on('gmcp/herp.derp', (data) => {
      gmcp.send('herp', 'derp', data);
    });
  }
);

server.listen(9001);
```

#### Client

```js
const telnetlib = require('telnetlib');
const { GMCP } = telnetlib.options;

const client = telnetlib.createConnection(
  {
    host: '127.0.0.1',
    port: 9001,
    remoteOptions: [GMCP]
  },
  () => {
    const gmcp = client.getOption(GMCP);
    gmcp.on('gmcp/herp.derp', (data) => {
      gmcp.send('herp', 'derp', data);
    });
  }
);
```

### Fancy Interfaces

Using the [blessed](https://github.com/chjj/blessed) library this example renders a box with in the middle of the terminal. The box will resize to fit in clients that support NAWS.

```js
const blessed = require('blessed');
const telnetlib = require('telnetlib');
const { ECHO, TRANSMIT_BINARY, NAWS, SGA } = telnetlib.options;

const server = telnetlib.createServer(
  {
    remoteOptions: [NAWS, TRANSMIT_BINARY, SGA],
    localOptions: [ECHO, TRANSMIT_BINARY, SGA]
  },
  (c) => {
    let screen;

    c.on('negotiated', () => {
      screen = blessed.screen({
        smartCSR: true,
        input: c,
        output: c,
        height: 80,
        width: 24,
        terminal: 'xterm',
        fullUnicode: true,
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
          color: null
        }
      });

      const box = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        content: 'Hello World',
        border: 'line'
      });

      screen.render();
    });

    c.on('end', () => {
      if (screen) screen.destroy();
    });
  }
);

server.listen(9001);
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
