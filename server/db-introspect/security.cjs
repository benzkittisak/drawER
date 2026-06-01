'use strict';

const dns = require('node:dns').promises;
const net = require('node:net');
const { allowPrivateNet } = require('./config.cjs');

const PRIVATE_V4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  if (!net.isIPv4(ip)) return true;
  return PRIVATE_V4.some((re) => re.test(ip));
}

async function resolveHost(host) {
  if (!host || host === 'localhost') return ['127.0.0.1', '::1'];
  if (net.isIP(host)) return [host];
  try {
    const records = await dns.lookup(host, { all: true });
    return records.map((r) => r.address);
  } catch {
    throw new Error(`Could not resolve host: ${host}`);
  }
}

/** @param {string} host */
async function assertHostAllowed(host) {
  if (allowPrivateNet()) return;
  const ips = await resolveHost(host);
  for (const ip of ips) {
    if (isPrivateIp(ip)) {
      throw new Error(
        'Connections to private/local addresses are blocked. Set DB_IMPORT_ALLOW_PRIVATE_NET=1 for local dev.',
      );
    }
  }
}

module.exports = { assertHostAllowed, isPrivateIp };
