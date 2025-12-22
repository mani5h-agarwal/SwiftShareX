import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  icon?: string;
  color?: string; // accent color for icon circle
};

const EmptyState: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  color = '#804DCC',
}) => {
  return (
    <View style={styles.container}>
      {icon ? (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${color}15`, borderColor: `${color}30` },
          ]}
        >
          <Text style={[styles.iconText, { color }]}>{icon}</Text>
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
  iconText: {
    fontSize: 36,
    fontWeight: '300',
    opacity: 0.8,
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
