document.querySelector('#run').onclick=async()=>{
 const out=document.querySelector('#results'),logs=[];out.textContent='Running…';
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 const check=async(name,fn)=>{try{await fn();logs.push('PASS '+name);}catch(e){logs.push('FAIL '+name+': '+e.message);}out.textContent=logs.join('\n');};
 const {canvas,context,toBlob,normalize,selectionMask,askFiles,editFiles,finishEdit,bitmap,encodePNG}=image;
 const c=canvas(160,100),ctx=context(c);ctx.fillStyle='#d34532';ctx.fillRect(0,0,80,50);ctx.fillStyle='#278451';ctx.fillRect(80,0,80,50);ctx.fillStyle='#2556ce';ctx.fillRect(0,50,80,50);ctx.fillStyle='#eabb22';ctx.fillRect(80,50,80,50);
 const blob=await toBlob(c),pic=await normalize(new File([blob],'fixture.png',{type:'image/png'}));
 const shapes=[{kind:'rect',a:{x:20,y:20},b:{x:60,y:65}}];
 await check('Upload normalizes canonical pixels and dimensions',()=>{assert(pic.width===160&&pic.height===100,'wrong size');assert(pic.pixels.length===64000,'missing canonical RGBA');});
 await check('Single brush click is selected; sparse stroke stays connected',()=>{const m=selectionMask(160,100,[{kind:'brush',radius:8,points:[{x:20,y:20}]},{kind:'brush',radius:5,points:[{x:30,y:50},{x:120,y:50}]}]);const d=context(m).getImageData(0,0,160,100).data;assert(d[(20*160+20)*4+3]===255,'click missing');assert(d[(50*160+75)*4+3]===255,'stroke gap');assert(d[3]===0,'exterior selected');});
 await check('Ask includes original, visual selection context and close crop',async()=>{const f=await askFiles(pic,shapes);assert(f.has('image')&&f.has('context')&&f.has('crop'),'missing image');const crop=await bitmap(f.get('crop'));assert(crop.width===40&&crop.height===45,'wrong crop');crop.close();});
 const prep=await editFiles(pic,shapes);
 await check('API mask is transparent inside selection and opaque outside',async()=>{const m=await bitmap(prep.data.get('mask')),mc=canvas(m.width,m.height),cx=context(mc);cx.drawImage(m,0,0);const {layout:l}=prep;const x=Math.round(l.x+40/160*l.drawWidth),y=Math.round(l.y+40/100*l.drawHeight);assert(cx.getImageData(x,y,1,1).data[3]===0,'selected alpha should be 0');assert(cx.getImageData(0,0,1,1).data[3]===255,'padding must be protected');m.close();});
 const changed=canvas(prep.layout.width,prep.layout.height);context(changed).fillStyle='#0000ff';context(changed).fillRect(0,0,changed.width,changed.height);
 let result;
 await check('Real compositor applies returned image only inside selected pixels',async()=>{result=await finishEdit(pic,shapes,await toBlob(changed),prep.layout);for(let y=0;y<100;y++)for(let x=0;x<160;x++){const i=(y*160+x)*4;if(x<20||x>=60||y<20||y>=65)for(let k=0;k<4;k++)assert(result.pixels[i+k]===pic.pixels[i+k],'outside changed');}assert(result.pixels[(40*160+40)*4+2]===255,'inside not edited');});
 await check('Transparent canonical RGBA survives successive selected edits',async()=>{const pixels=new Uint8ClampedArray(pic.pixels);pixels.set([127,11,83,2],0);const transparent={...pic,pixels,blob:await encodePNG(pixels,160,100)};const one=await finishEdit(transparent,shapes,await toBlob(changed),prep.layout);const two=await finishEdit(one,shapes,await toBlob(changed),prep.layout);assert([...two.pixels.slice(0,4)].join(',')==='127,11,83,2','transparent exterior drift');URL.revokeObjectURL(one.url);URL.revokeObjectURL(two.url);});
 await check('Unexpected model dimensions are rejected',async()=>{let rejected=false;try{await finishEdit(pic,shapes,blob,prep.layout);}catch{rejected=true;}assert(rejected,'accepted wrong model size');});
 await check('All 8 JPEG EXIF orientations map correctly',async()=>{
   const jpeg=new Uint8Array(await (await toBlob(c,'image/jpeg',.99)).arrayBuffer());
   const colors=['red','green','blue','gold'];
   const expected=[[0,1,2,3],[1,0,3,2],[3,2,1,0],[2,3,0,1],[0,2,1,3],[2,0,3,1],[3,1,2,0],[1,3,0,2]];
   for(let orientation=1;orientation<=8;orientation++){
     const exif=new Uint8Array([0xff,0xe1,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]);
     const f=new File([jpeg.slice(0,2),exif,jpeg.slice(2)],'orientation.jpg',{type:'image/jpeg'}),p=await normalize(f);assert(p.width===(orientation>=5?100:160)&&p.height===(orientation>=5?160:100),'dimensions orientation '+orientation);
     const corners=[[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([x,y])=>{const i=(Math.floor(y*p.height)*p.width+Math.floor(x*p.width))*4;const [r,g,b]=p.pixels.slice(i,i+3);return r>150&&g>120?'gold':r>g&&r>b?'red':g>r&&g>b?'green':'blue';});
     assert(corners.join(',')===expected[orientation-1].map(i=>colors[i]).join(','),'corners orientation '+orientation+': '+corners);URL.revokeObjectURL(p.url);
   }
 });
 await check('Corrupt and oversize uploads fail before becoming current image',async()=>{let failed=0;for(const f of [new File(['not png'],'bad.png',{type:'image/png'}),new File([new Uint8Array(21*1024*1024)],'large.png',{type:'image/png'})])try{await normalize(f);}catch{failed++;}assert(failed===2,'invalid file accepted');});
 URL.revokeObjectURL(pic.url);if(result)URL.revokeObjectURL(result.url);out.textContent+='\n\n'+logs.filter(x=>x.startsWith('PASS')).length+'/'+logs.length+' checks passed.';
};
