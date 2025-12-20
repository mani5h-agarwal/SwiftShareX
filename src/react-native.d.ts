import 'react-native';

declare module 'react-native' {
  import { ComponentType } from 'react';

  export interface TextProps {
    style?: any;
    numberOfLines?: number;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export const Text: ComponentType<TextProps>;
}
