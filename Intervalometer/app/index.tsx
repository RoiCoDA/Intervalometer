import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Pressable, FlatList, Alert, StatusBar, TextInput, Keyboard 
} from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { Procedure, getProcedures } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load Data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    const data = await getProcedures();
    setProcedures(data.sort((a, b) => b.createdAt - a.createdAt));
    setIsLoading(false);
  };

  // Filter Logic (Search)
  const filteredProcedures = useMemo(() => {
    if (!searchQuery) return procedures;
    return procedures.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, procedures]);

  // Delete Logic
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete the procedure "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const updated = procedures.filter(p => p.id !== id);
            setProcedures(updated);
            await AsyncStorage.setItem('@procedures_v2', JSON.stringify(updated));
          } 
        }
      ]
    );
  };

  const formatTotalTime = (steps: any[]) => {
    const totalMs = steps.reduce((acc, step) => acc + step.duration, 0);
    const totalSec = Math.floor(totalMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  };

  const renderItem = ({ item }: { item: Procedure }) => (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/run-procedure', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
             <Ionicons name="play-circle" size={24} color={COLORS.primary} style={{marginRight: 8}} />
             <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        </View>
        
        {/* Delete Button */}
        <Pressable 
            onPress={(e) => {
                e.stopPropagation(); // Prevent opening the procedure
                handleDelete(item.id, item.name);
            }}
            hitSlop={15}
        >
            <Ionicons name="trash-outline" size={22} color={COLORS.textDim} />
        </Pressable>
      </View>
      
      {item.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardMeta}>
        <View style={styles.badge}>
          <Ionicons name="list" size={12} color={COLORS.textDim} />
          <Text style={styles.badgeText}>{item.steps.length} Steps</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="time" size={12} color={COLORS.textDim} />
          <Text style={styles.badgeText}>{formatTotalTime(item.steps)}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Procedures</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search procedures..."
          placeholderTextColor={COLORS.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={20} color={COLORS.textDim} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredProcedures}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching procedures." : "No procedures found."}
              </Text>
              {!searchQuery && (
                <Text style={styles.emptySubText}>Create one to get started.</Text>
              )}
            </View>
          ) : null
        }
      />

      <Pressable 
  style={[styles.fab, { bottom: 30 + insets.bottom }]} 
  onPress={() => router.push('/create-procedure')}
>
        <Ionicons name="add" size={32} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    paddingBottom: SPACING.s,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.s,
    paddingHorizontal: SPACING.m,
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: SPACING.s,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    padding: SPACING.l,
    paddingTop: SPACING.s,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: '#333',
    ...SHADOWS.card,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#252525',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textDim,
    marginBottom: SPACING.m,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.textDim,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.s,
  },
  emptySubText: {
    color: COLORS.textDim,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
});