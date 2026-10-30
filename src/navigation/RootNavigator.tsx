import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';
import ChooseRoleScreen from '../screens/ChooseRoleScreen';
import DevicePickerScreen from '../screens/DevicePickerScreen';
import SessionScreen from '../screens/SessionScreen';
import { FileTransferRecord, PickedFile } from '../types/transfer';

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
  pickedFiles: PickedFile[];
  isPickingFile: boolean;
  pickerError: string | null;
  transferMode: 'idle' | 'sending' | 'receiving';
  progress: number;
  transferPort: number;
  sentFiles: FileTransferRecord[];
  receivedFiles: FileTransferRecord[];

  onChooseRole: (role: 'send' | 'receive') => void;
  onSelectDevice: (device: any) => void;
  onBack: () => void;
  onPickFile: () => void;
  onSendFiles: () => void;
  onCancelPick: () => void;
  onRemovePick: (index: number) => void;
  onCancelTransfer: (id?: string) => void;
  onCancelAllSends: () => void;
  onOpenFile: (file: FileTransferRecord) => void;
  onTerminate: () => void;
};

const RootNavigator: React.FC<NavigatorProps> = ({
  role,
  devices,
  sessionPeer,
  pickedFiles,
  isPickingFile,
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
  onSendFiles,
  onCancelPick,
  onRemovePick,
  onCancelTransfer,
  onCancelAllSends,
  onOpenFile,
  onTerminate,
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
                pickedFiles={pickedFiles}
                isPickingFile={isPickingFile}
                pickerError={pickerError}
                transferMode={transferMode}
                progress={progress}
                sentFiles={sentFiles}
                receivedFiles={receivedFiles}
                onPickFile={onPickFile}
                onSendFiles={onSendFiles}
                onCancelPick={onCancelPick}
                onRemovePick={onRemovePick}
                onCancelTransfer={onCancelTransfer}
                onCancelAllSends={onCancelAllSends}
                onOpenFile={onOpenFile}
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
