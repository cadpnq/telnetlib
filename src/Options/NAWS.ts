import { Socket } from "../Socket";
import { Where, OptionState, WhereValue, OptionStateValue } from "../constants";
import { Option } from "./Option";

export class NAWS extends Option {
  constructor(socket: Socket) {
    super(socket, "NAWS", 31);
  }

  enabled(where: WhereValue) {}
  disabled(where: WhereValue) {}

  subnegotiation(buffer: Buffer) {
    const width = buffer.readUint16BE(0);
    const height = buffer.readUInt16BE(0);
    this.socket.columns = width;
    this.socket.rows = height;
    this.socket.emit('resize');
    this.emit('resize', { width, height });
  }

  sendResize(width: number, height: number) {
    if (this.us !== OptionState.YES) return;

    const buffer = Buffer.alloc(4);
    buffer.writeUInt16BE(width, 0);
    buffer.writeUInt16BE(height, 2);
    this.socket.writer.writeSubnegotiation(this.code, buffer);
  }
}