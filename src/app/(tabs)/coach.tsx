// Coach Review: renders FitTrack/review/latest-review.md written by the
// nightly Claude Code session on the Mac.

import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { useFocusEffect } from 'expo-router';
import { Sub } from '@/components/ui';
import { readReview } from '@/lib/mirror';
import { C } from '@/lib/theme';

export default function Coach() {
  const [review, setReview] = useState(readReview());
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(useCallback(() => setReview(readReview()), []));

  const refresh = () => {
    setRefreshing(true);
    setReview(readReview());
    setTimeout(() => setRefreshing(false), 300);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      >
        <Text style={{ color: C.text, fontSize: 28, fontWeight: '800' }}>Coach</Text>
        {review?.updatedAt && (
          <Sub style={{ marginTop: 4 }}>Last updated {review.updatedAt.toLocaleString()}</Sub>
        )}
        {review ? (
          <Markdown style={md}>{review.text}</Markdown>
        ) : (
          <View style={{ marginTop: 40, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🛌</Text>
            <Sub style={{ textAlign: 'center' }}>
              Your review appears here after each nightly check-in.
            </Sub>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const md = {
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  heading1: { color: C.text, fontWeight: '800' as const, marginTop: 16 },
  heading2: { color: C.text, fontWeight: '700' as const, marginTop: 14 },
  heading3: { color: C.accent, fontWeight: '700' as const, marginTop: 12 },
  strong: { color: C.accent },
  bullet_list_icon: { color: C.accent },
  ordered_list_icon: { color: C.accent },
  blockquote: { backgroundColor: C.card, borderLeftColor: C.accent, borderLeftWidth: 3 },
  code_inline: { backgroundColor: C.card, color: C.accent },
  fence: { backgroundColor: C.card, borderColor: C.border },
  hr: { backgroundColor: C.border },
};
