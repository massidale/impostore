import React, { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { CoreRoom } from "../../types/room";
import { MetaRow, ErrorBanner, colors, fonts, spacing } from "../../ui";
import { FitContent } from "../../ui/FitContent";
import { wrappingText } from "../../ui/wrappingText";

/** Large card fits the game area; controls remain full-size in a scrollable footer. */
export function RoundLayout({
  roomData,
  title,
  gameName,
  card,
  children,
  error,
  centerContent = false,
}: {
  roomData: CoreRoom;
  /** Sottotitolo opzionale (es. "Domanda 2/8") mostrato sotto MetaRow. */
  title?: string;
  /** Nome del gioco, centrato dentro MetaRow. */
  gameName?: string;
  card?: ReactNode;
  children?: ReactNode;
  error?: string | null;
  /** Centre a scrollable group when it fits; keep its full width otherwise. */
  centerContent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        padding: spacing.sm,
        backgroundColor: colors.background,
        gap: spacing.sm,
      }}
    >
      <MetaRow
        roomId={roomData.id}
        players={Object.keys(roomData.players ?? {}).length}
        gameName={gameName}
      />
      {title ? (
        <Text
          style={[
            wrappingText,
            {
              fontFamily: fonts.bodyMedium,
              color: colors.textSecondary,
              fontSize: 14,
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {error && <ErrorBanner message={error} />}
      {card && <FitContent>{card}</FitContent>}
      {children && (
        <ScrollView
          style={
            card
              ? { flexGrow: 0, flexShrink: 1, maxHeight: "45%" }
              : { flex: 1, minHeight: 0 }
          }
          contentContainerStyle={[{ gap: spacing.sm, paddingBottom: spacing.sm }, centerContent && !card && { flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}
