import { Stream } from "stream";
import { EventEmitter } from "events";
import { Socket as NetSocket } from "net";
import { Reader } from "./Reader";
import { Writer } from "./Writer";
// TODO: what? Why do I have to specify index here??
import { OptionDescription, OptionImplementation, OptionName, Options } from "../Options/index";
import { OptionState, Q, Where, WhereValue, OptionStateValue, QValue } from "../constants";
import { Option } from "../Options/Option";

type SocketOptions = {
  localOptions: Array<OptionName>;
  remoteOptions: Array<OptionName>;
  negotiationTimeout?: number;
};

type OptionSpecifier =
  | {
      code: number;
      name?: never;
    }
  | {
      code?: never;
      name: OptionName;
    };

export const findOption = ({code, name}: OptionSpecifier) => {
  let o: [string, OptionDescription] | undefined;
  if (code !== undefined) {
    o = Object.entries(Options).find(([_, { code: c }]) => c === code);
  } else if (name !== undefined) {
    o = Object.entries(Options).find(([n, _]) => n === name);
  }
  if (o === undefined) throw new Error(`Unknown option ${name}`);
  return o;
};

export const reemit = (emitter: EventEmitter, name: string, on: EventEmitter): void => {
  emitter.on(name, (...args: any[]) => {
    console.log(`reemit ${name}`, args);
    on.emit(name, ...args);
  });
}

export class Socket extends Stream {
  isTTY = true;
  isRaw = true;
  columns = 80;
  rows = 24;

  socket: NetSocket;
  reader: Reader;
  writer: Writer;

  remoteOptions: Set<number>;
  localOptions: Set<number>;
  negotiationTimeout: number;

  options = new Map<number, InstanceType<OptionImplementation>>();

  readable: boolean;
  writable: boolean;

