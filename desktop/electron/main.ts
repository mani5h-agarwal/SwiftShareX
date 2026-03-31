import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as dgram from 'dgram';
import * as fs from 'fs';
import * as os from 'os';
import * as net from 'net';

// Pure Node.js implementation - no native C++ dependency needed for Desktop.

let mainWindow: BrowserWindow | null = null;
const discoverySockets: Record<string, dgram.Socket> = {};

// Node.js TCP receiver state (progress tracking)
let rxCurrentFileSize = 0;
let rxServer: net.Server | null = null;
let rxBytesTransferred = 0;
let rxTotalBytes = 0;
let rxCurrentFileName = '';

// Node.js TCP sender state
let txSocket: net.Socket | null = null;
let txBytesTransferred = 0;
let txTotalBytes = 0;
let txCurrentFileName = '';
let txCurrentFileSize = 0;

// Compute broadcast addresses for all active IPv4 network interfaces.
// When the Mac is a hotspot, macOS creates a bridge interface (e.g. bridge100)
// with a real subnet like 192.168.2.0/24. We must send to 192.168.2.255
// because 255.255.255.255 (limited broadcast) may not be forwarded on bridge ifaces.
function getSubnetBroadcasts(): string[] {
  const results: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const info of iface || []) {
      if (info.family === 'IPv4' && !info.internal && info.netmask) {
        const ipParts = info.address.split('.').map(Number);
        const maskParts = info.netmask.split('.').map(Number);
        const broadcast = ipParts
          .map((p, i) => (p | (~maskParts[i] & 0xff)))
          .join('.');
        if (!results.includes(broadcast)) results.push(broadcast);
        console.log(`[Network] interface ${info.address}/${info.netmask} → broadcast ${broadcast}`);
      }
    }
  }
  // Always include limited broadcast as a fallback
  if (!results.includes('255.255.255.255')) results.push('255.255.255.255');
  return results;
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    resizable: false,
    maximizable: false,
    title: 'SwiftShareX',
    icon: path.join(__dirname, '../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Set window title
  mainWindow.setTitle('SwiftShareX');

  // Setup the SwiftShareX storage folder in Downloads
  const downloadsDir = path.join(app.getPath('downloads'), 'SwiftShareX');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  console.log(`[App] SwiftShareX folder: ${downloadsDir}`);

  // Load the VITE dev server or built html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
});

// ------------- IPC ENDPOINTS FOR MOCK MODULES --------------

// react-native-device-info mock
ipcMain.handle('getDeviceName', () => os.hostname().replace(/\.local$/i, ''));

// @react-native-documents/picker mock
ipcMain.handle('pickDocument', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const fp = result.filePaths[0];
  const stats = fs.statSync(fp);
  
  return {
    uri: 'file://' + fp,
    name: path.basename(fp),
    size: stats.size,
    path: fp
  };
});

// react-native-fs mock
ipcMain.handle('fs:unlink', async (_, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch(e) {
    return false;
  }
});

