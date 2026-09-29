'use client';

import { useEffect, useState } from 'react';

type Notification = {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
};

export default function NotificationsBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Poll for notifications every 15 seconds
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
        // Silently fail polling
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const dismissNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to dismiss notification');
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 w-80">
      {notifications.map(notif => (
        <div key={notif.id} className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex flex-col relative animate-fade-in-up">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm">{notif.title}</h4>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="text-white hover:text-gray-200"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
          <p className="text-sm mt-1">{notif.message}</p>
          {notif.linkUrl && (
            <a
              href={notif.linkUrl}
              className="text-xs font-semibold underline mt-2 hover:text-gray-200"
              onClick={() => dismissNotification(notif.id)}
            >
              View Details
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
