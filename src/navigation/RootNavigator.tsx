import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  // CardStyleInterpolators,
} from '@react-navigation/stack';
import ChooseRoleScreen from '../screens/ChooseRoleScreen';
import DevicePickerScreen from '../screens/DevicePickerScreen';
import SessionScreen from '../screens/SessionScreen';

export type RootStackParamList = {
  ChooseRole: undefined;
  DevicePicker: {
    role: 'send' | 'receive';
  };
  Session: {
    role: 'send' | 'receive';
  };
};

const Stack = createStackNavigator<RootStackParamList>();

type NavigatorProps = {
  role: 'send' | 'receive' | null;
  devices: Array<{
    id: string;
    name: string;
    address: string;
    role: 'send' | 'receive';
  }>;
  sessionPeer: {
    id: string;
    name: string;
    address: string;
    role: 'send' | 'receive';
  } | null;
  pickedFile: {
    name: string;
    uri: string;
    size?: number | null;
    path: string;
  } | null;
  pickerError: string | null;
  transferMode: 'idle' | 'sending' | 'receiving';
  progress: number;
  transferPort: number;
  sentFiles: Array<{
    id: string;
    fileName: string;
    fileSize?: number;
    timestamp: Date;
    status: 'completed' | 'cancelled' | 'in-progress';
  }>;
  receivedFiles: Array<{
    id: string;
    fileName: string;
    fileSize?: number;
    timestamp: Date;
    status: 'completed' | 'cancelled' | 'in-progress';
  }>;

  onChooseRole: (role: 'send' | 'receive') => void;
  onSelectDevice: (device: any) => void;
  onBack: () => void;
  onPickFile: () => void;
  onSendFile: () => void;
  onCancelTransfer: () => void;
  onTerminate: () => void;
};

const RootNavigator: React.FC<NavigatorProps> = ({
  role,
  devices,
  sessionPeer,
  pickedFile,
  pickerError,
  transferMode,
  progress,
  transferPort,
  sentFiles,
  receivedFiles,
  onChooseRole,
  onSelectDevice,
  onBack,
  onPickFile,
  onSendFile,
  onCancelTransfer,
  onTerminate,
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          //   cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      >
        {!role ? (
          <Stack.Screen name="ChooseRole">
            {() => <ChooseRoleScreen onChoose={onChooseRole} />}
          </Stack.Screen>
        ) : !sessionPeer ? (
          <Stack.Screen name="DevicePicker">
            {() => (
              <DevicePickerScreen
                role={role}
                devices={devices}
                onSelect={onSelectDevice}
                onBack={onBack}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Session">
            {() => (
              <SessionScreen
                sessionPeer={sessionPeer}
                role={role}
                transferPort={transferPort}
                pickedFile={pickedFile}
                pickerError={pickerError}
                transferMode={transferMode}
                progress={progress}
                sentFiles={sentFiles}
                receivedFiles={receivedFiles}
                onPickFile={onPickFile}
                onSendFile={onSendFile}
                onCancelTransfer={onCancelTransfer}
                onTerminate={onTerminate}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
