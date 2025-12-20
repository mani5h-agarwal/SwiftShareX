import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import ProgressBar from './ProgressBar';

type FileTransferRecord = {
  id: string;
  fileName: string;
  fileSize?: number;
  timestamp: Date;
  status: 'completed' | 'cancelled' | 'in-progress';
};

const FileItemComponent = ({
  file,
  progress,
  onCancel,
  index,
}: {
  file: FileTransferRecord;
  progress: number;
  onCancel?: (id: string) => void;
  index: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const isInProgress = file.status === 'in-progress';
  const isCompleted = file.status === 'completed';
  // const isCancelled = file.status === 'cancelled';

  const accentColor = isInProgress
    ? '#3B82F6'
    : isCompleted
    ? '#10B981'
    : '#EF4444';

  const statusIcon = isInProgress ? '↻' : isCompleted ? '✓' : '×';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  return (
    <Animated.View
      style={[
        styles.fileCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale }],
        },
      ]}
    >
      <Pressable
        style={styles.fileCard}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isInProgress}
      >
        {/* Gradient Status Bar */}
        <View style={[styles.statusBar, { backgroundColor: accentColor }]} />

        {/* File Icon with Extension Badge */}
        <View style={styles.iconWrapper}>
          <View style={[styles.fileIcon, { backgroundColor: `${accentColor}15` }]}>
            <Text style={[styles.fileIconText, { color: accentColor }]}>
              {statusIcon}
            </Text>
          </View>
          <View style={[styles.extensionBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.extensionText}>
              {getFileExtension(file.fileName)}
            </Text>
          </View>
        </View>

        {/* File Info */}
        <View style={styles.fileInfo}>
          <View style={styles.fileHeader}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.fileName}
            </Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: `${accentColor}15` },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.statusText, { color: accentColor }]}>
                {isInProgress
                  ? 'Transferring'
                  : isCompleted
                  ? 'Completed'
                  : 'Cancelled'}
              </Text>
            </View>
          </View>

          <View style={styles.fileMetaRow}>
            <View style={styles.sizeChip}>
              <Text style={styles.sizeText}>{formatFileSize(file.fileSize)}</Text>
            </View>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.timeText}>{formatTime(file.timestamp)}</Text>
          </View>

          {isInProgress && (
            <View style={styles.progressSection}>
              <ProgressBar progress={progress} />
              <Text style={[styles.progressPercentage, { color: accentColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Cancel Button */}
        {isInProgress && onCancel && (
          <Pressable
            style={({pressed}) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={() => onCancel(file.id)}
          >
            <Text style={styles.cancelIcon}>✕</Text>
          </Pressable>
        )}

        {/* Completion Checkmark */}
        {isCompleted && (
          <View style={styles.completionBadge}>
            <Text style={styles.completionIcon}>✓</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fileCardWrapper: {
    marginBottom: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  iconWrapper: {
    position: 'relative',
  },
  fileIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  fileIconText: {
    fontSize: 32,
    fontWeight: '700',
  },
  extensionBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  extensionText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  fileInfo: {
    flex: 1,
    gap: 8,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.2,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  metaDivider: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'right',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  cancelButtonPressed: {
    backgroundColor: '#FCA5A5',
    transform: [{ scale: 0.95 }],
  },
  cancelIcon: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '700',
  },
  completionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
  },
});

export default FileItemComponent;