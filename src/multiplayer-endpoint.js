export function multiplayerEndpoint(configured, pageUrl) {
  const page = new URL(pageUrl);
  const url = new URL(configured?.trim() || '/room', page);
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error('The multiplayer server address is invalid. Solo play is still available.');
  }
  if (page.protocol === 'https:' && url.protocol !== 'wss:') {
    throw new Error('Multiplayer needs a secure server connection. Solo play is still available.');
  }
  if (url.pathname === '/') url.pathname = '/room';
  const health = new URL('/health', url);
  health.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  return { socketUrl: url.href, healthUrl: health.href };
}

// Wake sleeping hosts before upgrading. The caller owns the connection deadline.
export async function checkRoomServer(healthUrl, signal, request = fetch) {
  let response;
  try {
    response = await request(healthUrl, { signal, cache: 'no-store', credentials: 'omit' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('The multiplayer server could not be reached. Please try again shortly; solo play is available.');
  }
  if (response.status === 404) {
    throw new Error('Multiplayer hasn’t been connected to this site yet. You can still drive solo.');
  }
  let health;
  try { health = await response.json(); } catch { /* Static fallback pages are not room servers. */ }
  if (!response.ok || health?.ok !== true || health?.service !== 'elsewhere-rooms') {
    throw new Error('The multiplayer server is unavailable or this site’s server address needs updating. Solo play is still available.');
  }
}
