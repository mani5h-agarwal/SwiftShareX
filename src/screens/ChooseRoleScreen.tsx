import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoleButton from '../components/RoleButton';
import RNFS from 'react-native-fs';
import { ActionRow } from '../components/ActionRow';

type Props = {
  onChoose: (role: 'send' | 'receive') => void;
};

const ChooseRoleScreen: React.FC<Props> = ({ onChoose }) => {
  const openSwiftShareXFolder = async () => {
    try {
      // Get the SwiftShareX folder path
      const swiftShareXPath = Platform.select({
        android: `${RNFS.DownloadDirectoryPath}/SwiftShareX`,
        ios: `${RNFS.DocumentDirectoryPath}/SwiftShareX`,
      });

      if (!swiftShareXPath) {
        Alert.alert('Error', 'Could not determine SwiftShareX folder location');
        return;
      }

      // Check if folder exists
      const exists = await RNFS.exists(swiftShareXPath);

      if (!exists) {
        Alert.alert(
          'No Files Yet',
          "You haven't received any files yet. The SwiftShareX folder will be created when you receive your first file.",
          [{ text: 'OK' }],
        );
        return;
      }

      // Try to open the folder in file manager
      if (Platform.OS === 'android') {
        // For Android, try to open the Downloads/SwiftShareX folder
        const uri =
          'content://com.android.externalstorage.documents/document/primary%3ADownload%2FSwiftShareX';

        try {
          const canOpen = await Linking.canOpenURL(uri);
          if (canOpen) {
            await Linking.openURL(uri);
          } else {
            // Fallback: try opening just Downloads folder
            await Linking.openURL(
              'content://com.android.externalstorage.documents/document/primary%3ADownload',
            );
          }
        } catch {
          // If all fails, show message
          Alert.alert(
            'Open File Manager',
            `Files are saved in: Downloads/SwiftShareX\n\nPlease open your file manager and navigate to this folder.`,
            [{ text: 'OK' }],
          );
        }
      }
    } catch (error) {
      console.error('Error opening folder:', error);
      Alert.alert(
        'Files Location',
        `Received files are saved in:\n${
          Platform.OS === 'android'
            ? 'Downloads/SwiftShareX'
            : 'Files/SwiftShareX'
        }`,
        [{ text: 'OK' }],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <ActionRow
          icon="🗂️"
          title="View All Files"
          subtitle="Saved in SwiftShareX folder"
          onPress={openSwiftShareXFolder}
        />
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
    </SafeAreaView>
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
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
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
    marginBottom: 30,
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
