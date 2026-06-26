import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  AuthUser,
  AvailableSlot,
  SalonSettings,
  Service,
  Worker,
} from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { SelectCard } from '../components/SelectCard';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { TimeSlotCard } from '../components/TimeSlotCard';
import { theme } from '../theme/theme';
import { formatDateInput } from '../utils/date';
import { errorMessage } from '../utils/formatting';

type AddAppointmentScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type BookingForm = {
  serviceId: string;
  workerId: string;
  date: string;
  customerName: string;
  customerPhone: string;
};

const initialForm: BookingForm = {
  serviceId: '',
  workerId: '',
  date: formatDateInput(new Date()),
  customerName: '',
  customerPhone: '',
};

export function AddAppointmentScreen({
  api,
  salon,
  user,
}: AddAppointmentScreenProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [findingSlots, setFindingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  async function loadOptions() {
    setError('');

    try {
      const [servicesResponse, workersResponse] = await Promise.all([
        api.services(),
        api.workers(),
      ]);
      setServices(servicesResponse.filter((service) => service.isActive));
      setWorkers(workersResponse.filter((worker) => worker.isActive));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOptions();
    }, [api]),
  );

  function updateForm(patch: Partial<BookingForm>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setSlots([]);
    setSelectedSlot(null);
    setError('');
  }

  async function findSlots() {
    if (!form.serviceId) {
      setError('Select a service first');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Date must use YYYY-MM-DD format');
      return;
    }

    setFindingSlots(true);
    setError('');

    try {
      const response = await api.availableSlots({
        serviceId: form.serviceId,
        workerId: form.workerId || undefined,
        date: form.date,
        limit: 8,
      });
      setSlots(response.slots);
      setStep(4);
    } catch (slotError) {
      setError(errorMessage(slotError));
    } finally {
      setFindingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot) {
      setError('Choose an available slot');
      return;
    }

    if (!form.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (form.customerPhone.trim().length < 3) {
      setError('Customer phone is required');
      return;
    }

    setBooking(true);
    setError('');

    try {
      await api.bookAppointment({
        workerId: selectedSlot.workerId,
        serviceId: form.serviceId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        startAt: selectedSlot.startAt,
        channel: 'MANUAL',
      });
      setStep(6);
    } catch (bookingError) {
      setError(errorMessage(bookingError));
    } finally {
      setBooking(false);
    }
  }

  function resetFlow() {
    setForm(initialForm);
    setSlots([]);
    setSelectedSlot(null);
    setError('');
    setStep(1);
  }

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>New Appointment</Text>
        <Text style={styles.subtitle}>Step {step} of 6</Text>
      </View>

      {loading ? (
        <LoadingState message="Loading booking options..." />
      ) : error ? (
        <ErrorState message={error} onAction={() => setError('')} />
      ) : (
        <Card>
          {step === 1 ? (
            <StepServices
              onSelect={(serviceId) => {
                updateForm({ serviceId });
                setStep(2);
              }}
              selectedServiceId={form.serviceId}
              services={services}
            />
          ) : null}
          {step === 2 ? (
            <StepWorkers
              onBack={() => setStep(1)}
              onSelect={(workerId) => {
                updateForm({ workerId });
                setStep(3);
              }}
              selectedWorkerId={form.workerId}
              workers={workers}
            />
          ) : null}
          {step === 3 ? (
            <StepDate
              date={form.date}
              findingSlots={findingSlots}
              onBack={() => setStep(2)}
              onChangeDate={(date) => updateForm({ date })}
              onFindSlots={findSlots}
            />
          ) : null}
          {step === 4 ? (
            <StepSlots
              onBack={() => setStep(3)}
              onSelect={(slot) => {
                setSelectedSlot(slot);
                setStep(5);
              }}
              selectedSlot={selectedSlot}
              slots={slots}
            />
          ) : null}
          {step === 5 ? (
            <StepCustomer
              booking={booking}
              customerName={form.customerName}
              customerPhone={form.customerPhone}
              onBack={() => setStep(4)}
              onChange={(patch) => setForm({ ...form, ...patch })}
              onConfirm={confirmBooking}
            />
          ) : null}
          {step === 6 ? <StepSuccess onNewBooking={resetFlow} /> : null}
        </Card>
      )}
    </AppScreen>
  );
}

