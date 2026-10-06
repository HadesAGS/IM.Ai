export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Shape = { kind: "rect"; a: Point; b: Point } | { kind: "brush"; points: Point[]; radius: number };
export type Picture = { url: string; blob: Blob; pixels: Uint8ClampedArray; width: number; height: number; name: string; reduced?: boolean };
export const MAX_UPLOAD = 20 * 1024 * 1024;
export const MAX_EDGE = 1536;

export function canvas(width: number, height: number) {
  const c = document.createElement("canvas"); c.width = width; c.height = height; return c;
}
export function context(c: HTMLCanvasElement) { const ctx=c.getContext("2d", {willReadFrequently:true}); if(!ctx) throw Error("Your browser could not open an image canvas."); return ctx; }
export function toBlob(c: HTMLCanvasElement, type="image/png", quality=.92): Promise<Blob> {
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Could not prepare this image.")),type,quality));
}
export async function bitmap(blob: Blob) { return createImageBitmap(blob, {imageOrientation:"from-image"}); }
export function toPoint(clientX:number, clientY:number, rect:Pick<DOMRect,"left"|"top"|"width"|"height">, width:number,height:number): Point {
  return {x:Math.max(0,Math.min(width,(clientX-rect.left)*width/rect.width)),y:Math.max(0,Math.min(height,(clientY-rect.top)*height/rect.height))};
}
export function rectFrom(a:Point,b:Point):Rect { return {x:Math.floor(Math.min(a.x,b.x)),y:Math.floor(Math.min(a.y,b.y)),width:Math.ceil(Math.max(a.x,b.x))-Math.floor(Math.min(a.x,b.x)),height:Math.ceil(Math.max(a.y,b.y))-Math.floor(Math.min(a.y,b.y))}; }
export async function normalize(file: File): Promise<Picture> {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)) throw Error("Choose a JPG, PNG or WebP image. HEIC, GIF and SVG are not supported.");
  if(!file.size || file.size>MAX_UPLOAD) throw Error("Choose an image smaller than 20 MB.");
  const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const realType=head[0]===137&&head[1]===80&&head[2]===78?"image/png":head[0]===255&&head[1]===216?"image/jpeg":String.fromCharCode(...head.slice(0,4))==="RIFF"&&String.fromCharCode(...head.slice(8,12))==="WEBP"?"image/webp":"";
  if(realType!==file.type) throw Error("The image contents do not match its file type.");
  let img:ImageBitmap;
  try { img=await bitmap(file); } catch { throw Error("This image could not be read. Try exporting it as a JPG or PNG."); }
  try {
    if(img.width*img.height>40_000_000 || img.width>16000 || img.height>16000) throw Error("This image is too large to decode safely. Use an image under 40 megapixels.");
    const scale=Math.min(1,MAX_EDGE/Math.max(img.width,img.height));
    const width=Math.max(1,Math.round(img.width*scale)),height=Math.max(1,Math.round(img.height*scale));
    const c=canvas(width,height); context(c).drawImage(img,0,0,width,height);
    const pixels=context(c).getImageData(0,0,width,height).data;
    const blob=await encodePNG(pixels,width,height); return {blob,pixels,url:URL.createObjectURL(blob),width,height,name:file.name,reduced:scale<1};
  } finally { img.close(); }
}
export function paintShape(ctx:CanvasRenderingContext2D,shape:Shape) {
  if(shape.kind==="rect") { const r=rectFrom(shape.a,shape.b); ctx.fillRect(r.x,r.y,r.width,r.height); }
  else if(shape.points.length) {
    ctx.lineWidth=shape.radius*2; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath();ctx.arc(shape.points[0].x,shape.points[0].y,shape.radius,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(shape.points[0].x,shape.points[0].y);for(const p of shape.points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
  }
}
export function selectionMask(width:number,height:number,shapes:Shape[]) {
  const c=canvas(width,height),ctx=context(c);ctx.fillStyle="#fff";ctx.strokeStyle="#fff";shapes.forEach(s=>paintShape(ctx,s));return c;
}
export function selectionBounds(width:number,height:number,shapes:Shape[]):Rect|null {
  if(!shapes.length)return null;
  let x=width,y=height,right=0,bottom=0;
  for(const s of shapes) { if(s.kind==="rect"){const r=rectFrom(s.a,s.b);x=Math.min(x,r.x);y=Math.min(y,r.y);right=Math.max(right,r.x+r.width);bottom=Math.max(bottom,r.y+r.height);}else{for(const p of s.points){x=Math.min(x,p.x-s.radius);y=Math.min(y,p.y-s.radius);right=Math.max(right,p.x+s.radius);bottom=Math.max(bottom,p.y+s.radius);}} }
  x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));right=Math.min(width,Math.ceil(right));bottom=Math.min(height,Math.ceil(bottom));
  return right>x&&bottom>y?{x,y,width:right-x,height:bottom-y}:null;
}
export async function selectionPreview(picture:Picture,shapes:Shape[],max=280) {
  const img=await bitmap(picture.blob),scale=Math.min(1,max/Math.max(picture.width,picture.height));
  const c=canvas(Math.max(1,Math.round(picture.width*scale)),Math.max(1,Math.round(picture.height*scale))),ctx=context(c);
  ctx.scale(scale,scale);ctx.drawImage(img,0,0);img.close();
  if(shapes.length){ctx.fillStyle="rgba(155,128,255,.4)";ctx.strokeStyle=ctx.fillStyle;shapes.forEach(s=>paintShape(ctx,s));const b=selectionBounds(picture.width,picture.height,shapes);if(b){ctx.strokeStyle="#c9bbff";ctx.lineWidth=2/scale;ctx.strokeRect(b.x,b.y,b.width,b.height);}}
  return c.toDataURL("image/png");
}
export async function askFiles(picture:Picture,shapes:Shape[]) {
  const data=new FormData(); data.set("image",picture.blob,"image.png");
  const bounds=selectionBounds(picture.width,picture.height,shapes);
  data.set("selection",JSON.stringify({kind:shapes.length?(shapes.some(s=>s.kind==="brush")?"painted":"rectangle"):"whole",bounds,width:picture.width,height:picture.height}));
  if(bounds){
    const annotated=await fetch(await selectionPreview(picture,shapes,1024)).then(r=>r.blob());data.set("context",annotated,"selection-context.png");
    const img=await bitmap(picture.blob),s=Math.min(1,768/Math.max(bounds.width,bounds.height));
    const crop=canvas(Math.max(1,Math.round(bounds.width*s)),Math.max(1,Math.round(bounds.height*s))),ctx=context(crop);
    ctx.drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height,0,0,crop.width,crop.height);img.close();data.set("crop",await toBlob(crop),"selection-crop.png");
  }
  return data;
}
export function editLayout(width:number,height:number) {
  const ratio=width/height; const w=ratio>1.2?1536:1024,h=ratio<.83?1536:1024;
  const scale=Math.min(w/width,h/height);const drawWidth=Math.max(1,Math.round(width*scale)),drawHeight=Math.max(1,Math.round(height*scale));
  return {width:w,height:h,x:Math.floor((w-drawWidth)/2),y:Math.floor((h-drawHeight)/2),drawWidth,drawHeight};
}
export async function editFiles(picture:Picture,shapes:Shape[]) {
  const layout=editLayout(picture.width,picture.height),c=canvas(layout.width,layout.height),ctx=context(c),img=await bitmap(picture.blob);
  ctx.fillStyle="#e7e7e7";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,layout.x,layout.y,layout.drawWidth,layout.drawHeight);img.close();
  const mask=canvas(c.width,c.height),mctx=context(mask);mctx.fillStyle="#fff";mctx.fillRect(0,0,c.width,c.height);
  if(shapes.length){mctx.globalCompositeOperation="destination-out";mctx.drawImage(selectionMask(picture.width,picture.height,shapes),layout.x,layout.y,layout.drawWidth,layout.drawHeight);}
  else mctx.clearRect(layout.x,layout.y,layout.drawWidth,layout.drawHeight);
  const data=new FormData();data.set("image",await toBlob(c),"image.png");data.set("mask",await toBlob(mask),"mask.png");data.set("selection",JSON.stringify({kind:shapes.length?"selected":"whole",bounds:selectionBounds(picture.width,picture.height,shapes),width:picture.width,height:picture.height,layout}));
  return {data,layout};
}
// Work on raw RGBA values: coverage zero always retains the canonical source bytes.
export function blendPixels(source:Uint8ClampedArray,edited:Uint8ClampedArray,mask:Uint8ClampedArray) {
  if(source.length!==edited.length||source.length!==mask.length)throw Error("Image and mask sizes do not match.");
  const result=new Uint8ClampedArray(source);
  for(let i=0;i<source.length;i+=4){const t=mask[i+3]/255;if(!t)continue;const a=source[i+3]/255*(1-t),b=edited[i+3]/255*t,alpha=a+b;for(let j=0;j<3;j++)result[i+j]=alpha?(source[i+j]*a+edited[i+j]*b)/alpha:0;result[i+3]=alpha*255;}
  return result;
}
// Direct PNG encoding avoids a second canvas premultiplication round trip.
export async function encodePNG(bytes:Uint8ClampedArray,width:number,height:number):Promise<Blob> {
  const crc=(b:Uint8Array)=>{let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
  const chunk=(name:string,data:Uint8Array)=>{const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set(new TextEncoder().encode(name),4);out.set(data,8);v.setUint32(out.length-4,crc(out.subarray(4,out.length-4)));return out;};
  const header=new Uint8Array(13),hv=new DataView(header.buffer);hv.setUint32(0,width);hv.setUint32(4,height);header[8]=8;header[9]=6;
  const scan=new Uint8Array(height*(width*4+1));for(let y=0;y<height;y++)scan.set(bytes.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  const compressed=new Uint8Array(await new Response(new Blob([scan]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",compressed),chunk("IEND",new Uint8Array())],{type:"image/png"});
}
export async function finishEdit(picture:Picture,shapes:Shape[],result:Blob,layout:ReturnType<typeof editLayout>):Promise<Picture> {
  const img=await bitmap(result);
  if(img.width!==layout.width||img.height!==layout.height){img.close();throw Error("The model returned an unexpected image size. Your image is unchanged; try again.");}
  const c=canvas(picture.width,picture.height),ctx=context(c);ctx.drawImage(img,layout.x,layout.y,layout.drawWidth,layout.drawHeight,0,0,c.width,c.height);img.close();
  const edited=ctx.getImageData(0,0,c.width,c.height).data;
  let bytes=edited;
  if(shapes.length){const mask=context(selectionMask(c.width,c.height,shapes)).getImageData(0,0,c.width,c.height).data;bytes=blendPixels(picture.pixels,edited,mask);}
  const blob=await encodePNG(bytes,c.width,c.height);return {...picture,blob,pixels:bytes,url:URL.createObjectURL(blob)};
}
