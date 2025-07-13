//trainee.ts

export type FitnessTest = {
    date: string;
    category: string;
    test: string;
    result1: string;
    result2: string;
};

export type LabTest = {
    date: string;
    category: string;
    test: string;
    value: string;
};

export type HealthQuestionnaireResponses = {
    heartProblems: boolean;
    bloodPressure: boolean;
    chronicIllness: boolean;
    physicalDifficulty: boolean;
    physicianAdvice: boolean;
    recentSurgery: boolean;
    pregnancy: boolean;
    breathingDifficulty: boolean;
    muscleInjury: boolean;
    diabetes: boolean;
    smoking: boolean;
    obesity: boolean;
    cholesterol: boolean;
    familyHeartProblems: boolean;
    hernia: boolean;
    frequentFalls: boolean;
};

export const questionMapping = {
    heartProblems: "History of heart problems, chest pain, or stroke",
    bloodPressure: "Increased blood pressure",
    chronicIllness: "Any chronic illness or condition",
    physicalDifficulty: "Difficulty in physical exercise",
    physicianAdvice: "Advice from physician not to exercise",
    recentSurgery: "Recent surgery (last 12 months)",
    pregnancy: "Pregnancy (now or within last 3 months)",
    breathingDifficulty: "History of breathing difficulty or lung problems",
    muscleInjury: "Muscle, joint, or back disorder, or any previous injury",
    diabetes: "Diabetes or thyroid condition",
    smoking: "Cigarette smoking habit",
    obesity: "Obesity (more than 20% over ideal body weight)",
    cholesterol: "Increased blood cholesterol",
    familyHeartProblems: "History of heart problems in immediate family",
    hernia: "Hernia or any condition that may be aggravated by lifting weights",
    frequentFalls: "Do you have frequent falls / lose consciousness / balance",
};

export type Trainee = {
    id: string;
    name: string;
    phone_number: string;
    dob: string;
    gender: string;
    profession?: string;
    height: number;
    start_date?: string;
    membership_type?: string;
    emergency_contact?: string;
    medical_history?: string;
    goals?: string;
    notes?: string;
    active_status: boolean;
    social_handle?: string;
    image_url?: string;
    active_supplements?: string;

    fitness_tests?: FitnessTest[];
    lab_tests?: LabTest[];
    health_questionnaire?: {
        responses: HealthQuestionnaireResponses;
        comments?: string;
        date: string;
    };
};






export interface FitnessTestWithUI extends FitnessTest {
    id: number;
    icon: string;
    color: string;
}

export interface LabTestWithUI extends LabTest {
    id: number;
    unit: string;
    normalRange: string;
    icon: string;
    color: string;
}

export interface TestRecord {
    date: string;
    fitnessTests: FitnessTest[];
    labTests: LabTest[];
}

export interface CategoryGroup {
    [key: string]: FitnessTestWithUI[];
}

export interface LabCategoryGroup {
    [key: string]: LabTestWithUI[];
}

export const fitnessTestTemplates: Omit<FitnessTestWithUI, 'date' | 'result1' | 'result2'>[] = [
    { 
        id: 1, 
        category: 'Aerobic Endurance', 
        test: 'Rockport Test', 
        icon: 'directions-run',
        color: '#3B82F6'
    },
    { 
        id: 2, 
        category: 'Muscular Strength', 
        test: '1 Rep Max (Upper)', 
        icon: 'fitness-center',
        color: '#EF4444'
    },
    { 
        id: 3, 
        category: 'Muscular Strength', 
        test: '1 Rep Max (Lower)', 
        icon: 'fitness-center',
        color: '#EF4444'
    },
    { 
        id: 4, 
        category: 'Muscular Endurance', 
        test: 'Ab Crunches/min', 
        icon: 'timer',
        color: '#F97316'
    },
    { 
        id: 5, 
        category: 'Muscular Endurance', 
        test: 'Free Squats/min', 
        icon: 'timer',
        color: '#F97316'
    },
    { 
        id: 6, 
        category: 'Flexibility', 
        test: 'Sit & Reach', 
        icon: 'accessibility',
        color: '#10B981'
    },
    { 
        id: 7, 
        category: 'Flexibility', 
        test: 'Shoulder Mobility', 
        icon: 'accessibility',
        color: '#10B981'
    },
    { 
        id: 8, 
        category: 'Body Composition', 
        test: 'Push-ups', 
        icon: 'trending-up',
        color: '#8B5CF6'
    }
];

    
export const labTestTemplates: Omit<LabTestWithUI, 'date' | 'value'>[] = [
    // Complete Blood Count (CBC) - Essential
    { 
        id: 1, 
        category: 'Complete Blood Count (CBC)', 
        test: 'Hemoglobin', 
        unit: 'g/dL',
        normalRange: '12-16',
        icon: 'opacity',
        color: '#EA580C'
    },
    { 
        id: 2, 
        category: 'Complete Blood Count (CBC)', 
        test: 'White Blood Cells', 
        unit: '/μL',
        normalRange: '4000-11000',
        icon: 'opacity',
        color: '#EA580C'
    },
    
    // Lipid Profile - Heart Health
    { 
        id: 3, 
        category: 'Lipid Profile', 
        test: 'Total Cholesterol', 
        unit: 'mg/dL',
        normalRange: '<200',
        icon: 'favorite',
        color: '#7C3AED'
    },
    { 
        id: 4, 
        category: 'Lipid Profile', 
        test: 'HDL Cholesterol', 
        unit: 'mg/dL',
        normalRange: '>40',
        icon: 'favorite',
        color: '#7C3AED'
    },
    { 
        id: 5, 
        category: 'Lipid Profile', 
        test: 'LDL Cholesterol', 
        unit: 'mg/dL',
        normalRange: '<100',
        icon: 'favorite',
        color: '#7C3AED'
    },
    
    // Kidney Function - Essential
    { 
        id: 6, 
        category: 'Kidney Function Test', 
        test: 'Creatinine', 
        unit: 'mg/dL',
        normalRange: '0.6-1.2',
        icon: 'healing',
        color: '#DC2626'
    },
    
    // Liver Function - Essential
    { 
        id: 7, 
        category: 'Liver Function Test', 
        test: 'ALT (SGPT)', 
        unit: 'U/L',
        normalRange: '7-56',
        icon: 'local-hospital',
        color: '#059669'
    },
    
    // Metabolic - Essential
    { 
        id: 8, 
        category: 'Metabolic Panel', 
        test: 'Fasting Glucose', 
        unit: 'mg/dL',
        normalRange: '70-100',
        icon: 'psychology',
        color: '#0891B2'
    },
    { 
        id: 9, 
        category: 'Metabolic Panel', 
        test: 'HbA1c', 
        unit: '%',
        normalRange: '<5.7',
        icon: 'psychology',
        color: '#0891B2'
    },
    
    // Vitamins - Most Important
    { 
        id: 10, 
        category: 'Vitamins', 
        test: 'Vitamin D', 
        unit: 'ng/mL',
        normalRange: '30-100',
        icon: 'wb-sunny',
        color: '#CA8A04'
    },
    { 
        id: 11, 
        category: 'Vitamins', 
        test: 'Vitamin B12', 
        unit: 'pg/mL',
        normalRange: '200-900',
        icon: 'wb-sunny',
        color: '#CA8A04'
    }
];
