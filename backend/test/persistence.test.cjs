const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const {JwtService}=require('@nestjs/jwt');
const {WaitlistSchema}=require('../dist/src/modules/waitlist/schemas/waitlist.schema');
const {BookingSchema}=require('../dist/src/modules/booking/schemas/booking.schema');
const {BusinessSchema}=require('../dist/src/modules/business/schemas/business.schema');
const {WaitlistService}=require('../dist/src/modules/waitlist/waitlist.service');
const {BookingService}=require('../dist/src/modules/booking/booking.service');
const {BusinessService}=require('../dist/src/modules/business/business.service');
const {QrTokenService}=require('../dist/src/modules/qr-token/qr-token.service');

test('real MongoDB regression checks', {timeout:60000},async t=>{
  let uri=process.env.QA_MONGODB_URI;
  let server;
  if (uri && !/^mongodb:\/\/(127\.0\.0\.1|localhost):[0-9]+\/?$/.test(uri)) throw new Error('QA_MONGODB_URI must point to a local disposable MongoDB server');
  if (!uri) {
    server=await MongoMemoryServer.create();
    uri=server.getUri();
  }
  const db=await mongoose.createConnection(uri,{dbName:`queue_qa_regression_${process.pid}_${Date.now()}`}).asPromise();
  t.after(async()=>{
    try { await db.dropDatabase(); }
    finally {
      try { await db.close(); }
      finally { if (server) await server.stop(); }
    }
  });
  const Waitlist=db.model('Waitlist',WaitlistSchema);
  const Booking=db.model('Booking',BookingSchema);
  const Business=db.model('Business',BusinessSchema);
  const business=await Business.create({name:'QA Restaurant'});
  const businessService=new BusinessService(Business,{});
  const qr=new QrTokenService(new JwtService({secret:'local-regression-secret-long-enough-123456789'}));
  const events={emitQueueNew(){},emitQueueJoined(){},emitToRoom(){}};
  const waitlist=new WaitlistService(Waitlist,events,qr,businessService);

  await t.test('public business fields exclude QR secret while internal reads retain it',async()=>{
    const publicBusiness=await businessService.getPublicBusiness(business.id);
    assert.equal(publicBusiness.qrTokenSecret,undefined);
    assert.equal(publicBusiness.name,business.name);
    assert.equal((await businessService.getBusiness(business.id)).qrTokenSecret,business.qrTokenSecret);
  });

  await t.test('index builds and simultaneous duplicate QR joins allow one active phone',async()=>{
    const token=qr.generateQrEntryToken(business.id,business.qrTokenSecret);
    const payload={token,customerName:'QA Guest',customerPhone:'09911122233',partySize:2};
    const results=await Promise.allSettled([waitlist.createFromQr(payload),waitlist.createFromQr(payload)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.getStatus(),409);
    assert.ok((await Waitlist.collection.indexes()).some(index=>index.name==='unique_active_customer_phone'&&index.unique));
    // A finished entry must not permanently block a future visit; phone-less guests are independent.
    await Waitlist.updateOne({customerPhone:payload.customerPhone},{$set:{status:'completed'}});
    assert.ok((await waitlist.createFromQr(payload)).accessToken);
    assert.ok((await waitlist.createFromQr({...payload,customerPhone:''})).accessToken);
    assert.ok((await waitlist.createFromQr({...payload,customerPhone:''})).accessToken);
  });

  await t.test('atomic QR arrival accepts only one simultaneous scan and rejects cancelled bookings',async()=>{
    const bookings=new BookingService(Booking,events,qr);
    const booking=await Booking.create({businessId:business._id,customerName:'QA Booking',date:new Date(),time:'12:00'});
    const ticket=qr.generateQrTicket(booking.id);
    const results=await Promise.allSettled([bookings.scanArrival(booking.id,ticket),bookings.scanArrival(booking.id,ticket)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.getStatus(),400);
    await Booking.updateOne({_id:booking._id},{$set:{status:'cancelled',qrTicketUsed:false}});
    await assert.rejects(bookings.scanArrival(booking.id,ticket));
  });
});
