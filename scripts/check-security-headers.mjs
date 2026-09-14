import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
const headerMap = new Map(globalHeaders.map(({ key, value }) => [key.toLowerCase(), value]));
const csp = headerMap.get('content-security-policy');

if (!csp) {
  throw new Error('Content-Security-Policy header is required.');
}

const directives = new Map(
  csp
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\s+/);
      return [name, values];
    }),
);

function requireDirective(name) {
  if (!directives.has(name)) {
    throw new Error(`CSP directive ${name} is required.`);
  }
}

for (const name of [
  'default-src',
  'script-src',
  'style-src',
  'style-src-elem',
  'style-src-attr',
  'img-src',
  'connect-src',
  'worker-src',
  'frame-src',
  'frame-ancestors',
  'base-uri',
  'form-action',
  'object-src',
]) {
  requireDirective(name);
}

for (const name of ['default-src', 'script-src', 'style-src', 'style-src-elem', 'img-src', 'connect-src']) {
  const values = directives.get(name) ?? [];
  if (values.includes('*') || values.includes('http:') || values.includes('https:')) {
    throw new Error(`CSP directive ${name} contains a wildcard or scheme-wide source.`);
  }
}

for (const name of ['script-src', 'style-src', 'style-src-elem']) {
  const values = directives.get(name) ?? [];
  if (values.includes("'unsafe-inline'") || values.includes("'unsafe-eval'")) {
    throw new Error(`CSP directive ${name} contains an unsafe source.`);
  }
}

if (headerMap.get('access-control-allow-origin') !== 'https://smart-dsp.vercel.app') {
  throw new Error('Static site responses must allow only the SmartDSP production origin.');
}

console.log('Security header configuration passed.');
