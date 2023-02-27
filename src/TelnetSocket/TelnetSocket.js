const Stream = require('stream');
const { optionState, q, where } = require('../constants');
const constants = require('../constants');
const TelnetReader = require('./TelnetReader');
const TelnetWriter = require('./TelnetWriter');
const options = require('../options');

function expose(object, method, on) {
  on[method] = (...args) => {
    return object[method](...args);
  };
}

function reemit(emitter, name, on) {
  emitter.on(name, (...args) => {
    on.emit(name, ...args);
  });
}

class TelnetSocket extends Stream.Stream {
  isTTY = true;
  isRaw = true;
  columns = 80;
  rows = 24;

  constructor(socket, options = {}) {
    super();

    this.options = new Map();
    this.remoteOptions = new Set(options.remoteOptions || []);
    this.localOptions = new Set(options.localOptions || []);

    this.socket = socket;
    this.reader = new TelnetReader(this, options);
    this.writer = new TelnetWriter(this, options);

    this.socket.pipe(this.reader);
    this.writer.pipe(this.socket);

    expose(this.socket, 'setEncoding', this);

    if (
      this.remoteOptions.has(constants.options.MCCP) &&
      this.localOptions.has(constants.options.MCCP)
    ) {
      reemit(this.socket, 'end', this);
    }

    expose(this.writer, 'write', this);
    expose(this.writer, 'end', this);
    expose(this.writer, 'destroy', this);
    expose(this.reader, 'resume', this);
    expose(this.reader, 'pause', this);

    reemit(this.socket, 'error', this);
    reemit(this.writer, 'drain', this);
    reemit(this.writer, 'error', this);
    reemit(this.reader, 'data', this);
    reemit(this.reader, 'close', this);
    reemit(this.reader, 'end', this);
    reemit(this.reader, 'error', this);

    this.writable = this.writer.writable;
    this.readable = this.reader.readable;
  }

  // If we decide to ask him to enable: using him and himq
  //    NO            him=WANTYES, send DO.
  //    YES           Error: Already enabled.
  //    WANTNO  EMPTY If we are queueing requests, himq=OPPOSITE;
  //                  otherwise, Error: Cannot initiate new request
  //                  in the middle of negotiation.
  //         OPPOSITE Error: Already queued an enable request.
  //    WANTYES EMPTY Error: Already negotiating for enable.
  //         OPPOSITE himq=EMPTY.
  enableRemote(option, timeout = 1000) {
    return new Promise((resolve, reject) => {
      this.remoteOptions.add(option);
      const o = this.getOption(option);
      switch (o.him) {
        case optionState.NO:
          o.him = optionState.WANTYES;
          this.writer.writeDo(option);
          break;
        case optionState.YES:
          // error - already enabled
          resolve();
          return;
        case optionState.WANTNO:
          switch (o.himq) {
            case q.EMPTY:
              o.himq = q.OPPOSITE;
              break;
            case q.OPPOSITE:
            // error - already queued an enable request
          }
          break;
        case optionState.WANTYES:
          switch (o.himq) {
            case q.EMPTY:
              // error - already negotiating enable
              break;
            case q.OPPOSITE:
              o.himq = q.EMPTY;
          }
      }

      function enableListener(optionCode, location) {
        if (optionCode == option && location == where.REMOTE) {
          resolve();
          this.removeListener('enable', enableListener);
        }
      }
      this.on('enable', enableListener);
      setTimeout(() => {
        reject();
        this.removeListener('enable', enableListener);
      }, timeout);
    });
  }

  // If we decide to ask him to disable: using him and himq
  //    NO            Error: Already disabled.
  //    YES           him=WANTNO, send DONT.
  //    WANTNO  EMPTY Error: Already negotiating for disable.
  //         OPPOSITE himq=EMPTY.
  //    WANTYES EMPTY If we are queueing requests, himq=OPPOSITE;
  //                  otherwise, Error: Cannot initiate new request
  //                  in the middle of negotiation.
  //         OPPOSITE Error: Already queued a disable request.
  disableRemote(option, timeout = 1000) {
    return new Promise((resolve, reject) => {
      this.remoteOptions.delete(option);
      const o = this.getOption(option);
      switch (o.him) {
        case optionState.NO:
          // error - already disabled
          resolve();
          return;
        case optionState.YES:
          o.him = optionState.WANTNO;
          this.writer.writeDont(option);
          break;
        case optionState.WANTNO:
          switch (o.himq) {
            case q.EMPTY:
              // error - already negotiating disable
              break;
            case q.OPPOSITE:
              o.himq = q.EMPTY;
          }
          break;
        case optionState.WANTYES:
          switch (o.himq) {
            case q.EMPTY:
              o.himq = q.OPPOSITE;
              break;
            case q.OPPOSITE:
            // error - already disabling
          }
      }

      function disableListener(optionCode, location) {
        if (optionCode == option && location == where.REMOTE) {
          resolve();
          this.removeListener('disable', disableListener);
        }
      }
      this.on('disable', disableListener);
      setTimeout(() => {
        reject();
        this.removeListener('disable', disableListener);
      }, timeout);
    });
  }

