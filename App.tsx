import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeModules } from 'react-native';
import dgram, { RemoteInfo, Socket } from 'react-native-udp';
import * as DocumentPicker from '@react-native-documents/picker';
import DeviceInfo from 'react-native-device-info';
// import RNFS from 'react-native-fs';
import RootNavigator from './src/navigation/RootNavigator';

declare global {
  var startReceiver: (port: number) => boolean;
  var startSender: (path: string, ip: string, port: number) => boolean;
  var getProgress: () => number;
  var cancelTransfer: () => void;
  var getCurrentFileName: () => string;
  var getCurrentFileSize: () => number;
}

const DISCOVERY_PORT = 41234;
const BROADCAST_ADDR = '255.255.255.255';
const DISCOVER = 'SWIFTSHAREX_DISCOVER';
const HELLO_PREFIX = 'SWIFTSHAREX_HELLO';
const LOCK_PREFIX = 'SWIFTSHAREX_LOCK';
const BYE_PREFIX = 'SWIFTSHAREX_BYE';
const CANCEL_PREFIX = 'SWIFTSHAREX_CANCEL';
const TRANSFER_PORT = 5001;

type Role = 'send' | 'receive';
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

type FileTransferRecord = {
  id: string;
  fileName: string;
  fileSize?: number;
  timestamp: Date;
  status: 'completed' | 'cancelled' | 'in-progress';
};

