import React, { useMemo, useState } from "react";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/bg-remove`;


export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [outputUrl, setOutputUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const isValidFile = useMemo(() => {
    if (!file) return false;
    return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  }, [file]);

  const onSelectFile = (f: File | null) => {
    setError("");
    setOutputUrl("");
    setFile(f);

    if (!f) {
      setPreviewUrl("");
      return;
    }

    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleRemoveBackground = async () => {
    try {
      setError("");

      if (!file) {
        setError("Please select an image.");
        return;
      }
      if (!isValidFile) {
        setError("Only JPG / PNG / WEBP supported.");
        return;
      }

      setLoading(true);
      setOutputUrl("");

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(API_URL, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = await res.json();

      if (!data?.output_url) {
        throw new Error("Invalid API response.");
      }

      setOutputUrl(data.output_url);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-indigo-400 mb-2">
          Background Remover
        </h2>
        <p className="text-gray-300">
          Upload an image and remove background automatically (server-side).
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-500"
            onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={handleRemoveBackground}
            disabled={loading || !file}
            className={`px-5 py-2 rounded-lg font-semibold transition ${
              loading || !file
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {loading ? "Processing..." : "Remove Background"}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">Input Preview</div>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="rounded-lg max-h-[360px] object-contain w-full"
              />
            ) : (
              <div className="text-gray-500 text-sm">No image selected.</div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">Output PNG</div>

            {outputUrl ? (
              <>
                <img
                  src={outputUrl}
                  alt="output"
                  className="rounded-lg max-h-[360px] object-contain w-full"
                />

                <a
                  href={outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold"
                >
                  Download PNG
                </a>
              </>
            ) : (
              <div className="text-gray-500 text-sm">
                Output will appear here after processing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
