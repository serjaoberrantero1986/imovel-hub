import { build } from 'esbuild';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';

const bundle = await build({entryPoints:['tests/portal-editor.browser.tsx'],bundle:true,write:false,outdir:'out',format:'iife',define:{'import.meta.env':'{}','process.env.NODE_ENV':'"development"'}});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text;
const css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
const server=createServer((request,response)=>{
  if(request.url==='/test.js'){response.setHeader('Content-Type','text/javascript');response.end(js);}
  else {response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/test.js"></script></body></html>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const profile=await mkdtemp(join(tmpdir(),'portal-editor-test-'));
const executable=process.env.EDITOR_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const child=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let socket;
try {
  const endpoint=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Browser startup timed out')),20000);child.on('error',reject);child.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map();
  socket.onmessage=event=>{const value=JSON.parse(event.data);if(value.id){const callbacks=pending.get(value.id);pending.delete(value.id);value.error?callbacks.reject(value.error):callbacks.resolve(value.result);}};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params,...(sessionId?{sessionId}:{})}));});
  for(const width of [1280,390]){
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768},sessionId);
    await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`},sessionId);
    const deadline=Date.now()+30000;let result;
    while(Date.now()<deadline){const value=await call('Runtime.evaluate',{expression:'window.__editorTests',returnByValue:true},sessionId);result=value.result?.value;if(result)break;await new Promise(resolve=>setTimeout(resolve,100));}
    if(!result)throw new Error('Browser tests did not complete');
    await call('Runtime.evaluate',{expression:'window.__setEditor(true)'},sessionId);
    await new Promise(resolve=>setTimeout(resolve,100));
    const geometry=await call('Runtime.evaluate',{expression:'(()=>{const r=document.querySelector(".canvas-drag-handle").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()',returnByValue:true},sessionId);
    const {x,y}=geometry.result.value;
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1},sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-10,y:650,button:'left',buttons:1},sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:width-10,y:650,button:'left',buttons:0,clickCount:1},sessionId);
    await new Promise(resolve=>setTimeout(resolve,100));
    const moved=await call('Runtime.evaluate',{expression:'(()=>{const r=document.querySelector(".canvas-command-bar").getBoundingClientRect();return {passed:r.top>200&&r.right<=innerWidth+1&&r.left>=0&&r.bottom<=innerHeight+1,rect:{top:r.top,right:r.right,bottom:r.bottom,left:r.left,width:r.width,height:r.height}};})()',returnByValue:true},sessionId);
    result.results.push({name:'arraste real por ponteiro mantém barra dentro da tela',passed:moved.result.value.passed,...(!moved.result.value.passed?{error:JSON.stringify(moved.result.value.rect)}:{})});
    result.failed ||= !moved.result.value.passed;
    console.log(JSON.stringify({width,...result},null,2));
    if(result.failed)process.exitCode=1;
    await call('Target.closeTarget',{targetId});
  }
  await call('Browser.close');
} finally {
  socket?.close();child.kill();server.close();
  // This is only the unique browser profile allocated by this test run.
  if(dirname(profile)===tmpdir()&&basename(profile).startsWith('portal-editor-test-'))await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100}).catch(()=>{});
}
