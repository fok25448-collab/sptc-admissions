import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import './build.mjs';
const handlers={};for(const name of ['courses','application-prepare','applications','contact'])handlers['/api/'+name]=(await import('../api/'+name+'.js')).default;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(handlers[url.pathname]){
   let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>40000){res.writeHead(413);res.end();return;}}
   req.body=text;await handlers[url.pathname](req,res);return;
  }
  const pages={'/':'index.html','/courses':'courses.html','/application':'application.html','/contact':'contact.html'};
  const path=resolve('dist',pages[url.pathname]||'.'+url.pathname);
  if(!path.startsWith(resolve('dist')+'/')){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(3000,'0.0.0.0',()=>console.log('Local preview: http://localhost:3000'));
