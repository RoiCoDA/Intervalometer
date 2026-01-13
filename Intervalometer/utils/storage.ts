// AsyncStorage setup

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProcedureStep {
    id: string;
    name: string;
    description?: string;
    duration: number; // milliseconds
}

export interface Procedure {
    id: string;
    name: string;
    description?: string;
    steps: ProcedureStep[]; // Array of steps
    createdAt: number; // Timestamp
}

const STORAGE_KEY = "@procedures_v1" // Not secure, app identifier

// Helpers


// Procedure getter - return procedures
export const getProcedures = async (): Promise<Procedure[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    }
    catch (e)
    {
        console.error("Read Error: ", e);
        return []
    }
};


// Saves a new procedure - return bool for success/failure
export const saveProcedure = async (newProcedure: Procedure ) => {
    try {
        const existing = await getProcedures();
        const updated = [newProcedure, ...existing];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
    }
    catch (e)
    {
        console.error("Save Error: ", e);
        return false;
    }
}

// generated IDs
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);