import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, FlatList, Alert, StatusBar, Dimensions, Animated, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { Procedure, getProcedures } from '../utils/storage';
import { Audio } from 'expo-av';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice'; 

const { width } = Dimensions.get('window');

export default function RunProcedureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [isStepFinished, setIsStepFinished] = useState(false);
  const [isListening, setIsListening] = useState(false); 

  // Animation for Progress Bar
  const progressAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  async function playSound()
  {
    try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/beep.mp3'));
        await sound.playAsync();

        sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
                await sound.unloadAsync();
            }
        });
    }
    catch (error)
    {
        console.log('Error playing sound', error);
    }
  }

  // Voice logic

  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start('en-US'); 
    } catch (e) {
      console.error("Voice Start Error:", e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error("Voice Stop Error:", e);
    }
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value) {
      // Check if any recognized phrase contains "go"
      const saidGo = e.value.some(phrase => phrase.toLowerCase().includes('go'));
      if (saidGo) {
        handleNext();
      }
    }
  };

  

  // Load data

  useEffect(() => {
    if (params.id) {
      loadProcedure(params.id as string);
    }

    // Voice Setup
    Voice.onSpeechResults = onSpeechResults;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [params.id]);

  const loadProcedure = async (id: string) => {
    const all = await getProcedures();
    const found = all.find(p => p.id === id);
    if (found) {
      setProcedure(found);
      if (found.steps.length > 0) {
        setTimeLeft(found.steps[0].duration);
      }
    } else {
      Alert.alert("Error", "Procedure not found.");
      router.back();
    }
  };

  // Timer

  useEffect(() => {
    let interval: any;

    if (isRunning && timeLeft > 0) {
      const startTime = Date.now();
      const initialTime = timeLeft;

      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const newTime = Math.max(0, initialTime - elapsed);
        
        setTimeLeft(newTime);

        // Update Animation
        const currentStepTotal = procedure?.steps[currentStepIndex].duration || 1;
        const progress = newTime / currentStepTotal;
        progressAnim.setValue(progress);

        if (newTime <= 0) {
          setIsRunning(false);
          setIsStepFinished(true);
          clearInterval(interval);
          playSound();
          startListening(); // Mic turns on
        }
      }, 50); 
    }

    return () => clearInterval(interval);
  }, [isRunning, currentStepIndex]); 

  // Actions

  const handleStart = () => {
    setIsRunning(true);
  };

  // 
  const handleNext = () => {
    stopListening(); // Stop mic immediately

    if (!procedure) return;

    const nextIndex = currentStepIndex + 1;

    if (nextIndex < procedure.steps.length) {
      // Advance to next step
      setCurrentStepIndex(nextIndex);
      setTimeLeft(procedure.steps[nextIndex].duration);
      setIsStepFinished(false);
      setIsRunning(false);
      progressAnim.setValue(1); // Reset bar

      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true, viewPosition: 0.1 });
    } else {
      Alert.alert("Procedure Complete", "Great job!", [
        { text: "Finish", onPress: () => router.back() }
      ]);
    }
  };

  const handleAbort = () => {
    // We do NOT stop the timer here. It keeps running in background.
    Alert.alert(
      "Abort Run",
      "Are you sure you want to cancel? Progress will be lost.",
      [
        { text: "Keep Going", style: "cancel" },
        { 
          text: "Exit", 
          style: "destructive", 
          onPress: () => {
            stopListening();
            router.back();
          } 
        }
      ]
    );
  };

  // Renderers

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isActive = index === currentStepIndex;
    const isPast = index < currentStepIndex;
    
    // Complete card
    if (isPast) {
      return (
        <View style={[styles.card, styles.cardCompleted]}>
          <View style={styles.cardContent}>
            <Text style={styles.stepIndexCompleted}>Step {index + 1}</Text>
            <Text style={styles.stepNameCompleted}>{item.name}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>
      );
    }

    // Active card
    if (isActive) {
      const widthInterp = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
      });

      return (
        <View style={[styles.card, styles.cardActive]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: widthInterp }]} />
          </View>
          <View style={styles.activeContent}>
            <View>
              <Text style={styles.activeLabel}>CURRENT STEP {index + 1}</Text>
              <Text style={styles.activeName}>{item.name}</Text>
            </View>
            <Text style={styles.bigTimer}>
              {isStepFinished ? "DONE" : formatTime(timeLeft)}
            </Text>
          </View>
        </View>
      );
    }

    // Pending card
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.stepIndex}>Step {index + 1}</Text>
          <Text style={styles.stepName}>{item.name}</Text>
        </View>
        <Text style={styles.stepDuration}>{formatTime(item.duration)}</Text>
      </View>
    );
  };

  if (!procedure) return <View style={styles.container} />;

  // Determine button state
  let buttonLabel = "START";
  let buttonAction = handleStart;
  let buttonColor = COLORS.primary;
  let buttonDisabled = false;

  if (isStepFinished) {
    buttonLabel = isListening ? "LISTENING..." : "GO!"; // Visual cue for listening
    buttonAction = handleNext;
    buttonColor = COLORS.success;
  } else if (isRunning) {
    buttonLabel = "RUNNING...";
    buttonAction = () => {}; // No action
    buttonColor = '#333'; // Grayed out
    buttonDisabled = true;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {procedure.name}
        </Text>
      </View>

      {/* Steps list */}
      <FlatList
        ref={flatListRef}
        data={procedure.steps}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        getItemLayout={(data, index) => (
          { length: 80, offset: 80 * index, index } 
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        
        {/* Abort */}
        <Pressable 
          style={styles.abortButton} 
          onPress={handleAbort}
        >
          <Ionicons name="close-circle-outline" size={28} color={COLORS.error} />
          <Text style={styles.abortText}>EXIT</Text>
        </Pressable>

        {/* Main action button */}
        <Pressable 
          style={[
            styles.mainButton, 
            { backgroundColor: buttonColor, opacity: buttonDisabled ? 0.6 : 1 }
          ]}
          onPress={buttonAction}
          disabled={buttonDisabled}
        >
          {isListening && <Ionicons name="mic" size={24} color="white" style={{marginRight: 10}} />}
          <Text style={styles.mainButtonText}>{buttonLabel}</Text>
          {!isListening && isStepFinished && <Ionicons name="arrow-forward" size={24} color="white" style={{marginLeft: 10}} />}
        </Pressable>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.m,
    paddingBottom: 150, 
  },
  
  // Card styles
  card: {
    height: 70, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: SPACING.s,
    paddingHorizontal: SPACING.m,
    overflow: 'hidden',
  },
  cardContent: { flex: 1 },
  stepIndex: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stepName: { fontSize: 16, color: COLORS.textDim },
  stepDuration: {
    fontSize: 14,
    color: COLORS.textDim,
    fontVariant: ['tabular-nums'], 
  },

  // Completed State
  cardCompleted: {
    opacity: 0.5,
    backgroundColor: '#1a1a1a',
  },
  stepIndexCompleted: {
    fontSize: 10,
    color: COLORS.textDim,
    marginBottom: 2,
  },
  stepNameCompleted: {
    fontSize: 16,
    color: COLORS.textDim,
    textDecorationLine: 'line-through',
  },

  // Active State 
  cardActive: {
    height: 100,
    backgroundColor: '#2A2A2A',
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 0, 
  },
  progressTrack: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#2A2A2A',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
  },
  activeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
  },
  activeLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  activeName: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  bigTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
  },
  abortButton: {
    width: 70,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(207, 102, 121, 0.1)', 
    borderWidth: 1,
    borderColor: 'rgba(207, 102, 121, 0.3)',
  },
  abortText: {
    color: COLORS.error,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mainButton: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...SHADOWS.card,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});