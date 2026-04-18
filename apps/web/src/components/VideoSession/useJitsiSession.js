import { useCallback, useEffect, useRef, useState } from 'react';

const EXTERNAL_API_SCRIPT_ID = 'jaas-external-api';

function loadJitsiScript(domain, appId) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(EXTERNAL_API_SCRIPT_ID)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = EXTERNAL_API_SCRIPT_ID;
    script.src = `https://${domain}/${appId}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JaaS External API script'));
    document.head.appendChild(script);
  });
}

/**
 * Manages a JaaS/Jitsi Meet video session embedded in a given container node.
 *
 * @param {object} opts
 * @param {string|null} opts.jwt     – short-lived RS256 JWT from the API
 * @param {string|null} opts.domain  – JaaS domain (default: 8x8.vc)
 * @param {string|null} opts.roomName – full room name: <appId>/<opaqueId>
 * @param {HTMLElement|null} opts.containerNode – DOM node to embed into
 * @param {() => void} [opts.onLeft] – called when the local user leaves
 */
export function useJitsiSession({ jwt, domain, roomName, containerNode, onLeft }) {
  const apiRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Derive appId from roomName: everything before the first "/"
  const appId = roomName ? roomName.split('/')[0] : null;

  const disposeApi = useCallback(() => {
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch (_) { /* noop */ }
      apiRef.current = null;
    }
    setLoaded(false);
  }, []);

  useEffect(() => {
    if (!jwt || !domain || !roomName || !containerNode || !appId) return;

    let cancelled = false;

    (async () => {
      try {
        await loadJitsiScript(domain, appId);
        if (cancelled) return;

        // JitsiMeetExternalAPI is injected onto window by the script
        const api = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: containerNode,
          jwt,
          configOverwrite: {
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop',
              'fullscreen', 'fodeviceselection', 'hangup', 'chat',
              'settings', 'videoquality', 'tileview',
            ],
          },
        });

        api.on('videoConferenceLeft', () => {
          disposeApi();
          onLeft?.();
        });

        api.on('readyToClose', () => {
          disposeApi();
          onLeft?.();
        });

        apiRef.current = api;
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to start video session');
      }
    })();

    return () => {
      cancelled = true;
      disposeApi();
    };
  }, [jwt, domain, roomName, containerNode, appId, disposeApi, onLeft]);

  return { loaded, error, disposeApi };
}
