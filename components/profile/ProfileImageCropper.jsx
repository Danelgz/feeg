import { useState } from "react";

function createCroppedImage(imageSrc, scale, posX, posY, visualSize = 150) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 600; // Tamaño final de alta calidad
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);

      const imgRatio = img.width / img.height;
      let drawW, drawH;

      // Ajustar imagen para cubrir el cuadrado
      if (imgRatio > 1) {
        drawH = size * scale;
        drawW = drawH * imgRatio;
      } else {
        drawW = size * scale;
        drawH = drawW / imgRatio;
      }

      const factor = size / visualSize;
      const x = size / 2 - drawW / 2 + posX * factor;
      const y = size / 2 - drawH / 2 + posY * factor;

      ctx.drawImage(img, x, y, drawW, drawH);

      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    };
  });
}

/**
 * Overlay de recorte de foto a pantalla completa. Se le pasa `key={sourcePhotoURL}` desde el
 * padre para que el estado de zoom/posición se reinicie solo al seleccionar una foto nueva,
 * en vez de necesitar un useEffect de reset aquí.
 */
export default function ProfileImageCropper({ sourcePhotoURL, onSave, onClose }) {
  const [scale, setScale] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - posX, y: clientY - posY });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
    setPosX(clientX - dragStart.x);
    setPosY(clientY - dragStart.y);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    const visualSize = Math.min(window.innerWidth - 40, 400);
    const croppedBlob = await createCroppedImage(sourcePhotoURL, scale, posX, posY, visualSize);
    const croppedURL = URL.createObjectURL(croppedBlob);
    setIsProcessing(false);
    onSave(croppedURL);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#111", zIndex: 6000, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div style={{ color: "#fff", fontWeight: "600" }}>Ajustar imagen</div>
        <button onClick={handleConfirm} style={{ background: "none", border: "none", color: "#1dd1a1", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
        <div
          style={{
            width: "min(calc(100vw - 40px), 400px)",
            height: "min(calc(100vw - 40px), 400px)",
            border: "2px solid #fff",
            position: "relative",
            overflow: "hidden",
            zIndex: 10,
            boxShadow: "0 0 0 1000px rgba(0,0,0,0.7)",
          }}
        >
          {sourcePhotoURL && (
            <img
              src={sourcePhotoURL}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale}) translate(${posX}px, ${posY}px)`,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
              }}
            />
          )}
        </div>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: "#111" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", color: "#888", fontSize: "0.8rem", fontWeight: "bold" }}>
            <span>ZOOM</span>
            <span>{scale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#1dd1a1", cursor: "pointer", height: "4px", backgroundColor: "#333", borderRadius: "2px", appearance: "none" }}
          />

          <div style={{ marginTop: "40px", display: "flex", justifyContent: "center", gap: "40px" }}>
            <button
              onClick={() => {
                setScale(1);
                setPosX(0);
                setPosY(0);
              }}
              style={{ background: "none", border: "none", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              <span style={{ fontSize: "0.7rem", color: "#888" }}>RESET</span>
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", border: "2px solid #1dd1a1", borderRadius: "2px" }}></div>
              <span style={{ fontSize: "0.7rem", color: "#1dd1a1" }}>1:1</span>
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 7000 }}>
          <div style={{ color: "#1dd1a1", fontWeight: "bold" }}>Procesando...</div>
        </div>
      )}
    </div>
  );
}
