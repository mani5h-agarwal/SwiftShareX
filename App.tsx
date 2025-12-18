import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeModules } from 'react-native';
import dgram, { RemoteInfo, Socket } from 'react-native-udp';
import * as DocumentPicker from '@react-native-documents/picker';
// import RNFS from 'react-native-fs';

declare global {
  var startReceiver: (port: number) => boolean;
  var startSender: (path: string, ip: string, port: number) => boolean;
  var getProgress: () => number;
  var cancelTransfer: () => void;
}

const DISCOVERY_PORT = 41234;
const BROADCAST_ADDR = '255.255.255.255';
const DISCOVER = 'SWIFTSHAREX_DISCOVER';
const HELLO_PREFIX = 'SWIFTSHAREX_HELLO';
const LOCK_PREFIX = 'SWIFTSHAREX_LOCK';
const BYE_PREFIX = 'SWIFTSHAREX_BYE';
const TRANSFER_PORT = 5001;

type Role = 'send' | 'receive';
type Screen = 'chooseRole' | 'devicePicker' | 'session';
type DiscoveredDevice = {
  id: string;
  name: string;
  address: string;
  role: Role;
};

type TransferMode = 'idle' | 'sending' | 'receiving';

type PickedFile = {
  name: string;
  uri: string;
  size?: number | null;
  path: string;
};

