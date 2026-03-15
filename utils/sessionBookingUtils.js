// Progress: session helpers keep booking lock logic shared and readable.

// detect whether a session can no longer be booked
export function isSessionUnavailable(session) {
  if (!session || typeof session !== 'object') {
    return false;
  }

  if (session.isBooked === true || session.unavailable === true || session.isUnavailable === true) {
    return true;
  }

  const status = String(session.status || session.availabilityStatus || '').trim().toLowerCase();
  return status === 'booked' || status === 'unavailable';
}

// mark one matching session as booked and keep all sessions visible
export function markWorkshopSessionAsBooked(sessions, sessionId, bookedAtIso) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error('Selected session is unavailable');
  }

  let found = false;
  let alreadyUnavailable = false;

  const nextSessions = sessions.map((session) => {
    if (String(session?.id || '') !== String(sessionId || '')) {
      return session;
    }

    found = true;
    if (isSessionUnavailable(session)) {
      alreadyUnavailable = true;
      return session;
    }

    return {
      ...session,
      isBooked: true,
      unavailable: true,
      availabilityStatus: 'booked',
      bookedAt: bookedAtIso,
    };
  });

  if (!found) {
    throw new Error('Selected session is unavailable');
  }

  if (alreadyUnavailable) {
    throw new Error('This session is already booked');
  }

  return nextSessions;
}