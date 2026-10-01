import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetPropertyActivitiesQuery,
  useGetPropertyQuery,
  useUpdatePropertyMutation,
} from "../store/api/propertyApi";
import { useGetSiteVisitsQuery } from "../store/api/siteVisitApi";
import { getAccessToken } from "../store/authToken";
import "../style/PropertyDetails.css";
import socket from "../services/socket";

const statuses = [
  "Draft",
  "Listed",
  "Site visit",
  "Negotiation",
  "Closed / Withdrawn"
];

const formatPrice = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price)) return "—";
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  return `₹${(price / 100_000).toFixed(0)} L`;
};

const formatAmount = (value) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
};

function PropertyDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentUser = useSelector((state) => state.auth.user);
  const propertyId = id;
  const {
    data: propertyResult,
    isLoading,
    isError,
    error: propertyError,
    refetch,
  } = useGetPropertyQuery(propertyId, { skip: !propertyId });
  const { data: activityResult } = useGetPropertyActivitiesQuery(propertyId, { skip: !propertyId });
  const { data: visitResult } = useGetSiteVisitsQuery({
    propertyId,
    status: "SCHEDULED",
    page: 1,
    limit: 1,
  }, { skip: !propertyId });
  const [updateProperty, { isLoading: isUpdating }] = useUpdatePropertyMutation();
  const property = propertyResult?.data;
  const activities = activityResult?.data || [];
  const nextVisit = visitResult?.data?.[0];
  const [updateError, setUpdateError] = useState("");

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [typingName, setTypingName] = useState("A teammate");
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);
  const typingTimeout = useRef(null);

  const currentStatus = useMemo(() => {
    const value = property?.status || "Draft";
    if (value === "Available" || value === "Contacted") return "Listed";
    if (value === "Visit Scheduled") return "Site visit";
    if (value === "Closed" || value === "Withdrawn") return "Closed / Withdrawn";
    return value;
  }, [property?.status]);
  const currentStatusIndex = statuses.indexOf(currentStatus);
  const amenities = Array.isArray(property?.amenities)
    ? property.amenities
    : typeof property?.amenities === "string"
      ? (() => { try { return JSON.parse(property.amenities); } catch { return []; } })()
      : [];
  const currentPrice = Number(property?.price || 0);
  const area = Number(property?.area || 0);
  const listedPrice = Number(property?.listedPrice ?? property?.price ?? 0);
  const priceDelta = currentPrice - listedPrice;

  const updateStatus = async (status) => {
    if (!property || status === currentStatus) return;
    setUpdateError("");
    try {
      await updateProperty({
        id: property.id,
        status: status === "Closed / Withdrawn" ? "Closed" : status,
        version: property.version,
      }).unwrap();
    } catch (error) {
      setUpdateError(error?.data?.message || "Could not update property status.");
    }
  };

  const notifyTyping = (value) => {
    setMessage(value);
    if (!connected) return;
    socket.emit("chat:typing", { propertyId, isTyping: Boolean(value.trim()) });
    window.clearTimeout(typingTimeout.current);
    if (value.trim()) {
      typingTimeout.current = window.setTimeout(() => {
        socket.emit("chat:typing", { propertyId, isTyping: false });
      }, 900);
    }
  };

  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken || !propertyId) {
      return undefined;
    }

    socket.auth = {
      token: accessToken
    };

    const handleConnect = () => {
      setConnected(true);

      socket.emit("chat:join", propertyId);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleHistory = (history) => {
      if (!Array.isArray(history)) {
        return;
      }

      const formattedMessages = history.map((item) => ({
        id: item.id || item.client_msg_id || item.clientMsgId,
        sender: item.sender_name || item.senderName || item.sender || "User",
        time: (item.created_at || item.createdAt)
          ? new Date(item.created_at || item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "",
        text: item.message || item.text || "",
        clientMsgId: item.client_msg_id || item.clientMsgId,
        type: (item.sender_id || item.senderId) === currentUser?.id ? "outgoing" : "incoming",
        status: "delivered"
      }));

      setMessages((current) => {
        const pending = current.filter((item) => item.status === "sending" || item.status === "failed");
        const byClientId = new Map(formattedMessages.map((item) => [item.clientMsgId, item]));
        for (const item of pending) {
          if (!byClientId.has(item.clientMsgId)) byClientId.set(item.clientMsgId, item);
        }
        return [...byClientId.values()];
      });
    };

    const handleMessage = (item) => {
      const clientMsgId =
        item.client_msg_id || item.clientMsgId;
      const senderId = item.sender_id || item.senderId;
      const createdAt = item.created_at || item.createdAt;

      const incomingMessage = {
        id:
          item.id ||
          clientMsgId ||
          `message-${Date.now()}`,
        clientMsgId,
        sender: item.sender_name || item.senderName || item.sender || "User",
        time: createdAt
          ? new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
        text: item.message || item.text || "",
        type: senderId === currentUser?.id ? "outgoing" : "incoming",
        status: "delivered"
      };

      setMessages((current) => {
        const existingIndex = current.findIndex(
          (existing) =>
            existing.clientMsgId === clientMsgId ||
            existing.id === incomingMessage.id
        );

        if (existingIndex === -1) {
          return [...current, incomingMessage];
        }

        return current.map((existing, index) =>
          index === existingIndex
            ? {
                ...existing,
                ...incomingMessage,
                status: "delivered"
              }
            : existing
        );
      });

      setTyping(false);
    };

    const handleError = (error) => {
      const errorMessage =
        error?.message || "Message could not be sent";

      setMessages((current) =>
        current.map((item) =>
          item.status === "sending" &&
          (!error?.clientMsgId || item.clientMsgId === error.clientMsgId)
            ? {
                ...item,
                status: "failed",
                error: errorMessage
              }
            : item
        )
      );
    };

    const handlePresence = (presence) => {
      setViewers(Number(presence?.viewers) || 0);
    };

    const handleTyping = (state) => {
      if (state?.userId !== currentUser?.id) {
        setTyping(Boolean(state?.isTyping));
        setTypingName(state?.userName || "A teammate");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:history", handleHistory);
    socket.on("chat:message", handleMessage);
    socket.on("chat:error", handleError);
    socket.on("chat:presence", handlePresence);
    socket.on("chat:typing", handleTyping);

    socket.connect();

    return () => {
      window.clearTimeout(typingTimeout.current);
      socket.emit("chat:typing", { propertyId, isTyping: false });
      socket.emit("chat:leave", propertyId);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:history", handleHistory);
      socket.off("chat:message", handleMessage);
      socket.off("chat:error", handleError);
      socket.off("chat:presence", handlePresence);
      socket.off("chat:typing", handleTyping);

      socket.disconnect();
    };
  }, [propertyId, currentUser?.id]);

  const sendMessage = () => {
    const text = message.trim();

    if (!text || !connected) {
      return;
    }

    const clientMsgId = crypto.randomUUID();

    const optimisticMessage = {
      id: clientMsgId,
      clientMsgId,
      sender: "You",
      time: "",
      text,
      type: "outgoing",
      status: "sending"
    };

    setMessages((current) => [
      ...current,
      optimisticMessage
    ]);

    setMessage("");
    window.clearTimeout(typingTimeout.current);
    socket.emit("chat:typing", { propertyId, isTyping: false });

    socket.emit("chat:message", {
      propertyId,
      clientMsgId,
      message: text
    });
  };

  const retryMessage = (messageId) => {
    const target = messages.find(
      (item) => item.id === messageId
    );

    if (!target || !connected) {
      return;
    }

    const clientMsgId =
      target.clientMsgId || target.id;

    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              status: "sending"
            }
          : item
      )
    );

    socket.emit("chat:message", {
      propertyId,
      clientMsgId,
      message: target.text
    });
  };

  if (isLoading) {
    return <div className="property-detail-loading">Loading property...</div>;
  }

  if (isError || !property) {
    if ([403, 404].includes(propertyError?.status)) {
      return <Navigate to="/404" replace />;
    }

    return (
      <div className="property-detail-loading" role="alert">
        <p>Property could not be loaded.</p>
        <button type="button" onClick={refetch}>Retry</button>
        <button type="button" onClick={() => navigate("/properties")}>Back to properties</button>
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <aside className="property-sidebar">
        <div className="property-brand">
          <div className="property-brand-icon">↗</div>
          <span>PropFlow</span>
        </div>

        <nav className="property-navigation">
          <button className="active" onClick={() => navigate("/properties")}>
            My properties
          </button>

          <button onClick={() => navigate(`/site-visits?propertyId=${propertyId}`)}>
            My site visits
          </button>
        </nav>

        <div className="property-profile">
          <div>
            PropFlow · <strong>{currentUser?.role || "Team member"}</strong>
          </div>
          <strong>{currentUser?.name || currentUser?.email || "Signed in"}</strong>
        </div>
      </aside>

      <main className="property-detail-main">
        <header className="property-detail-header">
          <div className="property-heading">
            <button
              className="back-link"
              onClick={() => navigate("/properties")}
            >
              ← My properties
            </button>

            <h1>{property.title || property.buildingName}</h1>

            <span>
              {[property.locality, property.city].filter(Boolean).join(", ")} · {property.listingType === "SALE" ? "For sale" : "For rent"}
            </span>
          </div>

          <div className="property-header-actions">
            <span>
              version {property.version}
            </span>

            <button className="secondary-action" onClick={() => navigate(`/site-visits?propertyId=${propertyId}&schedule=1`)}>
              Schedule site visit
            </button>

            <button className="primary-action" onClick={() => navigate(`/properties/${propertyId}/edit`)}>
              Edit property
            </button>
          </div>
        </header>

        <div className="property-status-bar">
          {statuses.map((status, index) => (
            <button
              key={status}
              type="button"
              className={`property-status-item ${
                index <= currentStatusIndex ? "completed" : ""
              } ${index === currentStatusIndex ? "current" : ""}`}
              disabled={isUpdating}
              onClick={() => updateStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {updateError && <p className="property-update-error" role="alert">{updateError}</p>}

        <section className="property-detail-content">
          <div className="property-left-column">
            <section className="property-summary-card">
              <div className="property-price-row">
                <strong>{formatPrice(property.price)}</strong>

                <span>
                  {area ? `${formatAmount(currentPrice / area)} / sq ft` : "Area not set"}
                </span>

                <b className={priceDelta <= 0 ? "price-change-down" : "price-change-up"}>
                  {priceDelta === 0
                    ? "At listed price"
                    : `${priceDelta < 0 ? "↓" : "↑"} ${formatPrice(Math.abs(priceDelta))} since listing`}
                </b>
              </div>

              <div className="property-facts">
                <div>
                  <label>TYPE</label>
                  <span>{property.type}</span>
                </div>

                <div>
                  <label>CARPET AREA</label>
                  <span>{area ? `${area.toLocaleString("en-IN")} sq ft` : "—"}</span>
                </div>

                <div>
                  <label>FLOOR</label>
                  <span>{property.floor != null ? `${property.floor} of ${property.totalFloors || "—"}` : "—"}</span>
                </div>

                <div>
                  <label>FURNISHING</label>
                  <span>{property.furnishing || "—"}</span>
                </div>

                <div>
                  <label>OWNER</label>
                  <span>{property.ownerName || "—"}</span>
                </div>

                <div>
                  <label>OWNER PHONE</label>
                  <span>{property.ownerPhone || "—"}</span>
                </div>

                <div>
                  <label>NEXT SITE VISIT</label>
                  <span>{nextVisit ? formatDateTime(nextVisit.scheduledAt) : "None scheduled"}</span>
                </div>

                <div>
                  <label>FACING</label>
                  <span>{property.facing || "—"}</span>
                </div>
              </div>

              <div className="amenities">
                {amenities.map((amenity) => (
                  <span key={amenity}>
                    {amenity}
                  </span>
                ))}
                {!amenities.length && <span>No amenities listed</span>}
              </div>
            </section>

            <section className="activity-card">
              <h2>Activity</h2>

              <div className="activity-list">
                {activities.map((activity, index) => (
                  <div
                    className="activity-item"
                    key={activity.id || `${activity.userId}-${index}`}
                  >
                    <span
                      className={`activity-dot ${
                        index === 0 ? "active" : ""
                      }`}
                    />

                    <div>
                      <p>
                        <strong>{activity.userName}</strong>{" "}
                        {activity.details || activity.action}
                      </p>

                      <small>
                        {formatDateTime(activity.createdAt)}
                      </small>
                    </div>
                  </div>
                ))}
                {!activities.length && <p className="activity-empty">No activity recorded for this property.</p>}
              </div>
            </section>
          </div>

          <section className="property-chat-card">
            <div className="chat-header">
              <div>
                <h2>Property chat</h2>
                <span>
                  {connected
                    ? `Live · ${viewers} viewing`
                    : "Offline"}
                </span>
                <span className={`online-indicator ${connected ? "connected" : "disconnected"}`} />
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`chat-message-row ${
                    item.type === "outgoing"
                      ? "outgoing"
                      : "incoming"
                  }`}
                >
                  {item.type === "incoming" && (
                    <div className="message-meta">
                      {item.sender} · {item.time}
                    </div>
                  )}

                  <div
                    className={`chat-bubble ${item.status}`}
                  >
                    {item.text}
                  </div>

                  {item.type === "outgoing" && (
                    <div className="message-status">
                      {item.status === "sending" && (
                        "Optimistic · sending"
                      )}

                      {item.status === "delivered" && (
                        `${item.time} · Delivered`
                      )}

                      {item.status === "failed" && (
                        <>
                          Not sent ·{" "}
                          <button
                            onClick={() =>
                              retryMessage(item.id)
                            }
                          >
                            Retry
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {typing && (
                <div className="typing-indicator">
                  {typingName} is typing...
                </div>
              )}
            </div>

            <div className="chat-composer">
              <input
                value={message}
                onChange={(event) => notifyTyping(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="Message about this property"
                disabled={!connected}
              />

              <button
                onClick={sendMessage}
                disabled={!connected}
              >
                Send
              </button>
            </div>
          </section>
        </section>

        <span className="property-id">
          Property {propertyId}
        </span>
      </main>
    </div>
  );
}

export default PropertyDetails;