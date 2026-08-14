import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useUser } from '../../context/UserContext';
import MuscleMap from '../MuscleMap';
import type { MuscleGroup } from '../../data/muscleMapRegions';
import { Button, Card, Icon } from '../ui';
import { getTokens } from '../../lib/tokens';

type Photo = {
  id: string;
  label: string;
  dataUrl: string;
  fileName: string;
};

type ProgressMeasure = {
  id?: string | number;
  date?: string;
  timestamp?: number;
  photo?: string;
};

type MuscleFinding = {
  group: MuscleGroup;
  score: number;
  status: 'strength' | 'focus' | 'balanced';
  note: string;
};

type BodyAnalysis = {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  bodyFat: { estimate: string; range: string; disclaimer: string };
  symmetry: { score: number; note: string };
  proportions: Array<{ label: string; value: string; reading: string }>;
  evolution: { available: boolean; headline: string; points: string[] };
  muscles: MuscleFinding[];
  strengths: string[];
  focusAreas: string[];
  recommendations: string[];
};

const PHOTO_SLOTS = [
  { id: 'front', label: 'Frontal relajada' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
];

const MAX_IMAGE_EDGE = 1400;
const MAX_PHOTO_BYTES = 7 * 1024 * 1024;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Solo se admiten imágenes.'));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error('La imagen es demasiado grande. El máximo es 7 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('La imagen no es válida.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Tu navegador no permite preparar la imagen.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlParts(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Formato de imagen no válido.');
  return { mimeType: match[1], data: match[2] };
}

