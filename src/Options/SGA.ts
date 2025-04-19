import { Socket } from "../Socket";
import { Where, WhereValue } from "../constants";
import { Option } from "./Option";

export class SGA extends Option {
  constructor(socket: Socket) {
    super(socket, "SGA", 31);
  }

  enabled(where: WhereValue) {
    if (where === Where.LOCAL) {
      this.socket.reader.flushPolicy.endOfChunk = true;
    }
  }
  disabled(where: WhereValue) {
    if (where === Where.LOCAL) {
      this.socket.reader.flushPolicy.endOfChunk = false;
    }
  }

  subnegotiation(buffer: Buffer) {}
}