function App() {
  const [moduleStatus, setModuleStatus] = useState<'found' | 'missing'>(
    'missing',
  );
  const [screen, setScreen] = useState<Screen>('chooseRole');
  const [role, setRole] = useState<Role | null>(null);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [sessionPeer, setSessionPeer] = useState<DiscoveredDevice | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<TransferMode>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const discoverySocketRef = useRef<Socket | null>(null);
  const discoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingDiscoveryRef = useRef<boolean>(false);

  const deviceId = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const deviceName = useMemo(() => {
    const constants = (NativeModules.PlatformConstants ?? {}) as {
      model?: string;
      deviceName?: string;
    };
    return (
      constants.deviceName || constants.model || `SwiftShareX-${Platform.OS}`
    );
  }, []);

  // Install JSI once
  useEffect(() => {
    const mod = NativeModules.SwiftShareJSI as
      | { install?: () => void }
      | undefined;
    try {
      mod?.install?.();
      setModuleStatus(mod ? 'found' : 'missing');
    } catch {
      setModuleStatus('missing');
    }

    return () => {
      stopDiscovery();
      stopProgressPolling();
      global.cancelTransfer?.();
    };
  }, []);

  const stopBroadcasting = () => {
    if (discoveryIntervalRef.current) {
      clearInterval(discoveryIntervalRef.current);
      discoveryIntervalRef.current = null;
    }
  };

  const stopDiscovery = () => {
    if (closingDiscoveryRef.current) return;
    closingDiscoveryRef.current = true;

    stopBroadcasting();

    const sock = discoverySocketRef.current;
    discoverySocketRef.current = null;
    if (sock) {
      try {
        sock.removeAllListeners?.();
        sock.close();
      } catch {
        // ignore socket close errors
      }
    }

    closingDiscoveryRef.current = false;
  };

  const sendHello = (sock: Socket, targetAddr: string, currentRole: Role) => {
    const hello = `${HELLO_PREFIX}|${deviceId}|${deviceName}|${currentRole}`;
    sock.send(hello, 0, hello.length, DISCOVERY_PORT, targetAddr);
  };

  const sendLock = (
    sock: Socket,
    targetAddr: string,
    newSessionId: string,
    currentRole: Role,
  ) => {
    const lock = `${LOCK_PREFIX}|${newSessionId}|${deviceId}|${deviceName}|${currentRole}`;
    sock.send(lock, 0, lock.length, DISCOVERY_PORT, targetAddr);
  };

  const sendBye = (
    sock: Socket,
    targetAddr: string,
    currentSessionId: string,
  ) => {
    const bye = `${BYE_PREFIX}|${currentSessionId}|${deviceId}`;
    sock.send(bye, 0, bye.length, DISCOVERY_PORT, targetAddr);
  };

  const uriToPath = (uri?: string | null) => {
    if (!uri) return '';
    return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
  };

  const stopProgressPolling = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressPolling = () => {
    stopProgressPolling();
    progressTimerRef.current = setInterval(() => {
      const p = global.getProgress?.();
      if (typeof p === 'number') {
        setProgress(p);
        if (p >= 1) {
          stopProgressPolling();
          setTransferMode('idle');
          setPickedFile(null);
          setPickerError(null);
        }
      }
    }, 250);
  };

  const handleMessage =
    (sock: Socket, currentRole: Role) => (msg: Buffer, rinfo: RemoteInfo) => {
      const text = msg.toString();

      if (text.startsWith(HELLO_PREFIX)) {
        const [, peerId, peerName, peerRoleRaw] = text.split('|');
        const peerRole: Role = peerRoleRaw === 'receive' ? 'receive' : 'send';
        if (peerId === deviceId) return;

        setDevices(prev => {
          const already = prev.find(d => d.id === peerId);
          if (already) return prev;
          return [
            ...prev,
            {
              id: peerId || rinfo.address,
              name: peerName || 'Unknown',
              address: rinfo.address,
              role: peerRole,
            },
          ];
        });
        return;
      }

      if (text.startsWith(DISCOVER)) {
        sendHello(sock, rinfo.address, currentRole);
        return;
      }

      if (text.startsWith(LOCK_PREFIX)) {
        const [, incomingSessionId, peerId, peerName, peerRoleRaw] =
          text.split('|');
        if (peerId === deviceId) return;

        const peerRole: Role = peerRoleRaw === 'receive' ? 'receive' : 'send';
        const derivedRole: Role = peerRole === 'send' ? 'receive' : 'send';

        setSessionId(prev => prev ?? incomingSessionId);
        setRole(prev => prev ?? derivedRole);
        setSessionPeer({
          id: peerId || rinfo.address,
          name: peerName || 'Unknown',
          address: rinfo.address,
          role: peerRole,
        });
        stopBroadcasting();
        setScreen('session');
        setTransferMode('idle');
        setProgress(0);
        setPickedFile(null);
        return;
      }

      if (text.startsWith(BYE_PREFIX)) {
        const [, incomingSessionId, peerId] = text.split('|');
        if (peerId === deviceId) return;

        const shouldReset =
          !sessionId ||
          sessionId === incomingSessionId ||
          (sessionPeer && sessionPeer.id === peerId);
        if (shouldReset) {
          terminateSession();
        }
      }
    };

  const startDiscovery = (nextRole: Role) => {
    setRole(nextRole);
    setScreen('devicePicker');
    setSessionPeer(null);
    setSessionId(null);
    setPickedFile(null);
    setProgress(0);
    setTransferMode('idle');
    setDevices([]);
    stopDiscovery();
    closingDiscoveryRef.current = false;

    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    discoverySocketRef.current = sock;

    sock.on('message', handleMessage(sock, nextRole));
    sock.on('error', stopDiscovery);

    sock.bind(DISCOVERY_PORT, () => {
      try {
        sock.setBroadcast?.(true);
      } catch {
        // ignore broadcast failures
      }

      sendHello(sock, BROADCAST_ADDR, nextRole);
    });

    discoveryIntervalRef.current = setInterval(() => {
      const discover = `${DISCOVER}|${nextRole}`;
      sock.send(discover, 0, discover.length, DISCOVERY_PORT, BROADCAST_ADDR);
    }, 1500);
  };

  const startReceiving = () => {
    if (transferMode === 'receiving') return;
    const ok = global.startReceiver?.(TRANSFER_PORT);
    if (ok) {
      if (transferMode !== 'sending') {
        setTransferMode('receiving');
      }
      setProgress(0);
      startProgressPolling();
    }
  };

  const pickFile = async () => {
    try {
      setPickerError(null);

      // Pick the file
      const picker = DocumentPicker.pickSingle
        ? DocumentPicker.pickSingle
        : async (opts: any) => {
            const r = await DocumentPicker.pick({
              ...opts,
              allowMultiSelection: false,
            });
            return Array.isArray(r) ? r[0] : r;
          };

      const res = await picker({
        presentationStyle: 'fullScreen',
        mode: 'import',
        type: DocumentPicker.types?.allFiles || undefined,
      });

      // Use keepLocalCopy to ensure we have a local copy
      const copyResults = await DocumentPicker.keepLocalCopy({
        files: [
          {
            uri: res.uri,
            fileName: res.name ?? 'file',
          },
        ],
        destination: 'cachesDirectory',
      });

      const copyResult = Array.isArray(copyResults)
        ? copyResults[0]
        : copyResults;

      if (copyResult.status !== 'success') {
        setPickedFile(null);
        setPickerError(
          'Could not create a local copy of this file. Please choose a different file from local storage.',
        );
        return;
      }

      const path = uriToPath(copyResult.localUri);
      setPickerError(null);
      setPickedFile({
        name: res.name ?? 'file',
        uri: res.uri,
        size: res.size,
        path,
      });
    } catch (err: any) {
      if (DocumentPicker?.isCancel?.(err)) return;
      setPickerError('Failed to pick file. Try again.');
    }
  };

  const sendFile = () => {
    if (!sessionPeer || !pickedFile) return;
    const path = pickedFile.path;
    if (!path) {
      setPickerError('File is not accessible locally. Pick again.');
      return;
    }

    const ok = global.startSender?.(path, sessionPeer.address, TRANSFER_PORT);
    if (ok) {
      setTransferMode('sending');
      setProgress(0);
      startProgressPolling();
    }
  };

  const isSending = transferMode === 'sending';
  const isReceiving = transferMode === 'receiving';

  useEffect(() => {
    if (screen === 'session' && sessionPeer) {
      startReceiving();
    }
  }, [screen, sessionPeer]);

  const connectToDevice = (device: DiscoveredDevice) => {
    if (!discoverySocketRef.current || !role) return;
    const sock = discoverySocketRef.current;
    const newSessionId = `${deviceId}-${Date.now()}`;

    setSessionPeer(device);
    setSessionId(newSessionId);
    stopBroadcasting();
    setScreen('session');
    setTransferMode('idle');
    setProgress(0);
    setPickedFile(null);
    stopProgressPolling();

    sendLock(sock, device.address, newSessionId, role);
  };

  const terminateSession = () => {
    if (discoverySocketRef.current && sessionPeer && sessionId) {
      sendBye(discoverySocketRef.current, sessionPeer.address, sessionId);
    }

    setSessionPeer(null);
    setRole(null);
    setSessionId(null);
    setTransferMode('idle');
    setProgress(0);
    setPickedFile(null);
    setPickerError(null);
    global.cancelTransfer?.();
    stopProgressPolling();
    stopDiscovery();
    setScreen('chooseRole');
  };

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => (
    <Pressable style={styles.deviceCard} onPress={() => connectToDevice(item)}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceMeta}>
        {item.address} · {item.role === 'send' ? 'Sender' : 'Receiver'}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SwiftShareX</Text>
          <Text style={styles.subtitle}>JSI module: {moduleStatus}</Text>
        </View>

        {screen === 'chooseRole' && (
          <>
            <Text style={styles.bodyText}>Pick what you want to do.</Text>
            <Pressable
              style={styles.button}
              onPress={() => startDiscovery('send')}
            >
              <Text style={styles.buttonText}>Send</Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => startDiscovery('receive')}
            >
              <Text style={styles.buttonText}>Receive</Text>
            </Pressable>
          </>
        )}

        {screen === 'devicePicker' && role && (
          <>
            <Text style={styles.sectionTitle}>Devices nearby</Text>
            <Text style={styles.bodyText}>Scanning on UDP · Role: {role}</Text>

            <FlatList
              data={devices}
              keyExtractor={item => `${item.id}-${item.address}`}
              renderItem={renderDevice}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.bodyText}>Waiting for peers…</Text>
              }
              contentContainerStyle={
                devices.length ? undefined : styles.listEmpty
              }
            />

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={terminateSession}
            >
              <Text style={styles.buttonText}>Back</Text>
            </Pressable>
          </>
        )}

        {screen === 'session' && sessionPeer && role && (
          <View style={styles.sessionCard}>
            <Text style={styles.sectionTitle}>Connection locked</Text>
            <Text style={styles.deviceName}>{sessionPeer.name}</Text>
            <Text style={styles.deviceMeta}>IP {sessionPeer.address}</Text>
            <Text style={styles.deviceMeta}>
              You are the {role === 'send' ? 'Sender' : 'Receiver'}
            </Text>

            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Send a file</Text>
              <Pressable style={styles.button} onPress={pickFile}>
                <Text style={styles.buttonText}>Pick document</Text>
              </Pressable>

              {pickedFile && (
                <View style={styles.fileRow}>
                  <Text style={styles.bodyText}>{pickedFile.name}</Text>
                  {pickedFile.size != null && (
                    <Text style={styles.deviceMeta}>
                      {Math.round(pickedFile.size / 1024)} KB
                    </Text>
                  )}
                </View>
              )}

              {pickerError && (
                <Text style={styles.errorText}>{pickerError}</Text>
              )}

              <Pressable
                style={[
                  styles.button,
                  !pickedFile || isSending ? styles.buttonDisabled : null,
                ]}
                onPress={sendFile}
                disabled={!pickedFile || isSending}
              >
                <Text style={styles.buttonText}>
                  {isSending ? 'Sending…' : 'Send file'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Receive</Text>
              <Text style={styles.bodyText}>
                Listening on UDP port {TRANSFER_PORT}.
              </Text>
            </View>

            {transferMode !== 'idle' && (
              <View style={styles.cardSection}>
                <Text style={styles.sectionTitle}>
                  {transferMode === 'sending' ? 'Sending' : 'Receiving'}
                </Text>
                <Text style={styles.bodyText}>
                  Progress: {(progress * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.button, styles.terminate]}
              onPress={terminateSession}
            >
              <Text style={styles.buttonText}>Terminate connection</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'flex-start',
    backgroundColor: 'white',
  },
  header: {
    gap: 4,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
  },
  bodyText: {
    fontSize: 15,
    color: '#222',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSection: {
    gap: 10,
    marginTop: 10,
  },
  deviceCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  deviceMeta: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#444',
    marginTop: 10,
  },
  terminate: {
    backgroundColor: '#b00020',
  },
  separator: {
    height: 10,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCard: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#b00020',
    marginTop: 6,
  },
});

export default App;
