import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchGalleryItems } from "../services/galleryApi";
import MediaItem from "./MediaItem";
import AttributePanel from "./AttributePanel";
import BulkAttrModal from "./BulkAttrModal";

function Gallery({ dir = "" }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0); // NEW: track position
    const [isFullscreen, setIsFullscreen] = useState(false);
    const modalRef = useRef(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetchGalleryItems(dir)
            .then(data => {
                setItems(data.items);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [dir]);

    const itemFilePath = (item) =>
        item.dir ? `${item.dir}/${item.id}` : item.id;

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
                case "ArrowLeft":
                    e.preventDefault();
                    goPrev();
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    goNext();
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
                        className={`modal-content ${isFullscreen ? "fullscreen" : ""}`}
                        ref={modalRef}
                        onClick={e => e.stopPropagation()}
                    >
                        {selectedItem.type === "image" ? (
                            <img
                                src={selectedItem.src}
                                alt={selectedItem.title}
                                className="modal-media"
                            />
                        ) : (
                            <video
                                src={selectedItem.src}
                                controls
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="modal-media"
                            />
                        )}

                        <div className="modal-controls">
                            {/* NEW: Nav buttons */}
                            <button
                                onClick={goPrev}
                                className="nav-btn prev-btn"
                                title="Previous (←)"
                            >
                                ‹
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="fullscreen-btn"
                                title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F11)"}
                            >
                                ⛶ {isFullscreen ? "⛶" : "⬜"}
                            </button>
                            <button
                                onClick={goNext}
                                className="nav-btn next-btn"
                                title="Next (→)"
                            >
                                ›
                            </button>
                            <button onClick={closeItem} className="close-btn">×</button>
                        </div>

                        <div className="modal-title">
                            {selectedItem.title}
                            <span className="position-indicator">
                ({currentIndex + 1} / {items.length})
              </span>
                        </div>

                        {!isFullscreen && (
                            <AttributePanel
                                filePath={
                                    selectedItem.dir
                                        ? `${selectedItem.dir}/${selectedItem.id}`
                                        : selectedItem.id
                                }
                            />
                        )}
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
