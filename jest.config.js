module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    './jest.setup.js',
    '<rootDir>/node_modules/@react-native-documents/picker/jest/build/jest/setup.js',
  ],
  // Libraries that ship untranspiled ES modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-documents|@react-navigation)/)',
  ],
  // The desktop app has its own toolchain and isn't covered by these tests
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/desktop/'],
};
