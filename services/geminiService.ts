export const removeBackground = async (
  base64Image: string,
  mimeType: string
): Promise<string> => {
  
  // This will make a request to /api/remove-background on the same host
  // where the frontend is served. We will configure Render to proxy this
  // request to our backend service.
  const response = await fetch('/api/remove-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown network error occurred.' }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.resultBase64) {
      throw new Error("API did not return an image.");
  }
  return data.resultBase64;
};
