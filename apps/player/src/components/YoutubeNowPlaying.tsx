import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../lib/colors';
import { PLAYER_AREA_HEIGHT, SCREEN } from '../lib/layout';
import { NeonBorder } from './NeonBorder';

function buildPlayerHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin: 0; padding: 0; background: #000; overflow: hidden; height: 100%; }
  #player { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  var player;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: '${videoId}',
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        controls: 0,
        rel: 0,
        cc_load_policy: 0,
        origin: 'https://localhost'
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }

  function onPlayerReady(event) {
    setInterval(function () {
      try {
        post({
          type: 'progress',
          position: player.getCurrentTime(),
          duration: player.getDuration()
        });
      } catch (e) {}
    }, 500);
  }

  function onPlayerStateChange(event) {
    post({ type: 'stateChange', data: event.data });
  }

  function onPlayerError(event) {
    post({ type: 'error', data: event.data });
  }
</script>
</body>
</html>`;
}

const YT_ENDED = 0;

const FRAME_MARGIN = 10;
const BORDER_WIDTH = 4;

const FRAME_WIDTH = Math.max(SCREEN.width - FRAME_MARGIN * 2, 0);
const FRAME_HEIGHT = Math.max(PLAYER_AREA_HEIGHT - FRAME_MARGIN * 2, 0);
const WEBVIEW_WIDTH = Math.max(FRAME_WIDTH - BORDER_WIDTH * 2, 0);
const WEBVIEW_HEIGHT = Math.max(FRAME_HEIGHT - BORDER_WIDTH * 2, 0);

export function YoutubeNowPlaying({
  videoId,
  onEnded,
  onError,
  onProgress,
}: {
  videoId: string;
  onEnded: () => void;
  onError: () => void;
  onProgress?: (position: number, duration: number) => void;
}) {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    return () => {
      webViewRef.current?.injectJavaScript(
        'try { if (window.player) { player.stopVideo(); player.destroy(); } } catch (e) {} true;'
      );
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <NeonBorder width={FRAME_WIDTH} height={FRAME_HEIGHT} borderWidth={BORDER_WIDTH}>
        <WebView
          ref={webViewRef}
          source={{ html: buildPlayerHtml(videoId), baseUrl: 'https://localhost/' }}
          style={{ width: WEBVIEW_WIDTH, height: WEBVIEW_HEIGHT, backgroundColor: '#000' }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'stateChange') {
                if (msg.data === YT_ENDED) onEnded();
              } else if (msg.type === 'progress') {
                onProgress?.(msg.position ?? 0, msg.duration ?? 0);
              } else if (msg.type === 'error') {
                onError();
              }
            } catch {
              // ignore malformed/unexpected messages
            }
          }}
        />
      </NeonBorder>
    </View>
  );
}
