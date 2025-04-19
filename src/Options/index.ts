import { GMCP } from "./GMCP";
import { MCCP } from "./MCCP";
import { NAWS } from "./NAWS";
import { SGA } from "./SGA";

export type OptionImplementation = typeof GMCP | typeof NAWS | typeof SGA | typeof MCCP;
export type OptionName = "GMCP" | "NAWS" | "SGA" | "MCCP";

export interface OptionDescription {
  code: number;
  option: OptionImplementation;
}
export const Options: Record<OptionName, OptionDescription> = {
  GMCP: {code: 201, option: GMCP},
  MCCP: {code: 86, option: MCCP},
  NAWS: {code: 31, option: NAWS},
  SGA: {code: 3, option: SGA},
};

// export const Options: Record<OptionName, OptionDescription> = {
//   GMCP: {code: 201, option: GMCP},
//   MCCP: {code: 86, option: MCCP},
//   NAWS: {code: 31, option: NAWS},
//   SGA: {code: 3, option: SGA},
// };

// export type OptionName = keyof typeof Options;
