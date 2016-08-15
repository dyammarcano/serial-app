const SerialPort = require('serialport');
const wpi = require('wiring-pi');
const sleep = require('sleep');
const io = require('socket.io');
const moment = require('moment');

wpi.setup('gpio');

let buzz = 12;
let ledr = 21;
let ledg = 20;
let ledb = 16;

wpi.pinMode(buzz, wpi.OUTPUT);
wpi.pinMode(ledr, wpi.OUTPUT);
wpi.pinMode(ledg, wpi.OUTPUT);
wpi.pinMode(ledb, wpi.OUTPUT);

const cleanPins = () => {
  wpi.digitalWrite(buzz, 0);
  wpi.digitalWrite(ledr, 0);
  wpi.digitalWrite(ledg, 0);
  wpi.digitalWrite(ledb, 0);
};

const fingerError = () => {
  cleanPins();
  wpi.digitalWrite(ledr, 1);
  wpi.digitalWrite(buzz, 1);
  sleep.usleep(1000 * 1000);
  wpi.digitalWrite(buzz, 0);
  wpi.digitalWrite(ledr, 0);
};

const beepSound = () => {
  for (var i = 0; i < 3; i++) {
    wpi.digitalWrite(buzz, 1);
    sleep.usleep(50 * 1000);
    wpi.digitalWrite(buzz, 0);
    sleep.usleep(100 * 1000);
  };
};

const fingerSuccess = () => {
  cleanPins();
  wpi.digitalWrite(ledg, 1);
  wpi.digitalWrite(buzz, 1);
  sleep.usleep(50 * 1000);
  wpi.digitalWrite(buzz, 0);
  sleep.usleep(3000 * 1000);
  wpi.digitalWrite(ledg, 0);
};

const famReady = () => {
  cleanPins();
  wpi.digitalWrite(ledb, 1);
  beepSound();
};

const famReadyMute = () => {
  wpi.digitalWrite(ledb, 1);
};

const fingerCapture = () => {
  cleanPins();
  wpi.digitalWrite(ledr, 1);
  wpi.digitalWrite(ledg, 1);
};

const fingerFound = () => {
  wpi.digitalWrite(buzz, 1);
  sleep.usleep(50 * 1000);
  wpi.digitalWrite(buzz, 0);
  sleep.usleep(1500 * 1000);
};

steps = [];

const operationState = (state) => {
  cleanPins();
  if (state === 1) {
    fingerFound();
    //fingerError();
    fingerSuccess();
  }
  famReadyMute();
};

port = new SerialPort('/dev/ttyAMA0', {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false,
  parser: SerialPort.parsers.byteLength(13)
}, function (err) {
  if (err) {
    return console.log('Error: ', err.message);
  }
});

port.on('close',  () => {
  console.log('port closed.');
});

port.on('error', (error) => {
  console.log('Serial port error: ' + error);
});

cleanPins();
//fingerSuccess();
famReady();
//fingerError();
//fingerCapture();

commands = [];

commands[0] = new Uint8Array([0x40, 0x4b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x8b, 0x0d]); // check        40 4b 00 00 00 00 00 00 00 00 00 8b 0d
commands[1] = new Uint8Array([0x40, 0x49, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x89, 0x0d]); // capture      40 49 00 00 00 00 00 00 00 00 00 89 0d 
commands[2] = new Uint8Array([0x40, 0x52, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x93, 0x0d]); // compare vip  40 52 00 00 00 00 00 00 00 00 01 93 0d 
commands[3] = new Uint8Array([0x40, 0x4c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0d]); // cancel       40 4c 00 00 00 00 00 00 00 00 00 00 0d

num = 0;
mode = 0;
val = 0;

checkSum = (commands) => {
  for (var i = 0; i < 11; i++) {
    val += commands[i];
  }
  return val;
}

console.log("FAM Fs83 Start %s", checkSum(commands[num]) / 0xff);

setInterval(() => {
  if (num !== 0) {
    operationState(num);
  }
}, 50);

setInterval(() => {
  port.write(commands[num]);
}, 500);

buffer = [];

port.on('data', (data) => {

  console.log(data, num);

  if (data[10] == 0x40 || data[10] == 0x49) {
    //console.log(commands[num]);
    if (num == 1) {
      num = 2;
    } else {
      num = 1;
    }
  } else {
    num = 0;
  }
});