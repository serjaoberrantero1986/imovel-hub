import { build } from 'esbuild';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';

const bundle = await build({ entryPoints: ['tests/auth-review.browser.tsx'], bundle: true, write: false, format: 'iife', define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"development"' } });
const js = bundle.outputFiles[0].text;
const cssName = (await readdir('dist/assets')).find(name => name.endsWith('.css'));
const css = await readFile(join('dist/assets', cssName), 'utf8');
const emailHtml = await readFile('supabase/templates/confirmation.html', 'utf8');
const emailLogo = await readFile('public/assets/email-logo.png');
const prepareLogo = process.argv.includes('--prepare-email-logo');
const logo = prepareLogo ? Buffer.from(await (await fetch('https://mpqitqzcksusgbheiynz.supabase.co/storage/v1/object/public/portal-assets/default/logo/ce951603e133ae6c38678ef9aabc9afbdeec9c2b6d554a78ffbe7c60bd804cbc.webp')).arrayBuffer()) : null;
const server = createServer((request, response) => {
  if (request.url === '/test.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(js); }
  else if (request.url === '/email-logo.png') { response.setHeader('Content-Type', 'image/png'); response.end(emailLogo); }
  else if (request.url === '/email-preview') { response.setHeader('Content-Type', 'text/html'); response.end(emailHtml.replaceAll('{{ .ConfirmationURL }}', `http://127.0.0.1:${server.address().port}/confirmation-target`).replace('https://www.webimoveis.site/assets/email-logo.png', '/email-logo.png')); }
  else if (request.url === '/logo-source' && logo) { response.setHeader('Content-Type', 'image/webp'); response.end(logo); }
  else { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="root"></div><script src="/test.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'auth-review-test-'));
const executable = process.env.EDITOR_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error('Browser startup timed out')), 20000);
    child.on('error', reject); child.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = event => { const value = JSON.parse(event.data); if (value.id) { const handlers = pending.get(value.id); pending.delete(value.id); value.error ? handlers.reject(value.error) : handlers.resolve(value.result); } };
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) })); });
  for (const width of [1280, 390]) {
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    await call('Runtime.enable', {}, sessionId);
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
    await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` }, sessionId);
    const deadline = Date.now() + 30000; let result;
    while (Date.now() < deadline) { const value = await call('Runtime.evaluate', { expression: 'window.__authReviewTests', returnByValue: true }, sessionId); result = value.result?.value; if (result) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    if (!result) throw new Error('Browser tests did not complete');
    console.log(JSON.stringify({ width, ...result }, null, 2));
    if (result.failed) process.exitCode = 1;
    if (prepareLogo && width === 1280) {
      const converted = await call('Runtime.evaluate', { expression: `(async()=>{const image=new Image();image.src='/logo-source';await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png').split(',')[1];})()`, awaitPromise: true, returnByValue: true }, sessionId);
      if (!converted.result?.value) throw new Error('Logo conversion failed');
      await writeFile('public/assets/email-logo.png', Buffer.from(converted.result.value, 'base64'));
      console.log('Logotipo oficial convertido para PNG, preservando transparência.');
    }
    await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/email-preview` }, sessionId);
    await new Promise(resolve => setTimeout(resolve, 300));
    const emailCheck = await call('Runtime.evaluate', { expression: `(()=>{const logo=document.querySelector('img');const link=[...document.querySelectorAll('a')].find(item=>item.textContent.includes('Confirmar meu e-mail'));return {passed:document.documentElement.scrollWidth<=innerWidth+1&&logo.complete&&logo.naturalWidth>0&&link?.href.endsWith('/confirmation-target'),width:document.documentElement.scrollWidth,viewport:innerWidth,logoLoaded:logo.complete&&logo.naturalWidth>0};})()`, returnByValue: true }, sessionId);
    console.log(JSON.stringify({ width, emailPreview: emailCheck.result.value }, null, 2));
    if (!emailCheck.result.value.passed) process.exitCode = 1;
    await call('Target.closeTarget', { targetId });
  }
  await call('Browser.close');
} finally {
  socket?.close(); child.kill(); server.close();
  if (dirname(profile) === tmpdir() && basename(profile).startsWith('auth-review-test-')) await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
}
