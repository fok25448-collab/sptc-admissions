import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
const read=p=>readFile(p,'utf8');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('src/styles','dist/assets',{recursive:true});
await mkdir('dist/assets/fonts/files',{recursive:true});
let fontCss='';
for(const weight of [300,400,500,600,700])fontCss+=await read(`node_modules/@fontsource/kanit/${weight}.css`);
await writeFile('dist/assets/fonts/kanit.css',fontCss);
for(const name of await readdir('node_modules/@fontsource/kanit/files'))if(/-(300|400|500|600|700)-normal\.woff2?$/.test(name))await cp('node_modules/@fontsource/kanit/files/'+name,'dist/assets/fonts/files/'+name);
await cp('node_modules/@fortawesome/fontawesome-free/css/all.min.css','dist/assets/fontawesome.css');
await cp('node_modules/@fortawesome/fontawesome-free/webfonts','dist/webfonts',{recursive:true});
await mkdir('dist/licenses',{recursive:true});
await cp('node_modules/@fontsource/kanit/LICENSE','dist/licenses/Kanit.txt');
await cp('node_modules/@fortawesome/fontawesome-free/LICENSE.txt','dist/licenses/Font-Awesome.txt');
for(const page of ['home','courses','application','contact','application-status','admin']) {
 let html=await read(`src/pages/${page}.html`);
 for(const name of ['nav','footer','global-head']) {
  const partial=name==='footer'&&page==='contact'?'footer-compact':name;
  html=html.replace(`<!-- PARTIAL:${name} -->`,await read(`src/partials/${partial}.html`));
 }
 html=html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/g,'<link rel="stylesheet" href="/assets/tailwind.css">');
 html=html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css/g,'/assets/fontawesome.css');
 html=html.replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g,'/assets/fonts/kanit.css');
 html=html.replace('</head>','<link rel="stylesheet" href="/assets/motion.css">\n</head>');
 html=html.replace('</body>','<script src="/assets/motion.js"></script>\n</body>');
 html=html.replace('<body' ,'<body data-page="'+page+'"');
 await writeFile(`dist/${page==='home'?'index':page}.html`,html);
}
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-c','tailwind.config.cjs','-i','src/styles/tailwind-input.css','-o','dist/assets/tailwind.css','--minify'],{stdio:'inherit'});
await cp('shared/application-model.js','dist/assets/application-model.js');
await cp('node_modules/pdfmake/build/pdfmake.min.js','dist/assets/pdfmake.min.js');
const vfs={};for(const weight of [400,700])vfs['Sarabun-'+weight+'.ttf']=(await readFile('public/assets/pdf-fonts/Sarabun-'+weight+'.ttf')).toString('base64');
await writeFile('dist/assets/pdf-fonts.js','window.pdfMake.addVirtualFileSystem('+JSON.stringify(vfs)+');');
await cp('node_modules/pdfmake/LICENSE','dist/licenses/pdfmake.txt');
console.log('Built 6 pages with shared navigation/footer and local Thai PDF fonts.');
