import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  useCreateSiteVisitMutation,
  useGetSiteVisitsQuery,
  useUpdateSiteVisitMutation,
} from "../store/api/siteVisitApi";
import { useGetPropertiesQuery } from "../store/api/propertyApi";
import { getAccessToken } from "../store/authToken";
import socket from "../services/socket";
import "../style/siteVisits.css";

const EMPTY_LIST = [];

const formatDate = (value, options) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-IN", options).format(date);
};

const toLocalInputValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const getDefaultDateTime = () =>
  toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));

const getTimeZoneLabel = () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const abbreviation = new Intl.DateTimeFormat("en-IN", {
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  return `${zone}${abbreviation ? ` (${abbreviation})` : ""}`;
};

function SiteVisits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reminder, setReminder] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now);
  const requestedPropertyId = searchParams.get("propertyId") || "";
  const scheduleRequested = searchParams.get("schedule") === "1";

  const {
    data: visitResult,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSiteVisitsQuery(
    dateRange
      ? { page: 1, limit: 100, from: dateRange.from, to: dateRange.to }
      : {},
    { skip: !dateRange },
  );
  const { data: propertyResult } = useGetPropertiesQuery({
    page: 1,
    limit: 100,
    sortBy: "title",
    sortOrder: "asc",
  });
  const [createSiteVisit, { isLoading: isCreating }] = useCreateSiteVisitMutation();
  const [updateSiteVisit] = useUpdateSiteVisitMutation();
  const visits = visitResult?.data ?? EMPTY_LIST;
  const properties = propertyResult?.data ?? EMPTY_LIST;
  const timeZoneLabel = useMemo(() => getTimeZoneLabel(), []);
  const overdueCount = visits.filter(
    (visit) => visit.status === "SCHEDULED" && new Date(visit.scheduledAt).getTime() < currentTime,
  ).length;

  const events = visits.map((visit) => ({
    id: visit.id,
    title: [visit.propertyTitle, visit.unitNo].filter(Boolean).join(" · "),
    start: visit.scheduledAt,
    editable: visit.status === "SCHEDULED",
    classNames: [
      `site-calendar-event-${visit.status.toLowerCase()}`,
      ...(visit.status === "SCHEDULED" && new Date(visit.scheduledAt).getTime() < currentTime
        ? ["site-calendar-event-overdue"]
        : []),
    ],
    extendedProps: {
      propertyId: visit.propertyId,
      clientName: visit.clientName,
      propertyTitle: visit.propertyTitle,
      unitNo: visit.unitNo,
      status: visit.status,
    },
  }));

  const openSchedule = (date) => {
    setPropertyId(requestedPropertyId || properties[0]?.id || "");
    setScheduledAt(date ? toLocalInputValue(date) : getDefaultDateTime());
    setShowSchedule(true);
    setFeedback("");
  };

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const onReminder = (payload) => setReminder(payload);
    socket.auth = { token };
    socket.on("siteVisit:reminder", onReminder);
    socket.connect();

    return () => {
      socket.off("siteVisit:reminder", onReminder);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!reminder) return undefined;
    const timer = window.setTimeout(() => setReminder(null), 20_000);
    return () => window.clearTimeout(timer);
  }, [reminder]);

  const submitSchedule = async (event) => {
    event.preventDefault();
    try {
      await createSiteVisit({
        propertyId: propertyId || requestedPropertyId || properties[0]?.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined,
      }).unwrap();
      setFeedback("Site visit scheduled.");
      closeSchedule();
      setClientName("");
      setClientPhone("");
      setNotes("");
    } catch (error) {
      setFeedback(error?.data?.message || "Could not schedule this visit.");
    }
  };

  const closeSchedule = () => {
    setShowSchedule(false);
    if (scheduleRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete("schedule");
      setSearchParams(next, { replace: true });
    }
  };

  const scheduleDialogOpen = showSchedule || (scheduleRequested && properties.length > 0);

  const rescheduleVisit = async (info) => {
    const visit = visits.find((item) => item.id === info.event.id);
    if (!visit || !info.event.start) return;

    const nextDate = new Date(info.event.start);
    if (info.event.allDay) {
      const originalDate = new Date(visit.scheduledAt);
      nextDate.setHours(
        originalDate.getHours(),
        originalDate.getMinutes(),
        originalDate.getSeconds(),
        originalDate.getMilliseconds(),
      );
      info.event.setAllDay(false);
      info.event.setStart(nextDate);
    }

    try {
      await updateSiteVisit({
        id: visit.id,
        scheduledAt: nextDate.toISOString(),
      }).unwrap();
      setFeedback("Visit rescheduled.");
    } catch (error) {
      info.revert();
      setFeedback(error?.data?.message || "Could not reschedule this visit.");
    }
  };

  return (
    <div className="site-visits-page">
      <header className="site-calendar-header">
        <div>
          <p className="site-visits-eyebrow">ACTIVITY</p>
          <h1>Site visits</h1>
          <p className="site-calendar-timezone">Times shown in {timeZoneLabel}</p>
        </div>
        <div className="site-calendar-header-actions">
          <span className="site-calendar-count">
            {Number(visitResult?.total || 0).toLocaleString("en-IN")} visits
            {overdueCount > 0 && <span className="site-calendar-overdue-count">{overdueCount} overdue</span>}
          </span>
          <button
            type="button"
            className="site-visits-primary-button"
            onClick={() => openSchedule()}
            disabled={!properties.length}
            title={!properties.length ? "Add a property before scheduling a visit" : undefined}
          >
            <span aria-hidden="true">+</span> Schedule visit
          </button>
        </div>
      </header>

      {(feedback || (isError && !isLoading)) && (
        <div className={isError ? "site-calendar-feedback error" : "site-calendar-feedback"} role="status">
          {isError ? "Could not load visits. " : feedback}
          {isError && <button type="button" onClick={refetch}>Retry</button>}
        </div>
      )}

      <section className="site-calendar-panel" aria-label="Site visit calendar">
        {isFetching && <span className="site-calendar-loading" role="status">Updating calendar…</span>}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          timeZone="local"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          buttonText={{ today: "Today", month: "Month", week: "Week" }}
          events={events}
          datesSet={({ start, end }) => {
            const nextRange = { from: start.toISOString(), to: end.toISOString() };
            setDateRange((current) =>
              current?.from === nextRange.from && current?.to === nextRange.to
                ? current
                : nextRange,
            );
          }}
          dateClick={({ date }) => openSchedule(date)}
          eventDrop={rescheduleVisit}
          eventClick={({ event }) => navigate(`/properties/${event.extendedProps.propertyId}`)}
          eventContent={({ timeText, event }) => (
            <span className="site-calendar-event-content" title={`${event.extendedProps.clientName} · ${event.title}`}>
              {timeText && <time>{timeText}</time>}
              <span>{event.title || event.extendedProps.clientName}</span>
            </span>
          )}
          dayMaxEvents
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
          expandRows
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", hour12: true }}
          dayHeaderFormat={{ weekday: "short" }}
          weekends
          editable
          eventDurationEditable={false}
          eventStartEditable
          eventResizableFromStart={false}
          dragScroll
          eventDisplay="block"
          noEventsContent="No site visits in this period"
        />
      </section>

      {reminder && (
        <aside className="site-visit-reminder" role="status" aria-live="polite">
          <span className="site-visit-reminder-icon" aria-hidden="true">◷</span>
          <div>
            <strong>Site visit in 15 min</strong>
            <p>{reminder.clientName} · {reminder.propertyTitle}{reminder.unitNo ? ` ${reminder.unitNo}` : ""} · {formatDate(reminder.scheduledAt, { hour: "numeric", minute: "2-digit" })}</p>
            <button type="button" onClick={() => navigate(`/properties/${reminder.propertyId}`)}>
              Open property
            </button>
          </div>
          <button className="site-visit-reminder-dismiss" type="button" aria-label="Dismiss reminder" onClick={() => setReminder(null)}>×</button>
        </aside>
      )}

      {scheduleDialogOpen && (
        <div className="site-visit-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSchedule();
        }}>
          <section className="site-visit-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-visit-title">
            <div className="site-visit-modal-header">
              <h2 id="schedule-visit-title">Schedule site visit</h2>
              <button type="button" aria-label="Close dialog" onClick={closeSchedule}>×</button>
            </div>
            <form onSubmit={submitSchedule}>
              <label>
                Property
                <select value={propertyId || requestedPropertyId || properties[0]?.id || ""} onChange={(event) => setPropertyId(event.target.value)} required>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.title || property.buildingName}</option>
                  ))}
                </select>
              </label>
              <label>
                Client name
                <input value={clientName} onChange={(event) => setClientName(event.target.value)} required maxLength={150} />
              </label>
              <label>
                Client phone
                <input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} maxLength={30} />
              </label>
              <label>
                Date and time
                <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
              </label>
              <label>
                Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} />
              </label>
              <div className="site-visit-modal-actions">
                <button type="button" onClick={closeSchedule}>Cancel</button>
                <button type="submit" disabled={isCreating || !properties.length}>
                  {isCreating ? "Scheduling…" : "Schedule visit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default SiteVisits;