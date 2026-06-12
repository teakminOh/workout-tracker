import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { AppButton } from './app-button';

type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type DialogButton = {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
};

export type DialogConfig = {
  title: string;
  message?: string;
  buttons?: DialogButton[];
};

const cardStyle = { borderCurve: 'continuous' } as const;
const backdropStyle = { backgroundColor: 'rgba(0, 0, 0, 0.6)' } as const;

const buttonVariant: Record<DialogButtonStyle, 'primary' | 'secondary' | 'danger'> = {
  default: 'primary',
  cancel: 'secondary',
  destructive: 'danger',
};

const AppDialogContext = createContext<(config: DialogConfig) => void>(() => {});

/**
 * Themed replacement for `Alert.alert`. Renders a dark surface card over a dim
 * backdrop instead of the OS-default alert. Use via `useAppDialog()`.
 */
export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DialogConfig | null>(null);

  const showDialog = useCallback((next: DialogConfig) => setConfig(next), []);
  const close = useCallback(() => setConfig(null), []);

  // Stacked dialogs read better with the dismissive action last.
  const orderedButtons = useMemo(() => {
    const buttons = config?.buttons?.length
      ? config.buttons
      : [{ text: 'OK', style: 'cancel' as const }];

    return [...buttons].sort(
      (a, b) => Number(a.style === 'cancel') - Number(b.style === 'cancel')
    );
  }, [config]);

  return (
    <AppDialogContext.Provider value={showDialog}>
      {children}
      <Modal
        transparent
        statusBarTranslucent
        visible={config !== null}
        animationType="fade"
        onRequestClose={close}>
        <Pressable className="flex-1 items-center justify-center px-8" style={backdropStyle} onPress={close}>
          <Pressable
            className="w-full gap-4 rounded-10 bg-surface p-5"
            style={cardStyle}
            onPress={(event) => event.stopPropagation()}>
            <View className="gap-2">
              <ThemedText type="subtitle">{config?.title}</ThemedText>
              {config?.message ? (
                <ThemedText className="opacity-70">{config.message}</ThemedText>
              ) : null}
            </View>
            <View className="gap-2">
              {orderedButtons.map((button, index) => (
                <AppButton
                  key={`${button.text}-${index}`}
                  title={button.text}
                  variant={buttonVariant[button.style ?? 'default']}
                  onPress={() => {
                    close();
                    button.onPress?.();
                  }}
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export const useAppDialog = () => useContext(AppDialogContext);
