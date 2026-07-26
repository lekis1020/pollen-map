export async function fetchPollen(lat, lng) {
  const res = await fetch(`/api/pollen?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error(`pollen ${res.status}`);
  return res.json();
}
