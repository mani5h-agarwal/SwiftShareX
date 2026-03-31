// @ts-nocheck
import * as ReactNativeWeb from 'react-native-web';
export * from 'react-native-web';

export const TurboModuleRegistry = {
    getEnforcing: () => null,
    get: () => null
};

// Use View (web-safe) instead of raw div to prevent CSSStyleDeclaration errors
export const codegenNativeComponent = () => ReactNativeWeb.View;
export const codegenNativeCommands = () => ({});

export default {
    ...ReactNativeWeb,
    TurboModuleRegistry,
    codegenNativeComponent,
    codegenNativeCommands
};
