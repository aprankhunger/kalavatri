import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import orderRoutes from '../routes/orderRoutes.js';

test('Order System & Pincode Auto-Detection Suite', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);

  await t.test('Pincode API rejects invalid PIN codes', async () => {
    // Test non-numeric or short pincode
    const req = { params: { pincode: '123' } };
    let statusCode, responseJson;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseJson = data; return res; }
    };

    // Route handler test
    const handler = orderRoutes.stack.find(s => s.route?.path === '/pincode/:pincode')?.route?.stack[0]?.handle;
    assert.ok(handler, 'Pincode route handler should exist');

    await handler(req, res);
    assert.equal(statusCode, 400);
    assert.equal(responseJson.success, false);
  });

  await t.test('Pincode API returns city and state for valid 110001', async () => {
    const req = { params: { pincode: '110001' } };
    let statusCode, responseJson;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseJson = data; return res; }
    };

    const handler = orderRoutes.stack.find(s => s.route?.path === '/pincode/:pincode')?.route?.stack[0]?.handle;
    await handler(req, res);

    assert.equal(responseJson.success, true);
    assert.ok(responseJson.city, 'City should be returned');
    assert.ok(responseJson.state, 'State should be returned');
    assert.equal(responseJson.state.toLowerCase(), 'delhi');
  });

  await t.test('Order validation rejects orders with missing required customer details', async () => {
    const req = {
      body: {
        customer: { name: 'Test' }, // missing phone and email
        shippingAddress: {},
        items: []
      }
    };
    let statusCode, responseJson;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseJson = data; return res; }
    };

    const handler = orderRoutes.stack.find(s => s.route?.path === '/' && s.route?.methods?.post)?.route?.stack[0]?.handle;
    assert.ok(handler, 'Order creation route handler should exist');

    await handler(req, res);
    assert.equal(statusCode, 400);
    assert.equal(responseJson.success, false);
  });
});
