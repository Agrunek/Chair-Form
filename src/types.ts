export type ChairControl = {
  label: string
  known: boolean
  used: boolean
}

export const sensationBodyAreas = [
  'Legs',
  'Knees',
  'Feet',
  'Lower back',
  'Shoulders or neck',
  'Arms or wrists',
]

export type QuestionnaireAnswers = {
  adjustments: string[]
  adjustmentOther: string
  controls: ChairControl[]
  sensationRatings: Record<string, string>
  sensationsDetails: string
  sharedWorkspace: string
  sharedSetup: string
  sharedSkip: string
  exerciseActivity: string
  medicalConditions: string
  medicalDetails: string
  videoLink: string
  additionalComments: string
}

export const initialAnswers: QuestionnaireAnswers = {
  adjustments: [],
  adjustmentOther: '',
  controls: [
    { label: 'Seat height adjustment', known: false, used: false },
    { label: 'Tilt lock or recline adjustment', known: false, used: false },
    { label: 'Armrest adjustment (height, depth, or angle)', known: false, used: false },
    { label: 'Seat depth adjustment (sliding the seat forward or backward)', known: false, used: false },
    { label: 'Back support adjustment (lower-back curve or cushion)', known: false, used: false },
    { label: 'Unsure / don’t know', known: false, used: false },
  ],
  sensationRatings: Object.fromEntries(sensationBodyAreas.map((area) => [area, ''])),
  sensationsDetails: '',
  sharedWorkspace: '',
  sharedSetup: '',
  sharedSkip: '',
  exerciseActivity: '',
  medicalConditions: '',
  medicalDetails: '',
  videoLink: '',
  additionalComments: '',
}
