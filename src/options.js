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
defineOption('SGA', 3, require('./Options/SGA'));
defineOption('NAWS', 31, require('./Options/NAWS'));
defineOption('MCCP', 86, require('./Options/MCCP'));
defineOption('GMCP', 201, require('./Options/GMCP'));

exports.getOption = getOption;
exports.defineOption = defineOption;
exports.TelnetOption = TelnetOption;
