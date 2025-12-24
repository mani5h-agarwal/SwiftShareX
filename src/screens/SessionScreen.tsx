import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import FileItemComponent from '../components/FileItemComponent';
import EmptyState from '../components/EmptyState';
import SendConfirmationModal from '../modals/SendConfirmationModal';
import { ActionRow } from '../components/ActionRow';
import TabBar, { TabItem } from '../components/TabBar';

type Role = 'send' | 'receive';

type DiscoveredDevice = {
  id: string;
  name: string;
  address: string;
  role: Role;
};

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

type Props = {
  sessionPeer: DiscoveredDevice;
  role: Role;
  transferPort: number;
  pickedFile: PickedFile | null;
  isPickingFile: boolean;
  pickerError: string | null;
  transferMode: 'idle' | 'sending' | 'receiving';
  progress: number;
  sentFiles: FileTransferRecord[];
  receivedFiles: FileTransferRecord[];
  onPickFile: () => void;
  onSendFile: () => void;
  onCancelTransfer: () => void;
  onTerminate: () => void;
};

const SessionScreen: React.FC<Props> = ({
  sessionPeer,
  role: _role,
  transferPort: _transferPort,
  pickedFile,
  isPickingFile,
  pickerError: _pickerError,
  transferMode,
  progress,
  sentFiles,
  receivedFiles,
  onPickFile,
  onSendFile,
  onCancelTransfer,
  onTerminate,
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(_role);
  const [showSendModal, setShowSendModal] = useState(false);
  const [currentTransferId, setCurrentTransferId] = useState<string | null>(
    null,
  );
  const [currentReceiveId, setCurrentReceiveId] = useState<string | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [headerAnim, pulseAnim]);

  useEffect(() => {
    if (transferMode === 'sending' && sentFiles.length > 0) {
      const inProgressFile = sentFiles.find(f => f.status === 'in-progress');
      if (inProgressFile) {
        setCurrentTransferId(inProgressFile.id);
      }
    } else if (transferMode === 'idle') {
      setCurrentTransferId(null);
    }
  }, [transferMode, sentFiles]);

  useEffect(() => {
    if (transferMode === 'receiving' && receivedFiles.length > 0) {
      const inProgressFile = receivedFiles.find(
        f => f.status === 'in-progress',
      );
      if (inProgressFile) {
        setCurrentReceiveId(inProgressFile.id);
      }
    } else if (transferMode === 'idle') {
      setCurrentReceiveId(null);
    }
  }, [transferMode, receivedFiles]);

  useEffect(() => {
    if (pickedFile && transferMode === 'idle') {
      setShowSendModal(true);
    }
  }, [pickedFile, transferMode]);

  const handleConfirmSend = () => {
    setShowSendModal(false);
    onSendFile();
  };

  const handleCancelModal = () => {
    setShowSendModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent={Platform.OS === 'android' && Platform.Version >= 35}
        backgroundColor={
          Platform.OS === 'android' && Platform.Version >= 35
            ? 'transparent'
            : '#804DCC'
        }
        barStyle="light-content"
      />
      {/* Enhanced Gradient Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {/* Animated Connection Indicator */}
            <View style={styles.connectionIndicator}>
              <Animated.View
                style={[
                  styles.connectionPulse,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.connectionDot} />
            </View>

            <View>
              <Text style={styles.title}>Active Session</Text>
              <Text style={styles.subtitle}>
                Connected to {sessionPeer.name}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.terminateButton,
              pressed && styles.terminateButtonPressed,
            ]}
            onPress={onTerminate}
          >
            <Text style={styles.terminateIcon}>✕</Text>
          </Pressable>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      {/* Modern Tab Bar (Reusable) */}
      <TabBar
        items={[
          {
            key: 'send',
            label: 'Send',
            icon: '↑',
            badgeCount: sentFiles.length,
          } as TabItem,
          {
            key: 'receive',
            label: 'Receive',
            icon: '↓',
            badgeCount: receivedFiles.length,
          } as TabItem,
        ]}
        activeKey={activeTab}
        onChange={(key: string) => setActiveTab(key as 'send' | 'receive')}
      />

      {/* Content Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'send' ? (
          <>
            {/* Enhanced Send Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Send Files</Text>
                <View
                  style={[
                    styles.readyBadge,
                    transferMode !== 'idle' && styles.inProgressBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.readyDot,
                      transferMode !== 'idle' && styles.inProgressDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.readyText,
                      transferMode !== 'idle' && styles.inProgressText,
                    ]}
                  >
                    {transferMode === 'sending'
                      ? 'Sending'
                      : transferMode === 'receiving'
                      ? 'Receiving'
                      : 'Ready'}
                  </Text>
                </View>
              </View>
              <ActionRow
                icon="📁"
                title={
                  transferMode === 'sending'
                    ? 'Sending...'
                    : transferMode === 'receiving'
                    ? 'Receiving...'
                    : 'Select Document'
                }
                subtitle={
                  transferMode === 'sending' || transferMode === 'receiving'
                    ? 'Transfer in progress'
                    : 'Choose a file to share'
                }
                disabled={
                  transferMode === 'receiving' ||
                  transferMode === 'sending' ||
                  isPickingFile
                }
                onPress={onPickFile}
              />
            </View>

            {/* Transfer History */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transfer History</Text>
                {sentFiles.length > 0 && (
                  <View style={styles.historyCount}>
                    <Text style={styles.historyCountText}>
                      {sentFiles.length}{' '}
                      {sentFiles.length === 1 ? 'file' : 'files'}
                    </Text>
                  </View>
                )}
              </View>

              {sentFiles.length === 0 ? (
                <EmptyState
                  isSend={true}
                  title="No transfers yet"
                  subtitle="Files you send will appear here"
                />
              ) : (
                sentFiles.map((file, idx) => (
                  <FileItemComponent
                    key={file.id}
                    file={file}
                    progress={file.id === currentTransferId ? progress : 0}
                    onCancel={onCancelTransfer}
                    index={idx}
                  />
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Received Files</Text>
              {receivedFiles.length > 0 && (
                <View style={styles.historyCount}>
                  <Text style={styles.historyCountText}>
                    {receivedFiles.length}{' '}
                    {receivedFiles.length === 1 ? 'file' : 'files'}
                  </Text>
                </View>
              )}
            </View>

            {receivedFiles.length === 0 ? (
              <EmptyState
                isSend={false}
                title="No files received"
                subtitle="Incoming files will appear here"
              />
            ) : (
              receivedFiles.map((file, idx) => (
                <FileItemComponent
                  key={file.id}
                  file={file}
                  progress={file.id === currentReceiveId ? progress : 0}
                  onCancel={onCancelTransfer}
                  index={idx}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      <SendConfirmationModal
        visible={showSendModal}
        file={pickedFile}
        onConfirm={handleConfirmSend}
        onCancel={handleCancelModal}
      />
      {isPickingFile && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.overlayCard}>
            <ActivityIndicator color="#804DCC" size="large" />
            <Text style={styles.overlayText}>Preparing…</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    backgroundColor: '#804DCC',
    paddingHorizontal: 24,
    paddingTop:
      Platform.OS === 'android' && Platform.Version >= 35
        ? (StatusBar.currentHeight ?? 0) + 24
        : 24,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  connectionIndicator: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  connectionPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    opacity: 0.3,
    position: 'absolute',
  },
  connectionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  terminateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  terminateButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 0.95 }],
  },
  terminateIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -40,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -30,
    left: -20,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B98115',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inProgressBadge: {
    backgroundColor: '#804DCC15',
  },
  inProgressDot: {
    backgroundColor: '#804DCC',
  },
  inProgressText: {
    color: '#804DCC',
  },
  historyCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayCard: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  overlayText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default SessionScreen;
