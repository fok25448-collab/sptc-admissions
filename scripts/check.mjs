import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const dir of ['api','server','public/assets','scripts'])for(const file of await readdir(dir))if(/\.(js|mjs)$/.test(file))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
for(const name of ['index','courses','application','contact']){
 const text=await readFile(`dist/${name}.html`,'utf8');
 if(text.includes('<?')||text.includes('PARTIAL:'))throw Error('Unresolved template: '+name);
 if((text.match(/<nav\b/g)||[]).length!==1||(text.match(/<footer\b/g)||[]).length!==1)throw Error('Missing/duplicate shared shell');
}
console.log('JavaScript syntax and all four built pages passed.');
