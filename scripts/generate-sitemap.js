const fs=require('node:fs');
const path=require('node:path');
const base=String(process.env.SITE_URL||'').trim().replace(/\/$/,'');
const api=String(process.env.LUMINA_API_BASE_URL||'').trim().replace(/\/$/,'');
const sitemap=path.join(__dirname,'..','sitemap.xml');
if(!base || !/^https:\/\//i.test(base) || !api){console.warn('Aviso: SITE_URL ou LUMINA_API_BASE_URL em falta; sitemap.xml existente mantido.');process.exit(0)}
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
fetch(api.replace(/\/api$/,'')+'/api/produtos?limite=100',{signal:controller.signal,headers:{Accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);const ps=await r.json();if(!Array.isArray(ps))throw new Error('Formato de produtos inválido');const urls=['','loja.html','promocoes.html',...ps.map(p=>'produto.html?id='+encodeURIComponent(p.id))];const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'<url><loc>'+base+'/'+u+'</loc></url>').join('\n')+'\n</urlset>\n';fs.writeFileSync(sitemap,xml);console.log('Sitemap gerado: '+urls.length+' URLs');}).catch(e=>{console.warn('Aviso: API indisponível; sitemap.xml existente mantido:',e.message);}).finally(()=>clearTimeout(timer));
