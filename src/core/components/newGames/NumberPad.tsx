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
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
        justifyContent: "center",
      }}
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          size="sm"
          style={{ width: 48, minHeight: 44 }}
          disabled={disabled}
          variant={value === n ? "primary" : "secondary"}
          onPress={() => onChange(n)}
        >
          {n}
        </Button>
      ))}
    </View>
  );
}
