import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchGalleryItems } from "../services/galleryApi";
import { fetchViewItems } from "../services/viewsApi";
import MediaItem from "./MediaItem";
import AttributePanel from "./AttributePanel";
import ClipsPanel from "./ClipsPanel";
import BulkAttrModal from "./BulkAttrModal";

function Gallery({ dir = "", viewId = null }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0); // NEW: track position
    const [isFullscreen, setIsFullscreen] = useState(false);
    const modalRef = useRef(null);
    const videoRef = useRef(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [slideshowActive, setSlideshowActive] = useState(false);
    const [slideshowDelay, setSlideshowDelay] = useState(3);
    const [showDelayInput, setShowDelayInput] = useState(false);
    const [activeClip, setActiveClip] = useState(null); // { id, startMs, endMs }

    useEffect(() => {
        setLoading(true);
        const fetchFn = viewId
            ? fetchViewItems(viewId)
            : fetchGalleryItems(dir);
        fetchFn
            .then(data => {
                setItems(data.items);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [dir, viewId]);

    const itemFilePath = (item) => {
        if (item.type === "clip") return item.id; // already "clip:42"
        return item.dir ? `${item.dir}/${item.id}` : item.id;
    };

    const openItem = (item) => {
        if (selectMode) {
            const fp = itemFilePath(item);
            setSelectedPaths((prev) => {
                const next = new Set(prev);
                next.has(fp) ? next.delete(fp) : next.add(fp);
                return next;
            });
            return;
        }
        const index = items.findIndex(i => i.id === item.id);
        setCurrentIndex(index);
        setSelectedItem(item);
    };

    const toggleSelectMode = () => {
        setSelectMode((v) => !v);
        setSelectedPaths(new Set());
    };

    const selectAll = () => setSelectedPaths(new Set(items.map(itemFilePath)));
    const clearSelection = () => setSelectedPaths(new Set());

    const closeItem = () => {
        setSelectedItem(null);
        setSlideshowActive(false);
        setShowDelayInput(false);
        setActiveClip(null);
        exitFullscreen();
    };

    // NEW: Navigate to next/prev item
    const goToIndex = useCallback((index) => {
        const newIndex = (index + items.length) % items.length; // wrap around
        setCurrentIndex(newIndex);
        setSelectedItem(items[newIndex]);
    }, [items]);

    const goPrev = () => goToIndex(currentIndex - 1);
    const goNext = () => goToIndex(currentIndex + 1);

    // Fullscreen toggle (unchanged)
    const toggleFullscreen = useCallback(() => {
        if (!modalRef.current) return;

        if (!document.fullscreenElement) {
            modalRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error("Fullscreen failed:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    }, []);

    // NEW & IMPROVED: Keyboard handler with arrows
    useEffect(() => {
        if (!selectedItem) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case "Escape":
                    closeItem();
                    break;
                case " ":
                    if (selectedItem?.type === "image") {
                        e.preventDefault();
                        toggleSlideshow();
                    }
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    if (e.shiftKey && videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    } else {
                        goPrev();
                    }
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    if (e.shiftKey && videoRef.current) {
                        videoRef.current.currentTime = Math.min(
                            videoRef.current.duration || Infinity,
                            videoRef.current.currentTime + 10
                        );
                    } else {
                        goNext();
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedItem, currentIndex, items]); // deps include currentIndex & items

    // Fullscreen change listener (unchanged)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        };
    }, []);

    const exitFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    };

    // Slideshow auto-advance
    useEffect(() => {
        if (!slideshowActive || !selectedItem) return;
        const id = setTimeout(() => goToIndex(currentIndex + 1), slideshowDelay * 1000);
        return () => clearTimeout(id);
    }, [slideshowActive, slideshowDelay, currentIndex, selectedItem]);

    const toggleSlideshow = () => setSlideshowActive((v) => !v);

    // Set activeClip when opening a clip item from a view
    useEffect(() => {
        if (selectedItem?.type === "clip" && selectedItem.clip) {
            setActiveClip({ id: selectedItem.clip.id, startMs: selectedItem.clip.startMs, endMs: selectedItem.clip.endMs });
        } else if (selectedItem?.type !== "clip") {
            setActiveClip(null);
        }
    }, [selectedItem?.id]);

    const handleClipActive = useCallback((clip) => {
        if (!clip) { setActiveClip(null); return; }
        setActiveClip({ id: clip.id, startMs: clip.startMs, endMs: clip.endMs });
        if (videoRef.current) {
            videoRef.current.currentTime = (clip.startMs ?? 0) / 1000;
            videoRef.current.play().catch(() => {});
        }
    }, []);

    const handleVideoTimeUpdate = useCallback(() => {
        if (!activeClip || activeClip.endMs == null) return;
        if (videoRef.current && videoRef.current.currentTime * 1000 >= activeClip.endMs) {
            videoRef.current.pause();
        }
    }, [activeClip]);

    return (
        <div className="gallery">
            {loading && <div>Loading...</div>}

            <div className="gallery-toolbar">
                <button
                    className={`select-mode-btn${selectMode ? " active" : ""}`}
                    onClick={toggleSelectMode}
                >
                    {selectMode ? "Cancel" : "Select"}
                </button>
                {selectMode && (
                    <>
                        <span className="selection-count">
                            {selectedPaths.size} selected
                        </span>
                        <button onClick={selectAll}>All</button>
                        <button onClick={clearSelection}>None</button>
                        <button
                            className="btn-primary"
                            disabled={selectedPaths.size === 0}
                            onClick={() => setBulkModalOpen(true)}
                        >
                            Assign attributes…
                        </button>
                    </>
                )}
            </div>

            <div className="gallery-grid">
                {items.map(item => (
                    <MediaItem
                        key={item.id}
                        item={item}
                        onClick={openItem}
                        selectMode={selectMode}
                        selected={selectedPaths.has(itemFilePath(item))}
                    />
                ))}
            </div>

            {/* Modal / Lightbox */}
            {selectedItem && (
                <div className="modal-overlay" onClick={closeItem}>
                    <div
                        className={`modal-content${isFullscreen ? " fullscreen" : ""}`}
                        ref={modalRef}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Title bar always at the top */}
                        <div className="modal-title">
                            <span className="modal-title-text">{selectedItem.title}</span>
                            <span className="position-indicator">
                                ({currentIndex + 1} / {items.length})
                            </span>
                        </div>

                        {/* Body: row layout for videos (video + sidebar), column for images */}
                        <div className={`modal-body${!isFullscreen && selectedItem.type !== "image" ? " has-sidebar" : ""}`}>
                            <div className="modal-media-wrapper">
                                {selectedItem.type === "image" ? (
                                    <img
                                        ref={() => { videoRef.current = null; }}
                                        src={selectedItem.src}
                                        alt={selectedItem.title}
                                        className="modal-media"
                                    />
                                ) : (
                                    <video
                                        ref={videoRef}
                                        src={selectedItem.src}
                                        controls
                                        autoPlay
                                        muted
                                        loop={!activeClip}
                                        playsInline
                                        className="modal-media"
                                        onTimeUpdate={handleVideoTimeUpdate}
                                        onLoadedMetadata={() => {
                                            if (activeClip?.startMs != null && videoRef.current)
                                                videoRef.current.currentTime = activeClip.startMs / 1000;
                                        }}
                                    />
                                )}

                                {/* For images: attr-panel overlays the bottom of the media */}
                                {!isFullscreen && selectedItem.type === "image" && (
                                    <AttributePanel
                                        filePath={
                                            selectedItem.dir
                                                ? `${selectedItem.dir}/${selectedItem.id}`
                                                : selectedItem.id
                                        }
                                    />
                                )}

                                {/* Nav buttons */}
                                <button onClick={goPrev} className="nav-btn prev-btn" title="Previous (←)">‹</button>
                                <button onClick={goNext} className="nav-btn next-btn" title="Next (→)">›</button>

                                {/* Controls: top-right of the video/image area */}
                                <div className="modal-controls">
                                    <button
                                        onClick={toggleFullscreen}
                                        className="fullscreen-btn"
                                        title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F11)"}
                                    >
                                        {isFullscreen ? "⛶" : "⬜"}
                                    </button>
                                    <div className="slideshow-controls">
                                        <button
                                            className={`slideshow-btn${slideshowActive ? " active" : ""}`}
                                            onClick={toggleSlideshow}
                                            title={slideshowActive ? "Pause slideshow (Space)" : "Start slideshow (Space)"}
                                        >
                                            {slideshowActive ? "⏸" : "▶"}
                                        </button>
                                        <button
                                            className="slideshow-delay-btn"
                                            onClick={() => setShowDelayInput((v) => !v)}
                                            title="Set delay"
                                        >
                                            {slideshowDelay}s
                                        </button>
                                        {showDelayInput && (
                                            <input
                                                className="slideshow-delay-input"
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={slideshowDelay}
                                                onChange={(e) => setSlideshowDelay(Math.max(1, Number(e.target.value)))}
                                                onKeyDown={(e) => e.key === "Enter" && setShowDelayInput(false)}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                    <button onClick={closeItem} className="close-btn">×</button>
                                </div>
                            </div>

                            {/* Sidebar: attributes + clips, to the right of the video */}
                            {!isFullscreen && selectedItem.type !== "image" && (
                                <div className="modal-video-sidebar">
                                    <AttributePanel
                                        filePath={
                                            activeClip
                                                ? `clip:${activeClip.id}`
                                                : selectedItem.type === "clip"
                                                    ? selectedItem.id
                                                    : selectedItem.dir
                                                        ? `${selectedItem.dir}/${selectedItem.id}`
                                                        : selectedItem.id
                                        }
                                    />
                                    {(selectedItem.type === "video" || selectedItem.type === "clip") && (
                                        <ClipsPanel
                                            videoPath={
                                                selectedItem.type === "clip"
                                                    ? selectedItem.videoFilePath
                                                    : selectedItem.dir
                                                        ? `${selectedItem.dir}/${selectedItem.id}`
                                                        : selectedItem.id
                                            }
                                            videoRef={videoRef}
                                            activeClipId={activeClip?.id ?? null}
                                            onClipActive={handleClipActive}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {bulkModalOpen && (
                <BulkAttrModal
                    paths={[...selectedPaths]}
                    onClose={() => setBulkModalOpen(false)}
                    onDone={() => {
                        setBulkModalOpen(false);
                        setSelectMode(false);
                        setSelectedPaths(new Set());
                    }}
                />
            )}
        </div>
    );
}

export default Gallery;
