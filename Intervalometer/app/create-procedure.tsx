import React, { useState, useRef } from 'react';
import { 
  View, Text, TextInput, Pressable, StyleSheet, 
  Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, FlatList 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { ProcedureStep, saveProcedure, generateId } from '../utils/storage';

const { width } = Dimensions.get('window');

// Constants
const TIME_UNITS = [
  { label: 'ms', multiplier: 1 },
  { label: 'sec', multiplier: 1000 },
  { label: 'min', multiplier: 60 * 1000 },
  { label: 'hr',  multiplier: 60 * 60 * 1000 },
];

export default function CreateProcedureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); 
  
  // Page traversal states
  const [step, setStep] = useState(1); 
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Procedure data states
  const [procName, setProcName] = useState('');
  const [procDesc, setProcDesc] = useState('');
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  
  // Pre-save steps states
  const [newStepName, setNewStepName] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(1); // Default to 'sec' (Index 1)

  // Actions
  
  const nextStage = () => {
    if (!procName.trim()) {
      Alert.alert("Missing Info", "Please name your procedure.");
      return;
    }
    setStep(2);
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const prevStage = () => {
    setStep(1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const addStep = () => {
    if (!newStepName.trim()) return;
    
    const rawValue = parseInt(durationInput);
    if (isNaN(rawValue)) return;

    // Conversion logic
    const multiplier = TIME_UNITS[selectedUnitIndex].multiplier;
    const durationMs = rawValue * multiplier;

    const newStep: ProcedureStep = {
      id: generateId(),
      name: newStepName,
      duration: durationMs,
    };

    setSteps([...steps, newStep]);
    
    setNewStepName('');
    setDurationInput('');
  };

  const removeStep = (idToRemove: string) => {
    // Find name for the prompt
    const stepName = steps.find(s => s.id === idToRemove)?.name || 'this step';

    Alert.alert(
      "Delete Step",
      `Are you sure you want to delete step "${stepName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => setSteps(steps.filter(s => s.id !== idToRemove)) 
        }
      ]
    );
  };

  const handleFinalSave = async () => {
    if (steps.length === 0) {
      Alert.alert("Empty Procedure", "Please add at least one step.");
      return;
    }

    const success = await saveProcedure({
      id: generateId(),
      name: procName,
      description: procDesc,
      steps: steps,
      createdAt: Date.now(),
    });

    if (success) {
      router.back(); 
    } else {
      Alert.alert("Error", "Could not save procedure.");
    }
  };

  // Time unit picker component
  const renderUnitPicker = () => (
    <View style={styles.unitPickerContainer}>
      <Text style={styles.unitLabel}>UNIT</Text>
      <ScrollView 
        style={styles.unitScroller}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {TIME_UNITS.map((unit, index) => {
          const isSelected = index === selectedUnitIndex;
          return (
            <Pressable 
              key={unit.label} 
              onPress={() => setSelectedUnitIndex(index)}
              style={[
                styles.unitItem, 
                isSelected && styles.unitItemSelected
              ]}
            >
              <Text style={[
                styles.unitText, 
                isSelected && styles.unitTextSelected
              ]}>
                {unit.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // --- RENDER ---
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={40}
    >
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
        
        {/* Page 1 - Procedure data */}
        <View style={styles.page}>
          <Text style={styles.header}>Let&apos;s start.</Text>
          <Text style={styles.subHeader}>Name your standard operating procedure.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NAME</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Engine Cold Start" 
              placeholderTextColor={COLORS.textDim}
              value={procName}
              onChangeText={setProcName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIPTION (Optional)</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Context or safety warnings..." 
              placeholderTextColor={COLORS.textDim}
              value={procDesc}
              onChangeText={setProcDesc}
              multiline
            />
          </View>

          <Pressable style={styles.fab} onPress={nextStage}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </Pressable>
        </View>

        {/* Page 2 - steps editor */}
        <View style={styles.page}>
          <View style={[styles.pageHeaderRow, { paddingTop: insets.top }]}>
            <Pressable onPress={prevStage} style={{ padding: SPACING.s }}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textDim} />
            </Pressable>
            <Text style={{ color: COLORS.textDim, fontWeight: 'bold' }}>ADD STEPS</Text>
            <Pressable onPress={handleFinalSave} style={{ padding: SPACING.s }}>
              <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>SAVE</Text>
            </Pressable>
          </View>

          {/* Added steps list */}
          <ScrollView 
            style={styles.stepList}
            contentContainerStyle={{ paddingBottom: 100 }} // Extra padding so list doesn't get stuck behind input
          >
            {steps.length === 0 ? (
              <Text style={styles.emptyText}>No steps added yet.</Text>
            ) : (
              steps.map((s, index) => (
                <View key={s.id} style={styles.stepCard}>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
                    <View>
                      <Text style={styles.stepName}>{s.name}</Text>
                      <Text style={styles.stepDuration}>
                        {/* Display roughly in seconds for readability */}
                        {(s.duration / 1000).toFixed(1)}s ({s.duration}ms)
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => removeStep(s.id)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input area */}
          <View style={[styles.addStepContainer, { paddingBottom: insets.bottom + 10 }]}>
            <Text style={styles.label}>NEW STEP</Text>
            
            <View style={styles.row}>
              {/* Name Input */}
              <View style={{ flex: 1, marginRight: SPACING.s }}>
                 <TextInput 
                  style={styles.input} 
                  placeholder="Action Name" 
                  placeholderTextColor={COLORS.textDim}
                  value={newStepName}
                  onChangeText={setNewStepName}
                />
              </View>

              {/* Duration Input */}
              <View style={{ width: 80, marginRight: SPACING.s }}>
                <TextInput 
                  style={[styles.input, { textAlign: 'center' }]} 
                  placeholder="0" 
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={durationInput}
                  onChangeText={setDurationInput}
                />
              </View>

              {/* Custom Unit Picker */}
              {renderUnitPicker()}

              {/* Add Button */}
              <Pressable style={styles.addButton} onPress={addStep}>
                <Ionicons name="add" size={28} color="#FFF" />
              </Pressable>
            </View>
          </View>

        </View>

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slideContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * 2,
  },
  page: {
    width: width,
    paddingHorizontal: SPACING.l,
    paddingTop: 0, 
  },
  pageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
    height: 60, 
  },
  header: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SPACING.s,
    marginTop: 60, 
  },
  subHeader: {
    color: COLORS.textDim,
    fontSize: 16,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.l,
  },
  label: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: SPACING.m,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    height: 50,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  // Step List
  stepList: {
    flex: 1,
  },
  emptyText: {
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  },
  stepCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 8,
    marginBottom: SPACING.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndex: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginRight: SPACING.m,
    fontSize: 18,
  },
  stepName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  stepDuration: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  
  // Footer Area
  addStepContainer: {
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: COLORS.background, 
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: SPACING.s,
  },

  unitPickerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitLabel: {
    position: 'absolute', 
    top: -15, 
    fontSize: 8, 
    color: COLORS.secondary,
    fontWeight: 'bold'
  },
  unitScroller: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  unitItem: {
    height: 25, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitItemSelected: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    color: COLORS.textDim,
    fontSize: 10,
  },
  unitTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  }
});