import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, FlatList, Alert, StatusBar, Dimensions, Animated 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { Procedure, getProcedures } from '../utils/storage';
import { Audio } from 'expo-av';
import Voice, { SpeechResultsEvent } from '@dev-amirzubair/react-native-voice'; 

const { width } = Dimensions.get('window');

// Defining specific statuses for clearer UI feedback
type VoiceStatus = 'idle' | 'starting' | 'listening' | 'restarting' | 'error';

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
  
  // Voice State
  const [isListening, setIsListening] = useState(false); // General "Mode" flag
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle'); // Granular status

  // Refs
  const indexRef = useRef(0);
  const procedureRef = useRef<Procedure | null>(null);
  const shouldRestartVoice = useRef(false);
  
  // Navigation Guards
  const isExiting = useRef(false); 
  const isMounted = useRef(true);

  // Animation
  const progressAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  // Sync Refs
  useEffect(() => {
    indexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    procedureRef.current = procedure;
  }, [procedure]);

  async function playSound() {
    try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/beep.mp3'));
        await sound.playAsync();
        return new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    await sound.unloadAsync();
                    resolve();
                }
            });
        });
    }
    catch (error) {
        console.log('Error playing sound', error);
        return Promise.resolve();
    }
  }

  const safeGoBack = () => {
    if (isMounted.current && router.canGoBack()) {
        router.back();
    }
  };

  // Voice logic

  const startListening = async () => {
    if (isExiting.current) return;
    try {
      shouldRestartVoice.current = true;
      setIsListening(true);
      setVoiceStatus('starting');
      
      await Voice.stop(); 
      await Voice.start('en-US'); 
    } catch (e) {
      console.log("Voice Start Error:", e);
      setVoiceStatus('error');
    }
  };

  const stopListening = async () => {
    try {
      shouldRestartVoice.current = false;
      setIsListening(false);
      setVoiceStatus('idle');
      await Voice.stop();
    } catch (e) {
      // It it what it is
    }
  };

  const checkPhraseForGo = (value: string[] | undefined) => {
    if (!value || isExiting.current) return;
    const saidGo = value.some(phrase => 
      phrase.toLowerCase().includes('go')
    );
    if (saidGo) {
      handleNext();
    }
  };

  // Speech Started ( Beep has been beeped, now listening )
  const onSpeechStart = () => {
    if (!isExiting.current) {
        setVoiceStatus('listening'); 
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    checkPhraseForGo(e.value);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    checkPhraseForGo(e.value);
  };

  // Speech Ended (Silence or End of Session)
  const onSpeechEnd = () => {
    if (shouldRestartVoice.current && !isExiting.current) {
        setVoiceStatus('restarting'); 
        // Fast restart for normal end
        setTimeout(async () => {
            if (shouldRestartVoice.current && !isExiting.current) {
                try { await Voice.start('en-US'); } catch(e) {}
            }
        }, 300);
    } else {
        setVoiceStatus('idle');
    }
  };

  // Error Handling (Noise, Timeout, etc)
  const onSpeechError = (e: any) => {
    const code = e.error?.code;
    
    // Smart Delay:
    // 6 = Timeout (Silence) -> Fast Retry
    // 7 = No Match (Noise) -> Fast Retry
    // 5 = Busy/Client Error -> Slow Retry ( trying to avoid beep loop)
    const isMinorError = code === '6' || code === '7';
    const delay = isMinorError ? 500 : 1500;

    if (shouldRestartVoice.current && !isExiting.current) {
        setVoiceStatus('restarting'); 
        setTimeout(async () => {
            if (shouldRestartVoice.current && !isExiting.current) {
                try {
                    await Voice.stop(); 
                    await Voice.start('en-US');
                } catch(e) {}
            }
        }, delay); 
    } else {
        setIsListening(false);
        setVoiceStatus('error');
    }
  };

  // Setup
  useEffect(() => {
    isMounted.current = true;

    if (params.id) {
      loadProcedure(params.id as string);
    }

    // Register Listeners
    Voice.onSpeechStart = onSpeechStart; 
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults; 
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;

    return () => {
      isMounted.current = false;
      shouldRestartVoice.current = false;
      try {
        Voice.destroy().then(() => Voice.removeAllListeners());
      } catch (e) {}
    };
  }, [params.id]);

  // Data Loading
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
      safeGoBack();
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: any;

    if (isRunning && timeLeft > 0) {
      const startTime = Date.now();
      const initialTime = timeLeft;

      interval = setInterval(() => {
        if (!isMounted.current) {
            clearInterval(interval);
            return;
        }

        const now = Date.now();
        const elapsed = now - startTime;
        const newTime = Math.max(0, initialTime - elapsed);
        
        setTimeLeft(newTime);

        const currentStepTotal = procedure?.steps[currentStepIndex].duration || 1;
        const progress = newTime / currentStepTotal;
        progressAnim.setValue(progress);

        if (newTime <= 0) {
          setIsRunning(false);
          setIsStepFinished(true);
          clearInterval(interval);
          
          playSound().then(() => {
              if (!isMounted.current || isExiting.current) return;

              if (procedure && currentStepIndex >= procedure.steps.length - 1) {
                 isExiting.current = true;
                 Alert.alert(
                     "Procedure Concluded", 
                     `Procedure '${procedure.name}' has finished. Returning to menu.`, 
                     [{ text: "OK", onPress: safeGoBack }]
                 );
              } else {
                 startListening(); 
              }
          });
        }
      }, 50); 
    }

    return () => clearInterval(interval);
  }, [isRunning, currentStepIndex]); 

  // Actions
  const handleStart = () => {
    setIsRunning(true);
  };

  const handleNext = () => {
    if (isExiting.current) return;

    stopListening(); 

    const currentProc = procedureRef.current;
    if (!currentProc) return;

    const currentIndex = indexRef.current; 
    const nextIndex = currentIndex + 1;

    if (nextIndex < currentProc.steps.length) {
      setCurrentStepIndex(nextIndex);
      setTimeLeft(currentProc.steps[nextIndex].duration);
      setIsStepFinished(false);
      
      setIsRunning(true); 
      progressAnim.setValue(1); 

      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true, viewPosition: 0.1 });
    } else {
      isExiting.current = true;
      Alert.alert(
          "Procedure Concluded", 
          `Procedure '${currentProc.name}' has finished. Returning to menu.`, 
          [{ text: "OK", onPress: safeGoBack }]
      );
    }
  };

  const handleAbort = () => {
    Alert.alert(
      "Confirm Exit",
      "Are you sure you want to stop the current procedure? All progress will be lost.",
      [
        { text: "Continue Procedure", style: "cancel" },
        { 
          text: "Exit", 
          style: "destructive", 
          onPress: () => {
            isExiting.current = true;
            stopListening();
            safeGoBack();
          } 
        }
      ]
    );
  };

  // Helper to get UI Text & Color based on Status
  const getStatusUI = () => {
      if (!isListening) return { text: "Say 'GO!' or press to continue", color: COLORS.textDim };
      
      switch (voiceStatus) {
          case 'listening':
              return { text: "Listening... Say 'GO!'", color: COLORS.success };
          case 'starting':
              return { text: "Initializing...", color: '#FFA500' }; 
          case 'restarting':
              return { text: "Reconnecting...", color: COLORS.textDim };
          case 'error':
              return { text: "Retrying...", color: COLORS.error };
          default:
              return { text: "Waiting...", color: COLORS.textDim };
      }
  };

  const statusUI = getStatusUI();

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
        <View style={[
            styles.card, 
            styles.cardCompleted, 
            { elevation: 0, shadowOpacity: 0 } 
        ]}>
          <View style={styles.cardContent}>
            <Text style={styles.stepIndexCompleted}>Step {index + 1}</Text>
            <Text style={styles.stepNameCompleted}>
                {item.name || "Untitled Step"} 
            </Text>
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

  // Button Logic
  let buttonLabel = "START";
  let buttonAction = handleStart;
  let buttonColor = COLORS.primary;
  let buttonDisabled = false;

  if (isStepFinished) {
    buttonLabel = "CONTINUE"; 
    buttonAction = handleNext;
    buttonColor = COLORS.success;
  } else if (isRunning) {
    buttonLabel = "RUNNING...";
    buttonAction = () => {}; 
    buttonColor = '#333'; 
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
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        
        <Pressable 
          style={styles.abortButton} 
          onPress={handleAbort}
        >
          <Ionicons name="close-circle-outline" size={28} color={COLORS.error} />
          <Text style={styles.abortText}>EXIT</Text>
        </Pressable>

        <View style={{ flex: 1, marginLeft: SPACING.m }}>
            
            {/* Voice prompt UI */}
            {isStepFinished && (
                <View style={styles.voicePromptContainer}>
                    <Ionicons name="mic" size={16} color={statusUI.color} />
                    <Text style={[styles.voicePromptText, { color: statusUI.color }]}>
                        {statusUI.text}
                    </Text>
                </View>
            )}

            <Pressable 
            style={[
                styles.mainButton, 
                { backgroundColor: buttonColor, opacity: buttonDisabled ? 0.6 : 1 }
            ]}
            onPress={buttonAction}
            disabled={buttonDisabled}
            >
            <Text style={styles.mainButtonText}>{buttonLabel}</Text>
            {isStepFinished && <Ionicons name="arrow-forward" size={24} color="white" style={{marginLeft: 10}} />}
            </Pressable>
        </View>
        
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

  cardCompleted: {
    backgroundColor: '#1a1a1a', 
    borderWidth: 0, 
  },
  stepIndexCompleted: {
    fontSize: 10,
    color: '#666', 
    marginBottom: 2,
  },
  stepNameCompleted: {
    fontSize: 16,
    color: '#888', 
    textDecorationLine: 'none',
  },

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
    alignItems: 'flex-end', 
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
    width: '100%',
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
  voicePromptContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  voicePromptText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    textTransform: 'uppercase',
  }
});