import React from "react";
import { View, Text } from "react-native";
import { CoreRoom } from "../../types/room";
import { colors, fonts, spacing } from "../../ui";
export function ScoreList({
  scores,
  roomData,
}: {
  scores: Record<string, number>;
  roomData: CoreRoom;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([uid, score]) => (
          <View
            key={uid}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.body,
                flex: 1,
              }}
            >
              {roomData.players?.[uid]?.name ?? uid}
            </Text>
            <Text
              style={{ color: colors.primaryLight, fontFamily: fonts.bodySemi }}
            >
              {score} pt
            </Text>
          </View>
        ))}
    </View>
  );
}
