const http=require('http'),fs=require('fs'),path=require('path');const root=process.argv[2];
const types={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ttf':'font/ttf','.ico':'image/x-icon'};
http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);let f=path.join(root,p);
 const cands=[f,f+'.html',path.join(f,'index.html'),path.join(root,'+not-found.html')];
 if(p.startsWith('/course/'))cands.unshift(path.join(root,'course/[id].html'));if(p.startsWith('/member/'))cands.unshift(path.join(root,'member/[id].html'));
 for(const c of cands){if(fs.existsSync(c)&&fs.statSync(c).isFile()){r.writeHead(200,{'content-type':types[path.extname(c)]||'application/octet-stream'});return fs.createReadStream(c).pipe(r);}}
 r.writeHead(404);r.end('nf');}).listen(4173,()=>console.log('serve 4173'));
