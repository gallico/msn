import React, { useRef, useState } from "react";

function ZipUpload({ currentDir, onDone }) {
    const inputRef = useRef(null);
    const [status, setStatus] = useState(null); // null | "uploading" | "ok" | "error"
    const [message, setMessage] = useState("");

    const handleChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = "";

        setStatus("uploading");
        setMessage("");

        const form = new FormData();
        form.append("file", file);
        if (currentDir) form.append("targetDir", currentDir);

        try {
            const res = await fetch("/api/upload/zip", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setStatus("ok");
            setMessage(`Extracted to /${data.extractedTo}`);
            onDone();
        } catch (err) {
            setStatus("error");
            setMessage(err.message);
        }
    };

    return (
        <div className="zip-upload">
            <input
                ref={inputRef}
                type="file"
                accept=".zip"
                style={{ display: "none" }}
                onChange={handleChange}
            />
            <button
                className="zip-upload-btn"
                onClick={() => inputRef.current.click()}
                disabled={status === "uploading"}
            >
                {status === "uploading" ? "Uploading…" : "Upload ZIP"}
            </button>
            {status === "ok" && (
                <span className="zip-status zip-ok">{message}</span>
            )}
            {status === "error" && (
                <span className="zip-status zip-error">{message}</span>
            )}
        </div>
    );
}

export default ZipUpload;
