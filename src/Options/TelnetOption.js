const EventEmitter = require('events');
const { optionState, q, where } = require('../constants');

class TelnetOption extends EventEmitter {
  #us = optionState.NO;
  usq = q.EMPTY;
  #him = optionState.NO;
  himq = q.EMPTY;
  enabledLocal = false;
  enabledRemote = false;
  
  constructor(socket, code) {
    super();
    this.code = code;
    this.socket = socket;
  }

  set us(us) {
    this.#us = us;
    if (us == optionState.YES && this.enabledLocal == false) {
      this.enabledLocal = true;
      this.enabled(where.LOCAL);
      this.socket.emit('enable', this.code, where.LOCAL);
    } else if (us == optionState.NO && this.enabledLocal == true) {
      this.enabledLocal = false;
      this.disabled(where.LOCAL);
      this.socket.emit('disable', this.code, where.LOCAL);
    }
  }

  get us() {
    return this.#us;
  }

  set him(him) {
    this.#him = him;
    if (him == optionState.YES && this.enabledRemote == false) {
      this.enabledRemote = true;
      this.enabled(where.REMOTE);
      this.socket.emit('enable', this.code, where.REMOTE);
    } else if (him == optionState.NO && this.enabledRemote == true) {
      this.enabledRemote = false;
      this.disabled(where.REMOTE);
      this.socket.emit('disable', this.code, where.REMOTE);
    }
  }

  get him() {
    return this.#him;
  }

  enabled(at) {
  }

  disabled(at) {
  }
  
  subnegotiation(buffer) {
  }

  // Upon receipt of WILL, we choose based upon him and himq:
  //    NO            If we agree that he should enable, him=YES, send
  //                  DO; otherwise, send DONT.
  //    YES           Ignore.
  //    WANTNO  EMPTY Error: DONT answered by WILL. him=NO.
  //         OPPOSITE Error: DONT answered by WILL. him=YES*,
  //                  himq=EMPTY.
  //    WANTYES EMPTY him=YES.
  //         OPPOSITE him=WANTNO, himq=EMPTY, send DONT.
  handleWill() {
    switch (this.him) {
      case optionState.NO:
        if (this.socket.remoteOptions.has(this.code)) {
          this.socket.writer.writeDo(this.code);
        } else {
          this.socket.writer.writeDont(this.code);
        }
        break;
      case optionState.YES:
        break;
      case optionState.WANTNO:
        switch (this.himq) {
          case q.EMPTY:
            // error - DONT answered by WILL
            this.him = optionState.NO;
            break;
          case q.OPPOSITE:
            // error - DONT answered by WILL
            this.him = optionState.YES;
            this.himq = q.EMPTY;
        }
        break;
      case optionState.WANTYES:
        switch (this.himq) {
          case q.EMPTY:
            this.him = optionState.YES;
            break;
          case q.OPPOSITE:
            this.him = optionState.WANTNO;
            this.himq = q.EMPTY;
            this.socket.writer.writeDont(this.code);
        }
    }
  }

  //   Upon receipt of WONT, we choose based upon him and himq:
  //  NO            Ignore.
  //  YES           him=NO, send DONT.
  //  WANTNO  EMPTY him=NO.
  //       OPPOSITE him=WANTYES, himq=EMPTY, send DO.
  //  WANTYES EMPTY him=NO.*
  //       OPPOSITE him=NO, himq=EMPTY.**
  handleWont() {
    switch (this.him) {
      case optionState.NO:
        break;
      case optionState.YES:
        this.him = optionState.NO;
        this.socket.writer.writeDont(this.code);
        break;
      case optionState.WANTNO:
        switch (this.himq) {
          case q.EMPTY:
            this.him = optionState.NO;
            break;
          case q.OPPOSITE:
            this.him = optionState.WANTYES;
            this.himq = q.EMPTY;
            this.socket.writer.writeDo(this.code);
        }
        break;
      case optionState.WANTYES:
        switch (this.himq) {
          case q.EMPTY:
            this.him = optionState.NO;
            break;
          case q.OPPOSITE:
            this.him = optionState.NO;
            this.himq = q.EMPTY;
        }
    }
  }

  // Upon receipt of DO, we choose based upon us and usq
  //  NO            If we agree to enable, us=YES, send
  //                WILL; otherwise, send WONT
  //  YES           Ignore.
  //  WANTNO  EMPTY Error: WONT answered by DO. us=NO.
  //       OPPOSITE Error: WONT answered by DO. us=YES*,
  //                usq=EMPTY.
  //  WANTYES EMPTY us=YES.
  //       OPPOSITE us=WANTNO, usq=EMPTY, send WONT.
  handleDo() {
    switch (this.us) {
      case optionState.NO:
        if (this.socket.localOptions.has(this.code)) {
          this.us = optionState.YES;
          this.socket.writer.writeWill(this.code);
        } else {
          this.socket.writer.writeWont(this.code);
        }
        break;
      case optionState.YES:
        break;
      case optionState.WANTNO:
        switch (this.usq) {
          case q.EMPTY:
            // error - WONT answered by DO
            this.us = optionState.NO;
            break;
          case q.OPPOSITE:
            // error - WONT answered by DO
            this.us = optionState.YES;
            this.usp = q.EMPTY;
            break;
        }
        break;
      case optionState.WANTYES:
        switch (this.usq) {
          case q.EMPTY:
            this.us = optionState.YES;
            break;
          case q.OPPOSITE:
            this.us = optionState.WANTNO;
            this.usq = q.EMPTY;
            this.socket.writer.writeWont(this.code);
        }
    }
  }

  // Upon receipt of DONT, we choose based upon us and usq:
  //    NO            Ignore.
  //    YES           us=NO, send WONT.
  //    WANTNO  EMPTY us=NO.
  //         OPPOSITE us=WANTYES, usq=EMPTY, send WILL.
  //    WANTYES EMPTY us=NO.*
  //         OPPOSITE us=NO, usq=EMPTY.**
  handleDont() {
    switch (this.us) {
      case optionState.NO:
        break;
      case optionState.YES:
        this.us = optionState.NO;
        this.socket.writer.writeWont(this.code);
        break;
      case optionState.WANTNO:
        switch (this.usq) {
          case q.EMPTY:
            this.us = optionState.NO;
            break;
          case q.OPPOSITE:
            this.us = optionState.WANTYES;
            this.usq = q.EMPTY;
            this.socket.writer.writeWill(this.code);
            break;
        }
        break;
      case optionState.WANTYES:
        switch (this.usq) {
          case q.EMPTY:
            this.us = optionState.NO;
            break;
          case q.OPPOSITE:
            this.us = optionState.NO;
            this.usq = q.EMPTY;
        }
    }
  }
}

module.exports = TelnetOption;