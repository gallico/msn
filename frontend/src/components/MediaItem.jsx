// frontend/src/components/MediaItem.js
import React, { useState } from "react";

function MediaItem({ item, onClick }) {
    const [thumbError, setThumbError] = useState(false); // NEW: track thumb load error

    const handleItemClick = () => {
        if (onClick) onClick(item);
    };

    const thumbUrl = item.thumb || item.src;
    const isVideo = item.type === "video";

    const handleThumbError = () => {
        setThumbError(true); // NEW: mark as failed
    };

    return (
        <div className="media-item" onClick={handleItemClick}>
            {thumbError ? (
                // NEW: Fallback icon for failed thumbs
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
