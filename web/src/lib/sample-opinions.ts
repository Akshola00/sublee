// Answers written in advance, shown ONLY when the enclave can't answer (e.g. Sublee's AI credits ran out),
// and always under a banner saying so. They are not generated, not about the user's case, and never saved to history.
import type { Opinion } from './schema';
import { SAMPLE_CASES } from './sample-cases';

const GENERIC: Opinion = {
  summary:
    'This is an example of the format a Sublee specialist answers in. A real answer would be written for your case, inside the enclave.',
  urgency: 'routine',
  urgency_reason: 'Example only.',
  likely_explanations: [
    { condition: 'Most likely explanation', likelihood: 'high', reasoning: 'What in the case points towards it, and what would argue against it.' },
    { condition: 'Something to rule out', likelihood: 'low', reasoning: 'Less likely, but worth excluding because it changes what to do next.' },
  ],
  red_flags: ['Symptoms that would mean getting help the same day are listed here.'],
  questions_for_your_doctor: ['Questions worth taking to your appointment are listed here.'],
  suggested_tests: ['Tests that would settle the question are listed here.'],
  self_care: [],
  what_this_does_not_cover: 'An example answer covers nothing about your situation.',
};

export const SAMPLE_OPINIONS: Record<string, Opinion> = {
  'Sore throat & fever': {
    summary:
      'Fever, very sore throat, tender swollen neck glands and no cough together fit a bacterial throat infection (such as strep) better than a cold. A quick throat swab would settle it, and it matters because the usual antibiotic is penicillin, which you react to.',
    urgency: 'soon',
    urgency_reason: 'Worth seeing a doctor in the next day or two so a swab can be taken and a penicillin-free option chosen if needed.',
    likely_explanations: [
      { condition: 'Strep throat (bacterial tonsillitis)', likelihood: 'high', reasoning: 'Fever, swollen tender glands and no cough are the classic pattern (a high Centor score).' },
      { condition: 'Viral sore throat', likelihood: 'medium', reasoning: 'Still common with these symptoms; a negative swab would point here.' },
      { condition: 'Glandular fever (mono)', likelihood: 'low', reasoning: 'Possible at 34 with tiredness and big glands; a blood test checks it if things drag on.' },
    ],
    red_flags: [
      'You can’t swallow your own saliva, or you start drooling',
      'Your voice becomes muffled, or one side of the throat swells much more than the other',
      'Any difficulty breathing',
    ],
    questions_for_your_doctor: [
      'Can we do a rapid strep test or throat swab?',
      'If I need antibiotics, which one is safe with my penicillin allergy?',
    ],
    suggested_tests: ['Rapid strep antigen test or throat culture', 'Monospot / EBV test if not better in a week'],
    self_care: ['Regular paracetamol, plenty of fluids', 'Warm salt-water gargles'],
    what_this_does_not_cover: 'No one has examined your throat or neck.',
  },
  'Chest tightness on stairs': {
    summary:
      'Chest tightness that comes on with exertion or cold and eases within minutes of rest is the typical pattern of stable angina, and your blood pressure, smoking history and family history all raise the risk. It needs prompt assessment by a doctor, but at the moment it does not sound like an emergency.',
    urgency: 'urgent',
    urgency_reason: 'New exertional chest symptoms should be assessed within days, not weeks.',
    likely_explanations: [
      { condition: 'Stable angina (narrowed heart arteries)', likelihood: 'high', reasoning: 'Classic triggers and relief with rest, plus several risk factors.' },
      { condition: 'Exercise-induced asthma or reflux', likelihood: 'low', reasoning: 'Can mimic it, but would not explain the full pattern as well.' },
    ],
    red_flags: [
      'Tightness at rest, or lasting more than 15 minutes: call an ambulance',
      'Pain spreading to the arm, jaw or back, with sweating or breathlessness',
      'Fainting',
    ],
    questions_for_your_doctor: [
      'Should I be referred to a rapid-access chest pain clinic?',
      'Should I carry a GTN spray in the meantime?',
      'Is my blood pressure and cholesterol treatment enough?',
    ],
    suggested_tests: ['ECG', 'Blood tests: cholesterol, HbA1c, troponin if symptoms change', 'CT coronary angiogram or stress test'],
    self_care: ['Avoid heavy exertion until you’ve been assessed'],
    what_this_does_not_cover: 'No examination, ECG or blood tests have been seen.',
  },
  'Tired, odd blood test': {
    summary:
      'Your blood test shows iron-deficiency anaemia: low haemoglobin, small red cells (low MCV) and very low iron stores (ferritin 6). Heavy periods and a vegetarian diet explain this well, and it also explains the tiredness, breathlessness and hair thinning. The slightly high platelets are common with iron deficiency.',
    urgency: 'soon',
    urgency_reason: 'Not dangerous today, but it should be treated, and the cause of the heavy periods looked at.',
    likely_explanations: [
      { condition: 'Iron-deficiency anaemia from heavy periods', likelihood: 'high', reasoning: 'Every iron marker fits, and blood loss is the commonest cause at 29.' },
      { condition: 'Low dietary iron', likelihood: 'medium', reasoning: 'Vegetarian diets often contribute alongside blood loss.' },
      { condition: 'Poor absorption (e.g. coeliac disease)', likelihood: 'low', reasoning: 'Worth a simple blood test, especially if iron tablets don’t work.' },
    ],
    red_flags: ['Chest pain, fainting or a racing heart at rest', 'Black or bloody stools'],
    questions_for_your_doctor: [
      'What iron dose should I take, and when will you recheck my blood?',
      'Can we look into why my periods are so heavy?',
      'Should I be tested for coeliac disease?',
    ],
    suggested_tests: ['Repeat full blood count and ferritin after 4–8 weeks of iron', 'Coeliac serology (tTG-IgA)'],
    self_care: ['Take iron with vitamin C, away from tea and coffee', 'Iron-rich foods: lentils, beans, tofu, leafy greens'],
    what_this_does_not_cover: 'Only the results shown were reviewed.',
  },
};

const SAMPLE_CONCERNS: Record<string, string> = Object.fromEntries(SAMPLE_CASES.map((c) => [c.name, c.input.concern.trim()]));

export function sampleOpinionFor(concern: string): { name: string | null; opinion: Opinion } {
  for (const [name, o] of Object.entries(SAMPLE_OPINIONS)) {
    // Match the sample case the user loaded (its concern text is fixed).
    if (concern.trim() && SAMPLE_CONCERNS[name] === concern.trim()) return { name, opinion: o };
  }
  return { name: null, opinion: GENERIC };
}
