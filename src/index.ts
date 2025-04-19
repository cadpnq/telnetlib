import {
  createServer as netCreateServer,
  ServerOpts,
  createConnection as netCreateConnection,
  NetConnectOpts,
} from "net";
import { Socket } from "./Socket";
import { OptionName } from "./Options";

export interface TelnetConnectionOptions {
  localOptions: OptionName[];
  remoteOptions: OptionName[];
  autoNegotiate?: boolean;
  negotiationTimeout?: number;
}

export type CreateServerOptions = ServerOpts & TelnetConnectionOptions;
export const createServer = (
  options: CreateServerOptions,
  connectionListener: (socket: Socket) => void
) => {
  return netCreateServer(options, (socket) => {
    const telnet = new Socket(socket, options);
    connectionListener(telnet);
    if (options.autoNegotiate === true) {
      telnet.negotiateAll().catch((error) => {
        console.error("Negotiation failed", error);
      });
    }
  });
};

export type ConnectOptions = NetConnectOpts & TelnetConnectionOptions;
export const createConnection = async (
  options: ConnectOptions,
  connectionListener: () => void
) => {
  const connection = netCreateConnection(options, connectionListener);
  const telnet = new Socket(connection, options);
  if (options.autoNegotiate === true) {
    await telnet.negotiateAll().catch((error) => {
      console.error("Negotiation failed", error);
    });
  }
  return telnet;
};
