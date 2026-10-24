const {io}=require('../backend/node_modules/socket.io-client');
const fs=require('node:fs');
const results=[];let fixtures={};
async function req(path,method='GET',body,token,resource){const r=await fetch('http://localhost:3100/api'+path,{method,headers:{'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(resource?{'X-Access-Token':resource}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});} console.log(JSON.stringify(results.at(-1)));}
function ok(v,msg){if(!v)throw Error(msg);}
(async()=>{
const admin=await req('/auth/login','POST',{email:'admin@test.com',password:'admin123'});const at=admin.data.token;const shop=admin.data.user.businessId;fixtures.shop=shop;
const customer=await req('/auth/login','POST',{email:'customer@test.com',password:'customer123'});
const b=await req('/auth/signup','POST',{name:'QA Other Owner',email:`qa-${Date.now()}@example.test`,password:'qa-test-password',restaurantName:'QA Other Restaurant'});const bt=b.data.token;
await check('Admin and customer login',async()=>ok(at&&customer.data.token,'Login failed'));
await check('Bad password rejected',async()=>ok((await req('/auth/login','POST',{email:'admin@test.com',password:'wrong'})).status===401,'Wrong password accepted'));
await check('Public restaurant response excludes signing secret',async()=>{const r=await req('/public/business/'+shop);ok(r.status===200&&!('qrTokenSecret'in r.data),'Public response exposes qrTokenSecret');});
const booking=await req('/public/bookings','POST',{businessId:shop,customerName:'QA Booking',customerPhone:'0990001001',date:'2026-10-25',time:'12:00',partySize:2});const bid=booking.data._id;const token=booking.data.accessToken;fixtures.booking={id:bid,token};
await check('Create booking in real MongoDB',async()=>ok(booking.status===201&&token,'Booking failed: '+JSON.stringify(booking.data)));
await check('Booking status denies ID-only request',async()=>ok((await req(`/public/bookings/${bid}/status`)).status===401,'Status leaked'));
await check('Booking status accepts matching token',async()=>ok((await req(`/public/bookings/${bid}/status`,'GET',null,null,token)).status===200,'Status rejected'));
await check('Customer denied restaurant booking management',async()=>ok((await req('/bookings','GET',null,customer.data.token)).status===403,'Customer accepted'));
await check('Other restaurant cannot update booking',async()=>ok((await req(`/bookings/${bid}`,'PUT',{notes:'unauthorized'},bt)).status===404,'Foreign edit succeeded'));
await check('Owner updates own booking',async()=>ok((await req(`/bookings/${bid}`,'PUT',{notes:'QA edit'},at)).status===200,'Own edit failed'));
await check('Simultaneous QR scans consume once in real MongoDB',async()=>{const r=await Promise.all([req(`/public/bookings/${bid}/scan`,'POST',{qrTicket:booking.data.qrTicket}),req(`/public/bookings/${bid}/scan`,'POST',{qrTicket:booking.data.qrTicket})]);ok(r.filter(x=>x.status===201).length===1&&r.filter(x=>x.status===400).length===1,'Unexpected scan statuses '+r.map(x=>x.status));});
const qr=await req('/qr-token/generate','POST',{},at);fixtures.joinUrl=qr.data.bookingUrl;
await check('Admin generates QR and public validation succeeds',async()=>ok(qr.status===201&&(await req('/public/queue/validate-token','POST',{token:qr.data.token})).status===201,'QR validation failed'));
const phone='099'+String(Date.now()).slice(-8);const entry=await req('/public/waitlist/join','POST',{token:qr.data.token,customerName:'QA Queue Guest',customerPhone:phone,partySize:2});const id=entry.data.entryId;const et=entry.data.accessToken;fixtures.queue={id,token:et};
await check('Join QR queue',async()=>ok(entry.status===201&&et,'Queue join failed '+JSON.stringify(entry.data)));
await check('Duplicate active queue phone rejected',async()=>{const r=await req('/public/waitlist/join','POST',{token:qr.data.token,customerName:'QA Duplicate',customerPhone:phone});ok(r.status===409,'Expected 409, got '+r.status);});
await check('Queue status and position deny missing token',async()=>ok((await req(`/public/waitlist/${id}/status`)).status===401&&(await req(`/public/waitlist/position/${id}`)).status===401,'Queue info leaked'));
await check('Queue status and position accept matching token',async()=>ok((await req(`/public/waitlist/${id}/status`,'GET',null,null,et)).status===200&&(await req(`/public/waitlist/position/${id}`,'GET',null,null,et)).status===200,'Queue token rejected'));
await check('Queue refuses booking token',async()=>ok((await req(`/public/waitlist/${id}/status`,'GET',null,null,token)).status===401,'Wrong-purpose token accepted'));
const socket=io('http://localhost:3100',{transports:['websocket'],reconnection:false});await new Promise((resolve,reject)=>{socket.on('connect',resolve);socket.on('connect_error',reject);});
await check('Private business room denies unauthenticated join',async()=>ok(!(await socket.timeout(3000).emitWithAck('join',{room:`business:${shop}`})).ok,'Room leaked'));
await check('Business room verifies real restaurant membership',async()=>{ok(!(await socket.timeout(3000).emitWithAck('join',{room:`business:${shop}`,token:bt})).ok,'Foreign room accepted');ok((await socket.timeout(3000).emitWithAck('join',{room:`business:${shop}`,token:at})).ok,'Own business room rejected');});
await check('Customer queue room receives live admin update',async()=>{ok((await socket.timeout(3000).emitWithAck('join',{room:`queue:${id}`,token:et})).ok,'Queue room rejected');const event=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No queue event')),3000);socket.once('queue:approved',data=>{clearTimeout(timer);resolve(data);});});const approved=await req(`/waitlist/${id}/approve`,'PUT',{},at);ok(approved.status===200,'Approve failed');ok((await event).entry.status==='approved','Wrong status event');});socket.close();
await check('CORS rejects foreign browser origin',async()=>{const r=await fetch('http://localhost:3100/api/public/business/'+shop,{headers:{Origin:'https://evil.example'}});ok(!r.headers.get('access-control-allow-origin'),'Foreign CORS origin accepted');});
fs.writeFileSync('qa/local-session.json',JSON.stringify(fixtures,null,2));fs.writeFileSync('qa/api-results.json',JSON.stringify(results,null,2));console.log('QA SUMMARY '+results.filter(x=>x.pass).length+'/'+results.length);process.exitCode=results.some(x=>!x.pass)?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
