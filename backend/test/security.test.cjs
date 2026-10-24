const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { getJwtSecret, checkOrigin } = require('../dist/src/common/config/security');
const { BusinessGuard } = require('../dist/src/common/guards/business.guard');
const { BookingService } = require('../dist/src/booking/booking.service');
const { WaitlistService } = require('../dist/src/waitlist/waitlist.service');
const { JwtStrategy } = require('../dist/src/auth/jwt.strategy');
const events = { emitToRoom() {} };
const context = user => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) });

test('production refuses absent or placeholder secrets; development secrets are stable per process', () => {
  const saved = { ...process.env };
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    assert.throws(getJwtSecret, /JWT_SECRET/);
    process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
    assert.throws(getJwtSecret, /JWT_SECRET/);
    process.env.JWT_SECRET = 'a'.repeat(48);
    assert.equal(getJwtSecret(), process.env.JWT_SECRET);
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    assert.equal(getJwtSecret(), getJwtSecret());
    assert.ok(getJwtSecret().length >= 32);
  } finally { process.env = saved; }
});

test('CORS accepts configured origins and rejects foreign origins', () => {
  const previous = process.env.CORS_ORIGIN;
  try {
    process.env.CORS_ORIGIN = 'https://queue.example, https://admin.example';
    for (const [origin, expected] of [['https://queue.example', true], ['https://evil.example', false], [undefined, true]]) {
      checkOrigin(origin, (error, allowed) => { assert.equal(error, null); assert.equal(allowed, expected); });
    }
  } finally {
    if (previous === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previous;
  }
});

test('restaurant guard denies customers and missing business membership', () => {
  const guard = new BusinessGuard();
  for (const user of [undefined, { role: 'customer', businessId: 'shop' }, { role: 'owner' }]) {
    assert.throws(() => guard.canActivate(context(user)));
  }
  assert.equal(guard.canActivate(context({ role: 'owner', businessId: 'shop' })), true);
  assert.equal(guard.canActivate(context({ role: 'staff', businessId: 'shop' })), true);
});

test('resource tokens cannot authenticate as login tokens', async () => {
  const strategy = new JwtStrategy({ findById() { throw new Error('Should not query users'); } });
  await assert.rejects(strategy.validate({ sub: 'resource', type: 'booking' }), /Unauthorized/);
});

test('cancellation rejects tokens with the correct ID but wrong purpose', async () => {
  const tokens = { verifyToken: () => ({ sub: 'entry', type: 'qr-ticket' }) };
  const model = { findByIdAndUpdate() { throw new Error('Must not mutate'); } };
  await assert.rejects(new BookingService(model, events, tokens).cancelByCustomer('entry', 'ticket'), /Token does not match/);
  await assert.rejects(new WaitlistService(model, events, tokens).cancelByCustomer('entry', 'ticket'), /Token does not match/);
});

test('booking edits are scoped to the restaurant and cannot alter ownership or tokens', async () => {
  let captured;
  const model = {
    async findOneAndUpdate(...args) { captured = args; return { businessId: 'shop-a' }; },
    async findOneAndDelete(filter) { captured = [filter]; return null; },
  };
  const service = new BookingService(model, events, {});
  await service.update('booking', { notes: 'Window seat', businessId: 'shop-b', accessToken: 'replacement', $unset: { qrTicketUsed: 1 } }, 'shop-a');
  assert.deepEqual(captured[0], { _id: 'booking', businessId: 'shop-a' });
  assert.deepEqual(captured[1], { $set: { notes: 'Window seat' } });
  assert.equal(captured[2].runValidators, true);
  await assert.rejects(service.remove('foreign-booking', 'shop-a'), /Booking not found/);
  assert.deepEqual(captured[0], { _id: 'foreign-booking', businessId: 'shop-a' });
});

test('QR arrival uses a conditional atomic update and only emits for the winning scan', async () => {
  let consumed = false;
  let emissions = 0;
  const model = { async findOneAndUpdate(filter, update) {
    assert.deepEqual(filter, { _id: 'booking', qrTicketUsed: false, status: { $in: ['pending', 'confirmed'] } });
    assert.deepEqual(update, { $set: { status: 'arrived', qrTicketUsed: true } });
    if (consumed) return null;
    consumed = true;
    return { businessId: 'shop' };
  } };
  const service = new BookingService(model, { emitToRoom() { emissions++; } }, { verifyToken: () => ({ sub: 'booking', type: 'qr-ticket' }) });
  const results = await Promise.allSettled([service.scanArrival('booking', 'ticket'), service.scanArrival('booking', 'ticket')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  assert.equal(emissions, 2);
});
