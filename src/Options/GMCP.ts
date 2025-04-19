import { Socket } from "../Socket";
import { Where, WhereValue } from "../constants";
import { Option } from "./Option";

export class GMCP extends Option {
  constructor(socket: Socket) {
    super(socket, "GMCP", 201);
  }

  enabled(where: WhereValue) {}
  disabled(where: WhereValue) {}

  subnegotiation(buffer: Buffer) {
    const match = buffer.toString().match(/([a-z_][\w-_]*(?:\.[a-z_][\w-_]*)+)\s*(.*)?/i);
    if (match) {
      let [, name, data] = match;
      name = name.toLowerCase();
      let packageName, messageName;
      if (name.includes('.')) {
        [packageName, messageName] = name.split('.');
      }
      if (data) {
        data = JSON.parse(data);
      }
      this.emit(`gmcp/${name}`, data);
      this.emit('gmcp', packageName, messageName, data);
    }
  }

  send(packageName: string, messageName: string, data: any) {
    this.socket.writer.writeSubnegotiation(this.code, `${packageName}.${messageName} ${JSON.stringify(data ?? '')}`);
  }


}