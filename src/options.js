let { options } = require('./constants');
let TelnetOption = require('./Options/TelnetOption');

let _options = new Map();

function getOption(code) {
  if (_options.has(code)) {
    return _options.get(code);
  } else {
    return TelnetOption;
  }
}

function defineOption(name, code, handler = TelnetOption) {
  options[name] = code;
  _options.set(code, handler);
}

defineOption('TRANSMIT_BINARY', 0);
defineOption('ECHO', 1);
defineOption('SGA', 3, require('./Options/sga'));
defineOption('NAWS', 31, require('./Options/naws'));
defineOption('MCCP', 86, require('./Options/mccp'));
defineOption('GMCP', 201, require('./Options/gmcp'));

exports.getOption = getOption;
exports.defineOption = defineOption;
exports.TelnetOption = TelnetOption;
