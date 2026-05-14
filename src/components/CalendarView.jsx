"use client";
import React from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default function CalendarView({ events, onDayClick }) {
  // events: array of { date: 'YYYY-MM-DD', status, totalHours }
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = date.toISOString().slice(0,10);
    const ev = events.find(e => e.date === key);
    if (!ev) return null;
    const color = ev.status === 'Present' ? 'bg-green-200' : ev.status === 'Geo-Violation' ? 'bg-red-200' : 'bg-gray-200';
    return <div className={`mt-1 text-xs p-1 rounded ${color}`}>{ev.totalHours || ''}</div>;
  };

  return (
    <div>
      <Calendar
        tileContent={tileContent}
        onClickDay={(d)=> onDayClick && onDayClick(d.toISOString().slice(0,10))}
      />
    </div>
  );
}
