import React from "react";
import { View } from "react-native";
import { Button, spacing } from "../../ui";
export function NumberPad({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: spacing.sm, width: "100%" }}>
      {[0, 5].map((start) => (
        <View key={start} style={{ flexDirection: "row", gap: spacing.sm }}>
          {Array.from({ length: 5 }, (_, i) => start + i + 1).map((n) => (
            <Button key={n} size="sm" style={{ flex: 1, width: 0, minWidth: 0, minHeight: 48, paddingHorizontal: 0 }} disabled={disabled} variant={value === n ? "primary" : "secondary"} onPress={() => onChange(n)}>{n}</Button>
          ))}
        </View>
      ))}
    </View>
  );
}
