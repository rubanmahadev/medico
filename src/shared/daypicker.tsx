import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './daypicker.css'; // ✅ Custom styles (green/red dot modifiers)

type Props = {
  takenDates: Date[];
  missedDates: Date[];
  onDateSelect: (date: Date) => void;
};

export default function MedicationCalendar({ takenDates, missedDates, onDateSelect }: Props) {
  return (
    <div className="p-4 bg-white rounded-xl  w-fit">

      <DayPicker
        mode="single"
        onDayClick={(day) => {
          const localDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  onDateSelect(localDate);
        }}
        modifiers={{
          taken: takenDates,
          missed: missedDates,
        }}
        modifiersClassNames={{
          taken: 'rdp-day--taken',
          missed: 'rdp-day--missed',
        }}
      />

      {/* Legend */}
      <div className="mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span>Medication taken</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span>Missed medication</span>
        </div>
      </div>
    </div>
  );
}
