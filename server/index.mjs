import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { RoomHub } from './rooms.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
export function createServer({staticDir=root,allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)}={}){
  const hub=new RoomHub();
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return;}
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let target=path.resolve(staticDir,'.'+pathname);
      if(target!==staticDir&&!target.startsWith(staticDir+path.sep)){res.writeHead(403);res.end();return;}
      try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');}catch{target=path.join(staticDir,'index.html');}
      const data=await readFile(target),ext=path.extname(target);
      res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':target.includes(path.sep+'assets'+path.sep)?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Build the game with npm run build, then start this server.');}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    let allowed=false;
    try{
      const origin=req.headers.origin,host=new URL('http://'+req.headers.host);
      const local=['localhost','127.0.0.1','[::1]'];
      allowed=!origin||allowedOrigins.includes(origin)||new URL(origin).host===host.host||(local.includes(new URL(origin).hostname)&&local.includes(host.hostname));
    }catch{}
    if(req.url!=='/room'||!allowed||hub.clients.size>=2048){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  wss.on('connection',socket=>{
    const peer=hub.connect(socket);socket.alive=true;
    socket.on('pong',()=>socket.alive=true);
    socket.on('message',(data,binary)=>{if(binary)return;try{hub.handle(peer,JSON.parse(data.toString()));}catch{hub.error(peer,'That request could not be read.');}});
    socket.on('close',()=>hub.disconnect(peer));socket.on('error',()=>{});
  });
  const updates=setInterval(()=>hub.tick(),80),heartbeat=setInterval(()=>{
    for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}
  },30000);updates.unref();heartbeat.unref();
  return {server,hub,wss,async close(){clearInterval(updates);clearInterval(heartbeat);for(const socket of wss.clients)socket.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const app=createServer(),port=Number(process.env.PORT||5175),host=process.env.HOST||'0.0.0.0';
  app.server.listen(port,host,()=>console.log(`Multiplayer server ready on http://${host}:${port}`));
  app.server.on('error',error=>{console.error(error.message);process.exit(1);});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}
