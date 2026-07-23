// Helper utilities to parse and format times as minutes from midnight.
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientStatus?: 'presente' | 'a_caminho' | 'sem_resposta' | 'no_show' | 'finalizado';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // in minutes
  services: { name: string; price: number; duration: number }[];
  totalValue: number;
  status: 'pendente' | 'em_atendimento' | 'finalizado' | 'cancelado' | 'no_show';
  startedAt?: string; // ISO string
  finishedAt?: string; // ISO string
  notes?: string;
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro';
}

export interface AgendaConfig {
  openingTime: string; // "08:00"
  closingTime: string; // "19:00"
  workingDays: number[]; // [1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday...)
  lunchStart: string; // "12:00"
  lunchEnd: string; // "13:00"
  bufferTime: number; // minutes between clients
  minLeadTime: number; // hours in advance to book
  maxAdvanceDays: number; // max days in advance to book
  blockedPeriods: { date?: string; start: string; end: string; label: string }[];
  vacations: string[]; // YYYY-MM-DD
  holidays: string[]; // YYYY-MM-DD
  toleranceTime: number; // minutes of delay tolerance
  notificationTime: number; // minutes before to notify next client
  shopName?: string;
  whatsapp?: string;
  instagram?: string;
  address?: string;
  pixKey?: string;
}

/**
 * Calculates available starting times for a given date and service duration.
 */
export function getAvailableSlots(
  dateStr: string,
  totalDuration: number,
  existingAppointments: Appointment[],
  config: AgendaConfig,
  currentDateTime: Date = new Date()
): string[] {
  const targetDate = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = targetDate.getDay();

  // 1. Check if it's a working day
  if (!config.workingDays.includes(dayOfWeek)) {
    return [];
  }

  // 2. Check if it's a holiday
  if (config.holidays.includes(dateStr)) {
    return [];
  }

  // 3. Check if it's during vacations
  if (config.vacations.includes(dateStr)) {
    return [];
  }

  const openingMin = parseTimeToMinutes(config.openingTime);
  const closingMin = parseTimeToMinutes(config.closingTime);
  const lunchStartMin = parseTimeToMinutes(config.lunchStart);
  const lunchEndMin = parseTimeToMinutes(config.lunchEnd);

  // Convert existing appointments into blocked minute intervals on this day
  // An appointment blocks the interval [start, start + duration + bufferTime]
  // Note: we subtract bufferTime from candidate check, or add it to the block.
  // Standard way: an appointment at [A, B] blocks [A - bufferTime, B + bufferTime] for others,
  // or we block [A, B + bufferTime]. Let's say block is [A, B + bufferTime] so that they can start exactly at B + bufferTime.
  // Let's also enforce that if we start at S, S + totalDuration + bufferTime <= closingMin (except if it is the last slot, we can end exactly at closingMin).
  const blockedIntervals: { start: number; end: number }[] = existingAppointments
    .filter((app) => app.date === dateStr && app.status !== 'cancelado' && app.status !== 'no_show')
    .map((app) => {
      const start = parseTimeToMinutes(app.startTime);
      return {
        start,
        end: start + app.duration + config.bufferTime,
      };
    });

  // Add lunch break as a blocked interval
  if (lunchEndMin > lunchStartMin) {
    blockedIntervals.push({
      start: lunchStartMin,
      end: lunchEndMin,
    });
  }

  // Add custom blocked periods
  config.blockedPeriods.forEach((period) => {
    if (period.date && period.date !== dateStr) {
      return;
    }
    blockedIntervals.push({
      start: parseTimeToMinutes(period.start),
      end: parseTimeToMinutes(period.end),
    });
  });

  // Sort blocked intervals for faster check
  blockedIntervals.sort((a, b) => a.start - b.start);

  // Determine the start time for searching
  let searchStartMin = openingMin;
  
  // If target date is today, we cannot book in the past, and must respect the minimum lead time (minLeadTime in hours)
  const todayStr = getLocalDateStr(currentDateTime);
  if (dateStr === todayStr) {
    const currentHour = currentDateTime.getHours();
    const currentMin = currentDateTime.getMinutes();
    const minAdvanceMin = currentHour * 60 + currentMin + (config.minLeadTime * 60);
    searchStartMin = Math.max(searchStartMin, minAdvanceMin);
  }

  const availableSlots: string[] = [];
  const step = 15; // Offer slots every 15 minutes for UI cleanliness

  // Round searchStartMin up to next step interval
  const remainder = searchStartMin % step;
  if (remainder !== 0) {
    searchStartMin += (step - remainder);
  }

  for (let s = searchStartMin; s <= closingMin - totalDuration; s += step) {
    const e = s + totalDuration;
    
    // Check if slot exceeds closing time
    if (e > closingMin) continue;

    // Check if slot overlaps with any blocked intervals
    let isOverlap = false;
    for (const block of blockedIntervals) {
      // Overlap condition: s < block.end && e > block.start
      // However, if we start exactly at block.end, it's allowed (e.g. A finishes at 10:00, B starts at 10:00).
      // So condition for overlap is: s < block.end && e > block.start
      if (s < block.end && e > block.start) {
        isOverlap = true;
        break;
      }
    }

    if (!isOverlap) {
      availableSlots.push(formatMinutesToTime(s));
    }
  }

  return availableSlots;
}
