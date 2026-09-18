import { openBrowserAsync } from 'expo-web-browser';
import { type ReactNode, type JSX } from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';

type Props = Omit<PressableProps, 'onPress'> & {
  href: string;
  children?: ReactNode;
};

export function ExternalLink({ href, children, ...rest }: Props): JSX.Element {
  return (
    <Pressable
      {...rest}
      onPress={async () => {
        if (Platform.OS !== 'web') {
          await openBrowserAsync(href);
          return;
        }
        window.open(href, '_blank');
      }}
    >
      {children}
    </Pressable>
  );
}