  constructor(socket: NetSocket, {localOptions, remoteOptions, negotiationTimeout = 1000}: SocketOptions) {
    super();
    this.socket = socket;

    console.log("remoteOptions", remoteOptions);
    remoteOptions.map((name) => console.log(name));

    this.remoteOptions = new Set(remoteOptions.map((name) => findOption({name})[1].code));
    this.localOptions = new Set(localOptions.map((name) => findOption({name})[1].code));
    this.negotiationTimeout = negotiationTimeout;

    this.reader = new Reader(this);
    this.writer = new Writer(socket);

    this.socket.pipe(this.reader);
    this.writer.pipe(this.socket);

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

  setEncoding(encoding: BufferEncoding) {
    this.socket.setEncoding(encoding);
  }
  write(data: Buffer | string, encoding?: BufferEncoding) {
    return this.writer.write(data, encoding);
  }
  end() {
    this.writer.end();
  }
  destroy() {
    this.writer.destroy();
  }
  resume() {
    this.reader.resume();
  }
  pause() {
    this.reader.pause();
  }

  getOption<T extends Option>(code: number) {
    if (this.options.has(code)) return this.options.get(code) as T;
    const [name, description] =
      Object.entries(Options).find(([name, { code: c }]) => c === code) ?? [];
    if (!name || !description) return;
    console.log(description);
    console.log(Options);
    const option = new description.option(this);
    this.options.set(code, option);
    return option as T;
  }

  async negotiateAll() {
    const promises = [];
    for (const code of this.localOptions) {
      promises.push(this.enableLocal(code));
    }
    for (const code of this.remoteOptions) {
      promises.push(this.enableRemote(code));
    }
    return Promise.allSettled(promises).then(() => this.emit("negotiated"));
  }

  async negotiateOption(
    { code, name }: OptionSpecifier,
    where: WhereValue,
    state: OptionStateValue,
    timeout = this.negotiationTimeout,
  ) {
    let optionCode = code;
    if (code === undefined && name !== undefined) {
      const description = Options[name];
      optionCode = description.code;
    }
    if (optionCode === undefined) throw new Error(`Unknown option ${name}`);

    switch (where) {
      case Where.LOCAL:
        switch (state) {
          case OptionState.YES:
            return this.enableLocal(optionCode, timeout);
          case OptionState.NO:
            return this.disableLocal(optionCode, timeout);
        }
      case Where.REMOTE:
        switch (state) {
          case OptionState.YES:
            return this.enableRemote(optionCode, timeout);
          case OptionState.NO:
            return this.disableRemote(optionCode, timeout);
        }
    }
  }

  // The rest of this isn't terribly pretty, but it's implementing the RFC1143 state machine
  // State machines are rarely pretty. I've included the comments from the RFC for reference.

  // If we decide to ask him to enable: using him and himq
  //    NO            him=WANTYES, send DO.
  //    YES           Error: Already enabled.
  //    WANTNO  EMPTY If we are queueing requests, himq=OPPOSITE;
  //                  otherwise, Error: Cannot initiate new request
  //                  in the middle of negotiation.
  //         OPPOSITE Error: Already queued an enable request.
  //    WANTYES EMPTY Error: Already negotiating for enable.
  //         OPPOSITE himq=EMPTY.
  async enableRemote(code: number, timeout = 1000, rejectOnTimeout = false) {
    if (this.remoteOptions.has(code)) return;
    const o = this.getOption(code);
    if (o === undefined) return;
    if (o.remotePromise !== undefined) return o.remotePromise;

    o.remotePromise = new Promise<boolean>((resolve, reject) => {
      this.remoteOptions.add(code);
      o.resolveRemote = resolve;
      o.rejectRemote = reject;
      switch (o.him) {
        case OptionState.NO:
          o.him = OptionState.WANTYES;
          this.writer.writeDo(code);
          break;
        case OptionState.YES:
          // error - already enabled
          resolve(true);
          o.remotePromise = undefined;
          return;
        case OptionState.WANTNO:
          switch (o.himq) {
            case Q.EMPTY:
              o.himq = Q.OPPOSITE;
              break;
            case Q.OPPOSITE:
              // error - already queued an enable request
              resolve(false);
              o.remotePromise = undefined;
              return;
          }
          break;
        case OptionState.WANTYES:
          switch (o.himq) {
            case Q.EMPTY:
              // error - already negotiating for enable
              resolve(false);
              o.remotePromise = undefined;
              return;
            case Q.OPPOSITE:
              o.himq = Q.EMPTY;
          }
      }
      setTimeout(() => {
        if (rejectOnTimeout) {
          reject(new Error(`Timeout waiting for ${code} to enable remotely`));
        } else {
          resolve(o.him === OptionState.YES);
        }
        o.remotePromise = undefined;
      }, timeout);
    });

    return o.remotePromise;
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
  async enableLocal(code: number, timeout = 1000, rejectOnTimeout = false) {
    if (this.localOptions.has(code)) return;
    const o = this.getOption(code);
    if (o === undefined) return;
    if (o.localPromise !== undefined) return o.localPromise;

    o.localPromise = new Promise<boolean>((resolve, reject) => {
      this.localOptions.add(code);
      o.resolveLocal = resolve;
      o.rejectLocal = reject;
      switch (o.us) {
        case OptionState.NO:
          o.us = OptionState.WANTYES;
          this.writer.writeWill(code);
          break;
        case OptionState.YES:
          // error - already enabled
          resolve(true);
          o.localPromise = undefined;
          return;
        case OptionState.WANTNO:
          switch (o.usq) {
            case Q.EMPTY:
              o.usq = Q.OPPOSITE;
              break;
            case Q.OPPOSITE:
              // error - already queued an enable request
              resolve(false);
              o.localPromise = undefined;
              return;
          }
        case OptionState.WANTYES:
          switch (o.usq) {
            case Q.EMPTY:
              // error - already negotiating for enable
              resolve(false);
              o.localPromise = undefined;
              return;
            case Q.OPPOSITE:
              o.usq = Q.EMPTY;
          }
      }
      setTimeout(() => {
        if (rejectOnTimeout) {
          reject(new Error(`Timeout waiting for ${code} to enable locally`));
        } else {
          resolve(o.us === OptionState.YES);
        }
      }, timeout);
    });

    return o.localPromise;
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
  async disableRemote(code: number, timeout = 1000, rejectOnTimeout = false) {
    if (!this.remoteOptions.has(code)) return;
    const o = this.getOption(code);
    if (o === undefined) return;
    if (o.remotePromise !== undefined) return o.remotePromise;

    o.remotePromise = new Promise<boolean>((resolve, reject) => {
      o.resolveRemote = resolve;
      o.rejectRemote = reject;
      switch (o.him) {
        case OptionState.NO:
          // error - already disabled
          resolve(true);
          o.remotePromise = undefined;
          return;
        case OptionState.YES:
          o.him = OptionState.WANTNO;
          this.writer.writeDont(code);
          break;
        case OptionState.WANTNO:
          switch (o.himq) {
            case Q.EMPTY:
              // error - already negotiating for disable
              resolve(false);
              o.remotePromise = undefined;
              return;
            case Q.OPPOSITE:
              o.himq = Q.EMPTY;
          }
        case OptionState.WANTYES:
          switch (o.himq) {
            case Q.EMPTY:
              o.himq = Q.OPPOSITE;
              break;
            case Q.OPPOSITE:
              // error - already queued a disable request
              resolve(false);
              o.remotePromise = undefined;
              return;
          }
      }
      setTimeout(() => {
        if (rejectOnTimeout) {
          reject(new Error(`Timeout waiting for ${code} to disable remotely`));
        } else {
          resolve(o.him === OptionState.NO);
        }
        o.remotePromise = undefined;
      }, timeout);
    });

    return o.remotePromise;
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
  async disableLocal(code: number, timeout = 1000, rejectOnTimeout = false) {
    if (!this.localOptions.has(code)) return;
    const o = this.getOption(code);
    if (o === undefined) return;
    if (o.localPromise !== undefined) return o.localPromise;

    o.localPromise = new Promise<boolean>((resolve, reject) => {
      o.resolveLocal = resolve;
      o.rejectLocal = reject;
      switch (o.us) {
        case OptionState.NO:
          // error - already disabled
          resolve(false);
          o.localPromise = undefined;
          return;
        case OptionState.YES:
          o.us = OptionState.WANTNO;
          this.writer.writeWont(code);
          break;
        case OptionState.WANTNO:
          switch (o.usq) {
            case Q.EMPTY:
              // error - already negotiating for disable
              resolve(true);
              o.localPromise = undefined;
              return;
            case Q.OPPOSITE:
              o.usq = Q.EMPTY;
          }
        case OptionState.WANTYES:
          switch (o.usq) {
            case Q.EMPTY:
              o.usq = Q.OPPOSITE;
              break;
            case Q.OPPOSITE:
              // error - already queued a disable request
              resolve(true);
              o.localPromise = undefined;
              return;
          }
      }
      setTimeout(() => {
        if (rejectOnTimeout) {
          reject(new Error(`Timeout waiting for ${code} to disable locally`));
        } else {
          resolve(o.us === OptionState.NO);
        }
        o.localPromise = undefined;
      }, timeout);
    });

    return o.localPromise;
  }
}
