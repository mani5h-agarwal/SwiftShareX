import { useState, useEffect } from 'react';
import DeviceInfo from 'react-native-device-info';

type DeviceInfoData = {
  deviceName: string;
  ipAddress: string;
  isLoading: boolean;
};

export const useDeviceInfo = (): DeviceInfoData => {
  const [deviceName, setDeviceName] = useState<string>('Unknown Device');
  const [ipAddress, setIpAddress] = useState<string>('0.0.0.0');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const name = await DeviceInfo.getDeviceName();
        const ip = await DeviceInfo.getIpAddress();

        setDeviceName(name);
        setIpAddress(ip);
      } catch (error) {
        console.error('Error fetching device info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceInfo();
  }, []);

  return { deviceName, ipAddress, isLoading };
};
