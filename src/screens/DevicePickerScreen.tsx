import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import ScanningIndicator from '../components/ScanningIndicator';
import DeviceCard from '../components/DeviceCard';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

type Role = 'send' | 'receive';

type DiscoveredDevice = {
  id: string;
  name: string;
  address: string;
  role: Role;
};

type Props = {
  role: Role;
  devices: DiscoveredDevice[];
  onSelect: (device: DiscoveredDevice) => void;
  onBack: () => void;
};

const DevicePickerScreen: React.FC<Props> = ({
  role,
  devices,
  onSelect,
  onBack,
}) => {
  const { deviceName, ipAddress, isLoading } = useDeviceInfo();

  const isSending = role === 'send';
  const roleColor = isSending ? '#FF6B6B' : '#804DCC';

  const renderItem = ({
    item,
    index,
  }: {
    item: DiscoveredDevice;
    index: number;
  }) => (
    <DeviceCard
      item={item}
      onPress={() => onSelect(item)}
      index={index}
      isSending={isSending}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FAFBFC" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Select Device</Text>
          <View style={styles.roleIndicator}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={styles.subtitle}>
              You're {isSending ? 'sending' : 'receiving'} files
            </Text>
          </View>
        </View>
        {/* Current Device Info - Redesigned */}
        {!isLoading && (
          <View style={styles.currentDeviceCard}>
            <View style={styles.deviceIconContainer}>
              <View
                style={[
                  styles.deviceIcon,
                  { backgroundColor: roleColor + '15' },
                ]}
              >
                <Text style={[styles.deviceIconText, { color: roleColor }]}>
                  {deviceName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.deviceInfoContainer}>
              <View
                style={[
                  //eslint-disable-next-line react-native/no-inline-styles
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                    gap: 10,
                  },
                ]}
              >
                <Text style={styles.deviceInfoLabel}>This Device</Text>
                <View style={styles.ipContainer}>
                  <View style={styles.ipDot} />
                  <Text style={styles.deviceInfoIp}>{ipAddress}</Text>
                </View>
              </View>

              <Text style={styles.deviceInfoName} numberOfLines={1}>
                {deviceName}
              </Text>
            </View>
          </View>
        )}

        {devices.length > 0 && (
          <View style={styles.deviceCount}>
            <Text style={styles.deviceCountText}>
              {devices.length} {devices.length === 1 ? 'device' : 'devices'}{' '}
              nearby
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={devices}
          keyExtractor={item => `${item.id}-${item.address}`}
          renderItem={renderItem}
          // eslint-disable-next-line react/no-unstable-nested-components
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<ScanningIndicator isSending={isSending} />}
          contentContainerStyle={
            devices.length ? styles.listContent : styles.emptyContent
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={onBack}
        >
          <Text style={styles.arrow}>‹</Text>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 0,
    backgroundColor: '#FAFBFC',
  },
  headerContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Redesigned current device card
  currentDeviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  deviceIconContainer: {
    marginRight: 14,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  deviceInfoName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  ipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  deviceInfoIp: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  deviceCount: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deviceCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#FAFBFC',
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  arrow: {
    fontSize: 28,
    color: '#04000a3a',
    fontWeight: '400',
    marginRight: 8,
    marginBottom: 4,
  },
});

export default DevicePickerScreen;
