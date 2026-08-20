// SSRF 가드 자체점검 — 네트워크 없이 IP 분류만 검증. 실행: node lib/safe-fetch.test.mjs
import assert from 'node:assert';
import { isBlockedIp } from './safe-fetch.ts';

for (const ip of [
  '127.0.0.1', '10.0.0.5', '172.16.3.4', '172.31.255.255', '192.168.1.1',
  '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
  '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1',
  // IPv4-mapped IPv6 hex 형태 — WHATWG URL이 정규화해 실제로 만드는 형태 (과거 우회 경로)
  '::ffff:7f00:1',       // 127.0.0.1
  '::ffff:a9fe:a9fe',    // 169.254.169.254 (클라우드 메타데이터)
  '0:0:0:0:0:ffff:7f00:1',
  '::ffff:c0a8:1',       // 192.168.0.1
  '::127.0.0.1',         // IPv4-compatible
  '64:ff9b::7f00:1',     // NAT64 → 127.0.0.1
]) assert.equal(isBlockedIp(ip), true, `should block ${ip}`);

for (const ip of [
  '8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.0.1', '100.128.0.1',
  '2606:4700:4700::1111', '::ffff:808:808', // 8.8.8.8 mapped — 공인이면 허용
]) assert.equal(isBlockedIp(ip), false, `should allow ${ip}`);

console.log('safe-fetch guard: all cases pass');
