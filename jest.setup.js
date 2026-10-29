/* eslint-env jest */
// Native modules have no implementation under Jest; replace them with mocks.
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-device-info', () =>
  require('react-native-device-info/jest/react-native-device-info-mock'),
);

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  DownloadDirectoryPath: '/mock/downloads',
  exists: jest.fn(() => Promise.resolve(false)),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    on: jest.fn(),
    bind: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    setBroadcast: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));
