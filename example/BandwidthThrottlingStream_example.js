import BandwidthThrottlingStream from '../lib/BandwidthThrottlingStream.js';
import StreamSpeed from 'streamspeed';

import { Readable } from 'stream';
import { createWriteStream } from 'fs';

function* infinityGen(data) {
  while (true) {
    yield data;
  }
}

function* limit(len, iter) {
  let count = 0;
  for (const v of iter) {
    count += 1;
    yield v;
    if (count === len) return;
  }
}

const irs = Readable.from(limit(10000, infinityGen('a'.repeat(10000)))); // 100MB
const iws = createWriteStream('./dest.txt');

const throttle = new BandwidthThrottlingStream(1024 * 1024, 1000); // 1MB/S throttling

const startTime = process.hrtime.bigint();

iws.on('finish', () => {
  console.log((process.hrtime.bigint() - startTime) / 1000000n + ' ms');
});

let ss = new StreamSpeed();
ss.add(throttle);

ss.on('speed', (speed) => {
  console.log('Reading at', StreamSpeed.toHuman(speed, { timeUnit: 's' }));
});

irs.pipe(throttle).pipe(iws);
// ...
// Reading at 1.05MB/s
// Reading at 971.81KB/s
// Reading at 1.05MB/s
// Reading at 971.81KB/s
// Reading at 1.05MB/s
// Reading at 971.81KB/s
// Reading at 1.05MB/s
// Reading at 971.81KB/s
// Reading at 1.05MB/s
// Reading at 971.81KB/s
// 98770 ms
