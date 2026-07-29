import React, { useEffect, useRef } from 'react';
import { feedState } from '../lib/cameraFeed';
import { useStore } from '../store';

/**
 * The live rear camera, painted behind the canvas.
 *
 * Off by default in every mode. The scene is a drawing reference first, and a
 * clean field reads better than a busy room - but with the feed on, the metric
 * grid and the horizon lie over the actual floor you are standing on, which is
 * the whole point of walking the scene at 1:1.
 */
export const CameraFeed: React.FC<{ onError: (message: string) => void }> = ({ onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError('This browser will not share a camera with the page.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          // The lens match needs the stream's own size, not the element's.
          const publish = () => {
            feedState.videoWidth = videoRef.current?.videoWidth ?? 0;
            feedState.videoHeight = videoRef.current?.videoHeight ?? 0;
            useStore.getState().noteFeedSize();
          };
          publish();
          videoRef.current.addEventListener('loadedmetadata', publish);
          videoRef.current.addEventListener('resize', publish);
        }
      } catch {
        // Denied, already in use, or not served over https.
        onError('Camera unavailable. Needs permission and a secure (https) connection.');
      }
    };

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      feedState.videoWidth = 0;
      feedState.videoHeight = 0;
    };
  }, [onError]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="fixed inset-0 w-full h-full object-cover"
      style={{ zIndex: 0 }}
    />
  );
};
