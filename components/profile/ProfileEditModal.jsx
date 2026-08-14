import { useEffect } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function getInitial(value) {
  return String(value || "F").trim().charAt(0).toUpperCase() || "F";
}

const DESCRIPTION_MAX_LENGTH = 160;

/** Editor de perfil: identidad, foto local, descripción y configuración de rangos. */
export default function ProfileEditModal({ isDark = true, open, editData, setEditData, isProcessingImage, saving, justSaved = false, onFileSelected, onSave, onClose }) {
  const tk = getTokens(isDark);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const updateField = (field, value) => {
    setEditData((previous) => ({ ...previous, [field]: value }));
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: "13px",
    border: `1px solid ${tk.border}`,
    backgroundColor: tk.surfaceAlt,
    color: tk.text,
    outline: "none",
    font: "inherit",
    fontSize: "0.92rem",
    transition: "border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
  };
  const labelStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", color: tk.text, fontSize: "0.78rem", fontWeight: 700, marginBottom: "8px" };
  const secondaryText = { color: tk.textMuted, fontSize: "0.78rem", lineHeight: 1.5 };
  const displayName = editData.firstName || editData.username || "Tu perfil";
  const descriptionValue = editData.description === "Sin descripción" ? "" : editData.description;
  const descriptionLength = descriptionValue.length;

  return (
    <div
      className="profile-edit-overlay"
      role="presentation"
      onClick={onClose}
      style={{ backgroundColor: "rgba(4, 8, 8, 0.74)" }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");
        @keyframes profileEditOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes profileEditDialogIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes profileEditPop { 0% { transform: scale(1); } 40% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .profile-edit-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; width: 100%; max-width: 100%; box-sizing: border-box; padding: 18px; overflow: hidden; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); animation: profileEditOverlayIn 200ms ease-out; }
        .profile-edit-dialog { width: 100%; max-width: 760px; min-width: 0; max-height: min(820px, calc(100dvh - 36px)); display: flex; flex-direction: column; overflow: hidden; border-radius: 28px; box-shadow: 0 28px 90px rgba(0,0,0,0.42); font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif; animation: profileEditDialogIn 260ms cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) { .profile-edit-overlay, .profile-edit-dialog { animation: none; } }
        .profile-edit-header { display: flex; align-items: flex-start; justify-content: space-between; min-width: 0; max-width: 100%; gap: 24px; padding: 28px 32px 24px; border-bottom: 1px solid ${tk.border}; box-sizing: border-box; }
        .profile-edit-kicker { color: ${tk.accent}; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
        .profile-edit-header h2 { margin: 7px 0 5px; font-size: clamp(1.45rem, 3vw, 1.85rem); line-height: 1; letter-spacing: -0.05em; }
        .profile-edit-header p { min-width: 0; max-width: 440px; margin: 0; color: ${tk.textMuted}; font-size: 0.86rem; line-height: 1.5; }
        .profile-edit-close { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border: 1px solid ${tk.border}; border-radius: 12px; background: transparent; color: ${tk.textMuted}; cursor: pointer; transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease; }
        .profile-edit-close:hover { background: ${tk.surfaceHover}; color: ${tk.text}; border-color: ${tk.textMuted}; transform: rotate(4deg); }
        .profile-edit-shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); width: 100%; max-width: 100%; min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; }
        .profile-edit-aside { display: flex; flex-direction: column; align-items: center; min-width: 0; max-width: 100%; gap: 14px; padding: 30px 24px; border-right: 1px solid ${tk.border}; text-align: center; box-sizing: border-box; }
        .profile-edit-photo { position: relative; width: 148px; height: 148px; flex: 0 0 auto; display: grid; place-items: center; overflow: hidden; border: 1px solid ${tk.accent}66; border-radius: 38px; background: ${tk.accentSoft}; color: ${tk.accent}; box-shadow: 0 16px 40px ${tk.accent}18; cursor: pointer; transition: box-shadow 180ms ease, transform 180ms ease; }
        .profile-edit-photo:hover { box-shadow: 0 20px 48px ${tk.accent}30; transform: translateY(-1px); }
        .profile-edit-photo:hover .profile-edit-photo-hover { opacity: 1; }
        .profile-edit-photo img { width: 100%; height: 100%; object-fit: cover; }
        .profile-edit-photo input { display: none; }
        .profile-edit-photo-hover { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(4, 8, 8, 0.6); color: #fff; font-size: 0.7rem; font-weight: 700; opacity: 0; transition: opacity 180ms ease; }
        .profile-edit-photo-badge { position: absolute; right: -2px; bottom: -2px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: ${tk.accent}; color: ${tk.onAccent}; border: 3px solid ${tk.surface}; box-shadow: 0 6px 16px ${tk.accent}44; }
        .profile-edit-photo-loading { position: absolute; inset: 0; display: grid; place-items: center; background: ${tk.surface}cc; color: ${tk.accent}; font-size: 0.75rem; font-weight: 700; }
        .profile-edit-photo-name { min-width: 0; max-width: 100%; overflow: hidden; color: ${tk.text}; font-size: 0.94rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
        .profile-edit-form { min-width: 0; max-width: 100%; padding: 28px 32px 30px; box-sizing: border-box; }
        .profile-edit-section + .profile-edit-section { margin-top: 28px; padding-top: 26px; border-top: 1px solid ${tk.border}; }
        .profile-edit-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .profile-edit-section-title { color: ${tk.text}; font-size: 0.94rem; font-weight: 800; }
        .profile-edit-section-note { color: ${tk.textFaint}; font-size: 0.72rem; }
        .profile-edit-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .profile-edit-field + .profile-edit-field { margin-top: 14px; }
        .profile-edit-field-grid .profile-edit-field + .profile-edit-field { margin-top: 0; }
        .profile-edit-sex-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .profile-edit-sex-option { min-width: 0; max-width: 100%; min-height: 44px; overflow: hidden; padding: 8px; border-radius: 12px; font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease; }
        .profile-edit-sex-option:hover { transform: translateY(-1px); }
        .profile-edit-footer { display: flex; justify-content: flex-end; min-width: 0; max-width: 100%; gap: 10px; padding: 18px 32px 22px; border-top: 1px solid ${tk.border}; box-sizing: border-box; }
        .profile-edit-action { min-width: 0; max-width: 100%; min-height: 44px; padding: 0 18px; border-radius: 12px; font: inherit; font-size: 0.84rem; font-weight: 800; cursor: pointer; transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, opacity 180ms ease; }
        .profile-edit-action:hover:not(:disabled) { transform: translateY(-1px); }
        .profile-edit-action:active:not(:disabled) { transform: scale(0.98); }
        .profile-edit-action-saved { animation: profileEditPop 320ms ease; }
        .profile-edit-description-count { text-align: right; margin-top: 6px; color: ${tk.textFaint}; font-size: 0.7rem; }
        .profile-edit-description-count.is-near-limit { color: ${tk.accent}; }
        @media (max-width: 680px) { .profile-edit-overlay { align-items: flex-end; padding: 0; } .profile-edit-dialog { max-height: 100dvh; border-radius: 24px 24px 0 0; } .profile-edit-header { padding: 24px 20px 20px; } .profile-edit-shell { grid-template-columns: 1fr; } .profile-edit-aside { display: grid; grid-template-columns: 88px minmax(0, 1fr); align-items: center; gap: 12px 16px; padding: 20px; border-right: 0; border-bottom: 1px solid ${tk.border}; text-align: left; } .profile-edit-photo { grid-row: span 2; width: 88px; height: 88px; border-radius: 24px; } .profile-edit-photo-badge { width: 26px; height: 26px; } .profile-edit-photo-name { align-self: end; } .profile-edit-form { padding: 24px 20px 28px; } .profile-edit-field-grid { grid-template-columns: 1fr; gap: 14px; } .profile-edit-field-grid .profile-edit-field + .profile-edit-field { margin-top: 0; } .profile-edit-sex-grid { grid-template-columns: 1fr; } .profile-edit-footer { flex-wrap: wrap; padding: 16px 20px 20px; } .profile-edit-action { flex: 1 1 0; } }
      `}</style>

      <div
        className="profile-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(event) => event.stopPropagation()}
        style={{ backgroundColor: tk.surface, color: tk.text }}
      >
        <header className="profile-edit-header">
          <div>
            <div className="profile-edit-kicker">FEEG · Identidad</div>
            <h2 id="profile-edit-title">Personalizar perfil</h2>
            <p>Haz que tu perfil se sienta tuyo. Estos datos se muestran junto a tus entrenamientos.</p>
          </div>
          <button type="button" className="profile-edit-close" onClick={onClose} disabled={saving} aria-label="Cerrar edición de perfil">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="profile-edit-shell">
          <aside className="profile-edit-aside">
            <label className="profile-edit-photo" aria-label="Cambiar foto de perfil">
              {editData.photoURL ? (
                <img src={editData.photoURL} alt="Vista previa de tu foto de perfil" />
              ) : (
                <span style={{ fontSize: "2.7rem", fontWeight: 800 }}>{getInitial(editData.firstName || editData.username)}</span>
              )}
              <div className="profile-edit-photo-hover" aria-hidden="true">
                <Icon name="edit" size={18} />
                Cambiar foto
              </div>
              <div className="profile-edit-photo-badge" aria-hidden="true">
                <Icon name="edit" size={14} />
              </div>
              {isProcessingImage && <div className="profile-edit-photo-loading">Subiendo…</div>}
              <input
                type="file"
                accept="image/*"
                disabled={isProcessingImage || saving}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileSelected(file);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="profile-edit-photo-name">{displayName}</div>
            <p style={{ ...secondaryText, margin: 0 }}>Toca tu foto para cambiarla y ajústala antes de guardarla.</p>
          </aside>

          <form
            id="profile-edit-form"
            className="profile-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!saving) onSave();
            }}
          >
            <section className="profile-edit-section">
              <div className="profile-edit-section-heading">
                <div className="profile-edit-section-title">Identidad</div>
                <div className="profile-edit-section-note">Lo que verá la comunidad</div>
              </div>
              <div className="profile-edit-field-grid">
                <div className="profile-edit-field">
                  <label htmlFor="profile-username" style={labelStyle}>Usuario</label>
                  <input id="profile-username" value={editData.username} onChange={(event) => updateField("username", event.target.value)} placeholder="tu_usuario" style={inputStyle} autoComplete="username" />
                </div>
                <div className="profile-edit-field">
                  <label htmlFor="profile-first-name" style={labelStyle}>Nombre visible</label>
                  <input id="profile-first-name" value={editData.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="Tu nombre" style={inputStyle} autoComplete="given-name" />
                </div>
              </div>
            </section>

            <section className="profile-edit-section">
              <div className="profile-edit-section-heading">
                <label htmlFor="profile-description" className="profile-edit-section-title">Sobre ti</label>
                <div className="profile-edit-section-note">Una frase breve funciona mejor</div>
              </div>
              <textarea
                id="profile-description"
                value={descriptionValue}
                onChange={(event) => updateField("description", event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                placeholder="¿Qué te mueve a entrenar?"
                rows={4}
                maxLength={DESCRIPTION_MAX_LENGTH}
                style={{ ...inputStyle, minHeight: "104px", lineHeight: 1.5, resize: "vertical" }}
              />
              <div className={`profile-edit-description-count${descriptionLength >= DESCRIPTION_MAX_LENGTH - 20 ? " is-near-limit" : ""}`}>
                {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
              </div>
            </section>

            <section className="profile-edit-section">
              <div className="profile-edit-section-heading">
                <div className="profile-edit-section-title">Rangos de fuerza</div>
                <div className="profile-edit-section-note">Opcional</div>
              </div>
              <p style={{ ...secondaryText, margin: "0 0 12px" }}>Usamos este dato para ajustar tus rangos de fuerza. También puedes dejarlo sin indicar.</p>
              <div className="profile-edit-sex-grid">
                {[
                  { key: "male", label: "Hombre" },
                  { key: "female", label: "Mujer" },
                  { key: null, label: "Prefiero no decirlo" },
                ].map((option) => {
                  const active = (editData.sex ?? null) === option.key;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className="profile-edit-sex-option"
                      aria-pressed={active}
                      onClick={() => updateField("sex", option.key)}
                      style={{ border: `1px solid ${active ? tk.accent : tk.border}`, backgroundColor: active ? tk.accentSoft : "transparent", color: active ? tk.accent : tk.textMuted }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </form>
        </div>

        <footer className="profile-edit-footer" style={{ backgroundColor: tk.surface }}>
          <button type="button" className="profile-edit-action" onClick={onClose} disabled={saving} style={{ border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, opacity: saving ? 0.6 : 1 }}>
            Cancelar
          </button>
          <button
            type="submit"
            form="profile-edit-form"
            className={`profile-edit-action${justSaved ? " profile-edit-action-saved" : ""}`}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", border: `1px solid ${tk.accent}`, backgroundColor: tk.accent, color: tk.onAccent, opacity: saving && !justSaved ? 0.7 : 1 }}
          >
            {justSaved ? (
              <>
                <Icon name="check" size={16} />
                ¡Guardado!
              </>
            ) : saving ? (
              "Guardando…"
            ) : (
              "Guardar cambios"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
