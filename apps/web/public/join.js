/**
 * join.js — client-facing video session join page.
 *
 * Flow:
 *  1. Read ?token=<opaque> from URL.
 *  2. Call GET /api/v1/video/join/<token> to exchange token for a JaaS JWT.
 *  3. Show "Join" button once token is validated.
 *  4. On button click: load 8x8.vc external API and launch Jitsi.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token') || '';

  const btnEl    = document.getElementById('join-btn');
  const statusEl = document.getElementById('join-status');
  const errorEl  = document.getElementById('join-error');

  let sessionJwt    = null;
  let sessionDomain = null;
  let sessionRoom   = null;
  let sessionAppId  = null;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    statusEl.style.display = 'none';
    btnEl.disabled = true;
    btnEl.textContent = 'Unavailable';
  }

  function ready() {
    btnEl.textContent = 'Join Video Session';
    btnEl.disabled = false;
    statusEl.style.display = 'none';
  }

  // Step 1: Validate token and fetch session details
  async function init() {
    if (!token) {
      showError('No session token found. Please use the link your counselor shared with you.');
      return;
    }

    try {
      const resp = await fetch('/api/v1/video/join/' + encodeURIComponent(token), {
        method: 'GET',
        credentials: 'omit',   // public endpoint — no cookies needed
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        showError(body.error || 'This session link is no longer valid or has expired.');
        return;
      }

      const data = await resp.json();
      sessionJwt    = data.jwt    || null;
      sessionDomain = data.domain || '8x8.vc';
      sessionRoom   = data.roomName || null;
      sessionAppId  = data.appId  || null;

      if (!sessionRoom) {
        showError('Session details could not be loaded. Please contact your counselor.');
        return;
      }

      ready();
    } catch (err) {
      showError('Could not verify session link. Check your connection and try again.');
    }
  }

  // Step 2: On button click, load Jitsi and launch the meeting
  window.startJoin = async function startJoin() {
    btnEl.disabled = true;
    btnEl.textContent = 'Connecting…';
    statusEl.textContent = 'Loading video…';
    statusEl.style.display = 'block';

    // Determine the JaaS script URL.
    // If we have an appId this is a JaaS-hosted room; use the full external_api URL.
    const scriptSrc = sessionAppId
      ? `https://${sessionDomain}/${sessionAppId}/external_api.js`
      : `https://${sessionDomain}/external_api.js`;

    try {
      await loadScript(scriptSrc);
    } catch {
      showError(
        'Could not load the video library. Make sure your browser allows connections to ' +
        sessionDomain + ' and try again.',
      );
      return;
    }

    if (typeof JitsiMeetExternalAPI === 'undefined') {
      showError('Video library failed to initialise. Please refresh the page and try again.');
      return;
    }

    // Show the full-screen frame and hide the card
    const frameEl = document.getElementById('video-frame');
    const cardEl  = document.getElementById('join-card');
    frameEl.style.display = 'block';
    cardEl.style.display  = 'none';

    // The room name for JitsiMeetExternalAPI must be just the opaque ID part
    // (everything after the last '/').  The domain and appId are passed separately.
    const opaqueRoom = sessionRoom.includes('/')
      ? sessionRoom.split('/').pop()
      : sessionRoom;

    const api = new JitsiMeetExternalAPI(sessionDomain, {
      roomName: sessionRoom,    // full "appId/opaqueId" form (JaaS requirement)
      jwt:      sessionJwt,
      parentNode: frameEl,
      width:    '100%',
      height:   '100%',
      userInfo: { displayName: 'Client' },
      configOverwrite: {
        startWithAudioMuted:  false,
        startWithVideoMuted:  false,
        disableDeepLinking:   true,
        prejoinPageEnabled:   false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'hangup', 'chat',
          'tileview', 'fullscreen', 'settings',
        ],
      },
    });

    api.addEventListener('videoConferenceLeft', function () {
      frameEl.style.display = 'none';
      cardEl.style.display  = 'block';
      statusEl.textContent  = 'You have left the session.';
      statusEl.style.display = 'block';
      btnEl.textContent  = 'Rejoined';
      btnEl.disabled     = true;
    });
  };

  // Helper: load an external script dynamically
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Boot
  init();
}());
