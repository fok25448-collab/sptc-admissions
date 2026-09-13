/* js_global.html was absent from the supplied source. Recreated only its missing data load. */
document.addEventListener('DOMContentLoaded',()=>{
 const container=document.getElementById('cardContainer'),loader=document.getElementById('loader');
 async function load(){
  loader.classList.remove('hidden');
  try{
   const courses=await App.courses();container.replaceChildren();
   document.getElementById('resultCount').textContent=`ทั้งหมด ${courses.length} หลักสูตร`;
   for(const c of courses){
    const card=document.createElement('a');card.href='/courses';card.className='bg-white rounded-xl shadow-lg overflow-hidden hover-card block';
    card.innerHTML=`<img class="w-full h-48 object-cover" src="${App.escape(App.image(c.image)||'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80')}" alt="${App.escape(c.name)}" loading="lazy"><div class="p-6"><span class="text-sm text-blue-900">${App.escape(c.level)} · ${App.escape(c.system)}</span><h3 class="text-xl font-bold text-gray-800 mt-2 mb-3">${App.escape(c.name)}</h3><p class="text-gray-500 line-clamp-3">${App.escape(c.description)}</p><div class="mt-4 text-blue-900 font-medium">ดูรายละเอียด <i class="fas fa-arrow-right ml-2"></i></div></div>`;
    container.append(card);
   }
   if(!courses.length)App.error(container,'ยังไม่มีข้อมูลหลักสูตรที่เปิดเผย');
  }catch(e){App.error(container,e.message,load);}finally{loader.classList.add('hidden');}
 }
 load();
});
