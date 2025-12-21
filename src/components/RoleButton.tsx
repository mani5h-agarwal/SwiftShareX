import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

type Props = {
  onPress: () => void;
  role: 'send' | 'receive';
};

const RoleButton: React.FC<Props> = ({ onPress, role }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 1,
      useNativeDriver: true,
    }).start();
  };

  const isSend = role === 'send';
  const backgroundColor = isSend ? '#FF6B6B' : '#804DCC';
  const icon = isSend ? '↑' : '↓';
  const title = isSend ? 'Send' : 'Receive';
  const subtitle = isSend ? 'Share files' : 'Get files';

  return (
    <Animated.View style={[styles.buttonWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.gradientButton, { backgroundColor }]}>
          {/* Background Pattern */}
          <View style={styles.backgroundPattern}>
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
          </View>

          {/* Content */}
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
            <Text style={styles.buttonTitle}>{title}</Text>
            <Text style={styles.buttonSubtitle}>{subtitle}</Text>
          </View>

          {/* Shine Effect */}
          <View style={styles.shineEffect} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    flex: 1,
  },
  button: {
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 12,
  },
  gradientButton: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -30,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -25,
  },
  circle3: {
    width: 50,
    height: 50,
    top: '45%',
    right: 15,
    opacity: 0.5,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  iconText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
  },
  buttonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
    zIndex: 1,
  },
});

export default RoleButton;
