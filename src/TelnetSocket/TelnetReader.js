const { Transform } = require('stream');
const { state, commands, reason } = require('../constants');

class TelnetReader extends Transform {
  #state = state.DATA;
  #data = [];
  #subnegotiation = [];
  flushPolicy = {
    endOfChunk: false,
    goAhead: true,
    endOfRecord: true
  };

  constructor(socket, options) {
    super();
    this.socket = socket;

    this.receiveBufferMax = options.receiveBufferMax || 4096;
    this.subnegotiationBufferMax = options.subnegotiationBufferMax || 4096;
  }

  _maybeFlush(flushReason) {
    const length = this.#data.length;
    let flush = false;
    if (length == 0) return;

    switch (flushReason) {
      case reason.DATA:
        if (
          length >= 2 &&
          this.#data[length - 1] == 0x0a &&
          this.#data[length - 2] == 0x0d
        ) {
          flush = true;
        }
        break;
      case reason.EOR:
        flush = this.flushPolicy.endOfRecord;
        break;
      case reason.GA:
        flush = this.flushPolicy.goAhead;
        break;
      case reason.CHUNK:
        flush = this.flushPolicy.endOfChunk;
    }

    if (flush) {
      this.push(Buffer.from(this.#data));
      this.#data = [];
    }
  }

  _pushData(data) {
    if (this.#data.length > this.receiveBufferMax) {
      this.emit('error', new Error('Receive buffer overflow'));
      this.socket.end();
      return true;
    }
    this.#data.push(data);
  }

  _pushSubnegotiationData(data) {
    if (this.#subnegotiation.length > this.subnegotiationBufferMax) {
      this.emit('error', new Error('Subnegotiation buffer overflow'));
      this.socket.end();
      return true;
    }
    this.#subnegotiation.push(data);
  }

  _transform(chunk, encoding, callback) {
    try {
      for (const byte of chunk) {
        switch (this.#state) {
          case state.DATA:
            if (byte == commands.IAC) {
              this.#state = state.IAC;
            } else {
              if (this._pushData(byte)) return;
              this._maybeFlush(reason.DATA);
            }
            break;
          case state.IAC:
            switch (byte) {
              case commands.WILL:
                this.#state = state.WILL;
                break;
              case commands.WONT:
                this.#state = state.WONT;
                break;
              case commands.DO:
                this.#state = state.DO;
                break;
              case commands.DONT:
                this.#state = state.DONT;
                break;
              case commands.SB:
                this.#state = state.SB;
                break;
              case commands.IAC:
                this.#state = state.DATA;
                if (this._pushData(byte)) return;
                this._maybeFlush(reason.DATA);
                break;
              case commands.GA:
                this.#state = state.DATA;
                this._maybeFlush(reason.GA);
                break;
              case commands.EOR:
                this.#state = state.DATA;
                this._maybeFlush(reason.EOR);
                break;
              default:
                this.#state = state.DATA;
            }
            break;
          case state.WILL:
            this.#state = state.DATA;
            this.socket.getOption(byte).handleWill();
            break;
          case state.WONT:
            this.#state = state.DATA;
            this.socket.getOption(byte).handleWont();
            break;
          case state.DO:
            this.#state = state.DATA;
            this.socket.getOption(byte).handleDo();
            break;
          case state.DONT:
            this.#state = state.DATA;
            this.socket.getOption(byte).handleDont();
            break;
          case state.SB:
            if (byte == commands.IAC) {
              this.#state = state.SBIAC;
            } else {
              if (this._pushSubnegotiationData(byte)) return;
            }
            break;
          case state.SBIAC:
            switch (byte) {
              case commands.IAC:
                this.#state = state.SB;
                if (this._pushSubnegotiationData(commands.IAC)) return;
                break;
              case commands.SE:
                if (this.#subnegotiation.length > 0) {
                  const option = this.socket.getOption(this.#subnegotiation[0]);
                  option.subnegotiation(
                    Buffer.from(this.#subnegotiation.slice(1))
                  );
                  this.#subnegotiation = [];
                }
                this.#state = state.DATA;
            }
        }
      }

      if (this.#data.length > 0) {
        this._maybeFlush(reason.CHUNK);
      }
    } catch (err) {
      this.emit('error', err);
    }
    callback();
  }
}

module.exports = TelnetReader;
