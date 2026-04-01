import test from 'node:test';
import assert from 'node:assert/strict';

import { checkRateLimit } from '../src/lib/security.js';

function createRequest(ip = '127.0.0.1') {
  return {
    headers: {},
    socket: { remoteAddress: ip },
    method: 'POST',
  };
}

function createResponse() {
  const headers = new Map();
  let statusCode;
  let body;

  return {
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), String(value));
    },
    writeHead(code) {
      statusCode = code;
    },
    end(value) {
      body = value;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
  };
}

test('applies stricter limit to login route', () => {
  const route = '/v1/auth/login';
  const req = createRequest('10.1.1.1');

  for (let i = 0; i < 20; i += 1) {
    const res = createResponse();
    const limited = checkRateLimit(req, res, route);
    assert.equal(limited, false);
  }

  const blockedRes = createResponse();
  const blocked = checkRateLimit(req, blockedRes, route);
  assert.equal(blocked, true);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.getHeader('x-ratelimit-limit'), '20');
  assert.match(String(blockedRes.body), /Too many requests/i);
});

test('keeps default limit for regular route', () => {
  const route = '/v1/clients';
  const req = createRequest('10.1.1.2');

  const firstRes = createResponse();
  const limited = checkRateLimit(req, firstRes, route);
  assert.equal(limited, false);
});
