import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function FavoritesScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
          {t('favorites')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
