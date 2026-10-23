import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AttendanceSection } from '@/components/AttendanceSection';
import { FeesSection } from '@/components/FeesSection';
import { OverviewSection } from '@/components/OverviewSection';
import { SectionTabs, type SectionOption } from '@/components/SectionTabs';
import { Colors } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { TraineeRecordProvider } from '../contexts/TraineeRecordContext';
import type { ClientSection, RootStackParamList } from '../types/navigation';
import AboutTraineeScreen from './AboutTraineeScreen';
import DietListScreen from './DietListScreen';
import ProgressScreen from './ProgressScreen';
import WorkoutLogListScreen from './WorkoutLogListScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'TraineeDetail'>;

const ALL_SECTIONS: SectionOption<ClientSection>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'workouts', label: 'Workouts' },
  { value: 'diet', label: 'Diet' },
  { value: 'weight', label: 'Weight' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'fees', label: 'Fees' },
  { value: 'profile', label: 'Profile' },
];

/**
 * One client record: a section switcher over the client's workouts, diet, weight, attendance,
 * fees and profile. Used by the trainer for a client and by a client for themselves (clients do
 * not get the trainer-only Overview). Sections read the record through TraineeRecordContext.
 */
export default function ClientRecordScreen({ route }: Props): React.JSX.Element {
  const { trainee, section: initial } = route.params;
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const sections = useMemo(
    () => (isTrainer ? ALL_SECTIONS : ALL_SECTIONS.filter((s) => s.value !== 'overview')),
    [isTrainer]
  );
  const [section, setSection] = useState<ClientSection>(
    initial && sections.some((s) => s.value === initial) ? initial : sections[0].value
  );

  return (
    <TraineeRecordProvider record={{ id: trainee.id, name: trainee.name }}>
      <View style={styles.root}>
        <SectionTabs options={sections} value={section} onChange={setSection} />
        <View style={styles.body}>
          {section === 'overview' ? <OverviewSection onOpenSection={setSection} /> : null}
          {section === 'workouts' ? <WorkoutLogListScreen /> : null}
          {section === 'diet' ? <DietListScreen /> : null}
          {section === 'weight' ? <ProgressScreen /> : null}
          {section === 'attendance' ? <AttendanceSection /> : null}
          {section === 'fees' ? <FeesSection /> : null}
          {section === 'profile' ? <AboutTraineeScreen /> : null}
        </View>
      </View>
    </TraineeRecordProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