function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [moduleStatus, setModuleStatus] = useState<'found' | 'missing'>(
    'missing',
  );
  const [role, setRole] = useState<Role | null>(null);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [sessionPeer, setSessionPeer] = useState<DiscoveredDevice | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<TransferMode>('idle');

  // Keep ref in sync with state
  useEffect(() => {
    currentTransferModeRef.current = transferMode;
  }, [transferMode]);
  const [progress, setProgress] = useState<number>(0);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [sentFiles, setSentFiles] = useState<FileTransferRecord[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<FileTransferRecord[]>([]);

  const discoverySocketRef = useRef<Socket | null>(null);
  const discoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingDiscoveryRef = useRef<boolean>(false);
  const currentTransferIdRef = useRef<string | null>(null);
  const currentTransferModeRef = useRef<TransferMode>('idle');
  const justCancelledRef = useRef<boolean>(false);
  // const receivingFileNameRef = useRef<string>('Unknown File');

  const deviceId = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const [deviceName, setDeviceName] = useState<string>(
    `SwiftShareX-${Platform.OS}`,
  );

  // Get device name from react-native-device-info
  useEffect(() => {
    DeviceInfo.getDeviceName()
      .then(name => {
        setDeviceName(name);
      })
      .catch(() => {
        // Fallback to default name if error
        setDeviceName(`SwiftShareX-${Platform.OS}`);
      });
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
      globalThis.cancelTransfer?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sendCancel = (
    sock: Socket,
    targetAddr: string,
    currentSessionId: string,
  ) => {
    const cancel = `${CANCEL_PREFIX}|${currentSessionId}|${deviceId}`;
    sock.send(cancel, 0, cancel.length, DISCOVERY_PORT, targetAddr);
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
      const p = globalThis.getProgress?.();
      if (typeof p === 'number') {
        setProgress(p);

        // Clear the justCancelled flag once progress is back to 0
        if (p === 0 && justCancelledRef.current) {
          justCancelledRef.current = false;
        }

        // If progress is happening (> 0 but < 1) and we're idle, switch to receiving
        // But don't create a new transfer if we just cancelled (residual progress)
        if (p > 0 && p < 1 && !justCancelledRef.current) {
          setTransferMode(prev => {
            if (prev === 'idle') {
              const fileName =
                globalThis.getCurrentFileName?.() || 'Unknown File';
              const fileSize = globalThis.getCurrentFileSize?.() || undefined;
              // Start tracking a new receiving transfer
              const transferId = `recv-${Date.now()}`;
              currentTransferIdRef.current = transferId;
              setReceivedFiles(prevFiles => [
                {
                  id: transferId,
                  fileName: fileName,
                  fileSize: fileSize,
                  timestamp: new Date(),
                  status: 'in-progress',
                },
                ...prevFiles,
              ]);
              return 'receiving';
            }
            return prev;
          });
        }
        // When transfer completes
        if (p >= 1) {
          // Capture current mode before setTimeout
          setTransferMode(currentMode => {
            const wasSending = currentMode === 'sending';
            const wasReceiving = currentMode === 'receiving';
            const transferId = currentTransferIdRef.current;

            // Small delay to show 100% before resetting
            setTimeout(() => {
              // Update transfer record to completed
              if (wasSending && transferId) {
                setSentFiles(prevFiles =>
                  prevFiles.map(f =>
                    f.id === transferId
                      ? { ...f, status: 'completed' as const }
                      : f,
                  ),
                );
              } else if (wasReceiving && transferId) {
                setReceivedFiles(prevFiles =>
                  prevFiles.map(f =>
                    f.id === transferId
                      ? { ...f, status: 'completed' as const }
                      : f,
                  ),
                );
              }

              setTransferMode('idle');
              setProgress(0);
              currentTransferIdRef.current = null;

              if (wasSending) {
                setPickedFile(null);
                setPickerError(null);
              }
            }, 500);
            return currentMode; // Don't change mode yet
          });
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
        return;
      }

      if (text.startsWith(CANCEL_PREFIX)) {
        const [, incomingSessionId, peerId] = text.split('|');
        if (peerId === deviceId) return;

        // Use setState callbacks to get current values
        setSessionId(currentSessionId => {
          setSessionPeer(currentPeer => {
            const shouldCancel =
              currentSessionId === incomingSessionId ||
              (currentPeer && currentPeer.id === peerId);

            if (shouldCancel) {
              // Peer cancelled their transfer
              try {
                globalThis.cancelTransfer?.();
              } catch {}

              // Set flag to prevent creating duplicate transfer entries
              justCancelledRef.current = true;

              // Mark current transfer as cancelled using ref for mode
              const transferId = currentTransferIdRef.current;
              const mode = currentTransferModeRef.current;

              if (transferId) {
                if (mode === 'sending') {
                  setSentFiles(prevFiles =>
                    prevFiles.map(f =>
                      f.id === transferId
                        ? { ...f, status: 'cancelled' as const }
                        : f,
                    ),
                  );
                } else if (mode === 'receiving') {
                  setReceivedFiles(prevFiles =>
                    prevFiles.map(f =>
                      f.id === transferId
                        ? { ...f, status: 'cancelled' as const }
                        : f,
                    ),
                  );
                }
              }

              stopProgressPolling();
              setTransferMode('idle');
              setProgress(0);
              setPickedFile(null);
              currentTransferIdRef.current = null;

              // Restart the receiver so we can accept new transfers
              setTimeout(() => {
                try {
                  const ok = globalThis.startReceiver?.(TRANSFER_PORT);
                  if (ok) {
                    startProgressPolling();
                  }
                } catch {}
              }, 100);
            }

            return currentPeer;
          });
          return currentSessionId;
        });
        return;
      }
    };

  const startDiscovery = (nextRole: Role) => {
    setRole(nextRole);
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

  // const startReceiving = () => {
  //   if (transferMode === 'receiving') return;
  //   const ok = globalThis.startReceiver?.(TRANSFER_PORT);
  //   if (ok) {
  //     // Don't override if currently sending
  //     if (transferMode !== 'sending') {
  //       setTransferMode('idle');
  //     }
  //     setProgress(0);
  //     startProgressPolling();
  //   }
  // };

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
      // Best-effort cancel detection; library types may vary
      // @ts-ignore
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

    const ok = globalThis.startSender?.(
      path,
      sessionPeer.address,
      TRANSFER_PORT,
    );
    if (ok) {
      // Track the sending transfer
      const transferId = `send-${Date.now()}`;
      currentTransferIdRef.current = transferId;
      setSentFiles(prevFiles => [
        {
          id: transferId,
          fileName: pickedFile.name,
          fileSize: pickedFile.size || undefined,
          timestamp: new Date(),
          status: 'in-progress',
        },
        ...prevFiles,
      ]);

      setTransferMode('sending');
      setProgress(0);
      startProgressPolling();
    }
  };

  // UI state helpers now handled in SessionScreen

  useEffect(() => {
    if (sessionPeer) {
      // Start the receiver but keep in idle mode
      // It will automatically switch to 'receiving' when data arrives
      const ok = globalThis.startReceiver?.(TRANSFER_PORT);
      if (ok) {
        startProgressPolling();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPeer]);

  const cancelOngoingTransfer = () => {
    try {
      globalThis.cancelTransfer?.();
    } catch {}

    // Set flag to prevent creating duplicate transfer entries
    justCancelledRef.current = true;

    // Notify peer about cancellation
    if (discoverySocketRef.current && sessionPeer && sessionId) {
      sendCancel(discoverySocketRef.current, sessionPeer.address, sessionId);
    }

    // Mark current transfer as cancelled
    const transferId = currentTransferIdRef.current;
    if (transferId && transferMode === 'sending') {
      setSentFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === transferId ? { ...f, status: 'cancelled' as const } : f,
        ),
      );
    } else if (transferId && transferMode === 'receiving') {
      setReceivedFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === transferId ? { ...f, status: 'cancelled' as const } : f,
        ),
      );
    }

    stopProgressPolling();
    setTransferMode('idle');
    setProgress(0);
    setPickedFile(null);
    currentTransferIdRef.current = null;

    // Restart the receiver so we can accept new transfers
    setTimeout(() => {
      try {
        const ok = globalThis.startReceiver?.(TRANSFER_PORT);
        if (ok) {
          startProgressPolling();
        }
      } catch {}
    }, 100);
  };

  const connectToDevice = (device: DiscoveredDevice) => {
    if (!discoverySocketRef.current || !role) return;
    const sock = discoverySocketRef.current;
    const newSessionId = `${deviceId}-${Date.now()}`;

    setSessionPeer(device);
    setSessionId(newSessionId);
    stopBroadcasting();
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
    setSentFiles([]);
    setReceivedFiles([]);
    currentTransferIdRef.current = null;
    globalThis.cancelTransfer?.();
    stopProgressPolling();
    stopDiscovery();
  };

  // Device renderer moved into DevicePickerScreen

  return (
    <SafeAreaProvider>
      <RootNavigator
        role={role}
        devices={devices}
        sessionPeer={sessionPeer}
        pickedFile={pickedFile}
        pickerError={pickerError}
        transferMode={transferMode}
        progress={progress}
        transferPort={TRANSFER_PORT}
        sentFiles={sentFiles}
        receivedFiles={receivedFiles}
        onChooseRole={startDiscovery}
        onSelectDevice={connectToDevice}
        onBack={terminateSession}
        onPickFile={pickFile}
        onSendFile={sendFile}
        onCancelTransfer={cancelOngoingTransfer}
        onTerminate={terminateSession}
      />
    </SafeAreaProvider>
  );
}

export default App;
