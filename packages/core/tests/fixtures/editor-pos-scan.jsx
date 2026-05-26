// editor-pos-scan.jsx
// Stoqio · Editor Pós-Scan — components shared by the main canvas
// and the isolated preview.
//
// Exports on window:
//   EditorPosScanScreen  — full-screen experience (header + list + footer)
//   EditorPosScanList    — just the scrollable list (the reusable bit)
//   EditFx               — tiny FX helpers (entrance cascade, row collapse)
//
// All copy is pt-BR. Tom: direto, utilitário, doméstico, premium.

const { useState, useEffect, useRef, useMemo } = React;

/* ========================================================================
 * Tokens (Stoqio DS — light theme; dark variant kept for parity but the
 * deliverable here is light, matching the iOS UI kit's default).
 * ====================================================================== */
const eposTokens = {
  // Brand
  primary:        '#F54844',
  onPrimary:      '#FFFFFF',
  primaryContainer:'#FCECEA',
  // Surfaces
  bg:             '#FFFFFF',
  bgSec:          '#FAFAFA',
  surface:        '#F5F5F5',
  surfaceVar:     '#EEEEEE',
  // Text
  text:           '#212121',
  sub:            '#757575',
  // Outline
  outline:        '#E0E0E0',
  // Semantic
  success:        '#12D18E',
  successFg:      '#0E9D6C',
  successContainer:'#E8FAF4',
  warning:        '#FF9800',
  warningFg:      '#B25E00',
  warningContainer:'#FFF3E0',
  error:          '#F75555',
  errorFg:        '#C43A3B',
  errorContainer: '#FCECEA',
};

/* ========================================================================
 * Status — central source of truth
 *   resolved   — match perfeito no Open Food Facts
 *   unresolved — produto não-encontrado mas dados parseados (criar como "novo")
 *   error      — linha tem dado inválido (preço, qty); precisa atenção
 * ====================================================================== */
const STATUS_META = {
  resolved:   { color: eposTokens.success, fg: eposTokens.successFg, bg: eposTokens.successContainer, label: 'Resolvido' },
  unresolved: { color: eposTokens.warning, fg: eposTokens.warningFg, bg: eposTokens.warningContainer, label: 'Não encontrado' },
  error:      { color: eposTokens.error,   fg: eposTokens.errorFg,   bg: eposTokens.errorContainer,   label: 'Erro' },
};

/* ========================================================================
 * Utilities
 * ====================================================================== */
