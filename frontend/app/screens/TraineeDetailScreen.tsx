import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AboutTraineeScreen from '../screens/AboutTraineeScreen';
import DietEntryScreen from './DietListScreen';
import ProgressScreen from '../screens/ProgressScreen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import WorkoutLogListScreen from './WorkoutLogListScreen';
import { Colors } from '@/constants/theme';

const Tab = createBottomTabNavigator();

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeDetail'>;

// Higher-Order Component to inject props
const withTrainee = (Component: React.ComponentType<any>, trainee: any) => {
    return (props: any) => <Component {...props} trainee={trainee} />;
};

export default function TraineeDetailScreen({ route }: Props) {
    const { trainee } = route.params;

    // Memoized wrapped components
    const AboutTrainee = React.useMemo(() => withTrainee(AboutTraineeScreen, trainee), [trainee]);
    const WorkoutLogs = React.useMemo(() => withTrainee(WorkoutLogListScreen, trainee), [trainee]);
    const DietEntry = React.useMemo(() => withTrainee(DietEntryScreen, trainee), [trainee]);
    const Progress = React.useMemo(() => withTrainee(ProgressScreen, trainee), [trainee]);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName = '';
                    if (route.name === 'AboutTrainee') iconName = 'account';
                    else if (route.name === 'WorkoutLogs') iconName = 'home';
                    else if (route.name === 'DietEntry') iconName = 'food';
                    else if (route.name === 'Progress') iconName = 'chart-line';
                    return <Icon name={iconName} color={color} size={size} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="AboutTrainee"
                component={AboutTrainee}
                options={{ title: 'About' }}
            />
            <Tab.Screen
                name="WorkoutLogs"
                component={WorkoutLogs}
                options={{ title: 'Workouts' }}
            />
            <Tab.Screen
                name="DietEntry"
                component={DietEntry}
                options={{ title: 'Diet' }}
            />
            <Tab.Screen
                name="Progress"
                component={Progress}
                options={{ title: 'Progress' }}
            />
        </Tab.Navigator>
    );
}