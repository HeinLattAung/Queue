const fs=require('node:fs');
(async()=>{
 const base='http://localhost:3100/api';
 const call=async(path,method='GET',body,token)=>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(path+': '+JSON.stringify(data));return data;};
 const auth=await call('/auth/login','POST',{email:'admin@test.com',password:'admin123'});
 const shop=auth.user.businessId;const token=auth.token;
 const existing=await call('/waitlist/today','GET',null,token);
 for(const [customerName,customerPhone,status] of [['Mara Ellis','0990002001','waiting'],['Noah Chen','0990002002','waiting'],['Aye Thandar','0990002003','serving']]){
  if(existing.some(x=>x.customerPhone===customerPhone))continue;
  const entry=await call('/public/waitlist','POST',{businessId:shop,customerName,customerPhone,partySize:customerName==='Mara Ellis'?4:2});
  if(status==='serving'){await call('/waitlist/'+entry._id+'/approve','PUT',{},token);await call('/waitlist/'+entry._id+'/seat','PUT',{},token);}
 }
 const bookings=await call('/bookings/today','GET',null,token);
 for(const [customerName,time,partySize] of [['Oliver Park','18:30',2],['Lena Morris','19:00',4]]){
  if(bookings.some(x=>x.customerName===customerName))continue;
  await call('/public/bookings','POST',{businessId:shop,customerName,date:new Date().toISOString(),time,partySize});
 }
 console.log('Synthetic design-demo guests and reservations are ready in the disposable QA database.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
