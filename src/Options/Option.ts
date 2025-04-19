import { EventEmitter } from "events";
import { OptionState, Q, Where, WhereValue, OptionStateValue, QValue } from "../constants";
import { Socket } from "../Socket";
import { OptionName } from ".";

export abstract class Option extends EventEmitter {
  #us: OptionStateValue = OptionState.NO;
  usq: QValue = Q.EMPTY;
  #him: OptionStateValue = OptionState.NO;
  himq: QValue = Q.EMPTY;
  enabledLocal = false;
  enabledRemote = false;

  socket: Socket;
  code: number;
  name: OptionName;

  localPromise?: Promise<boolean>;
  remotePromise?: Promise<boolean>;
  resolveLocal?: (state: boolean) => void;
  resolveRemote?: (state: boolean) => void;
  rejectLocal?: () => void;
  rejectRemote?: () => void;

  constructor(socket: Socket, name: OptionName, code: number) {
    super();
    this.socket = socket;
    this.code = code;
    this.name = name;
  }

  abstract enabled(where: WhereValue): void;
  abstract disabled(where: WhereValue): void;
  abstract subnegotiation(data: Buffer): void;

  set us(state: OptionStateValue) {
    this.#us = state;
    if (state === OptionState.YES && this.enabledLocal === false) {
      this.enabledLocal = true;
      this.enabled(Where.LOCAL);
      this.socket.emit("enable", this.code, Where.LOCAL);
      this.resolveLocal?.(true);
    } else if (state === OptionState.NO && this.enabledLocal === true) {
      this.enabledLocal = false;
      this.disabled(Where.LOCAL);
      this.socket.emit("disable", this.code, Where.LOCAL);
      this.resolveLocal?.(false);
    }
  }

  get us(): OptionStateValue {
    return this.#us;
  }

  set him(state: OptionStateValue) {
    this.#him = state;
    if (state === OptionState.YES && this.enabledRemote === false) {
      this.enabledRemote = true;
      this.enabled(Where.REMOTE);
      this.socket.emit("enable", this.code, Where.REMOTE);
      this.resolveRemote?.(true);
    } else if (state === OptionState.NO && this.enabledRemote === true) {
      this.enabledRemote = false;
      this.disabled(Where.REMOTE);
      this.socket.emit("disable", this.code, Where.REMOTE);
      this.resolveLocal?.(false);
    }
  }

  get him(): OptionStateValue {
    return this.#him;
  }

  // The rest of this isn't terribly pretty, but it's implementing the RFC1143 state machine
  // State machines are rarely pretty. I've included the comments from the RFC for reference.

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
      case OptionState.NO:
        if (this.socket.remoteOptions.has(this.code)) {
          this.socket.writer.writeDo(this.code);
        } else {
          this.socket.writer.writeDont(this.code);
        }
        break;
      case OptionState.YES:
        break;
      case OptionState.WANTNO:
        switch (this.himq) {
          case Q.EMPTY:
            // error: DONT answered by WILL
            this.him = OptionState.NO;
            break;
          case Q.OPPOSITE:
            // error: DONT answered by WILL
            this.him = OptionState.YES;
            this.himq = Q.EMPTY;
        }
        break;
      case OptionState.WANTYES:
        switch (this.himq) {
          case Q.EMPTY:
            this.him = OptionState.YES;
            break;
          case Q.OPPOSITE:
            this.him = OptionState.WANTNO;
            this.himq = Q.EMPTY;
            this.socket.writer.writeDont(this.code);
        }
    }
  }

  //  Upon receipt of WONT, we choose based upon him and himq:
  //  NO            Ignore.
  //  YES           him=NO, send DONT.
  //  WANTNO  EMPTY him=NO.
  //       OPPOSITE him=WANTYES, himq=EMPTY, send DO.
  //  WANTYES EMPTY him=NO.*
  //       OPPOSITE him=NO, himq=EMPTY.**
  handleWont() {
    switch (this.him) {
      case OptionState.NO:
        break;
      case OptionState.YES:
        this.him = OptionState.NO;
        this.socket.writer.writeDont(this.code);
        break;
      case OptionState.WANTNO:
        switch (this.himq) {
          case Q.EMPTY:
            this.him = OptionState.NO;
            break;
          case Q.OPPOSITE:
            this.him = OptionState.WANTYES;
            this.himq = Q.EMPTY;
            this.socket.writer.writeDo(this.code);
        }
        break;
      case OptionState.WANTYES:
        switch (this.himq) {
          case Q.EMPTY:
            this.him = OptionState.NO;
            break;
          case Q.OPPOSITE:
            this.him = OptionState.NO;
            this.himq = Q.EMPTY;
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
      case OptionState.NO:
        if (this.socket.localOptions.has(this.code)) {
          this.us = OptionState.YES;
          this.socket.writer.writeWill(this.code);
        } else {
          this.socket.writer.writeWont(this.code);
        }
      case OptionState.YES:
        break;
      case OptionState.WANTNO:
        switch (this.usq) {
          case Q.EMPTY:
            // error: WONT answered by DO
            this.us = OptionState.NO;
            break;
          case Q.OPPOSITE:
            // error: WONT answered by DO
            this.us = OptionState.YES;
            this.usq = Q.EMPTY;
        }
        break;
      case OptionState.WANTYES:
        switch (this.usq) {
          case Q.EMPTY:
            this.us = OptionState.YES;
            break;
          case Q.OPPOSITE:
            this.us = OptionState.WANTNO;
            this.usq = Q.EMPTY;
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
      case OptionState.NO:
        break;
      case OptionState.YES:
        this.us = OptionState.NO;
        this.socket.writer.writeWont(this.code);
        break;
      case OptionState.WANTNO:
        switch (this.usq) {
          case Q.EMPTY:
            this.us = OptionState.NO;
            break;
          case Q.OPPOSITE:
            this.us = OptionState.WANTYES;
            this.usq = Q.EMPTY;
            this.socket.writer.writeWill(this.code);
        }
        break;
      case OptionState.WANTYES:
        switch (this.usq) {
          case Q.EMPTY:
            this.us = OptionState.NO;
            break;
          case Q.OPPOSITE:
            this.us = OptionState.NO;
            this.usq = Q.EMPTY;
        }
    }
  }
}
