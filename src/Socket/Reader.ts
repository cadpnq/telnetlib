import { Transform } from "stream";
import { Socket } from "./Socket";
import { Commands, Reason, State, StateValue, ReasonValue } from "../constants";

export class Reader extends Transform {
  #state: StateValue = State.DATA;
  #data: number[] = [];
  #subnegotiation: number[] = [];
  receiveBufferMax = 4096;
  subnegotiationBufferMax = 4096;
  flushPolicy = {
    endOfChunk: false,
    goAhead: true,
    endOfRecord: true,
  };

  socket: Socket;
  constructor(socket: Socket) {
    super();
    this.socket = socket;
  }

  _maybeFlush(flushReason: ReasonValue) {
    const length = this.#data.length;
    if (length === 0) return;
    let flush = false;

    switch (flushReason) {
      case Reason.DATA:
        if (
          length >= 2 &&
          this.#data[length - 1] === 0x0a &&
          this.#data[length - 2] === 0x0d
        ) {
          flush = true;
        }
        break;
      case Reason.EOR:
        flush = this.flushPolicy.endOfRecord;
        break;
      case Reason.GA:
        flush = this.flushPolicy.goAhead;
        break;
      case Reason.CHUNK:
        flush = this.flushPolicy.endOfChunk;
        break;
    }

    if (flush) {
      this.push(Buffer.from(this.#data));
      this.#data = [];
    }
  }

  _pushData(data: number) {
    if (this.#data.length > this.receiveBufferMax) {
      this.emit("error", new Error("Receive buffer overflow"));
      this.socket.end();
      return true;
    }
    this.#data.push(data);
  }

  _pushSubnegotiation(data: number) {
    if (this.#subnegotiation.length > this.subnegotiationBufferMax) {
      this.emit("error", new Error("Subnegotiation buffer overflow"));
      this.socket.end();
      return true;
    }
    this.#subnegotiation.push(data);
  }

  _transform(chunk: Buffer, encoding: string, callback: () => void) {
    for (const byte of chunk) {
      switch (this.#state) {
        case State.DATA:
          if (byte === Commands.IAC) {
            this.#state = State.IAC;
          } else {
            if (this._pushData(byte)) return;
            this._maybeFlush(Reason.DATA);
          }
          break;
        case State.IAC:
          switch (byte) {
            case Commands.IAC:
              if (this._pushData(byte)) return;
              this.#state = State.DATA;
              break;
            case Commands.WILL:
              this.#state = State.WILL;
              break;
            case Commands.WONT:
              this.#state = State.WONT;
              break;
            case Commands.DO:
              this.#state = State.DO;
              break;
            case Commands.DONT:
              this.#state = State.DONT;
              break;
            case Commands.SB:
              this.#state = State.SB;
              break;
            case Commands.GA:
              this.#state = State.DATA;
              this._maybeFlush(Reason.GA);
              break;
            case Commands.EOR:
              this.#state = State.DATA;
              this._maybeFlush(Reason.EOR);
              break;
            default:
              this.#state = State.DATA;
          }
          break;
        case State.SB:
          if (byte === Commands.IAC) {
            this.#state = State.SBIAC;
          } else {
            if (this._pushSubnegotiation(byte)) return;
          }
          break;
        case State.SBIAC:
          switch (byte) {
            case Commands.IAC:
              this.#state = State.SB;
              if (this._pushSubnegotiation(byte)) return;
              break;
            case Commands.SE:
              if (this.#subnegotiation.length > 0) {
                const option = this.socket.getOption(this.#subnegotiation[0]);
                if (!option) throw new Error("Unknown option");
                option.subnegotiation(Buffer.from(this.#subnegotiation.slice(1)));
                this.#subnegotiation = [];
              }
              this.#state = State.DATA;
          }
      }
    }

    if (this.#data.length > 0) {
      this._maybeFlush(Reason.CHUNK);
    }

    callback();
  }
}
