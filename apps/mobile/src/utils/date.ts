export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function addDays(date: string, amount: number) {
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + amount);

  return formatDateInput(nextDate);
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatReadableDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