function StepServices({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelect: (serviceId: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Select service</Text>
      {services.length === 0 ? (
        <EmptyState message="Add services in Settings before booking." />
      ) : (
        services.map((service) => (
          <SelectCard
            key={service.id}
            onPress={() => onSelect(service.id)}
            selected={selectedServiceId === service.id}
            subtitle={`${service.durationMinutes} min`}
            title={service.name}
          />
        ))
      )}
    </View>
  );
}

function StepWorkers({
  workers,
  selectedWorkerId,
  onSelect,
  onBack,
}: {
  workers: Worker[];
  selectedWorkerId: string;
  onSelect: (workerId: string) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Select worker</Text>
      <SelectCard
        onPress={() => onSelect('')}
        selected={selectedWorkerId === ''}
        subtitle="Booking Engine chooses earliest slot"
        title="Any available"
      />
      {workers.map((worker) => (
        <SelectCard
          key={worker.id}
          onPress={() => onSelect(worker.id)}
          selected={selectedWorkerId === worker.id}
          title={worker.name}
        />
      ))}
      <Button label="Back" onPress={onBack} variant="secondary" />
    </View>
  );
}

function StepDate({
  date,
  findingSlots,
  onChangeDate,
  onFindSlots,
  onBack,
}: {
  date: string;
  findingSlots: boolean;
  onChangeDate: (date: string) => void;
  onFindSlots: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Choose date</Text>
      <FormInput
        label="Date"
        onChangeText={onChangeDate}
        placeholder="2026-06-26"
        value={date}
      />
      <Button
        disabled={findingSlots}
        label={findingSlots ? 'Finding slots...' : 'Show available slots'}
        onPress={onFindSlots}
      />
      <Button label="Back" onPress={onBack} variant="secondary" />
    </View>
  );
}

function StepSlots({
  slots,
  selectedSlot,
  onSelect,
  onBack,
}: {
  slots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  onSelect: (slot: AvailableSlot) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Pick a slot</Text>
      {slots.length === 0 ? (
        <EmptyState message="No available slots for this choice." />
      ) : (
        slots.map((slot) => (
          <TimeSlotCard
            key={`${slot.workerId}-${slot.startAt}`}
            onPress={() => onSelect(slot)}
            selected={
              selectedSlot?.workerId === slot.workerId &&
              selectedSlot?.startAt === slot.startAt
            }
            slot={slot}
          />
        ))
      )}
      <Button label="Back" onPress={onBack} variant="secondary" />
    </View>
  );
}

function StepCustomer({
  customerName,
  customerPhone,
  booking,
  onChange,
  onConfirm,
  onBack,
}: {
  customerName: string;
  customerPhone: string;
  booking: boolean;
  onChange: (patch: Partial<BookingForm>) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Customer details</Text>
      <FormInput
        label="Customer name"
        onChangeText={(value) => onChange({ customerName: value })}
        placeholder="Marko Petrovic"
        value={customerName}
      />
      <FormInput
        label="Customer phone"
        onChangeText={(value) => onChange({ customerPhone: value })}
        placeholder="+381641234567"
        value={customerPhone}
      />
      <Button
        disabled={booking}
        label={booking ? 'Booking...' : 'Confirm booking'}
        onPress={onConfirm}
      />
      <Button label="Back" onPress={onBack} variant="secondary" />
    </View>
  );
}

function StepSuccess({ onNewBooking }: { onNewBooking: () => void }) {
  return (
    <View style={styles.success}>
      <CheckCircle2 color={theme.colors.success} size={42} strokeWidth={2.4} />
      <Text style={styles.stepTitle}>Appointment booked</Text>
      <Text style={styles.subtitle}>The customer is now on the calendar.</Text>
      <Button label="Book another" onPress={onNewBooking} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: 4,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.screenTitle,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  step: {
    gap: theme.spacing[3],
  },
  stepTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionTitle,
    fontWeight: '900',
  },
  success: {
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[6],
  },
});
