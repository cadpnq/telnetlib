import { createInflate, createDeflate, constants } from "zlib";
import { Socket } from "../Socket";
import { OptionState, Where, WhereValue } from "../constants";
import { Option } from "./Option";

const { Z_SYNC_FLUSH, Z_FINISH } = constants;

export class MCCP extends Option {
  deflating = false;
  inflating = false;

  deflate = createDeflate({ flush: Z_SYNC_FLUSH });
  inflate = createInflate({ flush: Z_SYNC_FLUSH });

  constructor(socket: Socket) {
    super(socket, "MCCP", 86);
  }

  enabled(where: WhereValue) {
    if (where === Where.LOCAL) {
      this.socket.writer.writeSubnegotiation(this.code, "");
      this.socket.writer.unpipe(this.socket.socket);
      this.socket.writer.pipe(this.deflate).pipe(this.socket.socket);
      this.deflating = true;
    }
  }
  disabled(where: WhereValue) {
    if (where === Where.LOCAL) {
      this._endCompression();
    }
  }

  subnegotiation(buffer: Buffer) {
    if (this.him === OptionState.YES && !this.inflating) {
      this.inflating = true;
      this.inflate.once("end", () => {
        this.socket.reader.unpipe(this.inflate);
        this.socket.socket.pipe(this.socket.reader);
        this.inflating = false;
        this.him = OptionState.NO;
      });

      this.socket.socket.unpipe(this.socket.reader);
      this.socket.socket
        .pipe(this.inflate, { end: false })
        .pipe(this.socket.reader, { end: false });
    }
  }

  _endCompression(callback?: () => void) {
    if (this.us === OptionState.YES && this.deflating === true) {
      this.socket.writer.cork();
      this.deflate.flush(Z_FINISH, () => {
        this.socket.writer.unpipe(this.deflate);
        this.socket.writer.pipe(this.socket.socket);
        this.deflating = false;
        this.socket.writer.uncork();
        callback?.();
      });
    }
  }

  endCompression(callback?: () => void) {
    return new Promise<void>((resolve) => {
      this._endCompression(() => {
        resolve();
        callback?.();
      });
    });
  }
}
