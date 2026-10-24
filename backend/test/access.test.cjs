const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtService } = require('@nestjs/jwt');
const { io } = require('socket.io-client');
const { RoomAccessService } = require('../dist/src/events/room-access.service');
const { EventsGateway } = require('../dist/src/events/events.gateway');
const { QrTokenService } = require('../dist/src/qr-token/qr-token.service');
const { BookingService } = require('../dist/src/booking/booking.service');
const { WaitlistService } = require('../dist/src/waitlist/waitlist.service');
const { PublicBookingController } = require('../dist/src/booking/public-booking.controller');
const { PublicWaitlistController } = require('../dist/src/waitlist/public-waitlist.controller');

const shop = 'a'.repeat(24);
const otherShop = 'b'.repeat(24);
const entry = 'c'.repeat(24);
const otherEntry = 'd'.repeat(24);
const owner = 'e'.repeat(24);
const customer = 'f'.repeat(24);
const jwt = new JwtService({ secret: 'test-secret-unique-to-access-suite-1234567890' });
const qr = new QrTokenService(jwt);
const sign = (sub, type, options = {}) => jwt.sign({ sub, type }, { expiresIn: '1h', ...options });
const users = { findById(id) { return { select: async () => id === owner
  ? { role: 'owner', businessId: shop } : id === customer ? { role: 'customer', businessId: shop } : null }; } };
const resources = { exists: async ({ _id }) => _id === entry };
const access = new RoomAccessService(jwt, users, resources, resources);

test('private room authorization rejects foreign resources, tenants, token purposes and malformed requests', async () => {
  const account = jwt.sign({ sub: owner, email: 'owner@test.com', role: 'owner' }, { expiresIn: '1h' });
  assert.ok(await access.authorize(`business:${shop}`, account));
  await assert.rejects(access.authorize(`business:${otherShop}`, account));
  await assert.rejects(access.authorize(`business:${shop}`, jwt.sign({ sub: customer, email: 'customer@test.com', role: 'owner' }, { expiresIn: '1h' })));
  await assert.rejects(access.authorize(`business:${shop}`, sign(entry, 'booking')));
  for (const kind of ['queue', 'waitlist']) {
    assert.ok(await access.authorize(`${kind}:${entry}`, sign(entry, 'waitlist')));
    await assert.rejects(access.authorize(`${kind}:${otherEntry}`, sign(entry, 'waitlist')));
    await assert.rejects(access.authorize(`${kind}:${entry}`, sign(entry, 'booking')));
  }
  assert.ok(await access.authorize(`booking:${entry}`, sign(entry, 'booking')));
  await assert.rejects(access.authorize(`booking:${entry}`, sign(entry, 'qr-ticket')));
  await assert.rejects(access.authorize(`booking:${entry}`, account));
  await assert.rejects(access.authorize(`booking:${otherEntry}`, sign(otherEntry, 'booking')));
  await assert.rejects(access.authorize(`booking:${entry}`, sign(entry, 'booking', { expiresIn: -1 })));
  await assert.rejects(access.authorize(`booking:${entry}`, sign(entry, 'booking') + 'tampered'));
  for (const room of [null, {}, 'business:*', 'business:invalid', `unknown:${entry}`]) await assert.rejects(access.authorize(room, account));
  assert.equal(await access.authorize(`availability:${shop}`), null);
});

