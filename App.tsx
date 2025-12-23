import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { Alert, NativeModules, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import dgram, { RemoteInfo, Socket } from 'react-native-udp';
import * as DocumentPicker from '@react-native-documents/picker';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';
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
const SEND_START_TIMEOUT_MS = 8000;

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
  const sendStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const closingDiscoveryRef = useRef<boolean>(false);
  const currentTransferIdRef = useRef<string | null>(null);
  const currentTransferModeRef = useRef<TransferMode>('idle');
  const progressRef = useRef<number>(0);
  const justCancelledRef = useRef<boolean>(false);
  const localCopyPathRef = useRef<string | null>(null);
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
      cleanupLocalCopy();
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
        // Just close without removing listeners - listeners handle any final errors
        sock.close();
      } catch {}
    }

    closingDiscoveryRef.current = false;
  };

  const sendHello = (sock: Socket, targetAddr: string, currentRole: Role) => {
    try {
      const hello = `${HELLO_PREFIX}|${deviceId}|${deviceName}|${currentRole}`;
      sock.send(hello, 0, hello.length, DISCOVERY_PORT, targetAddr);
    } catch (e) {
      console.warn('sendHello failed:', e);
    }
  };

  const sendLock = (
    sock: Socket,
    targetAddr: string,
    newSessionId: string,
    currentRole: Role,
  ) => {
    try {
      const lock = `${LOCK_PREFIX}|${newSessionId}|${deviceId}|${deviceName}|${currentRole}`;
      sock.send(lock, 0, lock.length, DISCOVERY_PORT, targetAddr);
    } catch (e) {
      console.warn('sendLock failed:', e);
    }
  };

  const sendBye = (
    sock: Socket,
    targetAddr: string,
    currentSessionId: string,
  ) => {
    try {
      const bye = `${BYE_PREFIX}|${currentSessionId}|${deviceId}`;
      sock.send(bye, 0, bye.length, DISCOVERY_PORT, targetAddr);
    } catch (e) {
      console.warn('sendBye failed:', e);
    }
  };

  const sendCancel = (
    sock: Socket,
    targetAddr: string,
    currentSessionId: string,
  ) => {
    try {
      const cancel = `${CANCEL_PREFIX}|${currentSessionId}|${deviceId}`;
      sock.send(cancel, 0, cancel.length, DISCOVERY_PORT, targetAddr);
    } catch (e) {
      console.warn('sendCancel failed:', e);
    }
  };

  const uriToPath = (uri?: string | null) => {
    if (!uri) return '';
    // Remove file:// prefix if present
    let path = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    
    // Always decode URL-encoded characters (e.g., %20 -> space)
    // This is necessary for files with spaces and special characters
    try {
      return decodeURIComponent(path);
    } catch {
      // If decoding fails for some reason, return the path as-is
      return path;
    }
  };

  
  const cleanupLocalCopy = async (path?: string | null) => {
    const target = path ?? localCopyPathRef.current;
    if (!target) return;

    if (localCopyPathRef.current === target) {
      localCopyPathRef.current = null;
    }

    try {
      await RNFS.unlink(target);
    } catch {
      // Swallow errors: cache files may already be gone.
    }
  };

  const stopProgressPolling = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const clearSendStartTimeout = () => {
    if (sendStartTimeoutRef.current) {
      clearTimeout(sendStartTimeoutRef.current);
      sendStartTimeoutRef.current = null;
    }
  };

  const startProgressPolling = () => {
    stopProgressPolling();
    progressTimerRef.current = setInterval(() => {
      const p = globalThis.getProgress?.();
      if (typeof p === 'number') {
        setProgress(p);
        progressRef.current = p;

        // Transfer started moving, so we can clear the startup timeout
        if (p > 0) {
          clearSendStartTimeout();
        }

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
            const finishedSendPath = localCopyPathRef.current;

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
              progressRef.current = 0;
              currentTransferIdRef.current = null;
              cleanupLocalCopy(finishedSendPath);

              if (wasSending) {
                setPickedFile(null);
                setPickerError(null);
              }
            }, 500);
            clearSendStartTimeout();
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
              cleanupLocalCopy();

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

    let bindSucceeded = false;
    let hasShownError = false;
    let bindTimeout: ReturnType<typeof setTimeout> | null = null;

    const showBindError = () => {
      if (hasShownError) return;
      hasShownError = true;
      if (bindTimeout) clearTimeout(bindTimeout);

      // Null out the ref BEFORE stopDiscovery to prevent re-closing
      discoverySocketRef.current = null;

      stopDiscovery();
      Alert.alert(
        'Network Error',
        'Could not start discovery. This can happen when:\n\n• Hotspot is starting up (wait a moment and try again)\n• Another app is using port 41234\n• Network permissions are restricted\n\nTry again in a few seconds.',
      );
      setRole(null);
    };

    try {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      discoverySocketRef.current = sock;

      // Handle socket errors (including bind failures and "Socket is closed")
      sock.on('error', err => {
        console.error('Discovery socket error:', err);

        // If bind hasn't succeeded yet, this is a bind failure
        if (!bindSucceeded && !hasShownError) {
          discoverySocketRef.current = null;
          try {
            // Remove listeners from the local sock reference
            sock.removeAllListeners?.();
          } catch {}
          try {
            sock.close();
          } catch {}
          showBindError();
        }
        // Otherwise, just log and ignore (prevents "Unhandled error" crashes)
        // This handles "Socket is closed" errors after cleanup
      });

      sock.on('message', handleMessage(sock, nextRole));

      // Timeout for bind - if bind doesn't succeed in 3 seconds, show error
      bindTimeout = setTimeout(() => {
        if (!bindSucceeded) {
          console.error(
            'Socket bind timeout - network interface may not be ready',
          );
          showBindError();
        }
      }, 3000);

      // Bind to any available address on the discovery port
      try {
        sock.bind(DISCOVERY_PORT, () => {
          if (bindTimeout) clearTimeout(bindTimeout);
          bindSucceeded = true;

          try {
            sock.setBroadcast?.(true);
          } catch (e) {
            console.warn('Failed to enable broadcast:', e);
          }

          try {
            sendHello(sock, BROADCAST_ADDR, nextRole);
          } catch (e) {
            console.warn('Failed to send initial hello:', e);
          }

          // Only start interval if bind succeeded
          discoveryIntervalRef.current = setInterval(() => {
            try {
              if (discoverySocketRef.current) {
                const discover = `${DISCOVER}|${nextRole}`;
                discoverySocketRef.current.send(
                  discover,
                  0,
                  discover.length,
                  DISCOVERY_PORT,
                  BROADCAST_ADDR,
                );
              }
            } catch (e) {
              console.warn('Failed to send discovery broadcast:', e);
            }
          }, 1500);
        });
      } catch (bindError) {
        console.error('Bind threw exception:', bindError);
        showBindError();
      }
    } catch (e) {
      console.error('Failed to start discovery:', e);
      showBindError();
    }
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
      await cleanupLocalCopy();

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
      localCopyPathRef.current = path;
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

  const handleSendFailure = (message: string) => {
    clearSendStartTimeout();
    try {
      globalThis.cancelTransfer?.();
    } catch {}

    stopProgressPolling();

    const transferId = currentTransferIdRef.current;
    if (transferId) {
      setSentFiles(prevFiles => prevFiles.filter(f => f.id !== transferId));
    }

    currentTransferIdRef.current = null;
    setTransferMode('idle');
    setProgress(0);
    progressRef.current = 0;
    setPickedFile(null);
    setPickerError(message);
    cleanupLocalCopy();
    Alert.alert('Send failed', message);
  };

  const sendFile = () => {
    if (!sessionPeer || !pickedFile) return;
    const path = pickedFile.path;
    if (!path) {
      setPickerError('File is not accessible locally. Pick again.');
      return;
    }

    clearSendStartTimeout();

    const ok = globalThis.startSender?.(
      path,
      sessionPeer.address,
      TRANSFER_PORT,
    );
    if (!ok) {
      handleSendFailure('Could not start the transfer. Please try again.');
      return;
    }

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
    progressRef.current = 0;
    startProgressPolling();

    // Failsafe: if progress never advances, time out and reset state so the user can retry.
    sendStartTimeoutRef.current = setTimeout(() => {
      if (
        currentTransferModeRef.current === 'sending' &&
        (progressRef.current ?? 0) < 0.01
      ) {
        handleSendFailure(
          'Transfer did not start in time. Please ensure the peer is reachable and retry.',
        );
      }
    }, SEND_START_TIMEOUT_MS);
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

    clearSendStartTimeout();

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
    progressRef.current = 0;
    setPickedFile(null);
    currentTransferIdRef.current = null;
    cleanupLocalCopy();

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
    clearSendStartTimeout();

    if (sessionPeer && sessionId && discoverySocketRef.current) {
      const existingSock = discoverySocketRef.current;
      try {
        sendBye(existingSock, sessionPeer.address, sessionId);
      } catch {}
      try {
        sendBye(existingSock, BROADCAST_ADDR, sessionId);
      } catch {}
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

    try {
      cleanupLocalCopy();
    } catch {}

    try {
      globalThis.cancelTransfer?.();
    } catch {}

    stopProgressPolling();

    // Defer socket shutdown slightly to allow BYE to flush
    setTimeout(() => {
      stopDiscovery();
    }, 50);
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