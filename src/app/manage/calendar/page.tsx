'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Modal, TextArea } from '@/components/ui';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Film,
  Lightbulb,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Bell,
} from 'lucide-react';
import type { CalendarEvent } from '@/types';

// 데모 이벤트
const demoEvents: CalendarEvent[] = [
  { id: '1', title: '쇼츠: AI 편집 팁', date: '2026-01-05', type: 'shorts', completed: false },
  { id: '2', title: '롱폼: 연말 결산', date: '2026-01-07', type: 'longform', completed: false },
  { id: '3', title: '쇼츠: 새해 인사', date: '2026-01-01', type: 'shorts', completed: true },
  { id: '4', title: '아이디어: 장비 추천', date: '2026-01-10', type: 'idea', description: '카메라, 마이크, 조명 추천 시리즈' },
  { id: '5', title: '협찬 마감일', date: '2026-01-15', type: 'deadline' },
  { id: '6', title: '쇼츠: 편집 꿀팁 #2', date: '2026-01-08', type: 'shorts', completed: false },
  { id: '7', title: '롱폼: 1월 브이로그', date: '2026-01-20', type: 'longform', completed: false },
  { id: '8', title: '쇼츠: 자막 자동화', date: '2026-01-12', type: 'shorts', completed: false },
];

const eventTypeConfig = {
  shorts: { label: '쇼츠', color: 'bg-primary', icon: Video },
  longform: { label: '롱폼', color: 'bg-warning', icon: Film },
  idea: { label: '아이디어', color: 'bg-purple-500', icon: Lightbulb },
  deadline: { label: '마감일', color: 'bg-error', icon: Clock },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // 2026년 1월
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'shorts',
    completed: false,
  });

  // 달력 데이터 생성
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    
    // 이전 달 빈 칸
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // 날짜 문자열 생성
  const formatDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  // 해당 날짜의 이벤트
  const getEventsForDate = (day: number) => {
    const dateStr = formatDateString(day);
    return events.filter(e => e.date === dateStr);
  };

  // 이벤트 추가
  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDate) return;

    const event: CalendarEvent = {
      id: `event_${Date.now()}`,
      title: newEvent.title,
      date: selectedDate,
      type: newEvent.type as CalendarEvent['type'],
      description: newEvent.description,
      completed: false,
    };

    setEvents([...events, event]);
    setShowAddModal(false);
    setNewEvent({ type: 'shorts', completed: false });
  };

  // 이벤트 수정
  const handleUpdateEvent = () => {
    if (!editingEvent) return;

    setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e));
    setEditingEvent(null);
  };

  // 이벤트 삭제
  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  // 완료 토글
  const handleToggleComplete = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  // 이전/다음 달
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 이번 달 통계
  const monthEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  });

  const stats = {
    total: monthEvents.length,
    shorts: monthEvents.filter(e => e.type === 'shorts').length,
    longform: monthEvents.filter(e => e.type === 'longform').length,
    completed: monthEvents.filter(e => e.completed).length,
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                📅 콘텐츠 캘린더
              </h1>
              <p className="text-muted">
                업로드 일정을 계획하고 관리하세요
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedDate(formatDateString(new Date().getDate()));
                setShowAddModal(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              일정 추가
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted">이번 달 일정</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.shorts}</p>
            <p className="text-xs text-muted">쇼츠</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.longform}</p>
            <p className="text-xs text-muted">롱폼</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
            <p className="text-xs text-muted">완료</p>
          </Card>
        </div>

        {/* 캘린더 */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button variant="ghost" size="sm" onClick={goToPrevMonth} icon={<ChevronLeft className="w-4 h-4" />} />
            <h2 className="text-lg font-semibold text-foreground">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextMonth} icon={<ChevronRight className="w-4 h-4" />} />
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-border">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  i === 0 ? 'text-error' : i === 6 ? 'text-primary' : 'text-muted'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="flex-1 grid grid-cols-7 overflow-auto">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day === new Date().getDate() && 
                             currentDate.getMonth() === new Date().getMonth() &&
                             currentDate.getFullYear() === new Date().getFullYear();
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border-b border-r border-border ${
                    !day ? 'bg-card-hover' : 'hover:bg-card-hover cursor-pointer'
                  }`}
                  onClick={() => {
                    if (day) {
                      setSelectedDate(formatDateString(day));
                      setShowAddModal(true);
                    }
                  }}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center' : 'text-foreground'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const config = eventTypeConfig[event.type];
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${config.color} text-white ${
                                event.completed ? 'opacity-50 line-through' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                              }}
                            >
                              {event.title}
                            </motion.div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted">
                            +{dayEvents.length - 3}개 더
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* 추가 모달 */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="일정 추가"
        >
          <div className="space-y-4">
            <Input
              label="제목"
              placeholder="영상 제목 또는 일정명"
              value={newEvent.title || ''}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <Input
              label="날짜"
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Select
              label="유형"
              options={[
                { value: 'shorts', label: '📱 쇼츠' },
                { value: 'longform', label: '🎬 롱폼' },
                { value: 'idea', label: '💡 아이디어' },
                { value: 'deadline', label: '⏰ 마감일' },
              ]}
              value={newEvent.type || 'shorts'}
              onChange={(v) => setNewEvent({ ...newEvent, type: v as CalendarEvent['type'] })}
            />
            <TextArea
              label="메모 (선택)"
              placeholder="추가 메모..."
              value={newEvent.description || ''}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                취소
              </Button>
              <Button variant="primary" onClick={handleAddEvent}>
                추가
              </Button>
            </div>
          </div>
        </Modal>

        {/* 수정 모달 */}
        <Modal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          title="일정 수정"
        >
          {editingEvent && (
            <div className="space-y-4">
              <Input
                label="제목"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
              />
              <Input
                label="날짜"
                type="date"
                value={editingEvent.date}
                onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
              />
              <Select
                label="유형"
                options={[
                  { value: 'shorts', label: '📱 쇼츠' },
                  { value: 'longform', label: '🎬 롱폼' },
                  { value: 'idea', label: '💡 아이디어' },
                  { value: 'deadline', label: '⏰ 마감일' },
                ]}
                value={editingEvent.type}
                onChange={(v) => setEditingEvent({ ...editingEvent, type: v as CalendarEvent['type'] })}
              />
              <TextArea
                label="메모"
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant={editingEvent.completed ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setEditingEvent({ ...editingEvent, completed: !editingEvent.completed })}
                  icon={editingEvent.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                >
                  {editingEvent.completed ? '완료됨' : '미완료'}
                </Button>
              </div>
              <div className="flex justify-between">
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDeleteEvent(editingEvent.id);
                    setEditingEvent(null);
                  }}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  삭제
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditingEvent(null)}>
                    취소
                  </Button>
                  <Button variant="primary" onClick={handleUpdateEvent}>
                    저장
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