test('real HTTP and Socket.IO protect status reads, room events, reconnects and expiration', { timeout: 20000 }, async t => {
  const bookings = new BookingService({}, {}, qr);
  bookings.findOne = async id => ({ _id: id, status: 'pending' });
  const waitlist = new WaitlistService({}, {}, qr, {});
  waitlist.findOne = async id => ({ _id: id, status: 'waiting' });
  waitlist.getPosition = async () => ({ position: 1 });
  class TestModule {}
  Module({
    controllers: [PublicBookingController, PublicWaitlistController],
    providers: [EventsGateway, { provide: RoomAccessService, useValue: access },
      { provide: BookingService, useValue: bookings }, { provide: WaitlistService, useValue: waitlist }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const base = await app.getUrl();
  const gateway = app.get(EventsGateway);
  const request = (path, token) => fetch(`${base}/api${path}`, { headers: token ? { 'X-Access-Token': token } : {} });

  await t.test('status and position require a valid token matching both type and ID', async () => {
    for (const [path, type] of [[`/bookings/${entry}/status`, 'booking'], [`/waitlist/${entry}/status`, 'waitlist'], [`/waitlist/position/${entry}`, 'waitlist']]) {
      for (const token of [undefined, 'bad-token', sign(otherEntry, type), sign(entry, 'qr-ticket'), sign(entry, type, { expiresIn: -1 }), sign(entry, type === 'booking' ? 'waitlist' : 'booking')]) {
        assert.equal((await request(`/public${path}`, token)).status, 401);
      }
      assert.equal((await request(`/public${path}`, sign(entry, type))).status, 200);
      assert.equal((await request(`/public${path}?token=${sign(entry, type)}`)).status, 401);
    }
  });

  const connect = async () => {
    const client = io(base, { transports: ['websocket'], reconnection: false, autoConnect: false });
    t.after(() => client.close());
    client.connect();
    await once(client, 'connect');
    return client;
  };
  const join = (client, payload) => client.timeout(2000).emitWithAck('join', payload);

  await t.test('unauthorized sockets cannot join private rooms or receive private events', async () => {
    const client = await connect();
    assert.equal((await join(client, `business:${shop}`)).ok, false);
    assert.equal((await join(client, { room: `business:${shop}`, token: sign(entry, 'waitlist') })).ok, false);
    let leaked = false;
    client.on('booking:updated', () => { leaked = true; });
    gateway.emitToRoom(`business:${shop}`, 'booking:updated', { customerName: 'Private' });
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(leaked, false);
  });

  await t.test('public availability subscriptions receive only availability invalidation', async () => {
    const client = await connect();
    assert.equal((await join(client, { room: `availability:${shop}` })).ok, true);
    let leaked = false;
    client.on('booking:updated', () => { leaked = true; });
    const received = once(client, 'availability:changed');
    gateway.emitToRoom(`business:${shop}`, 'booking:updated', { customerName: 'Private' });
    gateway.emitToRoom(`business:${shop}`, 'availability:changed', { businessId: shop, privateData: 'never-forward' });
    assert.deepEqual((await received)[0], { businessId: shop });
    assert.equal(leaked, false);
  });

  await t.test('valid resource credentials receive events and must be revalidated after reconnect', async () => {
    const client = await connect();
    const payload = { room: `queue:${entry}`, token: sign(entry, 'waitlist') };
    assert.equal((await join(client, payload)).ok, true);
    const update = once(client, 'queue:position-update');
    gateway.emitQueuePositionUpdate(entry, 2, 10);
    assert.equal((await update)[0].position, 2);
    client.disconnect();
    const reconnected = once(client, 'connect');
    client.connect();
    await reconnected;
    assert.equal(gateway.server.sockets.sockets.get(client.id).rooms.has(payload.room), false);
    assert.equal((await join(client, { ...payload, token: 'bad-token' })).ok, false);
    assert.equal((await join(client, payload)).ok, true);
  });

  await t.test('browser socket module resends resource credentials and reads current staff credentials on reconnect', async () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const { pathToFileURL } = require('node:url');
    let accountToken = jwt.sign({ sub: owner, email: 'owner@test.com', role: 'owner' }, { expiresIn: '1h' });
    global.localStorage = { getItem: () => accountToken };
    // Substitute only the bundler's environment value and dependency URL; run the actual browser module.
    const source = readFileSync(resolve(__dirname, '../../frontend/src/services/socket.js'), 'utf8')
      .replace("'socket.io-client'", JSON.stringify(pathToFileURL(require.resolve('socket.io-client')).href))
      .replace('import.meta.env.VITE_SOCKET_URL', JSON.stringify(base));
    const browser = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const connection = browser.default();
    t.after(() => { browser.leaveRoom(`business:${shop}`); browser.leaveRoom(`queue:${entry}`); connection.close(); delete global.localStorage; });
    if (!connection.connected) await once(connection, 'connect');
    let onBusinessResult;
    const firstJoin = new Promise(resolve => { onBusinessResult = resolve; });
    browser.joinRoom(`business:${shop}`, undefined, result => onBusinessResult(result));
    assert.equal((await firstJoin).ok, true);
    connection.disconnect();
    accountToken = 'invalid-account-token';
    const refused = new Promise(resolve => { onBusinessResult = resolve; });
    connection.connect();
    assert.equal((await refused).ok, false);
    assert.equal(gateway.server.sockets.sockets.get(connection.id).rooms.has(`business:${shop}`), false);
    browser.leaveRoom(`business:${shop}`);
    let onQueueResult;
    const resourceJoin = new Promise(resolve => { onQueueResult = resolve; });
    browser.joinRoom(`queue:${entry}`, sign(entry, 'waitlist'), result => onQueueResult(result));
    assert.equal((await resourceJoin).ok, true);
    connection.disconnect();
    const resourceRejoin = new Promise(resolve => { onQueueResult = resolve; });
    connection.connect();
    assert.equal((await resourceRejoin).ok, true);
    browser.leaveRoom(`queue:${entry}`);
    // Acknowledgment on the same transport orders this check after the leave message.
    await join(connection, { room: `availability:${shop}` });
    assert.equal(gateway.server.sockets.sockets.get(connection.id).rooms.has(`queue:${entry}`), false);
  });

  await t.test('expired credentials are removed from private rooms on a live connection', async () => {
    const client = await connect();
    const room = `booking:${entry}`;
    const expired = once(client, 'subscription:expired');
    assert.equal((await join(client, { room, token: sign(entry, 'booking', { expiresIn: 2 }) })).ok, true);
    assert.equal((await expired)[0].room, room);
    assert.equal(gateway.server.sockets.sockets.get(client.id).rooms.has(room), false);
  });
});
