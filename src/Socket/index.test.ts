import { Socket } from ".";
import { Duplex } from "stream";
import { Socket as NetSocket } from "net";
import { OptionName } from "../Options";
import { GMCP } from "../Options/GMCP";

type SocketOptions = {
  local?: OptionName[];
  remote?: OptionName[];
};

interface CreateSocketPairOptions {
  aOptions?: SocketOptions;
  bOptions?: SocketOptions;
}
const createSocketPair = ({ aOptions, bOptions }: CreateSocketPairOptions) => {
  const duplex1 = new Duplex({
    read(size) {},
    write(chunk, encoding, callback) {
      duplex2.push(chunk);
      callback();
    },
  });
  const duplex2 = new Duplex({
    read(size) {},
    write(chunk, encoding, callback) {
      duplex1.push(chunk);
      callback();
    },
  });

  const socketA = new Socket(duplex1 as NetSocket, {
    localOptions: aOptions?.local ?? [],
    remoteOptions: aOptions?.remote ?? [],
  });
  const socketB = new Socket(duplex2 as NetSocket, {
    localOptions: bOptions?.local ?? [],
    remoteOptions: bOptions?.remote ?? [],
  });

  return {
    socketA,
    socketB,
    negotiate: async () => {
      await socketA.negotiateAll();
      await socketB.negotiateAll();
    },
  };
};

describe("telnetlib", () => {
  describe("Socket", () => {
    it("should properly send data between sockets", async () => {
      const { socketA, socketB, negotiate } = createSocketPair({});
      await negotiate();

      socketA.on("data", (data) => {
        expect(data).toBe("abc");
      });
      socketB.write("abc");
    });

    it("should be able to negotiate a telnet option", async () => {
      const { socketA, socketB, negotiate } = createSocketPair({
        aOptions: { local: ["GMCP"], remote: ["GMCP"]},
        bOptions: { local: ["GMCP"], remote: ["GMCP"]}
      });
      await negotiate();

      socketA.on("data", (data) => {
        expect(data).toBe("abc");
      });
      socketB.write("abc");
    });
  });
  // describe("Options", () => {
  //   describe("Options: GMCP", () => {
  //     it("should be able to enable GMCP", async () => {
  //       const { socketA, socketB, negotiate } = createSocketPair({
  //         aOptions: { local: ["GMCP"], remote: ["GMCP"]},
  //         bOptions: { local: ["GMCP"], remote: ["GMCP"]}
  //       });
  //       await negotiate();
  
  //       socketA.on("data", (data) => {
  //         expect(data).toBe("abc");
  //       });
  //       socketB.write("abc");
  //     });

  //     describe("Options: GMCP: Package Names", () => {
  //       let socketA: Socket | null = null;
  //       let socketB: Socket | null = null;
  //       let packageName = "";
  //       let messageName = "";
  //       const dummyData = 69;

  //       beforeEach(async () => {
  //         const { socketA: socketASetup, socketB: socketBSetup, negotiate } = createSocketPair({
  //           aOptions: { local: ["GMCP"], remote: ["GMCP"]},
  //           bOptions: { local: ["GMCP"], remote: ["GMCP"]}
  //         });
  //         await negotiate();
  //         socketA = socketASetup;
  //         socketB = socketBSetup;
  //       });

  //       afterEach((done) => {
  //         let bothDone = false;

  //         let aGMCP = socketA!.getOption<GMCP>(201)!;
  //         let bGMCP = socketB!.getOption<GMCP>(201)!;

  //         aGMCP.once(
  //           `gmcp/${packageName.toLowerCase()}.${messageName.toLowerCase()}`,
  //           (data) => {
  //             expect(data).toBe(dummyData);
  //             if (bothDone) done();
  //             bothDone = true;
  //           }
  //         );
  //         aGMCP.once(`gmcp`, (_packageName, _messageName, data) => {
  //           if (_packageName == packageName && _messageName == messageName) {
  //             expect(data).toBe(dummyData);
  //             if (bothDone) done();
  //             bothDone = true;
  //           }
  //         });
  //         bGMCP.send(packageName, messageName, dummyData);
  //       });

  //       messageName = "derp";
  //       it("should support simple package names", () => {
  //         packageName = "test";
  //       });
  //     });
  //   });
  //   describe("Options: MCCP", () => {});
  //   describe("Options: NAWS", () => {});
  //   describe("Options: SGA", () => {});
  // });
});