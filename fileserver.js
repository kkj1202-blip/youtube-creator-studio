const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const PUBLIC_DIR = '/home/user/webapp/public';

const server = http.createServer((req, res) => {
    const filePath = path.join(PUBLIC_DIR, decodeURIComponent(req.url));
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            'Content-Length': content.length
        });
        res.end(content);
    } else {
        const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.vrew'));
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`<h1>Vrew Files</h1><ul>${files.map(f => `<li><a href="/${f}">${f}</a></li>`).join('')}</ul>`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('File server running on port ' + PORT);
});
