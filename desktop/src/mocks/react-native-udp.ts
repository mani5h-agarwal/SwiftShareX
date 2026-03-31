// React Native UDP Mock — bridges to Electron main process via IPC

const w = window as any;

class UdpSocket {
    private id: string;
    private callbacks: Record<string, Function[]> = { message: [], error: [] };

    constructor() {
        this.id = Math.random().toString(36).substr(2, 9);
        w.swiftshareIPC.udpCreateSocket(this.id);

        // Register incoming message handler — msg is already a string from main.ts
        w.swiftshareIPC.onUdpMessage(this.id, (msg: string, rinfo: any) => {
            // App.tsx does msg.toString() — pass a string-like object that satisfies that
            const msgObj = {
                toString: () => msg,
                length: msg.length,
            };
            this.callbacks['message']?.forEach((cb) => cb(msgObj, rinfo));
        });

        w.swiftshareIPC.onUdpError(this.id, (err: string) => {
            this.callbacks['error']?.forEach((cb) => cb(new Error(err)));
        });
    }

    on(event: string, cb: Function) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(cb);
        return this;
    }

    removeAllListeners() {
        this.callbacks = { message: [], error: [] };
        return this;
    }

    bind(port: number, callback?: () => void) {
        w.swiftshareIPC.udpBind(this.id, port).then((ok: boolean) => {
            if (ok && callback) callback();
        });
    }

    send(
        msg: any,
        offset: number,
        length: number,
        port: number,
        address: string,
        callback?: (err?: any) => void
    ) {
        // Convert any type to string for IPC transport
        const payload = (typeof msg === 'string') ? msg
            : (msg && typeof msg.toString === 'function') ? msg.toString()
            : String(msg);

        w.swiftshareIPC.udpSend(this.id, payload, port, address).then((success: boolean) => {
            if (callback) callback(success ? undefined : new Error('UDP send failed'));
        });
    }

    close() {
        try {
            w.swiftshareIPC.udpClose(this.id);
        } catch {}
    }

    setBroadcast(_enabled: boolean) {
        // Handled automatically in main.ts bind — broadcast is always enabled
    }
}

export default {
    createSocket: (_options: any) => new UdpSocket(),
};
