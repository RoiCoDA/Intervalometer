import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.title}>
      <Text style={styles.title}>Procedure Timer</Text>
      <View style={styles.buttonContainer}>
        <Pressable style={styles.button} onPress={() => router.push('/create-procedure')}>
          <Text style={styles.buttonText}>Create New Procedure</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push('/run-procedure')}>
          <Text style={styles.buttonText}>Run Procedure</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:
  {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title:
  {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: 'bold',
  },
  buttonContainer:
  {
    width: '80%',
    gap: 20,
  },
  button: 
  {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText:
  {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})