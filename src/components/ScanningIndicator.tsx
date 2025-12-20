import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const ScanningIndicator: React.FC<{ isSending: boolean }> = ({ isSending }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const accentColor = isSending ? '#FF6B6B' : '#804DCC';

  return (
    <View style={styles.scanningContainer}>
      <Animated.View
        style={[
          styles.scanningRing,
          { borderColor: accentColor },
          {
            transform: [{ scale: pulse }, { rotate: rotateInterpolate }],
          },
        ]}
      >
        <View
          style={[styles.scanningInner, { backgroundColor: accentColor }]}
        />
      </Animated.View>
      <Text style={styles.scanningText}>Scanning for devices...</Text>
      <Text style={styles.scanningSubtext}>
        Make sure both devices are on the same network
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  scanningRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scanningInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.2,
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default ScanningIndicator;
