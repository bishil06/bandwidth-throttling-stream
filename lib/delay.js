import { setTimeout } from 'node:timers';

export default function delay(ms) {
  const numberMs = Number(ms);

  return new Promise((res) => {
    setTimeout(() => res(), numberMs);
  });
}
