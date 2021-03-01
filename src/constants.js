exports.commands = {
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
  IAC: 255
};

exports.optionState = {
  NO: 'NO',
  YES: 'YES',
  WANTNO: 'WANTNO',
  WANTYES: 'WANTYES'
};

exports.q = {
  EMPTY: 'EMPTY',
  OPPOSITE: 'OPPOSITE'
};

exports.where = {
  REMOTE: 'REMOTE',
  LOCAL: 'LOCAL'
};

exports.state = {
  DATA: 'DATA',
  IAC: 'IAC',
  WILL: 'WILL',
  WONT: 'WONT',
  DO: 'DO',
  DONT: 'DONT',
  SB: 'SB',
  SBIAC: 'SBIAC'
};

exports.reason = {
  DATA: 'DATA',
  GA: 'GA',
  EOR: 'EOR',
  CHUNK: 'CHUNK'
};

exports.options = {};