// frontend/src/components/MediaItem.js
import React, { useState } from "react";

function MediaItem({ item, onClick, selectMode = false, selected = false }) {
    const [thumbError, setThumbError] = useState(false);

    const handleItemClick = () => {
        if (onClick) onClick(item);
    };

    const thumbUrl = item.thumb || item.src;
    const isVideo = item.type === "video";

    const handleThumbError = () => {
        setThumbError(true); // NEW: mark as failed
    };

    return (
        <div
            className={`media-item${selectMode ? " select-mode" : ""}${selected ? " selected" : ""}`}
            onClick={handleItemClick}
        >
            {selectMode && (
                <div className="select-checkbox">{selected ? "☑" : "☐"}</div>
            )}
            {thumbError ? (
                <div className="thumb-fallback">
                    {isVideo ? "📹" : "🖼️"}
                </div>
            ) : (
                // Existing thumb logic with error handler
                isVideo ? (
                    <video
                        src={item.src}
                        poster={thumbUrl}
                        muted
                        playsInline
                        onError={handleThumbError}
                    />
                ) : (
                    <img
                        src={item.src}
                        alt={item.title}
                        loading="lazy"
                        onError={handleThumbError} // NEW: catch image load failures
                    />
                )
            )}
            <div className="media-title">
                {item.title}
            </div>
        </div>
    );
}

export default MediaItem;
