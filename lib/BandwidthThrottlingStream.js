import { Transform } from 'stream';

import { cuttingBuffer } from 'buffer-cutter';

import delay from './delay.js';

export default class BandwidthThrottlingStream extends Transform {
  constructor(bytePerInterval, intervalMSec, streamOpts) {
    super(streamOpts);

    this.responsiveMSec = 100;
    const temp = intervalMSec / this.responsiveMSec;
    this.bytePerInterval = bytePerInterval / temp;
    this.intervalMSec = intervalMSec / temp;
    this.lastPush = this.getNow();
    this.tmpBuf = null;
  }

  async _transform(chunk, enc, cb) {
    const nowBuf = this.tmpBuf ? Buffer.concat([this.tmpBuf, chunk]) : chunk;
    this.tmpBuf = null;
    if (nowBuf.length > this.bytePerInterval) {
      // console.log('large');
      const nowBuffers = cuttingBuffer(nowBuf, {
        deepCopy: true,
        length: this.bytePerInterval,
      });

      for (const buf of nowBuffers) {
        // console.log('larget split send', buf.length);
        if (buf.length === this.bytePerInterval) {
          this.push(buf);
          this.lastPush = this.getNow();
          await delay(this.intervalMSec);
        } else {
          this.push(buf);
          this.lastPush = this.getNow();
          const delayTime =
            buf.length / (this.bytePerInterval / this.intervalMSec);
          if (delayTime !== 0) {
            await delay(delayTime);
          }
        }
      }
      return cb();
    } else {
      if (
        (this.getNow() - this.lastPush) / 1000000n <
        BigInt(this.intervalMSec)
      ) {
        this.tmpBuf = nowBuf;
        return cb();
      } else {
        console.log('time out');
        this.push(nowBuf);
        this.lastPush = this.getNow();
        const delayTime =
          nowBuf.length / (this.bytePerInterval / this.intervalMSec);
        if (delayTime !== 0) {
          await delay(delayTime);
        }
        return cb();
      }
    }
  }

  getNow() {
    return process.hrtime.bigint();
  }

  _flush(cb) {
    cb();
  }
}