function formatBRL(n) {
  // n is a number in BRL (e.g. 17.97 → "R$ 17,97"). Negatives get sign.
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}R$ ${abs.toFixed(2).replace('.', ',')}`;
}

function pluralizeProdutos(n) {
  return n === 1 ? '1 produto' : `${n} produtos`;
}

/* ========================================================================
 * StatusDot — circular badge to the LEFT of each row.
 * Glyph is a hand-drawn SVG so we don't depend on any icon CDN at row level
 * (Lucide is still used for header/sheet/footer chrome).
 * ====================================================================== */
function StatusDot({ status }) {
  const m = STATUS_META[status];
  const stroke = m.color;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 999,
      background: m.bg, color: m.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      border: `1px solid ${m.color}33`,
    }}>
      {status === 'resolved' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3.2 7.2 L5.8 9.8 L10.8 4.4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {status === 'unresolved' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.2 L12.4 11.4 L1.6 11.4 Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
          <path d="M7 5.8 L7 8.4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="7" cy="10.1" r="0.85" fill={stroke}/>
        </svg>
      )}
      {status === 'error' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 4 L10 10 M10 4 L4 10" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  );
}

/* ========================================================================
 * EditorPosScanRow — one item line.
 * Layout:  [Status]  [Name + meta]  [Price]  [Edit]
 * Cascade entrance is delegated to the parent List so the stagger is one
 * source of truth.
 * ====================================================================== */
function EditorPosScanRow({ item, index, onEdit, isLast }) {
  const { status, name, qty, unit, price, errorReason, isNew } = item;
  const meta = STATUS_META[status];

  const showName = status === 'unresolved' && (!name || name === '?')
    ? '[nome ilegível]'
    : name;

  // Technical sub-line (qty · unit) — always shown.
  const techParts = [];
  if (qty != null) techParts.push(`${qty} un`);
  if (unit) techParts.push(unit);
  // For errors with errorReason we keep qty·unit on the technical line
  // (when meaningful) so it's still parseable; the actionable hint goes
  // on a separate line below.
  if (status === 'error' && errorReason) {
    // If qty is 0 (errorReason 'qty zero'), the technical line might be
    // dishonest — keep it but include the dash unit gracefully.
  }

  // AJUSTE 1 — hint line, like an iOS form field hint.
  let hint = null;
  if (status === 'unresolved') {
    hint = { text: 'Não identificado — escaneie o código de barras', color: eposTokens.warningFg };
  } else if (status === 'error') {
    hint = { text: 'Edite os campos para corrigir', color: eposTokens.errorFg };
  }

  // Right-side price block — empty/dash for hard errors (e.g. preço inválido)
  const priceText = (price == null || (status === 'error' && errorReason === 'preço inválido'))
    ? '—'
    : formatBRL(price);

  return (
    <div
      data-row
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${eposTokens.outline}`,
        background: eposTokens.bg,
      }}
    >
      <StatusDot status={status} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontFamily: 'Urbanist', fontWeight: 600, fontSize: 14, lineHeight: 1.25,
            color: status === 'unresolved' && showName.startsWith('[') ? eposTokens.sub : eposTokens.text,
            fontStyle: status === 'unresolved' && showName.startsWith('[') ? 'italic' : 'normal',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            minWidth: 0,
          }}>{showName}</span>
          {isNew && (
            <span style={{
              flexShrink: 0,
              padding: '2px 7px', borderRadius: 999,
              background: eposTokens.warningContainer,
              color: eposTokens.warningFg,
              fontFamily: 'Urbanist', fontSize: 10, fontWeight: 700,
              letterSpacing: 0.4, textTransform: 'uppercase',
              border: `1px solid ${eposTokens.warning}33`,
            }}>novo</span>
          )}
        </div>
        <div style={{
          marginTop: 3,
          fontFamily: 'Urbanist', fontSize: 12, fontWeight: 500,
          color: eposTokens.sub,
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {techParts.join(' · ')}
        </div>
        {hint && (
          <div style={{
            marginTop: 2,
            fontFamily: 'Urbanist', fontSize: 11, fontWeight: 500,
            color: hint.color, opacity: 0.85,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{hint.text}</div>
        )}
      </div>

      <div style={{
        marginTop: 1,
        fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14,
        color: priceText === '—' ? eposTokens.sub : eposTokens.text,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}>{priceText}</div>

      <button
        onClick={() => onEdit && onEdit(item, index)}
        aria-label={`Editar ${showName}`}
        style={{
          width: 32, height: 32, borderRadius: 10, border: 'none',
          background: 'transparent', color: eposTokens.sub,
          cursor: 'pointer', padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M11.4 2.6 L13.4 4.6 L5.6 12.4 L3 13 L3.6 10.4 Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

/* ========================================================================
 * EditorPosScanList — the reusable list.
 * Props:
 *   items    : Item[]       — required
 *   onEdit   : (item, i)    — opens the edit sheet
 *   maxHeight: string|number — caps the scroll region (default: parent fills)
 * ====================================================================== */
function EditorPosScanList({ items, onEdit, maxHeight }) {
  // AJUSTE 4 — single fade on the container; rows arrive ready.
  return (
    <div
      data-component="EditorPosScanList"
      style={{
        background: eposTokens.bg,
        overflowY: 'auto',
        animation: 'eposFadeIn .2s ease-out',
        ...(maxHeight ? { maxHeight } : null),
      }}
    >
      {items.map((it, i) => (
        <EditorPosScanRow
          key={it.id || i}
          item={it}
          index={i}
          onEdit={onEdit}
          isLast={i === items.length - 1}
        />
      ))}
    </div>
  );
}

/* ========================================================================
 * EditorHeader — supplier · data · total
 * Sits below the StatusBar+Navbar; full-bleed surface card with a soft
 * underline to separate from the list.
 * ====================================================================== */
/* Inline-editable placeholder used when supplier or date is null on the
 * scanned DANFE (~5-10% of cases). Tap → becomes a TextField inline.
 * Visual: italic placeholder copy + small pencil affordance. */
function InlinePlaceholder({ value, onChange, placeholder, big }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (onChange) onChange(draft.trim());
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, width: '100%',
          border: 'none', outline: 'none',
          background: eposTokens.surface,
          borderRadius: 8, padding: big ? '4px 8px' : '2px 8px',
          fontFamily: 'Urbanist',
          fontWeight: big ? 700 : 500,
          fontSize: big ? 16 : 12,
          color: eposTokens.text,
        }}
      />
    );
  }

  const empty = !value;
  return (
    <button
      onClick={() => { setDraft(value || ''); setEditing(true); }}
      style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'text',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: empty ? eposTokens.sub : eposTokens.text,
        fontFamily: 'Urbanist',
        fontWeight: big ? 700 : 500,
        fontSize: big ? 16 : 12,
        fontStyle: empty ? 'italic' : 'normal',
        lineHeight: 1.2,
        maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {empty ? placeholder : value}
        {/* blinking caret next to placeholder for affordance */}
        {empty && <span style={{
          display: 'inline-block', width: 1.5, height: big ? 16 : 12,
          background: eposTokens.sub, marginLeft: 2,
          animation: 'eposCaret 1s step-start infinite',
        }}></span>}
      </span>
      <svg width={big ? 12 : 10} height={big ? 12 : 10} viewBox="0 0 12 12" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
        <path d="M8.5 2 L10 3.5 L4 9.5 L2 10 L2.5 8 Z"
              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

function EditorHeader({ nfe, onChangeSupplier, onChangeDate }) {
  const supplier = nfe.supplier;
  const date = nfe.date;
  return (
    <div style={{
      padding: '14px 16px 16px',
      background: eposTokens.bg,
      borderBottom: `1px solid ${eposTokens.outline}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Urbanist', fontSize: 11, fontWeight: 700,
            letterSpacing: 0.6, textTransform: 'uppercase',
            color: eposTokens.sub,
          }}>Emissor</div>
          <div style={{ marginTop: 4 }}>
            <InlinePlaceholder
              value={supplier}
              onChange={onChangeSupplier}
              placeholder="Adicionar estabelecimento"
              big
            />
          </div>
          <div style={{
            marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 6,
            color: date ? eposTokens.sub : eposTokens.sub,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 1.2 V3.6 M8 1.2 V3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M1.5 5 H10.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            <InlinePlaceholder
              value={date}
              onChange={onChangeDate}
              placeholder="Adicionar data"
            />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'Urbanist', fontSize: 11, fontWeight: 700,
            letterSpacing: 0.6, textTransform: 'uppercase',
            color: eposTokens.sub,
          }}>Total da nota</div>
          <div style={{
            marginTop: 4,
            fontFamily: 'Urbanist', fontSize: 22, fontWeight: 800,
            color: eposTokens.text, letterSpacing: -0.4,
            fontVariantNumeric: 'tabular-nums',
          }}>{nfe.total}</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
 * EditorFooter — fixed bottom bar.
 * Counter + primary "Salvar N produtos" + secondary "Cancelar import".
 * Save button disables (visually) when there are 0 saveable items.
 * ====================================================================== */
function EditorFooter({ items, totalLabel, onSave, onCancel }) {
  // AJUSTE 2 — counter shows TOTAL items (not just saveable). CTA blocks
  // when there are ANY error rows OR when N=0. Errors must be corrected
  // or excluded explicitly — counter no longer hides them silently.
  const total = items.length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const disabled = total === 0 || errorCount > 0;

  return (
    <div style={{
      borderTop: `1px solid ${eposTokens.outline}`,
      background: eposTokens.bg,
      padding: '12px 16px 16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: 'Urbanist', fontSize: 13, fontWeight: 600,
          color: eposTokens.text,
          fontVariantNumeric: 'tabular-nums',
        }}>{pluralizeProdutos(total)}</span>
        <span style={{
          fontFamily: 'Urbanist', fontSize: 14, fontWeight: 700,
          color: eposTokens.text,
          fontVariantNumeric: 'tabular-nums',
        }}>{totalLabel}</span>
      </div>
      <button
        onClick={() => !disabled && onSave && onSave()}
        disabled={disabled}
        style={{
          width: '100%', height: 52, border: 'none',
          borderRadius: 14,
          background: disabled ? `${eposTokens.primary}55` : eposTokens.primary,
          color: eposTokens.onPrimary,
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled ? 'none' : '0 4px 14px rgba(245,72,68,0.28)',
          transition: 'transform .15s ease-out, opacity .15s',
        }}
      >
        Salvar {pluralizeProdutos(total)}
      </button>
      {errorCount > 0 && (
        <div style={{
          marginTop: 8, textAlign: 'center',
          fontFamily: 'Urbanist', fontSize: 11, fontWeight: 500,
          color: eposTokens.errorFg, opacity: 0.85,
          letterSpacing: 0.1,
        }}>
          Corrija ou exclua os items com erro antes de salvar.
        </div>
      )}
      <button
        onClick={() => onCancel && onCancel()}
        style={{
          width: '100%', height: 44, marginTop: errorCount > 0 ? 6 : 10, border: 'none',
          background: 'transparent',
          color: eposTokens.sub,
          fontFamily: 'Urbanist', fontWeight: 600, fontSize: 13.5,
          cursor: 'pointer',
        }}
      >Cancelar import</button>
    </div>
  );
}

/* ========================================================================
 * EditItemSheet — .medium detent (~50%).
 * Form fields + (conditional) "Resolver via código de barras" + "Excluir item".
 * ====================================================================== */
function EditItemSheet({ open, item, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(item || null);
  // AJUSTE 3 — detents .medium + .large.
  // Opens .medium; expands to .large when keyboard opens (any field focused),
  // or when user drags the handle up. iOS 16+ presentationDetents semantics.
  const [detent, setDetent] = useState('medium'); // 'medium' | 'large'
  useEffect(() => { setDraft(item || null); setDetent('medium'); }, [item, open]);

  if (!open || !draft) return null;

  const isUnresolved = draft.status === 'unresolved';
  const showName = (draft.name && draft.name !== '?') ? draft.name : '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 100,
        animation: 'eposFadeIn .2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: detent === 'large' ? '92%' : '64%',
          background: eposTokens.bg,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
          animation: 'eposSlideUp .3s cubic-bezier(.2,.8,.2,1)',
          transition: 'height .28s cubic-bezier(.2,.8,.2,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — tappable to toggle detent */}
        <button
          onClick={() => setDetent(detent === 'medium' ? 'large' : 'medium')}
          aria-label="Expandir folha"
          style={{
            width: '100%', height: 22, border: 'none', background: 'transparent',
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ width: 40, height: 4, borderRadius: 2, background: eposTokens.outline, display: 'block' }}></span>
        </button>

        <div style={{
          padding: '14px 20px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{
            fontFamily: 'Urbanist', fontSize: 18, fontWeight: 700, color: eposTokens.text,
          }}>Editar item</span>
          <StatusDot status={draft.status} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 0' }} onFocusCapture={() => setDetent('large')}>
          {/* Name */}
          <Field
            label="Nome"
            value={showName}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder={isUnresolved ? '[nome ilegível]' : ''}
            italic={isUnresolved && !showName}
          />
          {/* Preço + Qty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="Preço"
              value={draft.price != null ? draft.price.toFixed(2).replace('.', ',') : ''}
              onChange={(v) => {
                const num = parseFloat(v.replace(',', '.'));
                setDraft({ ...draft, price: isNaN(num) ? null : num });
              }}
              prefix="R$"
              tabular
            />
            <Field
              label="Quantidade"
              value={String(draft.qty ?? 0)}
              onChange={(v) => setDraft({ ...draft, qty: parseInt(v, 10) || 0 })}
              suffix="un"
              tabular
            />
          </div>
          {/* EAN */}
          <Field
            label="EAN"
            value={draft.ean || ''}
            onChange={(v) => setDraft({ ...draft, ean: v })}
            mono
            placeholder="—"
          />

          {isUnresolved && (
            <button style={{
              width: '100%', height: 48, marginTop: 12,
              borderRadius: 14, border: `1.5px dashed ${eposTokens.outline}`,
              background: eposTokens.bgSec,
              color: eposTokens.text,
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 13.5,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 3 V15 M5 3 V15 M7 3 V15 M9.5 3 V15 M12 3 V15 M14 3 V15 M16 3 V15"
                      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Resolver via código de barras
            </button>
          )}

          <button
            onClick={() => onDelete && onDelete(draft)}
            style={{
              width: '100%', height: 48, marginTop: 12, marginBottom: 16,
              borderRadius: 14, border: 'none',
              background: eposTokens.errorContainer,
              color: eposTokens.errorFg,
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 13.5,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4 H13 M5.5 4 V2.5 H10.5 V4 M4 4 V13.5 H12 V4 M6.5 6.5 V11 M9.5 6.5 V11"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Excluir item
          </button>
        </div>

        <div style={{
          padding: '12px 20px 20px', display: 'flex', gap: 10,
          borderTop: `1px solid ${eposTokens.outline}`,
        }}>
          <button onClick={onClose} style={{
            flex: 1, height: 48, borderRadius: 14,
            background: 'transparent', color: eposTokens.text,
            border: `1.5px solid ${eposTokens.outline}`,
            fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={() => onSave && onSave(draft)} style={{
            flex: 1.4, height: 48, borderRadius: 14,
            background: eposTokens.primary, color: '#fff',
            border: 'none',
            fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245,72,68,0.28)',
          }}>Salvar item</button>
        </div>
      </div>
    </div>
  );
}

/* Small text field used inside the sheet */
function Field({ label, value, onChange, placeholder, prefix, suffix, mono, tabular, italic }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <div style={{
        fontFamily: 'Urbanist', fontSize: 11, fontWeight: 700,
        letterSpacing: 0.6, textTransform: 'uppercase',
        color: eposTokens.sub, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        height: 48, padding: '0 14px', borderRadius: 12,
        background: eposTokens.surface,
        border: `1px solid ${eposTokens.outline}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {prefix && <span style={{ color: eposTokens.sub, fontWeight: 600, fontSize: 14, fontFamily: 'Urbanist' }}>{prefix}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ''}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'Urbanist',
            fontSize: 15, fontWeight: 600,
            color: eposTokens.text,
            fontStyle: italic ? 'italic' : 'normal',
            fontVariantNumeric: tabular ? 'tabular-nums' : 'normal',
            minWidth: 0, width: '100%',
          }}
        />
        {suffix && <span style={{ color: eposTokens.sub, fontWeight: 600, fontSize: 14, fontFamily: 'Urbanist' }}>{suffix}</span>}
      </div>
    </label>
  );
}

/* ========================================================================
 * StoqioAlert — alerta customizado Stoqio (substitui o iOS nativo).
 * Modular: ícone semântico + título + body + N botões (1 ou 2) em stack.
 *
 * Props:
 *   open      : boolean
 *   variant   : 'destructive' | 'warning' | 'neutral'   (default 'destructive')
 *   icon      : 'trash' | 'warning' | 'info' | custom React node
 *   title     : string
 *   body      : string | React node
 *   primary   : { label: string, onClick: () => void }   (top, in-emphasis)
 *   secondary : { label: string, onClick: () => void }   (bottom, backout) — optional
 *   onDismiss : () => void   — only fires via swipe-down or secondary button
 * ====================================================================== */
const STOQIO_ALERT_VARIANTS = {
  destructive: {
    iconBg: eposTokens.errorContainer,
    iconColor: eposTokens.errorFg,
    primaryBg: eposTokens.error,
    primaryFg: '#FFFFFF',
  },
  warning: {
    iconBg: eposTokens.warningContainer,
    iconColor: eposTokens.warningFg,
    primaryBg: eposTokens.warning,
    primaryFg: '#FFFFFF',
  },
  neutral: {
    iconBg: eposTokens.primaryContainer,
    iconColor: eposTokens.primary,
    primaryBg: eposTokens.primary,
    primaryFg: '#FFFFFF',
  },
};

function StoqioAlertIcon({ kind, color }) {
  if (React.isValidElement(kind)) return kind;
  if (kind === 'trash') return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill={color} fillOpacity="0.14"/>
      <path d="M11 12 H21 M13.5 12 V10.5 H18.5 V12 M12.5 12 V22 H19.5 V12 M14.5 14.5 V19.5 M17.5 14.5 V19.5"
            stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (kind === 'warning') return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill={color} fillOpacity="0.14"/>
      <path d="M16 9 L24 22 H8 Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
      <path d="M16 14 V18" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="16" cy="20.5" r="1" fill={color}/>
    </svg>
  );
  // info
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill={color} fillOpacity="0.14"/>
      <circle cx="16" cy="16" r="9" stroke={color} strokeWidth="1.7" fill="none"/>
      <path d="M16 14.5 V20.5" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="16" cy="11.5" r="1" fill={color}/>
    </svg>
  );
}

function StoqioAlert({
  open, variant = 'destructive', icon = 'trash',
  title, body, primary, secondary, onDismiss,
}) {
  if (!open) return null;
  const v = STOQIO_ALERT_VARIANTS[variant] || STOQIO_ALERT_VARIANTS.destructive;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'eposFadeIn .15s ease-out',
        fontFamily: 'Urbanist',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 320,
        background: eposTokens.surface,
        borderRadius: 24, padding: 24,
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        animation: 'eposStoqioAlertIn .2s cubic-bezier(.2,.8,.2,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StoqioAlertIcon kind={icon} color={v.iconColor} />
        </div>
        <div style={{
          marginTop: 12, textAlign: 'center',
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 18,
          color: eposTokens.text, letterSpacing: -0.2,
        }}>{title}</div>
        {body && (
          <div style={{
            marginTop: 8, textAlign: 'center',
            fontFamily: 'Urbanist', fontWeight: 500, fontSize: 14,
            color: eposTokens.sub, lineHeight: 1.4,
          }}>{body}</div>
        )}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {primary && (
            <button onClick={primary.onClick} style={{
              width: '100%', height: 50, border: 'none', borderRadius: 14,
              background: v.primaryBg, color: v.primaryFg,
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>{primary.label}</button>
          )}
          {secondary && (
            <button onClick={secondary.onClick} style={{
              width: '100%', height: 50, border: 'none', borderRadius: 14,
              background: eposTokens.surfaceVar, color: eposTokens.text,
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>{secondary.label}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
 * CancelImportAlert — agora delega ao StoqioAlert (variante destrutiva).
 * Mantido como wrapper pra preservar a API consumida pelo Screen.
 * ====================================================================== */
function CancelImportAlert({ open, count, onKeep, onDiscard }) {
  return (
    <StoqioAlert
      open={open}
      variant="destructive"
      icon="trash"
      title="Descartar essa nota?"
      body={`Os ${count} produtos não vão ser salvos no estoque.`}
      primary={{ label: 'Descartar', onClick: onDiscard }}
      secondary={{ label: 'Manter', onClick: onKeep }}
      onDismiss={onKeep}
    />
  );
}

/* ========================================================================
 * EditorPosScanScreen — full-screen experience.
 *
 * Props:
 *   nfe          : { supplier, date, total }   — header data
 *   items        : Item[]                      — list rows
 *   sheetItem    : Item | null                 — open the edit sheet on this
 *   alertOpen    : boolean                     — show cancel-import alert
 *   onTriggerEdit, onCloseSheet, onTriggerCancel, onKeepImport, onDiscard,
 *   onSave (delete row), onSaveItem
 *
 * The screen is uncontrolled by default — use the props to PIN specific
 * states (sheet open / alert open) for the canvas artboards.
 * ====================================================================== */
function EditorPosScanScreen({
  nfe, items: initialItems,
  pinnedSheetIndex = null,
  pinnedAlertOpen = false,
}) {
  const [items, setItems] = useState(initialItems);
  const [sheetIdx, setSheetIdx] = useState(pinnedSheetIndex);
  const [alertOpen, setAlertOpen] = useState(pinnedAlertOpen);

  useEffect(() => { setItems(initialItems); }, [initialItems]);
  useEffect(() => { setSheetIdx(pinnedSheetIndex); }, [pinnedSheetIndex]);
  useEffect(() => { setAlertOpen(pinnedAlertOpen); }, [pinnedAlertOpen]);

  // Recompute lucide icons on every render that adds chrome
  useEffect(() => {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  });

  const total = useMemo(() => {
    const sum = items
      .filter((i) => i.status !== 'error' || (i.errorReason !== 'preço inválido' && i.price != null))
      .reduce((a, b) => a + (b.price || 0) * (b.qty || 1) / (b.qty || 1), 0);
    // Use the parsed price * qty for parity with NFC-e math
    const sum2 = items
      .filter((i) => i.price != null && i.errorReason !== 'preço inválido')
      .reduce((a, b) => a + b.price, 0);
    return sum2;
  }, [items]);

  const handleEdit = (item, idx) => setSheetIdx(idx);
  const handleCloseSheet = () => setSheetIdx(null);
  const handleSaveItem = (draft) => {
    setItems(items.map((it, i) => i === sheetIdx ? draft : it));
    setSheetIdx(null);
  };
  const handleDelete = (draft) => {
    // Row collapse: mark item then remove on transitionend
    const idx = sheetIdx;
    setSheetIdx(null);
    // Defer to allow sheet to close visually
    setTimeout(() => {
      setItems((prev) => prev.filter((_, i) => i !== idx));
    }, 220);
  };

  const sheetItem = sheetIdx != null ? items[sheetIdx] : null;

  return (
    <div style={{
      width: '100%', height: '100%', background: eposTokens.bg,
      display: 'flex', flexDirection: 'column', position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Urbanist',
    }}>
      {/* Status bar — minimal, matches the iOS UI kit */}
      <div style={{
        height: 44, padding: '0 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15, color: eposTokens.text,
      }}>
        <span>9:41</span>
        <span style={{ fontSize: 12, opacity: 0.85 }}>● ● ▮</span>
      </div>

      {/* Navbar — chevron-back + title */}
      <div style={{
        height: 52, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'transparent', border: 'none',
          color: eposTokens.text, cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 5 L7 11 L14 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 17, color: eposTokens.text,
          letterSpacing: -0.2,
        }}>Revisar Nota</span>
        <span style={{ width: 44 }}></span>
      </div>

      {/* Header */}
      <EditorHeader nfe={nfe} />

      {/* List (fills) */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <EditorPosScanList items={items} onEdit={handleEdit} />
      </div>

      {/* Footer */}
      <EditorFooter
        items={items}
        totalLabel={formatBRL(total)}
        onSave={() => {/* noop in mock */}}
        onCancel={() => setAlertOpen(true)}
      />

      {/* Edit sheet */}
      <EditItemSheet
        open={sheetItem != null}
        item={sheetItem}
        onClose={handleCloseSheet}
        onSave={handleSaveItem}
        onDelete={handleDelete}
      />

      {/* Cancel-import alert */}
      <CancelImportAlert
        open={alertOpen}
        count={items.length}
        onKeep={() => setAlertOpen(false)}
        onDiscard={() => setAlertOpen(false)}
      />
    </div>
  );
}

/* ========================================================================
 * Animation keyframes — injected once.
 * ====================================================================== */
(function injectEposKeyframes() {
  if (document.getElementById('epos-fx')) return;
  const s = document.createElement('style');
  s.id = 'epos-fx';
  s.textContent = `
    @keyframes eposRowIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes eposFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes eposSlideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes eposCaret {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    @keyframes eposStoqioAlertIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes eposRowCollapse {
      from { opacity: 1; max-height: 64px; }
      to   { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
    }
  `;
  document.head.appendChild(s);
})();

/* ========================================================================
 * Export
 * ====================================================================== */
Object.assign(window, {
  EditorPosScanScreen,
  EditorPosScanList,
  EditorPosScanRow,
  EditorHeader,
  EditorFooter,
  EditItemSheet,
  CancelImportAlert,
  StoqioAlert,
  StoqioAlertIcon,
  StatusDot,
  eposTokens,
  formatBRL,
  pluralizeProdutos,
});


/* ============================================================
 * Canvas wiring (consolidated from editor-pos-scan-canvas.jsx — gated on
 * <body data-canvas="editor-pos-scan">). Lives here so the canvas
 * lives next to its components — single source of truth per
 * the canonical structure: 1 screen-canvas .jsx per screen.
 * ============================================================ */
if (typeof document !== 'undefined' && document.body && document.body.dataset.canvas === 'editor-pos-scan') {
/* ====================================================================
 * Editor Pós-Scan · Canvas com 5 estados
 *   1. Lista feliz             (5 resolvidos)
 *   2. Lista mista             (3 resolvidos · 1 unresolved · 1 erro)
 *   3. Lista 100% problemática (3 unresolved · 2 erros)
 *   4. Sheet de edição         (.medium detent, sobre a Lista mista)
 *   5. Alert "Cancelar import" (sobre a Lista feliz)
 *
 * Lives as an external text/babel script so all JSX is compiled by the
 * same external pipeline as editor-pos-scan.jsx — no inline-vs-external
 * race in Babel-standalone's auto-runner.
 * ================================================================== */
const { useEffect } = React;

// ── State 1 — happy path ────────────────────────────────────────────
const NFE_FELIZ = {
  supplier: 'Pão de Açúcar · Vila Madalena',
  date: '27 mar 2026 · 14:32',
  total: 'R$ 109,55',
};
const ITEMS_FELIZ = [
  { id: 'a1', status: 'resolved', name: 'Leite Integral Piracanjuba', qty: 3, unit: '1 L',     price: 17.97, ean: '7891000100103' },
  { id: 'a2', status: 'resolved', name: 'Arroz Tio João Tipo 1',       qty: 1, unit: '5 kg',    price: 28.90, ean: '7896006711049' },
  { id: 'a3', status: 'resolved', name: 'Café Pilão Torrado',          qty: 1, unit: '500 g',   price: 19.90, ean: '7896089010015' },
  { id: 'a4', status: 'resolved', name: 'Coca-Cola Zero Açúcar',       qty: 2, unit: '1,5 L',   price: 17.98, ean: '7894900700013' },
  { id: 'a5', status: 'resolved', name: 'Sabão Líquido Ypê',           qty: 2, unit: '900 ml',  price: 24.80, ean: '7896098900123' },
];

// ── State 2 — mixed ────────────────────────────────────────────────
const NFE_MISTA = {
  supplier: 'Mercado Extra · Vila Olímpia',
  date: 'Ontem · 19:08',
  total: 'R$ 89,65',
};
const ITEMS_MISTA = [
  { id: 'b1', status: 'resolved',   name: 'Leite Integral Piracanjuba', qty: 3, unit: '1 L',     price: 17.97, ean: '7891000100103' },
  { id: 'b2', status: 'resolved',   name: 'Arroz Tio João Tipo 1',      qty: 1, unit: '5 kg',    price: 28.90, ean: '7896006711049' },
  { id: 'b3', status: 'resolved',   name: 'Coca-Cola Zero Açúcar',      qty: 2, unit: '1,5 L',   price: 17.98, ean: '7894900700013' },
  { id: 'b4', status: 'unresolved', name: '?',                          qty: 2, unit: '900 ml',  price: 12.40, ean: '', isNew: true },
  { id: 'b5', status: 'error',      name: 'BTRA RUF CHURR 115G',        qty: 0, unit: '115 g',   price: 17.29, ean: '7892840818142', errorReason: 'qty zero' },
];

// ── State 3 — all problematic ──────────────────────────────────────
const NFE_PROBLEMA = {
  supplier: 'Atacadão · Marginal Tietê',
  date: 'Hoje · 10:15',
  total: 'R$ 91,33',
};
const ITEMS_PROBLEMA = [
  { id: 'c1', status: 'unresolved', name: '?',                          qty: 1, unit: '500 g',   price: 8.90,  ean: '', isNew: true },
  { id: 'c2', status: 'unresolved', name: 'BTRA RUF CHURR 115G',        qty: 4, unit: '115 g',   price: 17.29, ean: '7892840818142', isNew: true },
  { id: 'c3', status: 'error',      name: 'FNERG.RED BULL 355ML',       qty: 1, unit: '355 ml',  price: null,  ean: '', errorReason: 'preço inválido' },
  { id: 'c4', status: 'unresolved', name: 'DET YPÊ CL. 500ML',          qty: 6, unit: '500 ml',  price: 22.14, ean: '', isNew: true },
  { id: 'c5', status: 'error',      name: '?',                          qty: 0, unit: '—',       price: null,  ean: '', errorReason: 'qty zero' },
];

const SCREEN_W = 402;
const SCREEN_H = 874;

// ── State 6 — nullable header (DANFE com cabeçalho ilegível) ──────────
const NFE_SUPPLIER_NULL = { supplier: null, date: '27 mar 2026 · 14:32',  total: 'R$ 109,55' };
const NFE_DATE_NULL     = { supplier: 'Pão de Açúcar · Vila Madalena', date: null, total: 'R$ 109,55' };
const NFE_BOTH_NULL     = { supplier: null, date: null, total: 'R$ 109,55' };

function Artboard6A() {
  return <div className="epos-screen"><EditorPosScanScreen nfe={NFE_SUPPLIER_NULL} items={ITEMS_FELIZ} /></div>;
}
function Artboard6B() {
  return <div className="epos-screen"><EditorPosScanScreen nfe={NFE_DATE_NULL}     items={ITEMS_FELIZ} /></div>;
}
function Artboard6C() {
  return <div className="epos-screen"><EditorPosScanScreen nfe={NFE_BOTH_NULL}     items={ITEMS_FELIZ} /></div>;
}

// ── State 7 — swipe-to-delete iOS ─────────────────────────────────────────────
function Artboard7() {
  return (
    <div className="epos-screen">
      <SwipeToDeleteShowcase />
    </div>
  );
}

/* Static composition: renders the mixed list with the 4th row (unresolved)
 * pulled aside revealing the red 'Excluir' action. Not interactive — it
 * exists to spec the visual. */
function SwipeToDeleteShowcase() {
  // Reach into the screen by mounting the full screen, then overlay the
  // swipe state on top of the 4th row position. Simpler: render Screen
  // and absolute-position an overlay 'pulled' row at the right Y.
  const SWIPE_REVEAL = 80; // pt of red button revealed
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <EditorPosScanScreen nfe={NFE_MISTA} items={ITEMS_MISTA} />
      {/* Overlay: swipe revealed on the 4th row.
       * Header(~96) + statusbar(44) + navbar(52) + 3 rows*~58 = ~366; the
       * 4th row sits at ~366. We render the SwipeRow positioned over it. */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: 240, // statusbar+nav+header+3 rows in this layout
        pointerEvents: 'none',
      }}>
        <SwipeRowOverlay
          item={ITEMS_MISTA[3]}
          revealPx={SWIPE_REVEAL}
        />
      </div>
    </div>
  );
}

function SwipeRowOverlay({ item, revealPx }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid #E0E0E0',
      borderTop: '1px solid #E0E0E0',
      overflow: 'hidden',
    }}>
      {/* Red action sits underneath, pinned right */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: revealPx,
        background: '#F75555',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        color: '#FFFFFF',
        fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 4 H13 M5.5 4 V2.5 H10.5 V4 M4 4 V13.5 H12 V4 M6.5 6.5 V11 M9.5 6.5 V11"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Excluir</span>
      </div>
      {/* Row content slides left by revealPx */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#FFFFFF',
        transform: `translateX(-${revealPx}px)`,
        transition: 'transform .25s cubic-bezier(.2,.8,.2,1)',
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: '#FFF3E0', color: '#FF9800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, border: '1px solid #FF980033',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2.2 L12.4 11.4 L1.6 11.4 Z" stroke="#B25E00" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
            <path d="M7 5.8 L7 8.4" stroke="#B25E00" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="7" cy="10.1" r="0.85" fill="#B25E00"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Urbanist', fontWeight: 600, fontSize: 14, color: '#212121' }}>
              [nome ilegível]
            </span>
            <span style={{
              padding: '2px 7px', borderRadius: 999,
              background: '#FFF3E0', color: '#B25E00',
              fontFamily: 'Urbanist', fontSize: 10, fontWeight: 700,
              letterSpacing: 0.4, textTransform: 'uppercase',
              border: '1px solid #FF980033',
            }}>novo</span>
          </div>
          <div style={{ marginTop: 3, fontFamily: 'Urbanist', fontSize: 12, fontWeight: 500, color: '#757575' }}>
            2 un · 900 ml
          </div>
          <div style={{ marginTop: 2, fontFamily: 'Urbanist', fontSize: 11, fontWeight: 500, color: '#B25E00', opacity: 0.85 }}>
            Não identificado — escaneie o código de barras
          </div>
        </div>
        <div style={{ marginTop: 1, fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, color: '#212121' }}>
          R$ 12,40
        </div>
      </div>
    </div>
  );
}

function Artboard1() {
  useEffect(() => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }, []);
  return (
    <div className="epos-screen">
      <EditorPosScanScreen nfe={NFE_FELIZ} items={ITEMS_FELIZ} />
    </div>
  );
}
function Artboard2() {
  return (
    <div className="epos-screen">
      <EditorPosScanScreen nfe={NFE_MISTA} items={ITEMS_MISTA} />
    </div>
  );
}
function Artboard3() {
  return (
    <div className="epos-screen">
      <EditorPosScanScreen nfe={NFE_PROBLEMA} items={ITEMS_PROBLEMA} />
    </div>
  );
}
function Artboard4() {
  return (
    <div className="epos-screen">
      <EditorPosScanScreen
        nfe={NFE_MISTA}
        items={ITEMS_MISTA}
        pinnedSheetIndex={3}
      />
    </div>
  );
}
function Artboard5() {
  return (
    <div className="epos-screen">
      <EditorPosScanScreen
        nfe={NFE_FELIZ}
        items={ITEMS_FELIZ}
        pinnedAlertOpen={true}
      />
    </div>
  );
}

/* ─── About panel ──────────────────────────────────────────────────────
 * Sits above the artboards as the FIRST thing the user sees on the canvas,
 * answering "o que isso faz?" and "o que eu posso clicar?" without making
 * them guess. */
function AboutPanel() {
  return (
    <div style={{
      width: 880, padding: '28px 32px',
      background: '#fff', border: '1px solid rgba(33,33,33,0.08)',
      borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      fontFamily: 'Urbanist, system-ui, sans-serif',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
        textTransform: 'uppercase', color: '#F54844',
      }}>Stoqio · iOS · Tela</div>
      <h2 style={{
        margin: '6px 0 8px', fontSize: 24, fontWeight: 800,
        color: '#212121', letterSpacing: -0.3,
      }}>Editor Pós-Scan</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#444' }}>
        Tela full-screen acessada após <b>Scan&nbsp;→&nbsp;“Revisar e salvar”</b>.
        O usuário revisa os itens que o OCR extraiu da NF antes de salvar
        no estoque. Aqui na esquerda você vê <b>5 estados</b> da mesma tela,
        lado a lado — não é um fluxo, é um catálogo.
      </p>

      <div style={{
        marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
      }}>
        <div style={{ padding: 14, background: '#FAFAFA', borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0E9D6C', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            ✓ Estados 01 · 02 · 03 — interativos
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
            Toque em <b>✏ Editar</b> numa linha para abrir o sheet de edição.
            Toque em <b>“Cancelar import”</b> no rodapé para abrir o alert.
            <br /><span style={{ color: '#757575' }}>(O botão “Salvar N produtos” é mock — não navega pra lugar nenhum nessa demo.)</span>
          </div>
        </div>
        <div style={{ padding: 14, background: '#FAFAFA', borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#B25E00', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            ◉ Estados 04 · 05 — pinados
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
            Showcases congelados pra exibir o sheet (.medium detent) e o
            alert de cancelamento. <b>Não interagem</b> — propositalmente.
            Use 01–03 pra dirigir o fluxo de verdade.
          </div>
        </div>
      </div>
    </div>
  );
}

function Canvas() {
  return (
    <DesignCanvas>
      <DCSection
        id="sobre"
        title="Sobre essa tela"
        subtitle="O que é, o que fazer, o que clica."
      >
        <DCArtboard id="about" label="Leia primeiro" width={880} height={360}>
          <AboutPanel />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="interativos"
        title="Estados interativos · 01 · 02 · 03"
        subtitle="Toque em ✏ para editar uma linha, ou em 'Cancelar import' no rodapé pra abrir o alert."
      >
        <DCArtboard id="ab1" label="01 · Lista feliz · 5 verdes" width={SCREEN_W} height={SCREEN_H}>
          <Artboard1 />
        </DCArtboard>
        <DCArtboard id="ab2" label="02 · Lista mista · 3 · 1 · 1" width={SCREEN_W} height={SCREEN_H}>
          <Artboard2 />
        </DCArtboard>
        <DCArtboard id="ab3" label="03 · 100% problemática · 3 · 2" width={SCREEN_W} height={SCREEN_H}>
          <Artboard3 />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pinados"
        title="Showcases pinados · 04 · 05"
        subtitle="Estados congelados pra revisar visual do sheet e do alert. Não interagem."
      >
        <DCArtboard id="ab4" label="04 · Sheet de edição aberto (.medium)" width={SCREEN_W} height={SCREEN_H}>
          <Artboard4 />
        </DCArtboard>
        <DCArtboard id="ab5" label="05 · Alert “Cancelar import” aberto" width={SCREEN_W} height={SCREEN_H}>
          <Artboard5 />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="nulos"
        title="Estado 06 · Header com campos nulos"
        subtitle="DANFE com cabeçalho ilegível (~5–10% dos scans). Tap no placeholder italic vira TextField inline."
      >
        <DCArtboard id="ab6a" label="06A · supplier nil + data ok" width={SCREEN_W} height={SCREEN_H}>
          <Artboard6A />
        </DCArtboard>
        <DCArtboard id="ab6b" label="06B · supplier ok + data nil" width={SCREEN_W} height={SCREEN_H}>
          <Artboard6B />
        </DCArtboard>
        <DCArtboard id="ab6c" label="06C · ambos nulos" width={SCREEN_W} height={SCREEN_H}>
          <Artboard6C />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="swipe"
        title="Estado 07 · Swipe-to-delete"
        subtitle="Padrão iOS. Swipe parcial revela ~40–80pt do botão; full swipe comita o delete sem segundo tap."
      >
        <DCArtboard id="ab7" label="07 · 4ª linha pulled left, botão vermelho revelado" width={SCREEN_W} height={SCREEN_H}>
          <Artboard7 />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

/* Poll-gate: external text/babel scripts are fetched+compiled async in
 * arbitrary order. Wait for upstream globals before mounting. */
function bootEditorPosScanCanvas() {
  if (window.EditorPosScanScreen && window.DesignCanvas && window.DCSection && window.DCArtboard) {
    ReactDOM.createRoot(document.getElementById('root')).render(<Canvas />);
  } else {
    setTimeout(bootEditorPosScanCanvas, 30);
  }
}
bootEditorPosScanCanvas();

} /* end canvas-gate (editor-pos-scan) */
