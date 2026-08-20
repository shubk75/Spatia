/**
 * API client for the AI-Assisted Immersive Reconstruction Backend.
 */

const API_BASE = '/api';

export async function fetchProject() {
  const res = await fetch(`${API_BASE}/project`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function setProjectMode(mode) {
  const res = await fetch(`${API_BASE}/project/set-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to set project mode');
  return res.json();
}

export async function createRoom(name, category = 'living_room') {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category }),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function uploadFace(roomId, direction, file) {
  const formData = new FormData();
  formData.append('direction', direction);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/rooms/${roomId}/upload-face`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload face image');
  return res.json();
}

export async function runQualityScan(roomId, direction = null) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/quality-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) throw new Error('Failed to run quality scan');
  return res.json();
}

export async function addManualBox(roomId, faceDirection, { x, y, width, height, issue_type, description }) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/manual-box`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      face_direction: faceDirection,
      x,
      y,
      width,
      height,
      issue_type: issue_type || 'blur',
      description: description || 'User-drawn unclear area',
    }),
  });
  if (!res.ok) throw new Error('Failed to add manual box');
  return res.json();
}

export async function triggerAiReconstruction(roomId, faceDirection, regionId, method = 'telea') {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/reconstruct-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      face_direction: faceDirection,
      region_id: regionId,
      method,
    }),
  });
  if (!res.ok) throw new Error('Failed to trigger AI reconstruction');
  return res.json();
}

export async function triggerPhotoPatch(roomId, faceDirection, regionId, patchFile) {
  const formData = new FormData();
  formData.append('face_direction', faceDirection);
  formData.append('region_id', regionId);
  formData.append('patch_file', patchFile);

  const res = await fetch(`${API_BASE}/rooms/${roomId}/reconstruct-patch`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to align and blend photo patch');
  return res.json();
}

export async function verifyCorrection(roomId, candidateId, action, verificationNotes = '') {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/verify-correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidateId,
      action,
      verification_notes: verificationNotes,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit verification');
  return res.json();
}

export async function stitchRoom(roomId) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/stitch`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to stitch 360 cubemap');
  return res.json();
}

export async function createHotspot(roomId, { target_room_id, label, yaw_deg, pitch_deg, icon_type }) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/hotspots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_room_id,
      label,
      yaw_deg: parseFloat(yaw_deg),
      pitch_deg: parseFloat(pitch_deg),
      icon_type: icon_type || 'door',
    }),
  });
  if (!res.ok) throw new Error('Failed to create hotspot');
  return res.json();
}

export async function deleteHotspot(roomId, hotspotId) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/hotspots/${hotspotId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete hotspot');
  return res.json();
}

export async function expertSignoff(roomId, expertName, expertNotes, isApproved = true) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/signoff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expert_name: expertName,
      expert_notes: expertNotes,
      is_approved: isApproved,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit expert signoff');
  return res.json();
}

export async function loadSampleDataset(datasetType = 'heritage') {
  const res = await fetch(`${API_BASE}/sample-datasets/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_type: datasetType }),
  });
  if (!res.ok) throw new Error('Failed to load demo dataset');
  return res.json();
}

export async function fetchMlModels() {
  const res = await fetch(`${API_BASE}/ml/models`);
  if (!res.ok) throw new Error('Failed to fetch ML models');
  return res.json();
}

export async function setActiveMlModel(detector, reconstructor) {
  const res = await fetch(`${API_BASE}/ml/set-active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ detector, reconstructor }),
  });
  if (!res.ok) throw new Error('Failed to set active ML model');
  return res.json();
}
