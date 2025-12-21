import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { formatFileSize, getFileExtension } from '../utils/fileUtils';

type PickedFile = {
  name: string;
  uri: string;
  size?: number | null;
  path: string;
};

const SendConfirmationModal = ({
  visible,
  file,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  file: PickedFile | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!file) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View
          style={[styles.overlayBackground, { opacity: fadeAnim }]}
        />
      </Pressable>

      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>↑</Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.modalTitle}>Send File?</Text>
            <Text style={styles.modalSubtitle}>Confirm your transfer</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onCancel}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.filePreviewCard}>
          <View style={styles.fileIconWrapper}>
            <View style={styles.fileIconBackground}>
              <Text style={styles.fileIcon}>📄</Text>
            </View>
            <View style={styles.extensionBadge}>
              <Text style={styles.extensionText}>
                {getFileExtension(file.name)}
              </Text>
            </View>
          </View>

          <View style={styles.fileDetails}>
            <Text
              style={styles.fileName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {file.name}
            </Text>
            <View style={styles.fileMetaContainer}>
              <View style={styles.sizeChip}>
                <Text style={styles.sizeText}>{formatFileSize(file.size)}</Text>
              </View>
              <View style={styles.readyIndicator}>
                <View style={styles.readyPulse} />
                <View style={styles.readyDot} />
                <Text style={styles.readyText}>Ready to send</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.confirmButton,
              pressed && styles.confirmButtonPressed,
            ]}
            onPress={onConfirm}
          >
            <View style={styles.confirmButtonGradient}>
              <Text style={styles.confirmButtonText}>Send File</Text>
              <Text style={styles.confirmButtonIcon}>→</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    padding: 20,
    zIndex: 10,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#E5E7EB',
    transform: [{ scale: 0.95 }],
  },
  closeIcon: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '700',
  },
  filePreviewCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#FAFBFC',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  fileIconWrapper: {
    position: 'relative',
  },
  fileIconBackground: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 32,
  },
  extensionBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  extensionText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  fileDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  fileMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  sizeChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    position: 'relative',
  },
  readyPulse: {
    position: 'absolute',
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    opacity: 0.3,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cancelButtonPressed: {
    backgroundColor: '#E5E7EB',
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    elevation: 6,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  confirmButtonPressed: {
    backgroundColor: '#FF6B6B',
    transform: [{ scale: 0.98 }],
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  confirmButtonIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  iconContainer: {
    width: 66,
    height: 66,
    backgroundColor: 'rgba(255, 24, 24, 0.11)',
    borderRadius: 48,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ff6b6ba1',
  },
  iconText: {
    fontSize: 36,
    color: '#fa5252ff',
    fontWeight: '300',
  },
});

export default SendConfirmationModal;
