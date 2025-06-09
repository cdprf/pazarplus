import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  StopCircle,
  Loader,
} from "lucide-react";

const DatabaseBusyModal = ({ isOpen, onClose, onUserDecision }) => {
  const [wsConnection, setWsConnection] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState({
    isDatabaseBusy: false,
    activeTransactions: [],
    queuedOperations: 0,
    busyDetails: null,
  });
  const [userInteraction, setUserInteraction] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isOpen && !wsConnection) {
      connectWebSocket();
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [isOpen]);

  const connectWebSocket = () => {
    setIsConnecting(true);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Get the correct server URL based on environment
    const getServerHost = () => {
      if (process.env.NODE_ENV === "development") {
        const hostname = window.location.hostname;

        // If hostname is an IP address (mobile access), use localhost for server
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          return "localhost:5001";
        }

        // Default to localhost for desktop development
        return "localhost:5001";
      }
      return window.location.host;
    };

    const ws = new WebSocket(
      `${protocol}//${getServerHost()}/ws/database-status`
    );

    ws.onopen = () => {
      console.log("Database status WebSocket connected");
      setWsConnection(ws);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Database status WebSocket disconnected");
      setWsConnection(null);
      setIsConnecting(false);
    };

    ws.onerror = (error) => {
      console.error("Database status WebSocket error:", error);
      setIsConnecting(false);
    };
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case "initial_status":
      case "status_update":
        setDatabaseStatus(data.data);
        break;
      case "database_busy_user_input":
        setUserInteraction(data.data.interaction);
        break;
      case "database_recovered":
        setDatabaseStatus((prev) => ({ ...prev, isDatabaseBusy: false }));
        break;
      case "user_decision_made":
        if (userInteraction && data.data.interactionId === userInteraction.id) {
          setUserInteraction(null);
        }
        break;
      default:
        console.log("Unhandled WebSocket message type:", data.type);
    }
  };

  const handleUserDecision = async (action) => {
    if (!userInteraction) return;

    try {
      const response = await fetch("/api/database/user-decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          interactionId: userInteraction.id,
          action,
        }),
      });

      if (response.ok) {
        console.log(`User decision '${action}' sent successfully`);
        if (onUserDecision) {
          onUserDecision(action);
        }
      } else {
        console.error("Failed to send user decision");
      }
    } catch (error) {
      console.error("Error sending user decision:", error);
    }
  };

  const formatDuration = (startTime) => {
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-100";
      case "waiting":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      case "completed":
        return "text-green-600 bg-green-100";
      case "queued":
        return "text-purple-600 bg-purple-100";
      case "paused":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Database Transaction Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Connection Status */}
        {isConnecting && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-2 text-blue-700">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Connecting to database status service...</span>
            </div>
          </div>
        )}

        {/* Database Status Overview */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Database Status
                </span>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    databaseStatus.isDatabaseBusy
                      ? "text-red-600 bg-red-100"
                      : "text-green-600 bg-green-100"
                  }`}
                >
                  {databaseStatus.isDatabaseBusy ? "Busy" : "Available"}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Active Transactions
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {databaseStatus.activeTransactions?.length || 0}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Queued Operations
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {databaseStatus.queuedOperations || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Interaction Section */}
        {userInteraction && (
          <div className="p-6 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  Database is Busy - User Action Required
                </h3>
                <p className="text-yellow-700 mb-4">
                  The database is currently busy with other operations.
                  Operation type:{" "}
                  <span className="font-semibold">
                    {userInteraction.operationType}
                  </span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleUserDecision("wait")}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Wait
                  </button>
                  <button
                    onClick={() => handleUserDecision("force_close")}
                    className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Force Close
                  </button>
                  <button
                    onClick={() => handleUserDecision("queue")}
                    className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Queue
                  </button>
                  <button
                    onClick={() => handleUserDecision("cancel")}
                    className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>

                <div className="mt-4 text-sm text-yellow-700">
                  <p>
                    <strong>Wait:</strong> Wait for current operations to
                    complete
                  </p>
                  <p>
                    <strong>Force Close:</strong> Immediately close other
                    transactions (may cause data loss)
                  </p>
                  <p>
                    <strong>Queue:</strong> Add your operation to the queue for
                    later processing
                  </p>
                  <p>
                    <strong>Cancel:</strong> Cancel your operation entirely
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Transactions */}
        {databaseStatus.activeTransactions &&
          databaseStatus.activeTransactions.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Active Transactions
              </h3>
              <div className="space-y-3">
                {databaseStatus.activeTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">
                          {transaction.id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            transaction.status
                          )}`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDuration(transaction.startTime)}
                      </span>
                    </div>

                    {transaction.metadata && (
                      <div className="text-sm text-gray-600">
                        <p>
                          <strong>Type:</strong>{" "}
                          {transaction.metadata.operationType || "Unknown"}
                        </p>
                        {transaction.metadata.description && (
                          <p>
                            <strong>Description:</strong>{" "}
                            {transaction.metadata.description}
                          </p>
                        )}
                        {transaction.metadata.totalProducts && (
                          <p>
                            <strong>Products:</strong>{" "}
                            {transaction.metadata.totalProducts}
                          </p>
                        )}
                      </div>
                    )}

                    {transaction.lastError && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Last Error:</strong> {transaction.lastError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Real-time database transaction monitoring
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseBusyModal;
