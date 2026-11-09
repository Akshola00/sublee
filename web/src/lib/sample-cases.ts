// Fictional cases so judges can try Sublee without entering real health data.
import type { CaseInput } from './schema';

export const SAMPLE_CASES: { name: string; input: CaseInput }[] = [
  {
    name: 'Sore throat & fever',
    input: {
      age: '34', sex: 'female', duration: '3 days',
      concern: 'Fever up to 38.5°C, very sore throat, painful swollen glands in my neck, no cough. Swallowing hurts. Feeling tired.',
      history: 'Generally healthy.', medications: 'Paracetamol as needed', allergies: 'Penicillin (rash as a child)',
      attachmentsText: [],
    },
  },
  {
    name: 'Chest tightness on stairs',
    input: {
      age: '58', sex: 'male', duration: '2 weeks',
      concern: 'Tightness in the centre of my chest when climbing stairs or walking fast in the cold, goes away after resting for a few minutes. No pain at rest.',
      history: 'High blood pressure, ex-smoker (quit 5 years ago, 25 pack-years), father had a heart attack at 61.',
      medications: 'Amlodipine 5mg daily', allergies: 'None',
      attachmentsText: [],
    },
  },
  {
    name: 'Tired, odd blood test',
    input: {
      age: '29', sex: 'female', duration: '2 months',
      concern: 'Exhausted all the time, short of breath on exertion, hair thinning. My GP sent a blood test; I would like to understand it before my appointment.',
      history: 'Heavy periods. Vegetarian.', medications: 'None', allergies: 'None',
      attachmentsText: [{
        name: 'blood-test.txt',
        text: 'Haemoglobin 98 g/L (115-165) LOW\nMCV 72 fL (80-100) LOW\nFerritin 6 ug/L (15-150) LOW\nTSH 2.1 mU/L (0.4-4.0)\nVitamin B12 310 ng/L (190-900)\nWBC 6.2 x10^9/L (4.0-11.0)\nPlatelets 410 x10^9/L (150-400) HIGH',
      }],
    },
  },
];
