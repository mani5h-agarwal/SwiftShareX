import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  formatFileSize,
  getFileExtension,
  formatRelativeTime,
} from '../utils/fileUtils';

// Types
type FileTransferRecord = {
  id: string;
  fileName: string;
  fileSize?: number;
  timestamp: Date;
  status: 'completed' | 'cancelled' | 'in-progress';
};

// Main File Item Component
type FileItemProps = {
  file: FileTransferRecord;
  progress: number;
  onCancel?: (id: string) => void;
  index: number;
};

const FileItemComponent = ({
  file,
  progress,
  onCancel,
  index: _index,
}: FileItemProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const verticalProgress = useRef(new Animated.Value(0)).current;

  const isInProgress = file.status === 'in-progress';
  const isCompleted = file.status === 'completed';

  const accentColor = isInProgress
    ? '#804DCC'
    : isCompleted
    ? '#10B981'
    : '#FF6B6B';

  const statusIcon = isCompleted ? '✓' : '×';

  // Animate the left vertical status bar to reflect progress
  useEffect(() => {
    const target = isInProgress ? progress : 1; // full when completed/cancelled
    Animated.timing(verticalProgress, {
      toValue: target,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isInProgress, progress, verticalProgress]);

  const verticalHeight = verticalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

  return (
    // <Animated.View style={{ transform: [{ scale }] }}>
    <Pressable
      style={styles.fileCard}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInProgress}
    >
      {/* Left Vertical Progress Bar */}
      <View style={styles.statusBar}>
        <Animated.View
          style={[
            styles.statusBarFill,
            { height: verticalHeight, backgroundColor: accentColor },
          ]}
        />
      </View>

      {/* File Icon with Extension Badge */}
      <View style={styles.iconWrapper}>
        <View
          style={[styles.fileIcon, { backgroundColor: `${accentColor}15` }]}
        >
          {isInProgress ? (
            <ActivityIndicator color={accentColor} size="small" />
          ) : (
            <Text style={[styles.fileIconText, { color: accentColor }]}>
              {statusIcon}
            </Text>
          )}
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
          {isInProgress && onCancel && (
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={() => onCancel(file.id)}
            >
              <Text style={styles.cancelIcon}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.fileMetaRow}>
          <View style={styles.sizeChip}>
            <Text style={styles.sizeText}>{formatFileSize(file.fileSize)}</Text>
          </View>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.timeText}>
            {formatRelativeTime(file.timestamp)}
          </Text>
          {isInProgress && (
            <>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={[styles.progressPercentage, { color: accentColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
    // </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    minHeight: 92,
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#E5E7EB',
  },
  statusBarFill: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
  },
  iconWrapper: {
    position: 'relative',
    padding: 3,
  },
  fileIcon: {
    width: 56,
    height: 56,
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
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  progressPercentage: {
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  cancelButtonPressed: {
    backgroundColor: '#FCA5A5',
    transform: [{ scale: 0.9 }],
  },
  cancelIcon: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '900',
  },
});

export default FileItemComponent;
