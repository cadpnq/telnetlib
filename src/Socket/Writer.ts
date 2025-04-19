import { Transform } from 'stream';
import { Commands, Command } from '../constants';
import { Socket as NetSocket } from 'net';

type Bufferesque = Buffer | number[] | string;

export class Writer extends Transform {
  socket: NetSocket;
  constructor(socket: NetSocket) {
    super();
    this.socket = socket;
  }

  _transform(chunk: Buffer, encoding: string, callback: () => void) {
    this.socket.write(chunk.toString(), callback);
  }

  __write(data: Bufferesque) {
    let buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (buffer.includes(Commands.IAC)) {
      const duplicatedData = [];
      for (const byte of buffer) {
        if (byte === Commands.IAC) {
          duplicatedData.push(byte);
        }
        duplicatedData.push(byte);
      }
      buffer = Buffer.from(duplicatedData);
    }

    this.__writeRaw(buffer);
  }

  __writeRaw(data: Bufferesque) {
    let buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.push(buffer);
  }

  writeCommand(command: Command, ...data: number[]) {
    this.__writeRaw([Commands.IAC, command, ...data]);;
  }

  writeDo(option: number) {
    this.writeCommand(Commands.DO, option);
  }
  writeDont(option: number) {
    this.writeCommand(Commands.DONT, option);
  }
  writeWill(option: number) {
    this.writeCommand(Commands.WILL, option);
  }
  writeWont(option: number) {
    this.writeCommand(Commands.WONT, option);
  }
  writeSubnegotiation(option: number, data: Bufferesque) {
    this.socket.cork();

    this.writeCommand(Commands.SB, option);
    if (data) {
      this.__write(data);
    }
    this.writeCommand(Commands.SE);
    this.socket.uncork();
  }
}