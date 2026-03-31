// react-native-device-info mock for Electron desktop
// All functions are async to match the real API

export const getDeviceName = async (): Promise<string> => {
    try {
        return await (window as any).swiftshareIPC.getDeviceName();
    } catch {
        return 'SwiftShareX Desktop';
    }
};

export const getUniqueId = async (): Promise<string> => 'desktop-unique-id';

export const getSystemName = (): string => 'Desktop';

export const getSystemVersion = (): string => '1.0';

export const getIpAddress = async (): Promise<string> => {
    try {
        return await (window as any).swiftshareIPC.getLocalIP();
    } catch {
        return '127.0.0.1';
    }
};

export default {
    getDeviceName,
    getUniqueId,
    getSystemName,
    getSystemVersion,
    getIpAddress,
};
