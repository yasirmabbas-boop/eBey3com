import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          {t('home')}
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          اي بيع — ebey3 React Native
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
