export const Commands = {
  EOR: 239,
  SE: 240,
  NOP: 241,
  DM: 242,
  BRK: 243,
  IP: 244,
  AO: 245,
  AYT: 246,
  EC: 247,
  EL: 248,
  GA: 249,
  SB: 250,
  WILL: 251,
  WONT: 252,
  DO: 253,
  DONT: 254,
  IAC: 255,
} as const;

export type Command = typeof Commands[keyof typeof Commands];
export type CommandName = keyof typeof Commands;

export const OptionState = {
  NO: 0,
  YES: 1,
  WANTNO: 2,
  WANTYES: 3,
} as const;

export type OptionStateValue = typeof OptionState[keyof typeof OptionState];
export type OptionStateName = keyof typeof OptionState;

export const Q = {
  EMPTY: 0,
  OPPOSITE: 1,
} as const;

export type QValue = typeof Q[keyof typeof Q];
export type QName = keyof typeof Q;

export const Where = {
  REMOTE: 0,
  LOCAL: 1,
} as const;

export type WhereValue = typeof Where[keyof typeof Where];
export type WhereName = keyof typeof Where;

export const State = {
  DATA: 0,
  IAC: 1,
  WILL: 2,
  WONT: 3,
  DO: 4,
  DONT: 5,
  SB: 6,
  SBIAC: 7,
} as const;

export type StateValue = typeof State[keyof typeof State];
export type StateName = keyof typeof State;

export const Reason = {
  DATA: 0,
  GA: 1,
  EOR: 2,
  CHUNK: 3,
} as const;

export type ReasonValue = typeof Reason[keyof typeof Reason];
export type ReasonName = keyof typeof Reason;
