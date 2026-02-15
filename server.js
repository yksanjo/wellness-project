const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // API endpoints
  if (pathname === '/api/create-checkout-session' && req.method === 'POST') {
    try {
      const body = [];
      req.on('data', chunk => body.push(chunk));
      req.on('end', async () => {
        try {
          const { productId } = JSON.parse(Buffer.concat(body).toString());
          
          // Create checkout session
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: 'Wellness Project Premium',
                    description: 'Access to all 10 wellness product MVPs',
                  },
                  unit_amount: 2999, // $29.99 in cents
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: `http://localhost:${PORT}/success.html`,
            cancel_url: `http://localhost:${PORT}/cancel.html`,
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessionId: session.id }));
        } catch (error) {
          console.error('Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Serve static files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const ext = path.extname(pathname);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  // Security: Prevent directory traversal
  const safePath = path.join(__dirname, pathname.replace(/\.\./g, ''));
  
  fs.readFile(safePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1>');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Stripe checkout available at http://localhost:${PORT}`);
});