import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
          Product #{id}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
          Product detail screen — to be built in Session 3
        </Text>
      </View>
    </SafeAreaView>
  );
}
