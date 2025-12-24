import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  isSend?: boolean; // true for send icon, false for receive icon
  color?: string; // accent color for icon circle
};

const EmptyState: React.FC<Props> = ({
  title,
  subtitle,
  isSend,
  color = '#804DCC',
}) => {
  return (
    <View style={styles.container}>
      {isSend !== undefined ? (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${color}15`, borderColor: `${color}30` },
          ]}
        >
          <Image
            style={[
              styles.iconImage,
              !isSend && { transform: [{ rotate: '180deg' }] },
            ]}
            resizeMode="contain"
            source={require('../assets/arrow.png')}
          />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
  },
  iconImage: {
    width: 24,
    tintColor: '#804DCC',
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmptyState;
