import { StyleSheet, Text, View } from 'react-native';
import { AvailableSlot } from '../api/client';
import { formatTime } from '../utils/date';
import { SelectCard } from './SelectCard';

type TimeSlotCardProps = {
  slot: AvailableSlot;
  selected?: boolean;
  onPress?: () => void;
};

export function TimeSlotCard({ slot, selected, onPress }: TimeSlotCardProps) {
  return (
    <SelectCard
      onPress={onPress}
      right={
        <View style={styles.timeWrap}>
          <Text style={styles.time}>
            {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
          </Text>
        </View>
      }
      selected={selected}
      subtitle={`${formatTime(slot.startAt)} - ${formatTime(slot.endAt)}`}
      title={slot.workerName}
    />
  );
}

const styles = StyleSheet.create({
  timeWrap: {
    display: 'none',
  },
  time: {
    fontWeight: '800',
  },
});
