import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  Appointment,
  AvailableSlot,
  Service,
  Worker,
} from '../api/client';
import {
  DashboardButton,
  DashboardCard,
  DashboardField,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';

type TodayScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

type BookingForm = {
  serviceId: string;
  workerId: string;
  date: string;
  customerName: string;
  customerPhone: string;
};

export function TodayScreen({ api, onBack }: TodayScreenProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [form, setForm] = useState<BookingForm>({
    serviceId: '',
    workerId: '',
    date: formatDateInput(new Date()),
    customerName: '',
    customerPhone: '',
  });
  const [loading, setLoading] = useState(true);
  const [findingSlots, setFindingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadData(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
    }

    setError('');

    try {
      const [appointmentsResponse, servicesResponse, workersResponse] =
        await Promise.all([
          api.appointments({ date: form.date }),
          api.services(),
          api.workers(),
        ]);

      setAppointments(appointmentsResponse);
      setServices(servicesResponse);
      setWorkers(workersResponse);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [api, form.date]);

  function updateForm(patch: Partial<BookingForm>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setSlots([]);
    setSelectedSlot(null);
    setError('');
    setNotice('');
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
    setNotice('');
    setSelectedSlot(null);

    try {
      const response = await api.availableSlots({
        serviceId: form.serviceId,
        workerId: form.workerId || undefined,
        date: form.date,
        limit: 6,
      });

      setSlots(response.slots);

      if (response.slots.length === 0) {
        setNotice('No available slots for this choice');
      }
    } catch (slotsError) {
      setError(errorMessage(slotsError));
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
    setNotice('');

    try {
      await api.bookAppointment({
        workerId: selectedSlot.workerId,
        serviceId: form.serviceId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        startAt: selectedSlot.startAt,
        channel: 'MANUAL',
      });

      setForm({
        serviceId: '',
        workerId: '',
        date: form.date,
        customerName: '',
        customerPhone: '',
      });
      setSlots([]);
      setSelectedSlot(null);
      setNotice('Appointment booked');
      await loadData(false);
    } catch (bookingError) {
      setError(errorMessage(bookingError));
    } finally {
      setBooking(false);
    }
  }

  async function cancelAppointment(appointment: Appointment) {
    setCancelingId(appointment.id);
    setError('');
    setNotice('');

    try {
      await api.cancelBooking({ appointmentId: appointment.id });
      setNotice('Appointment cancelled');
      await loadData(false);
    } catch (cancelError) {
      setError(errorMessage(cancelError));
    } finally {
      setCancelingId(null);
    }
  }

  const activeServices = services.filter((service) => service.isActive);
  const activeWorkers = workers.filter((worker) => worker.isActive);
  const bookedAppointments = appointments.filter(
    (appointment) => appointment.status === 'BOOKED',
  );

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle="Book and manage today's appointments."
      title="Today"
    >
      <DashboardCard>
        <Text style={styles.sectionTitle}>New Appointment</Text>

        <DashboardField
          label="Date"
          onChangeText={(date) => updateForm({ date })}
          placeholder="2026-06-26"
          value={form.date}
        />

        <Text style={styles.label}>Service</Text>
        <View style={styles.choiceRow}>
          {activeServices.length === 0 ? (
            <DashboardNotice message="No active services yet" />
          ) : (
            activeServices.map((service) => (
              <DashboardButton
                key={service.id}
                label={`${service.name} (${service.durationMinutes}m)`}
                onPress={() => updateForm({ serviceId: service.id })}
                variant={
                  form.serviceId === service.id ? 'primary' : 'secondary'
                }
              />
            ))
          )}
        </View>

        <Text style={styles.label}>Worker</Text>
        <View style={styles.choiceRow}>
          <DashboardButton
            label="Any available"
            onPress={() => updateForm({ workerId: '' })}
            variant={form.workerId === '' ? 'primary' : 'secondary'}
          />
          {activeWorkers.map((worker) => (
            <DashboardButton
              key={worker.id}
              label={worker.name}
              onPress={() => updateForm({ workerId: worker.id })}
              variant={form.workerId === worker.id ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <DashboardButton
          disabled={findingSlots}
          label={findingSlots ? 'Finding...' : 'Find available slots'}
          onPress={findSlots}
        />

        {slots.length > 0 ? (
          <>
            <Text style={styles.label}>Available slots</Text>
            <View style={styles.choiceRow}>
              {slots.map((slot) => (
                <DashboardButton
                  key={`${slot.workerId}-${slot.startAt}`}
                  label={slot.label}
                  onPress={() => setSelectedSlot(slot)}
                  variant={
                    selectedSlot?.workerId === slot.workerId &&
                    selectedSlot?.startAt === slot.startAt
                      ? 'primary'
                      : 'secondary'
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        <DashboardField
          label="Customer name"
          onChangeText={(customerName) =>
            setForm({ ...form, customerName })
          }
          placeholder="Marko"
          value={form.customerName}
        />
        <DashboardField
          label="Customer phone"
          onChangeText={(customerPhone) =>
            setForm({ ...form, customerPhone })
          }
          placeholder="+381641234567"
          value={form.customerPhone}
        />
        <DashboardButton
          disabled={booking}
          label={booking ? 'Booking...' : 'Confirm booking'}
          onPress={confirmBooking}
        />
      </DashboardCard>

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      <DashboardCard>
        <Text style={styles.sectionTitle}>Appointments</Text>
        {loading ? (
          <ActivityIndicator color={dashboardColors.primary} />
        ) : bookedAppointments.length === 0 ? (
          <DashboardNotice message="No booked appointments for this date" />
        ) : (
          <View style={styles.list}>
            {bookedAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentRow}>
                <View style={styles.appointmentText}>
                  <Text style={styles.appointmentTitle}>
                    {appointment.customerName}
                  </Text>
                  <Text style={styles.appointmentMeta}>
                    {formatTime(appointment.startAt)}-{formatTime(appointment.endAt)}
                  </Text>
                  <Text style={styles.appointmentMeta}>
                    {appointment.serviceName} with {appointment.workerName}
                  </Text>
                </View>
                <DashboardButton
                  disabled={cancelingId === appointment.id}
                  label={
                    cancelingId === appointment.id ? 'Cancelling...' : 'Cancel'
                  }
                  onPress={() => cancelAppointment(appointment)}
                  variant="danger"
                />
              </View>
            ))}
          </View>
        )}
      </DashboardCard>
    </DashboardLayout>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: dashboardColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 12,
  },
  appointmentRow: {
    borderTopColor: dashboardColors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  appointmentText: {
    gap: 3,
  },
  appointmentTitle: {
    color: dashboardColors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  appointmentMeta: {
    color: dashboardColors.muted,
    fontSize: 14,
  },
});
