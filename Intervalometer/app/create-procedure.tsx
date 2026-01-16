import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, Pressable, StyleSheet, 
  Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard 
} from 'react-native';
import { useRouter, Stack, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { ProcedureStep, saveProcedure, generateId } from '../utils/storage';
import { useHeaderHeight } from '@react-navigation/elements'; 

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); 
  const headerHeight = useHeaderHeight(); 
  
  // Page traversal ( name -> step creation ) states
  const [step, setStep] = useState(1); 
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Procedure data states
  const [procName, setProcName] = useState('');
  const [procDesc, setProcDesc] = useState('');
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  
  // Step Input States
  const [newStepName, setNewStepName] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(1); 

  // Edit Mode & UI State
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  
  // Keyboard state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const nameInputRef = useRef<TextInput>(null);

  // Keyboard listener - ios consideration just in case
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Unsaved changes protection - prevents leaving page accidentally
  const hasUnsavedChanges = Boolean(procName.trim() || procDesc.trim() || steps.length > 0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      Alert.alert(
        'Discard Unsaved Changes?',
        'You have unsaved progress. Are you sure you want to discard this procedure and leave?',
        [
          { text: "Keep Editing", style: 'cancel', onPress: () => {} },
          {
            text: 'Discard & Exit',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);


  // Actions
  
  // Movement between page 1 and page 2
  const nextStage = () => {
    if (!procName.trim()) {
      Alert.alert("Missing Information", "Please enter a name for your procedure to continue.");
      return;
    }
    setStep(2);
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // returning to page 1 from page 2
  const prevStage = () => {
    setStep(1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Edit logic

  const startEditing = (step: ProcedureStep) => {
    setEditingStepId(step.id);
    setNewStepName(step.name);

    let foundUnit = false;
    for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
        const unit = TIME_UNITS[i];
        if (step.duration % unit.multiplier === 0 && step.duration !== 0) {
            setDurationInput((step.duration / unit.multiplier).toString());
            setSelectedUnitIndex(i);
            foundUnit = true;
            break;
        }
    }
    if (!foundUnit) {
        setDurationInput(step.duration.toString());
        setSelectedUnitIndex(0); // ms
    }
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const cancelEditing = () => {
    setEditingStepId(null);
    setNewStepName('');
    setDurationInput('');
    Keyboard.dismiss();
  };

  const handleStepAction = () => {
    if (!newStepName.trim()) return;
    
    const rawValue = parseInt(durationInput);
    if (isNaN(rawValue)) return;

    const multiplier = TIME_UNITS[selectedUnitIndex].multiplier;
    const durationMs = rawValue * multiplier;

    if (editingStepId) {
        setSteps(prev => prev.map(s => 
            s.id === editingStepId 
            ? { ...s, name: newStepName, duration: durationMs } 
            : s
        ));
        setEditingStepId(null);
    } else {
        const newStep: ProcedureStep = {
            id: generateId(),
            name: newStepName,
            duration: durationMs,
        };
        setSteps([...steps, newStep]);
    }
    
    setNewStepName('');
    setDurationInput('');
    
    if (!editingStepId) {
        setTimeout(() => nameInputRef.current?.focus(), 100);
    } else {
        Keyboard.dismiss();
    }
  };

  const removeStep = (idToRemove: string) => {
    if (editingStepId === idToRemove) {
        cancelEditing(); 
    }
    
    const stepName = steps.find(s => s.id === idToRemove)?.name || 'this step';

    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove the step "${stepName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => setSteps(steps.filter(s => s.id !== idToRemove)) 
        }
      ]
    );
  };

  const handleFinalSave = async () => {
    if (steps.length === 0) {
      Alert.alert("Procedure Empty", "A procedure must contain at least one step to be saved.");
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
      setProcName('');
      setProcDesc('');
      setSteps([]);
      setTimeout(() => router.back(), 0);
    } else {
      Alert.alert("Save Failed", "An error occurred while saving the procedure. Please try again.");
    }
  };

  const getFormattedDuration = (ms: number) => {
    if (ms === 0) return '0s';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    if (parts.length === 0) return `${ms}ms`;
    return parts.join(' ');
  };

  const renderUnitPicker = () => (
    <View style={styles.unitPickerContainer}>
      <Text style={styles.unitLabel}>UNIT</Text>
      <ScrollView 
        style={styles.unitScroller}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="always"
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

  // Render content
  const renderContent = () => (
    <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
      
      {/* Page 1 */}
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

        <Pressable 
          style={[styles.fab, { bottom: 40 + insets.bottom }]} 
          onPress={nextStage}
        >
          <Ionicons name="arrow-forward" size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* Page 2 */}
      <View style={styles.page}>
        <View style={[styles.pageHeaderRow, { paddingTop: insets.top }]}>
          <Pressable onPress={prevStage} style={{ padding: SPACING.s }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDim} />
          </Pressable>
          <Text style={{ color: COLORS.textDim, fontWeight: 'bold' }}>ADD STEPS</Text>
          <Pressable onPress={handleFinalSave} style={{ padding: SPACING.s, borderWidth: 2, borderColor: COLORS.success, borderRadius: 10 }}>
            <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>FINALIZE & SAVE</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView 
            style={styles.stepList}
            contentContainerStyle={{ paddingBottom: 20 }} 
            keyboardShouldPersistTaps="handled"
          >
            {steps.length === 0 ? (
              <Text style={styles.emptyText}>No steps added yet.</Text>
            ) : (
              steps.map((s, index) => (
                <View key={s.id} style={[
                    styles.stepCard, 
                    editingStepId === s.id && styles.stepCardEditing 
                ]}>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
                    <View>
                      <Text style={styles.stepName}>{s.name}</Text>
                      <Text style={styles.stepDuration}>
                        {getFormattedDuration(s.duration)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <Pressable onPress={() => startEditing(s)} hitSlop={10}>
                        <Ionicons 
                            name="create-outline" 
                            size={22} 
                            color={editingStepId === s.id ? COLORS.success : COLORS.textDim} 
                        />
                    </Pressable>
                    <Pressable onPress={() => removeStep(s.id)} hitSlop={10}>
                        <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={[
            styles.addStepContainer, 
            editingStepId && styles.editContainerActive
        ]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
              <Text style={[styles.label, editingStepId && { color: COLORS.success }]}>
                  {editingStepId ? "EDITING STEP" : "NEW STEP"}
              </Text>
              
              {editingStepId && (
                  <Pressable onPress={cancelEditing}>
                       <Text style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 'bold' }}>CANCEL EDIT</Text>
                  </Pressable>
              )}
          </View>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: SPACING.s }}>
               <TextInput 
                ref={nameInputRef}
                style={styles.input} 
                placeholder={editingStepId ? "Edit Name" : "Action Name"}
                placeholderTextColor={COLORS.textDim}
                value={newStepName}
                onChangeText={setNewStepName}
              />
            </View>

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

            {renderUnitPicker()}

            <Pressable 
              style={[
                  styles.addButton,
                  editingStepId && { backgroundColor: COLORS.success } 
              ]} 
              onPress={handleStepAction}
            >
              <Ionicons 
                  name={editingStepId ? "checkmark" : "add"} 
                  size={28} 
                  color="#FFF" 
              />
            </Pressable>
          </View>
        </View>

      </View>

    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{
        title: 'Editor',
        headerStyle: { backgroundColor: '#37474F' }, 
        headerTintColor: '#fff',
      }} />

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
          behavior="padding" 
          style={{ flex: 1 }}
          keyboardVerticalOffset={headerHeight}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      )}
    </View>
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
    flex: 1, 
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
  stepCardEditing: {
    borderColor: COLORS.success,
    borderWidth: 1,
    backgroundColor: '#1B2E24',
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, 
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
  addStepContainer: {
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: COLORS.background,
    marginBottom: 20
  },
  editContainerActive: {
      borderTopColor: COLORS.success,
      borderTopWidth: 2,
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