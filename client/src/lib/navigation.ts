export function openNativeNavigation(address: string, lat?: number, lng?: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  const encodedAddress = encodeURIComponent(address);
  
  let url: string;
  
  if (lat && lng) {
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    } else if (isAndroid) {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${encodedAddress})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  } else {
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
    } else if (isAndroid) {
      url = `geo:0,0?q=${encodedAddress}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }
  }
  
  window.open(url, "_blank");
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