ipcMain.handle('fs:copyToCache', async (_, filePath) => {
  try {
    const fileName = path.basename(filePath);
    const cacheDir = path.join(app.getPath('temp'), 'SwiftShareX_Cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const destPath = path.join(cacheDir, fileName);
    fs.copyFileSync(filePath, destPath);
    return 'file://' + destPath;
  } catch(e) {
    console.error('copyToCache error:', e);
    return null;
  }
});

// react-native-udp mock
ipcMain.handle('udp:createSocket', (_, id) => {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  discoverySockets[id] = socket;

  socket.on('message', (msg, rinfo) => {
    const text = msg.toString();
    console.log(`[UDP ${id}] ← FROM ${rinfo.address}:${rinfo.port} | ${text.substring(0, 60)}`);
    if (mainWindow) {
      mainWindow.webContents.send(`udp:message:${id}`, text, rinfo);
    }
  });

  socket.on('error', (err) => {
    console.error(`[UDP ${id}] error:`, err.message);
    if (mainWindow) {
      mainWindow.webContents.send(`udp:error:${id}`, err.message);
    }
  });

  return true;
});

ipcMain.handle('udp:bind', (_, id, port) => {
  return new Promise((resolve) => {
    const socket = discoverySockets[id];
    if (!socket) return resolve(false);

    // Handle bind errors so the promise doesn't hang forever
    const onError = (err: Error) => {
      console.error(`[UDP ${id}] bind error on port ${port}:`, err.message);
      resolve(false);
    };
    socket.once('error', onError);

    socket.bind(port, () => {
      socket.removeListener('error', onError);
      socket.setBroadcast(true);
      console.log(`[UDP ${id}] bound to port ${port}, broadcast enabled`);
      resolve(true);
    });
  });
});

ipcMain.handle('udp:send', (_, id, msg, port, address) => {
  return new Promise((resolve) => {
    const socket = discoverySockets[id];
    if (!socket) return resolve(false);

    // When broadcasting, send to ALL subnet broadcast addresses so hotspot
    // bridge interfaces (bridge100 etc.) also receive the packet.
    const targets: string[] = address === '255.255.255.255'
      ? getSubnetBroadcasts()
      : [address];

    let pending = targets.length;
    let anySuccess = false;

    for (const target of targets) {
      socket.send(msg, 0, msg.length, port, target, (err) => {
        if (!err) anySuccess = true;
        pending--;
        if (pending === 0) resolve(anySuccess);
      });
    }
  });
});

ipcMain.handle('udp:close', (_, id) => {
  const socket = discoverySockets[id];
  if (socket) {
    try { socket.close(); } catch {}
    delete discoverySockets[id];
  }
  return true;
});

// Helper: get local IPv4 address for diagnostics
ipcMain.handle('getLocalIP', () => {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
});

// Helper to find a unique filename by appending (1), (2), etc.
function getUniqueFilePath(dir: string, originalName: string): string {
  const filePath = path.join(dir, originalName);
  if (!fs.existsSync(filePath)) return filePath;

  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let counter = 1;

  while (true) {
    const newName = `${baseName} (${counter})${ext}`;
    const newPath = path.join(dir, newName);
    if (!fs.existsSync(newPath)) return newPath;
    counter++;
  }
}

// Pure Node.js TCP receiver implementing the SWFT protocol.
// Replaces C++ engine's startReceiver to avoid macOS BSD O_NONBLOCK/recv issues.
ipcMain.on('engine:startReceiver', (event, port) => {
  try {
    // Close any existing server
    if (rxServer) {
      try { rxServer.close(); } catch {}
      rxServer = null;
    }

    const downloadsDir = path.join(app.getPath('downloads'), 'SwiftShareX');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const server = net.createServer((sock) => {
      console.log(`[NodeRX] Connection from ${sock.remoteAddress}:${sock.remotePort}`);

      // We accumulate incoming bytes in a buffer and parse the SWFT protocol
      let buf = Buffer.alloc(0);
      let phase: 'hello'|'meta'|'filename'|'data'|'done' = 'hello';
      let fileSize = 0;
      let nameLen = 0;
      let chunkSize = 0;
      let filename = '';
      let fd: number = -1;
      let written = 0;
      let chunkRemaining = 0;

      // Sizes (all little-endian, matching protocol.h)
      const HELLO_SIZE = 8;  // magic(4) + version(1) + mode(1) + reserved(2)
      const META_SIZE  = 16; // fileSize(8) + nameLen(2) + pad(2) + chunkSize(4)
      const RESUME_OFFSET_SIZE = 8;  // uint64
      const CHUNK_HDR_SIZE = 4; // uint32 length

      const tryParse = () => {
        // Keep parsing as long as we have enough data for the current phase
        while (true) {
          if (phase === 'hello') {
            if (buf.length < HELLO_SIZE) return;
            // HelloPacket: just validate magic
            const magic = buf.slice(0, 4).toString('ascii');
            if (magic !== 'SWFT') {
              console.error(`[NodeRX] Bad magic: ${magic}`);
              sock.destroy();
              return;
            }
            buf = buf.slice(HELLO_SIZE);
            phase = 'meta';

          } else if (phase === 'meta') {
            if (buf.length < META_SIZE) return;
            // FileMeta: fileSize(uint64le) + nameLen(uint16le) + pad(2) + chunkSize(uint32le)
            fileSize = Number(buf.readBigUInt64LE(0));
            nameLen  = buf.readUInt16LE(8);
            // bytes 10-11: padding
            chunkSize = buf.readUInt32LE(12);
            buf = buf.slice(META_SIZE);
            phase = 'filename';

          } else if (phase === 'filename') {
            if (buf.length < nameLen) return;
            filename = buf.slice(0, nameLen).toString('utf8');
            buf = buf.slice(nameLen);

            // Determine unique path to avoid overwriting
            const outPath = getUniqueFilePath(downloadsDir, filename);
            const finalFilename = path.basename(outPath);
            
            console.log(`[NodeRX] Receiving: ${filename} (saved as ${finalFilename}) (${fileSize} bytes) → ${outPath}`);

            // Track state for progress polling
            rxCurrentFileName = finalFilename;
            rxCurrentFileSize = fileSize;
            rxTotalBytes = fileSize;
            rxBytesTransferred = 0;
            written = 0;

            // Open file for writing (create or truncate)
            try {
              fd = fs.openSync(outPath, 'w');
            } catch (e) {
              console.error(`[NodeRX] Failed to open file: ${outPath}`, e);
              sock.destroy();
              return;
            }

            // Send resume offset (8 bytes, little-endian uint64 = 0)
            const resumeBuf = Buffer.alloc(8, 0);
            sock.write(resumeBuf, () => {
              console.log(`[NodeRX] Sent resume offset 0, waiting for data...`);
            });

            phase = 'data';
            chunkRemaining = 0; // 0 means we need to read the next chunk header

          } else if (phase === 'data') {
            if (chunkRemaining === 0) {
              // Read DataChunkHeader (4 bytes = uint32 length)
              if (buf.length < CHUNK_HDR_SIZE) return;
              const chunkLen = buf.readUInt32LE(0);
              buf = buf.slice(CHUNK_HDR_SIZE);

              if (chunkLen === 0) {
                // End-of-transfer marker
                console.log(`[NodeRX] Transfer complete: ${filename}`);
                if (fd >= 0) { fs.closeSync(fd); fd = -1; }
                rxBytesTransferred = rxTotalBytes; // Signal 100%
                phase = 'done';
                sock.end();
                return;
              }
              chunkRemaining = chunkLen;
            }

            // Consume as much chunk data as available
            const avail = Math.min(chunkRemaining, buf.length);
            if (avail === 0) return;

            const chunk = buf.slice(0, avail);
            buf = buf.slice(avail);
            chunkRemaining -= avail;

            if (fd >= 0) {
              try {
                fs.writeSync(fd, chunk, 0, chunk.length, written);
              } catch (e) {
                console.error(`[NodeRX] Write error:`, e);
                sock.destroy();
                return;
              }
            }
            written += avail;
            rxBytesTransferred = written;

          } else if (phase === 'done') {
            return;
          }
        }
      };

      sock.on('data', (data: Buffer) => {
        buf = Buffer.concat([buf, data]);
        tryParse();
      });

      sock.on('end', () => {
        console.log(`[NodeRX] Connection closed (phase=${phase}, written=${written})`);
        if (fd >= 0) { try { fs.closeSync(fd); } catch {} fd = -1; }
        if (phase !== 'done') {
          // Premature close
          rxBytesTransferred = 0;
          rxTotalBytes = 0;
        }
        // Reset state after a brief delay so JS can see completion
        setTimeout(() => {
          rxBytesTransferred = 0;
          rxTotalBytes = 0;
          rxCurrentFileName = '';
          rxCurrentFileSize = 0;
        }, 1500);
      });

      sock.on('error', (err) => {
        console.error(`[NodeRX] Socket error:`, err.message);
        if (fd >= 0) { try { fs.closeSync(fd); } catch {} fd = -1; }
        rxBytesTransferred = 0;
        rxTotalBytes = 0;
        rxCurrentFileName = '';
        rxCurrentFileSize = 0;
      });
    });

    server.on('error', (err) => console.error('[NodeRX] Server error:', err));
    server.listen(port, '0.0.0.0', () => {
      console.log(`[NodeRX] TCP receiver listening on port ${port}`);
    });

    rxServer = server;
    event.returnValue = true;
  } catch (e) {
    console.error('startReceiver error:', e);
    event.returnValue = false;
  }
});

ipcMain.on('engine:startSender', (event, filePath, ip, port) => {
  try {
    // Close any existing sender socket
    if (txSocket) {
      try { txSocket.destroy(); } catch {}
      txSocket = null;
    }

    const stats = fs.statSync(filePath);
    txTotalBytes = stats.size;
    txBytesTransferred = 0;
    txCurrentFileName = path.basename(filePath);
    txCurrentFileSize = stats.size;

    console.log(`[NodeTX] Starting sender: ${filePath} → ${ip}:${port} (${txTotalBytes} bytes)`);

    const client = new net.Socket();
    txSocket = client;

    client.connect(port, ip, () => {
      console.log(`[NodeTX] Connected to ${ip}:${port}`);

      // 1. Send HELLO (8 bytes)
      const hello = Buffer.alloc(8);
      hello.write('SWFT', 0); // magic
      hello.writeUInt8(1, 4); // version
      hello.writeUInt8(1, 5); // mode (SEND)
      // rest is zero-padded
      client.write(hello);

      // 2. Send META (16 bytes)
      const meta = Buffer.alloc(16);
      meta.writeBigUInt64LE(BigInt(txTotalBytes), 0);
      const nameBuf = Buffer.from(txCurrentFileName, 'utf8');
      meta.writeUInt16LE(nameBuf.length, 8);
      // bytes 10-11: padding
      meta.writeUInt32LE(256 * 1024, 12); // chunkSize = 256KB
      client.write(meta);

      // 3. Send Filename
      client.write(nameBuf);
      console.log(`[NodeTX] Sent metadata. Waiting for resume offset...`);
    });

    let phase: 'resume' | 'data' | 'done' = 'resume';

    client.on('data', (data: Buffer) => {
      if (phase === 'resume') {
        if (data.length < 8) return;
        const resumeOffset = Number(data.readBigUInt64LE(0));
        console.log(`[NodeTX] Received resume offset: ${resumeOffset}`);
        txBytesTransferred = resumeOffset;
        phase = 'data';

        // Start streaming file data
        const stream = fs.createReadStream(filePath, { start: resumeOffset, highWaterMark: 256 * 1024 });

        stream.on('data', (chunk: Buffer) => {
          // Pause stream until chunk is sent (backpressure)
          stream.pause();

          // Write DataChunkHeader (4 bytes = uint32 length)
          const hdr = Buffer.alloc(4);
          hdr.writeUInt32LE(chunk.length, 0);
          
          if (!client.destroyed) {
            client.write(hdr);
            client.write(chunk, () => {
              txBytesTransferred += chunk.length;
              stream.resume();
            });
          } else {
            stream.destroy();
          }
        });

        stream.on('end', () => {
          console.log(`[NodeTX] File data stream finished. Sending end marker...`);
          // Send END marker (4 zero bytes)
          const endHdr = Buffer.alloc(4, 0);
          if (!client.destroyed) {
            client.write(endHdr, () => {
              console.log(`[NodeTX] Transfer complete: ${txCurrentFileName}`);
              phase = 'done';
              // Keep socket open for a moment? No, protocol says done.
              setTimeout(() => client.destroy(), 500);
            });
          }
        });

        stream.on('error', (err) => {
          console.error(`[NodeTX] Stream error:`, err);
          client.destroy();
        });
      }
    });

    client.on('close', () => {
      console.log(`[NodeTX] Socket closed.`);
      txSocket = null;
      // Reset state after a brief delay
      setTimeout(() => {
        if (!txSocket) {
          txBytesTransferred = 0;
          txTotalBytes = 0;
          txCurrentFileName = '';
          txCurrentFileSize = 0;
        }
      }, 1500);
    });

    client.on('error', (err) => {
      console.error(`[NodeTX] Socket error:`, err.message);
      txSocket = null;
    });

    event.returnValue = true;
  } catch (e) {
    console.error('[NodeTX] startSender error:', e);
    event.returnValue = false;
  }
});

// Helper: Open the Downloads/SwiftShareX folder
ipcMain.handle('openDownloadsFolder', async () => {
  const folderPath = path.join(app.getPath('downloads'), 'SwiftShareX');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return shell.openPath(folderPath);
});

// Progress: check both C++ sender progress AND Node.js (receiver AND sender) progress
ipcMain.on('engine:getProgress', (event) => {
  try {
    // Node.js receiver is active?
    if (rxTotalBytes > 0) {
      event.returnValue = rxBytesTransferred / rxTotalBytes;
      return;
    }
    // Node.js sender is active?
    if (txTotalBytes > 0) {
      event.returnValue = txBytesTransferred / txTotalBytes;
      return;
    }
    event.returnValue = 0;
  }
  catch { event.returnValue = 0; }
});

ipcMain.on('engine:cancelTransfer', (event) => {
  // Cancel Node.js receiver
  if (rxServer) { try { rxServer.close(); } catch {} rxServer = null; }
  rxBytesTransferred = 0; rxTotalBytes = 0;
  rxCurrentFileName = ''; rxCurrentFileSize = 0;

  // Cancel Node.js sender
  if (txSocket) { try { txSocket.destroy(); } catch {} txSocket = null; }
  txBytesTransferred = 0; txTotalBytes = 0;
  txCurrentFileName = ''; txCurrentFileSize = 0;

  event.returnValue = null;
});

ipcMain.on('engine:getCurrentFileName', (event) => {
  try {
    if (rxCurrentFileName) { event.returnValue = rxCurrentFileName; return; }
    if (txCurrentFileName) { event.returnValue = txCurrentFileName; return; }
    event.returnValue = '';
  }
  catch { event.returnValue = ''; }
});

ipcMain.on('engine:getCurrentFileSize', (event) => {
  try {
    if (rxCurrentFileSize > 0) { event.returnValue = rxCurrentFileSize; return; }
    if (txCurrentFileSize > 0) { event.returnValue = txCurrentFileSize; return; }
    event.returnValue = 0;
  }
  catch { event.returnValue = 0; }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
