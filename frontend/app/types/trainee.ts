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
    /** Set when the client already has an app account linked (invite redeemed or discovery accepted). */
    user_id?: string;
    email?: string;
    rating?: number;
    rating_count?: number;

    fitness_tests?: FitnessTest[];
    lab_tests?: LabTest[];
    health_questionnaire?: {
        responses: HealthQuestionnaireResponses;
        comments?: string;
        date?: string;
    };
};






export interface FitnessTestWithUI extends FitnessTest {
    id: number;
    icon: string;
    color: string;
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
        category: 'Muscular Endurance', 
        test: 'Push-ups', 
        icon: 'trending-up',
        color: '#8B5CF6'
    }
];

/**
 * Fields sent when creating or editing a client. Only include fields that changed: the server
 * writes exactly what it receives. trainer_id, user_id, rating and timestamps are server-owned.
 * Coach-only fields (notes, active_status, membership_type, start_date, fitness_tests, lab_tests)
 * are ignored when a client edits their own record.
 */
export type TraineeInput = Partial<
    Pick<
        Trainee,
        | 'name'
        | 'phone_number'
        | 'email'
        | 'dob'
        | 'gender'
        | 'profession'
        | 'height'
        | 'start_date'
        | 'membership_type'
        | 'emergency_contact'
        | 'medical_history'
        | 'social_handle'
        | 'goals'
        | 'notes'
        | 'active_status'
        | 'image_url'
        | 'active_supplements'
        | 'fitness_tests'
        | 'lab_tests'
    >
> & {
    health_questionnaire?: { responses: HealthQuestionnaireResponses; comments?: string };
};
