const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const mimeTypes = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};

function send(response, status, payload) {
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  response.end(JSON.stringify(payload));
}
function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 1_000_000) reject(new Error('Request is too large.')); });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid request body.')); } });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'POST' && url.pathname === '/api/chat') {
    if (!process.env.OPENAI_API_KEY) return send(response, 503, {error:'Add your OpenAI API key to OPENAI_API_KEY in the environment, then restart the server.'});
    try {
      const body = await readJson(request);
      if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 60) return send(response, 400, {error:'Send between 1 and 60 messages.'});
      const messages = body.messages.map(item => {
        if (!item || !['user','assistant'].includes(item.role) || typeof item.content !== 'string') throw new Error('Each message needs a valid role and text.');
        return {role:item.role,content:item.content.slice(0, 12000)};
      });
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model, messages:[{role:'system',content:'You are Forma, a thoughtful, clear, friendly assistant. Be useful and direct. Ask a brief follow-up when a request is ambiguous. Use readable plain text and never claim certainty when you are unsure.'},...messages],temperature:0.7})
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : 400;
        return send(response, status, {error:result.error?.message || 'The AI service could not complete that request.'});
      }
      const reply = result.choices?.[0]?.message?.content;
      if (!reply) return send(response, 502, {error:'The AI service returned an empty reply. Please try again.'});
      return send(response, 200, {reply});
    } catch (error) {
      return send(response, 400, {error:error.message || 'Could not process that request.'});
    }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, {error:'Method not allowed.'});
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(root + path.sep)) return send(response, 403, {error:'Forbidden.'});
  fs.readFile(filename, (error, content) => {
    if (error) { response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return response.end('Not found'); }
    response.writeHead(200, {'Content-Type':mimeTypes[path.extname(filename)] || 'application/octet-stream','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : content);
  });
});

server.listen(port, () => console.log(`Forma is ready at http://localhost:${port}`));
