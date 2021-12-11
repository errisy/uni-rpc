import  { WebSocket, WebSocketServer } from 'ws';

const port = 8080;

const wss = new WebSocketServer({
    port: port,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});

const sockets: WebSocket[] = [];

wss.on('connection', function connection(this, websocket, request) {
    console.log('request.url:', request.url);
    sockets.push(websocket);
    websocket.on('message', function message(this, data, isBinary) {
        console.log('message:', data.toString());
        let text = data.toString();
        let json = JSON.parse(text);
        console.log('json:', json);
    });
});

console.log(`websocket listening on ${port}...`);