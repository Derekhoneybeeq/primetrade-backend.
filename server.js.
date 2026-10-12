
'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const BINANCE_BASE = 'https://testnet.binance.vision';

const ALLOWED_SYMBOLS = new Set([
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT'
]);

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Basic request rate limit.
const requestCounts = new Map();
const RATE_WINDOW = 60 * 1000;
const RATE_LIMIT = 60;

app.use((req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let entry = requestCounts.get(ip);

  if (!entry || now - entry.start >= RATE_WINDOW) {
    entry = { start: now, count: 0 };
  }

  entry.count++;
  requestCounts.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute.'
    });
  }

  next();
});

// Compare the private access token safely.
function tokenMatches(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return first.length === second.length &&
    crypto.timingSafeEqual(first, second);
}

// Protect private account and order endpoints.
function requireAccessToken(req, res, next) {
  const expected = process.env.PRIMETRADE_ACCESS_TOKEN;
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  if (!expected || expected.length < 32) {
    return res.status(503).json({
      error: 'Backend access token is not configured.'
    });
  }

  if (!tokenMatches(supplied, expected)) {
    return res.status(401).json({
      error: 'Unauthorized. Valid access token required.'
    });
  }

  next();
}

// Send a signed request to Binance Spot Testnet.
async function binanceRequest(method, path, params = {}) {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    const error = new Error(
      'Binance Testnet credentials are not configured.'
    );
    error.status = 503;
    throw error;
  }

  const query = new URLSearchParams({
    ...params,
    recvWindow: '5000',
    timestamp: String(Date.now())
  }).toString();

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(query)
    .digest('hex');

  const url = `${BINANCE_BASE}${path}?${query}&signature=${signature}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey
      },
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.msg || 'Binance Testnet request failed.'
      );
      error.status = response.status;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// Public health check. Never returns secrets.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PrimeTrade',
    exchange: 'Binance Spot Testnet',
    realMoneyTrading: false
  });
});

// Private account endpoint.
app.get(
  '/api/account',
  requireAccessToken,
  async (req, res) => {
    try {
      const account = await binanceRequest(
        'GET',
        '/api/v3/account'
      );

      const assets = account.balances
        .filter(item =>
          ['USDT', 'BTC', 'ETH', 'BNB'].includes(item.asset)
        )
        .map(item => ({
          asset: item.asset,
          free: item.free,
          locked: item.locked
        }));

      res.json({
        exchange: 'Binance Spot Testnet',
        canTrade: account.canTrade,
        balances: assets
      });
    } catch (error) {
      console.error('Account request failed:', error.message);
      res.status(error.status || 502).json({
        error: error.message || 'Could not retrieve test account.'
      });
    }
  }
);

// Private market-order endpoint.
app.post(
  '/api/order',
  requireAccessToken,
  async (req, res) => {
    try {
      const symbol = String(req.body.symbol || '').toUpperCase();
      const side = String(req.body.side || '').toUpperCase();
      const quantity = Number(req.body.quantity);

      if (!ALLOWED_SYMBOLS.has(symbol)) {
        return res.status(400).json({
          error: 'Unsupported trading pair.'
        });
      }

      if (!['BUY', 'SELL'].includes(side)) {
        return res.status(400).json({
          error: 'Side must be BUY or SELL.'
        });
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 1000000
      ) {
        return res.status(400).json({
          error: 'Enter a valid positive quantity.'
        });
      }

      const order = await binanceRequest(
        'POST',
        '/api/v3/order',
        {
          symbol,
          side,
          type: 'MARKET',
          quantity: String(quantity)
        }
      );

      res.json({
        message: 'Binance Testnet accepted the order.',
        exchange: 'Binance Spot Testnet',
        order: {
          symbol: order.symbol,
          orderId: order.orderId,
          side: order.side,
          type: order.type,
          status: order.status,
          executedQty: order.executedQty,
          cumulativeQuoteQty: order.cummulativeQuoteQty
        }
      });
    } catch (error) {
      console.error('Order request failed:', error.message);
      res.status(error.status || 502).json({
        error: error.message || 'Test order failed.'
      });
    }
  }
);

// Unknown endpoints.
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PrimeTrade backend listening on port ${PORT}`);
});