function formatDate(measure: ProgressMeasure) {
  const value = measure.date || (measure.timestamp ? new Date(measure.timestamp).toISOString() : '');
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function progressMeasureKey(measure: ProgressMeasure, index: number) {
  return String(measure.id ?? index);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function confidenceLabel(confidence: BodyAnalysis['confidence']) {
  return confidence === 'high' ? 'Confianza alta' : confidence === 'medium' ? 'Confianza media' : 'Confianza limitada';
}

function mapColor(score: number, tk: ReturnType<typeof getTokens>) {
  if (score >= 75) return { from: tk.heat[2], to: tk.heat[3] };
  if (score >= 50) return { from: tk.heat[0], to: tk.accent };
  return { from: tk.warning, to: tk.warning };
}

export default function BodyAnalyzer({ isDark, isMobile }: { isDark: boolean; isMobile: boolean }) {
  const { user, authUser, measures, showNotification } = useUser();
  const tk = getTokens(isDark);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('front');
  const [previousMeasureId, setPreviousMeasureId] = useState('');
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  const progressPhotos = useMemo(() => {
    const entries = Array.isArray(measures) ? (measures as ProgressMeasure[]) : [];
    return entries
      .filter((measure) => typeof measure.photo === 'string' && measure.photo.startsWith('data:image/'))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [measures]);

  const currentSlot = PHOTO_SLOTS.find((slot) => slot.id === selectedSlot) || PHOTO_SLOTS[0];
  const canAnalyze = photos.length >= 2 && status !== 'loading';

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setPhotos((current) => [
        ...current.filter((photo) => photo.id !== currentSlot.id),
        { id: currentSlot.id, label: currentSlot.label, dataUrl, fileName: file.name },
      ]);
      setError('');
      const nextSlot = PHOTO_SLOTS.find((slot) => !photos.some((photo) => photo.id === slot.id) && slot.id !== currentSlot.id);
      if (nextSlot) setSelectedSlot(nextSlot.id);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo cargar la imagen.';
      setError(message);
      showNotification(message, 'error');
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setSelectedSlot(photoId);
  };

  const analyze = async () => {
    if (!canAnalyze) return;
    if (!authUser?.uid) {
      setError('Inicia sesión para poder enviar las fotos al analizador.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const selectedPrevious = progressPhotos.find((measure, index) => progressMeasureKey(measure, index) === previousMeasureId);
      const currentImages = photos.map((photo) => ({ ...dataUrlParts(photo.dataUrl), label: photo.label }));
      const previousImages = selectedPrevious?.photo ? [{ ...dataUrlParts(selectedPrevious.photo), label: 'Foto anterior' }] : [];
      const response = await fetch('/api/body-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          currentImages,
          previousImages,
          userProfile: { sex: user?.sex, height: user?.height, weight: user?.weight, level: user?.level },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo completar el análisis.');
      setAnalysis(data.analysis as BodyAnalysis);
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'No se pudo completar el análisis.';
      setError(message);
      showNotification(message, 'error');
    } finally {
      setStatus('idle');
    }
  };

  const reset = () => {
    setAnalysis(null);
    setError('');
    setPhotos([]);
    setPreviousMeasureId('');
    setSelectedSlot('front');
  };

  if (analysis) {
    const muscleScores = Object.fromEntries(analysis.muscles.map((item) => [item.group, clampScore(item.score)])) as Partial<Record<MuscleGroup, number>>;
    const sex = user?.sex === 'female' ? 'female' : 'male';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tk.space.lg }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: tk.space.md, flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <div style={{ color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lectura completada</div>
            <h2 style={{ color: tk.text, margin: '4px 0 0', fontSize: isMobile ? tk.fontSize.xl : '1.7rem', lineHeight: 1.1 }}>Tu análisis físico</h2>
          </div>
          <Button isDark={isDark} variant="secondary" icon="plus" onClick={reset}>Nuevo análisis</Button>
        </div>

        <div style={{ padding: tk.space.lg, borderRadius: tk.radius.lg, background: `linear-gradient(135deg, ${tk.accentSoft}, ${tk.surface})`, border: `1px solid ${tk.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, marginBottom: tk.space.sm, color: tk.accent }}>
            <Icon name="zap" size={17} />
            <span style={{ fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{confidenceLabel(analysis.confidence)}</span>
          </div>
          <p style={{ margin: 0, color: tk.text, fontSize: tk.fontSize.lg, lineHeight: 1.5 }}>{analysis.summary}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: tk.space.md }}>
          <MetricCard tk={tk} label="Simetría estimada" value={`${clampScore(analysis.symmetry.score)}%`} detail={analysis.symmetry.note} />
          <MetricCard tk={tk} label="% graso orientativo" value={analysis.bodyFat.estimate} detail={analysis.bodyFat.range} />
          <MetricCard tk={tk} label="Fotos comparadas" value={`${photos.length}${previousMeasureId ? ' + 1' : ''}`} detail={previousMeasureId ? 'Incluye referencia anterior' : 'Lectura actual'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(300px, 0.95fr)', gap: tk.space.lg, alignItems: 'start' }}>
          <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
            <SectionHeading tk={tk} eyebrow="Mapa corporal" title="Dónde está tu margen" icon="user" />
            <MuscleMap
              isDark={isDark}
              sex={sex}
              seriesByMuscle={muscleScores}
              labelForGroup={(group) => group}
              colorForGroup={(group) => {
                const score = muscleScores[group];
                return score === undefined ? null : mapColor(score, tk);
              }}
              readoutForGroup={(group, value) => <span style={{ color: tk.text, fontSize: tk.fontSize.sm }}><strong>{group}</strong><span style={{ color: tk.textMuted }}> · {Math.round(value)} / 100 de desarrollo visual estimado</span></span>}
              ariaLabelForGroup={(group, value) => `${group}: ${Math.round(value)} sobre 100 de desarrollo visual estimado`}
              hint="Toca una zona para leer la estimación del analizador."
              legend={<MapLegend tk={tk} />}
            />
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: tk.space.md }}>
            <FindingCard tk={tk} title="Puntos fuertes" icon="trendUp" color={tk.accent} items={analysis.strengths} />
            <FindingCard tk={tk} title="Músculos a priorizar" icon="arrowRight" color={tk.warning} items={analysis.focusAreas} />
          </div>
        </div>

            <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
          <SectionHeading tk={tk} eyebrow="Proporciones" title="La lectura de conjunto" icon="barChart" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: tk.space.sm }}>
            {analysis.proportions.map((item) => <InfoRow key={item.label} tk={tk} label={item.label} value={item.value} detail={item.reading} />)}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: tk.space.md }}>
          <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
            <SectionHeading tk={tk} eyebrow="Siguiente bloque" title="Recomendaciones de entrenamiento" icon="dumbbell" />
            <ol style={{ margin: 0, paddingLeft: '20px', color: tk.text, display: 'flex', flexDirection: 'column', gap: tk.space.md }}>
              {analysis.recommendations.map((recommendation) => <li key={recommendation} style={{ paddingLeft: '4px', lineHeight: 1.5 }}>{recommendation}</li>)}
            </ol>
          </Card>
          <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
            <SectionHeading tk={tk} eyebrow="Evolución" title={analysis.evolution.headline} icon="trendUp" />
            {analysis.evolution.points.length > 0 ? <ul style={{ margin: 0, paddingLeft: '18px', color: tk.text, display: 'flex', flexDirection: 'column', gap: tk.space.sm }}>{analysis.evolution.points.map((point) => <li key={point} style={{ lineHeight: 1.5 }}>{point}</li>)}</ul> : <p style={{ color: tk.textMuted, margin: 0, lineHeight: 1.5 }}>Guarda otra foto de progreso y vuelve a analizarla para ver cambios en el tiempo.</p>}
          </Card>
        </div>

        <div style={{ display: 'flex', gap: tk.space.sm, alignItems: 'flex-start', padding: tk.space.md, borderRadius: tk.radius.md, backgroundColor: tk.warningSoft, color: tk.textMuted, fontSize: tk.fontSize.xs, lineHeight: 1.5 }}>
          <Icon name="alertCircle" size={17} color={tk.warning} />
          <span>{analysis.bodyFat.disclaimer} El análisis visual puede verse afectado por luz, postura, ropa y ángulo; no sustituye una valoración profesional.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tk.space.lg }}>
      <div style={{ padding: isMobile ? tk.space.lg : tk.space.xl, borderRadius: tk.radius.lg, background: `radial-gradient(circle at top right, ${tk.accentSoft}, transparent 48%), ${tk.surface}`, border: `1px solid ${tk.border}`, boxShadow: tk.shadow.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, color: tk.accent, marginBottom: tk.space.sm }}><Icon name="user" size={19} /><span style={{ fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Visión + entrenamiento</span></div>
        <h2 style={{ margin: '0 0 10px', color: tk.text, fontSize: isMobile ? '1.6rem' : '2rem', lineHeight: 1.08, letterSpacing: '-0.03em' }}>Conoce dónde estás para saber dónde ir.</h2>
        <p style={{ margin: 0, maxWidth: '620px', color: tk.textMuted, fontSize: tk.fontSize.md, lineHeight: 1.6 }}>Sube 2 o 3 fotos consistentes y FEEG te dará una lectura visual orientativa de desarrollo, simetría, proporciones y próximos pasos.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: tk.space.sm, marginTop: tk.space.lg }}>
          {['Fortalezas y prioridades', 'Simetría y proporciones', 'Mapa muscular visual'].map((label) => <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: tk.radius.pill, backgroundColor: tk.accentSoft, color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}><Icon name="check" size={13} />{label}</span>)}
        </div>
      </div>

        <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
        <SectionHeading tk={tk} eyebrow="Paso 1 · Fotos actuales" title="Elige 2 o 3 ángulos" icon="plus" />
        <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, lineHeight: 1.5, margin: `0 0 ${tk.space.md}` }}>Misma distancia, luz neutra y postura relajada. Las fotos se preparan en tu dispositivo y solo se envían al analizar.</p>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: tk.space.sm }}>
          {PHOTO_SLOTS.map((slot) => {
            const photo = photos.find((item) => item.id === slot.id);
            return <button key={slot.id} type="button" onClick={() => { setSelectedSlot(slot.id); fileInputRef.current?.click(); }} className="feeg-press feeg-hover" style={{ minHeight: isMobile ? '92px' : '178px', padding: photo ? '6px' : tk.space.md, borderRadius: tk.radius.md, border: `1px solid ${photo ? tk.accent : tk.border}`, backgroundColor: photo ? tk.surfaceAlt : tk.surfaceAlt, color: tk.text, cursor: 'pointer', position: 'relative', overflow: 'hidden', textAlign: 'left' }}>
              {photo ? <><img src={photo.dataUrl} alt={`Vista ${slot.label}`} style={{ width: '100%', height: '100%', minHeight: '158px', objectFit: 'cover', borderRadius: tk.radius.sm, display: 'block' }} /><span style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', padding: '6px 8px', borderRadius: tk.radius.sm, backgroundColor: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: tk.fontSize.xs }}>{slot.label}</span><span role="button" tabIndex={0} aria-label={`Eliminar ${slot.label}`} onClick={(event) => { event.stopPropagation(); removePhoto(slot.id); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); removePhoto(slot.id); } }} style={{ position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', borderRadius: tk.radius.full, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', color: '#fff' }}><Icon name="trash" size={14} /></span></> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: tk.space.sm, height: '100%', minHeight: isMobile ? '76px' : '154px' }}><span style={{ width: '38px', height: '38px', borderRadius: tk.radius.full, display: 'grid', placeItems: 'center', backgroundColor: tk.accentSoft, color: tk.accent }}><Icon name="plus" size={20} /></span><span style={{ fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium }}>{slot.label}</span><span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint }}>Añadir foto</span></div>}
            </button>;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: tk.space.md, alignItems: 'center', marginTop: tk.space.md, color: photos.length >= 2 ? tk.accent : tk.textMuted, fontSize: tk.fontSize.xs }}><span>{photos.length}/3 fotos añadidas · mínimo 2</span><span>{photos.length >= 2 ? 'Listo para analizar' : 'Añade otro ángulo'}</span></div>
      </Card>

      <Card isDark={isDark} onClick={() => undefined} style={{ padding: isMobile ? tk.space.md : tk.space.lg }}>
        <SectionHeading tk={tk} eyebrow="Paso 2 · Comparativa opcional" title="¿Quieres ver tu evolución?" icon="clock" />
        <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, lineHeight: 1.5, margin: `0 0 ${tk.space.md}` }}>Puedes contrastar el análisis con una foto guardada en Medidas. Si no eliges ninguna, recibirás solo la lectura actual.</p>
        {progressPhotos.length > 0 ? <select value={previousMeasureId} onChange={(event) => setPreviousMeasureId(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: tk.radius.md, border: `1px solid ${tk.border}`, backgroundColor: tk.surfaceAlt, color: tk.text, font: 'inherit' }}><option value="">Sin comparativa anterior</option>{progressPhotos.map((measure, index) => <option key={progressMeasureKey(measure, index)} value={progressMeasureKey(measure, index)}>{formatDate(measure)}</option>)}</select> : <div style={{ padding: tk.space.md, borderRadius: tk.radius.md, backgroundColor: tk.surfaceAlt, color: tk.textMuted, fontSize: tk.fontSize.sm }}>Aún no tienes fotos guardadas en Medidas. Puedes añadir una allí para compararla en el próximo análisis.</div>}
      </Card>

      {error && <div role="alert" style={{ display: 'flex', gap: tk.space.sm, alignItems: 'flex-start', padding: tk.space.md, borderRadius: tk.radius.md, backgroundColor: tk.dangerSoft, color: tk.text, fontSize: tk.fontSize.sm, lineHeight: 1.5 }}><Icon name="alertCircle" size={18} color={tk.danger} /><span>{error}</span></div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button isDark={isDark} onClick={analyze} disabled={!canAnalyze} icon="zap">{status === 'loading' ? 'Analizando fotos…' : 'Generar análisis físico'}</Button></div>

      <div style={{ display: 'flex', gap: tk.space.sm, alignItems: 'flex-start', padding: tk.space.md, borderRadius: tk.radius.md, backgroundColor: tk.surfaceAlt, color: tk.textMuted, fontSize: tk.fontSize.xs, lineHeight: 1.5 }}><Icon name="alertCircle" size={17} color={tk.warning} /><span>El porcentaje graso será una estimación visual, no una medición médica. La calidad de la luz, la postura y el ángulo pueden cambiar la lectura.</span></div>
    </div>
  );
}

function SectionHeading({ tk, eyebrow, title, icon }: { tk: ReturnType<typeof getTokens>; eyebrow: string; title: string; icon: string }) {
  return <div style={{ display: 'flex', gap: tk.space.sm, alignItems: 'flex-start', marginBottom: tk.space.md }}><div style={{ width: '32px', height: '32px', borderRadius: tk.radius.sm, backgroundColor: tk.accentSoft, color: tk.accent, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={icon} size={16} /></div><div><div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{eyebrow}</div><h3 style={{ margin: '3px 0 0', color: tk.text, fontSize: tk.fontSize.lg }}>{title}</h3></div></div>;
}

function MetricCard({ tk, label, value, detail }: { tk: ReturnType<typeof getTokens>; label: string; value: string; detail: string }) {
  return <div style={{ padding: tk.space.md, borderRadius: tk.radius.md, border: `1px solid ${tk.border}`, backgroundColor: tk.surface }}><div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginBottom: '7px' }}>{label}</div><div style={{ color: tk.accent, fontSize: '1.45rem', fontWeight: tk.weight.bold, letterSpacing: '-0.03em' }}>{value}</div><div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs, lineHeight: 1.4, marginTop: '5px' }}>{detail}</div></div>;
}

function FindingCard({ tk, title, icon, color, items }: { tk: ReturnType<typeof getTokens>; title: string; icon: string; color: string; items: string[] }) {
  return <Card isDark={tk.isDark} onClick={() => undefined} style={{ padding: tk.space.md }}><div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, color, marginBottom: tk.space.md }}><Icon name={icon} size={17} /><h3 style={{ margin: 0, color: tk.text, fontSize: tk.fontSize.md }}>{title}</h3></div>{items.length ? <ul style={{ margin: 0, paddingLeft: '18px', color: tk.text, display: 'flex', flexDirection: 'column', gap: tk.space.sm }}>{items.map((item) => <li key={item} style={{ lineHeight: 1.45 }}>{item}</li>)}</ul> : <span style={{ color: tk.textMuted, fontSize: tk.fontSize.sm }}>Sin señales claras en las fotos.</span>}</Card>;
}

function InfoRow({ tk, label, value, detail }: { tk: ReturnType<typeof getTokens>; label: string; value: string; detail: string }) {
  return <div style={{ padding: tk.space.md, borderRadius: tk.radius.md, backgroundColor: tk.surfaceAlt }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: tk.space.sm, color: tk.text, fontWeight: tk.weight.medium, fontSize: tk.fontSize.sm }}><span>{label}</span><span style={{ color: tk.accent, textAlign: 'right' }}>{value}</span></div><div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, lineHeight: 1.45, marginTop: '5px' }}>{detail}</div></div>;
}

function MapLegend({ tk }: { tk: ReturnType<typeof getTokens> }) {
  return <div style={{ display: 'flex', gap: tk.space.md, flexWrap: 'wrap', justifyContent: 'center' }}>{[[tk.heat[3], 'Punto fuerte'], [tk.accent, 'Equilibrado'], [tk.warning, 'A priorizar']].map(([color, label]) => <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: tk.textMuted, fontSize: tk.fontSize.xs }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />{label}</span>)}</div>;
}
