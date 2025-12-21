import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';

type Role = 'send' | 'receive';

type DiscoveredDevice = {
  id: string;
  name: string;
  address: string;
  role: Role;
};

const DeviceCard: React.FC<{
  item: DiscoveredDevice;
  onPress: () => void;
  index: number;
  isSending: boolean;
}> = ({ item, onPress, index, isSending }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isSender = !isSending;
  const accentColor = isSender ? '#FF6B6B' : '#804DCC';

  return (
    <Animated.View
      style={[
        styles.deviceCardWrapper,
        { opacity: fadeAnim, transform: [{ scale }] },
      ]}
    >
      <Pressable
        style={styles.deviceCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Status indicator */}
        <View style={[styles.statusDot, { backgroundColor: accentColor }]} />

        {/* Device icon */}
        <View
          style={[styles.deviceIcon, { backgroundColor: `${accentColor}15` }]}
        >
          <Text style={[styles.deviceIconText, { color: accentColor }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Device info */}
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.deviceMetaRow}>
            <View
              style={[styles.roleTag, { backgroundColor: `${accentColor}15` }]}
            >
              <Text style={[styles.roleTagText, { color: accentColor }]}>
                {isSender ? 'Sender' : 'Receiver'}
              </Text>
            </View>
            <Text style={styles.deviceAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  deviceCardWrapper: {
    marginVertical: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 18,
    left: 18,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  deviceIconText: {
    fontSize: 28,
    fontWeight: '700',
  },
  deviceInfo: {
    flex: 1,
    gap: 6,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceAddress: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  arrow: {
    fontSize: 28,
    color: '#04000a3a',
    fontWeight: '400',
    marginRight: 8,
  },
});

export default DeviceCard;
