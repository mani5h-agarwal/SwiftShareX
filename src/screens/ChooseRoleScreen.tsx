import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import RoleButton from '../components/RoleButton';

type Props = {
  onChoose: (role: 'send' | 'receive') => void;
};

const ChooseRoleScreen: React.FC<Props> = ({ onChoose }) => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FAFBFC" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SwiftShareX</Text>
        <Text style={styles.tagline}>Fast. Simple. Secure.</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.prompt}>Choose your action</Text>
        
        <View style={styles.buttonsContainer}>
          <RoleButton role="send" onPress={() => onChoose('send')} />
          <RoleButton role="receive" onPress={() => onChoose('receive')} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.featureRow}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>End-to-end encrypted</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>No file size limits</Text>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>Lightning fast transfers</Text>
        </View>
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
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#804DCC',
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default ChooseRoleScreen;