import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AboutTraineeScreen from '../screens/AboutTraineeScreen';
import DietEntryScreen from './DietListScreen';
import ProgressScreen from '../screens/ProgressScreen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import WorkoutLogListScreen from './WorkoutLogListScreen';

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
                tabBarActiveTintColor: '#6200ee',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen name="AboutTrainee" component={AboutTrainee} />
            <Tab.Screen name="WorkoutLogs" component={WorkoutLogs} />
            <Tab.Screen name="DietEntry" component={DietEntry} />
            <Tab.Screen name="Progress" component={Progress} />
        </Tab.Navigator>
    );
}