  // If we decide to enable: using us and usq
  //    NO            us=WANTYES, send WILL.
  //    YES           Error: Already enabled.
  //    WANTNO  EMPTY If we are queueing requests, usq=OPPOSITE;
  //                  otherwise, Error: Cannot initiate new request
  //                  in the middle of negotiation.
  //         OPPOSITE Error: Already queued an enable request.
  //    WANTYES EMPTY Error: Already negotiating for enable.
  //         OPPOSITE usq=EMPTY.
  enableLocal(option, timeout = 1000) {
    return new Promise((resolve, reject) => {
      this.localOptions.add(option);
      let o = this.getOption(option);
      switch (o.us) {
        case optionState.NO:
          o.us = optionState.WANTYES;
          this.writer.writeWill(option);
          break;
        case optionState.YES:
          // error - already enabled
          resolve();
          return;
        case optionState.WANTNO:
          switch (o.usq) {
            case q.EMPTY:
              o.usq = q.OPPOSITE;
              break;
            case q.OPPOSITE:
              // error - already queued an enable request
              break;
          }
          break;
        case optionState.WANTYES:
          switch (o.usq) {
            case q.EMPTY:
              // error - already negotiating enable
              break;
            case q.OPPOSITE:
              o.usq = q.EMPTY;
          }
      }

      function enableListener(optionCode, location) {
        if (optionCode == option && location == where.LOCAL) {
          resolve();
          this.removeListener('enable', enableListener);
        }
      }
      this.on('enable', enableListener);
      setTimeout(() => {
        reject();
        this.removeListener('enable', enableListener);
      }, timeout);
    });
  }

  // If we decide to disable: using us and usq
  //    NO            Error: Already disabled.
  //    YES           us=WANTNO, send WONT.
  //    WANTNO  EMPTY Error: Already negotiating for disable.
  //         OPPOSITE usq=EMPTY.
  //    WANTYES EMPTY If we are queueing requests, usq=OPPOSITE;
  //                  otherwise, Error: Cannot initiate new request
  //                  in the middle of negotiation.
  //         OPPOSITE Error: Already queued a disable request.
  disableLocal(option, timeout = 1000) {
    return new Promise((resolve, reject) => {
      this.localOptions.delete(option);
      let o = this.getOption(option);
      switch (o.us) {
        case optionState.NO:
          // error - already disabled
          resolve();
          return;
        case optionState.YES:
          o.us = optionState.WANTNO;
          this.writer.writeWont(option);
          break;
        case optionState.WANTNO:
          switch (o.usq) {
            case q.EMPTY:
              // error - already negotiating disable
              break;
            case q.OPPOSITE:
              o.usq = q.EMPTY;
          }
          break;
        case optionState.WANTYES:
          switch (o.usq) {
            case q.EMPTY:
              o.usq = q.OPPOSITE;
              // error - already negotiating
              break;
            case q.OPPOSITE:
            // error - already disabling
          }
      }

      function disableListener(optionCode, location) {
        if (optionCode == option && location == where.LOCAL) {
          resolve();
          this.removeListener('disable', disableListener);
        }
      }
      this.on('disable', disableListener);
      setTimeout(() => {
        reject();
        this.removeListener('disable', disableListener);
      }, timeout);
    });
  }

  getOption(code) {
    if (!this.options.has(code)) {
      this.options.set(code, new (options.getOption(code))(this, code));
    }
    return this.options.get(code);
  }

  negotiate() {
    const promises = [];

    for (const option of this.localOptions) {
      promises.push(this.enableLocal(option));
    }
    for (const option of this.remoteOptions) {
      promises.push(this.enableRemote(option));
    }

    return Promise.allSettled(promises).then(() => this.emit('negotiated'));
  }
}

module.exports = TelnetSocket;
