function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildClientMap(clients = []) {
  return new Map(
    clients
      .filter((client) => client?.id)
      .map((client) => [client.id, client]),
  );
}

function isAssignedToCounselor(client, currentUser) {
  if (!client || !currentUser) return false;
  if (currentUser.staffId && client.primaryCounselorId) {
    return client.primaryCounselorId === currentUser.staffId;
  }
  return false;
}

function matchesCounselorIdentity(entry, currentUser, client) {
  if (!currentUser) return false;
  if (currentUser.staffId && (entry?.counselorId || client?.primaryCounselorId)) {
    if (entry?.counselorId === currentUser.staffId) return true;
    if (client?.primaryCounselorId === currentUser.staffId) return true;
  }

  const currentName = normalizeName(currentUser.name);
  const entryName = normalizeName(entry?.counselorName);
  return Boolean(currentName && entryName && currentName === entryName);
}

function summarizeAssignments(items = []) {
  return items.reduce((summary, item) => {
    summary.total += 1;
    if (item.kind === 'document') summary.documents += 1;
    if (item.kind === 'form') summary.forms += 1;
    return summary;
  }, { total: 0, documents: 0, forms: 0 });
}

function summarizeNoteGaps(items = []) {
  return items.reduce((summary, item) => {
    const daysWithoutNote = Number(item?.daysWithoutNote ?? 0);
    if (daysWithoutNote >= 1) summary.over1Day += 1;
    if (daysWithoutNote >= 3) summary.over3Days += 1;
    if (daysWithoutNote >= 7) summary.over7Days += 1;
    return summary;
  }, { over1Day: 0, over3Days: 0, over7Days: 0 });
}

export function buildCounselorWorkspaceData(summary, clients = [], currentUser = null) {
  const clientMap = buildClientMap(clients);
  const unscheduledClientItems = Array.isArray(summary?.clientsBox?.unscheduledClientItems)
    ? summary.clientsBox.unscheduledClientItems
    : [];
  const noteGapItems = Array.isArray(summary?.complianceWatch?.noteGapItems)
    ? summary.complianceWatch.noteGapItems
    : [];
  const outstandingAssignmentItems = Array.isArray(summary?.complianceWatch?.outstandingAssignments?.items)
    ? summary.complianceWatch.outstandingAssignments.items
    : [];
  const intakePreviewItems = Array.isArray(summary?.clientsBox?.intakePreviews?.items)
    ? summary.clientsBox.intakePreviews.items
    : [];

  const counselorUnscheduledClients = unscheduledClientItems.filter((item) => {
    const client = clientMap.get(item.clientId);
    return isAssignedToCounselor(client, currentUser);
  });

  const counselorNoteGapItems = noteGapItems.filter((item) => {
    const client = clientMap.get(item.clientId);
    return matchesCounselorIdentity(item, currentUser, client);
  });

  const counselorAssignmentItems = outstandingAssignmentItems.filter((item) => {
    const client = clientMap.get(item.clientId);
    return isAssignedToCounselor(client, currentUser);
  });
  const counselorIntakePreviewItems = intakePreviewItems.filter((item) => {
    const client = clientMap.get(item.clientId);
    return isAssignedToCounselor(client, currentUser);
  });

  const counselorHighTouchpointClients = clients.filter((client) => (
    Boolean(client?.highTouchpoint) && isAssignedToCounselor(client, currentUser)
  ));

  const noteGapCounts = summarizeNoteGaps(counselorNoteGapItems);
  const assignmentCounts = summarizeAssignments(counselorAssignmentItems);

  return {
    assignedClients: clients.filter((client) => isAssignedToCounselor(client, currentUser)),
    unscheduledClients: counselorUnscheduledClients,
    noteGapItems: counselorNoteGapItems,
    noteGapCounts,
    assignmentItems: counselorAssignmentItems,
    assignmentCounts,
    highTouchpointClients: counselorHighTouchpointClients,
    intakePreviewItems: counselorIntakePreviewItems,
  };
}
