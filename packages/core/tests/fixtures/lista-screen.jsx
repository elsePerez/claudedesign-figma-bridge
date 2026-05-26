/* Stoqio — Fase 2: Tela Lista (6 artboards)
   Componentes: TabBar4, ShoppingListCard (3 variants), Header, Estados.
   Carregado em "Lista (Fase 2).html". */

const { useState } = React;

/* ============ Tokens ============ */
const T = {
  // light surfaces
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  outline: '#E0E0E0',
  outlineVariant: 'rgba(33,33,33,.06)',
  // text
  onSurface: '#212121',
  onSurfaceVariant: '#757575',
  // brand
  primary: '#F54844',
  primaryContainer: 'rgba(245,72,68,.12)',
  // semantic
  warning: '#FF9800',
  warningContainer: 'rgba(255,152,0,.12)',
  success: '#12D18E',
};

/* ============ Status Bar / Frame Chrome ============ */
function StatusBar() {
  return (
    <div style={{
      height: 44, padding: '0 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', background: T.surface,
      fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15, color: T.onSurface,
    }}>
      <span>9:41</span>
      <span style={{ fontSize: 11, opacity: .8, letterSpacing: 1 }}>● ● ▮</span>
    </div>
  );
}

/* ============ Tab Bar — 4 slots ============ */
function IconEstoque({ active }) {
  const c = active ? T.primary : 'currentColor';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2.5, width: 20, height: 20 }}>
      {[0,1,2,3].map(i => <span key={i} style={{ background: c, borderRadius: 2.5 }}></span>)}
    </div>
  );
}

function IconLista({ active }) {
  const c = active ? T.primary : 'currentColor';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* clipboard top */}
      <rect x="6.5" y="2" width="9" height="3" rx="1.2" stroke={c} strokeWidth="1.75"/>
      <rect x="3.5" y="4.5" width="15" height="16" rx="2.5" stroke={c} strokeWidth="1.75"/>
      {/* check + lines */}
      <path d="M7 11 L8.5 12.5 L11 10" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 11.5 L16 11.5" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M7 15.5 L8.5 17 L11 14.5" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 16 L16 16" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}

function IconScan() {
  return (
    <div style={{ position: 'relative', width: 26, height: 22 }}>
      {[
        { tl: true, top: 0, left: 0 },
        { tr: true, top: 0, right: 0 },
        { bl: true, bottom: 0, left: 0 },
        { br: true, bottom: 0, right: 0 },
      ].map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: 6, height: 6,
          borderTop: p.tl || p.tr ? '2px solid currentColor' : 'none',
          borderBottom: p.bl || p.br ? '2px solid currentColor' : 'none',
          borderLeft: p.tl || p.bl ? '2px solid currentColor' : 'none',
          borderRight: p.tr || p.br ? '2px solid currentColor' : 'none',
          ...p,
        }}></div>
      ))}
      <div style={{ position: 'absolute', top: 5, bottom: 5, left: 6, right: 6, display: 'flex', gap: 1.5 }}>
        {[2,1,3,1,2,1,3,2].map((w, i) => <span key={i} style={{ width: w, background: 'currentColor', borderRadius: .5 }}></span>)}
      </div>
    </div>
  );
}

function IconHistorico({ active }) {
  const c = active ? T.primary : 'currentColor';
  return (
    <div style={{ width: 22, height: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ height: 7, background: c, borderRadius: '3px 3px 2px 2px', display: 'flex', alignItems: 'center', paddingLeft: 3 }}>
        <span style={{ width: 9, height: 2, background: '#fff', borderRadius: 1, opacity: .95 }}></span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 1 }}>
        {[70, 55, 65].map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 2.5 }}>
            <span style={{ width: 2.5, height: 2.5, background: c, borderRadius: '50%' }}></span>
            <span style={{ flex: 1, height: 2, background: c, borderRadius: 1, opacity: .85, maxWidth: `${w}%` }}></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBar4({ active }) {
  const tabs = [
    { id: 'estoque',   label: 'Estoque',   Icon: IconEstoque },
    { id: 'lista',     label: 'Lista',     Icon: IconLista },
    { id: 'scan',      label: 'Escanear',  Icon: IconScan, center: true },
    { id: 'historico', label: 'Histórico', Icon: IconHistorico },
  ];
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12, bottom: 18, height: 70, zIndex: 10,
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', alignItems: 'stretch',
      padding: 7, borderRadius: 999,
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(26px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(26px) saturate(1.6)',
      border: '1px solid rgba(255,255,255,.7)',
      boxShadow: '0 1px 0 rgba(255,255,255,.9) inset, 0 -1px 0 rgba(255,255,255,.3) inset, 0 10px 30px rgba(17,17,17,.12), 0 2px 6px rgba(17,17,17,.06)',
    }}>
      <div style={{
        position: 'absolute', inset: 1, borderRadius: 999, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 40%)',
      }}></div>

      {tabs.map(t => {
        const isActive = active === t.id;
        const isCenter = t.center;
        const Ico = t.Icon;
        return (
          <button key={t.id} style={{
            position: 'relative', border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: isActive && !isCenter ? T.primary : 'rgba(33,33,33,.85)',
            fontFamily: 'Urbanist', fontSize: 10.5, fontWeight: 600,
            borderRadius: 999, zIndex: 1, padding: 0, cursor: 'pointer',
          }}>
            {isActive && !isCenter && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 999, zIndex: -1,
                background: 'linear-gradient(180deg, rgba(255,255,255,1), rgba(245,245,245,.96))',
                border: '1px solid rgba(255,255,255,.9)',
                boxShadow: '0 1px 0 rgba(255,255,255,.9) inset, 0 4px 10px rgba(17,17,17,.06), 0 1px 2px rgba(17,17,17,.04)',
              }}></div>
            )}
            <div style={{
              width: isCenter ? 30 : 22, height: isCenter ? 30 : 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ico active={isActive} />
            </div>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Lista Header ============ */
function ListaHeader({ count, suggestions = 0, allChecked }) {
  return (
    <div style={{ background: T.surface, padding: '8px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h1 style={{
          fontFamily: 'Urbanist', fontWeight: 800, fontSize: 32, letterSpacing: -.6,
          margin: 0, color: T.onSurface, lineHeight: 1.05,
        }}>Lista</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {suggestions > 0 && (
            <button style={{
              height: 34, padding: '0 11px', borderRadius: 999,
              background: 'rgba(255,255,255,.65)',
              backdropFilter: 'blur(14px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
              border: `1px solid ${T.outline}`,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: T.onSurface, fontFamily: 'Urbanist', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z"/>
              </svg>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{suggestions}</span>
            </button>
          )}
          <button style={{
            width: 34, height: 34, borderRadius: 999, padding: 0,
            background: T.surfaceVariant, border: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: T.onSurfaceVariant, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8 V12 L14.5 14.5"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </button>
          {count > 0 && (
            <button style={{
              height: 34, padding: '0 13px', borderRadius: 999,
              background: allChecked ? T.primary : 'transparent',
              border: allChecked ? 'none' : `1.5px solid ${T.outline}`,
              color: allChecked ? '#fff' : T.onSurface,
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', boxShadow: allChecked ? '0 4px 10px rgba(245,72,68,.25)' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {allChecked && (
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.3 L5.6 9.9 L11 4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              Concluir
            </button>
          )}
        </div>
      </div>
      {count > 0 && (
        <div style={{
          marginTop: 4, fontFamily: 'Urbanist', fontSize: 13, color: T.onSurfaceVariant,
        }}>
          {count} {count === 1 ? 'item' : 'itens'}
        </div>
      )}
    </div>
  );
}

/* ============ Shopping List Cards ============ */
function Checkbox({ checked, color }) {
  const c = color || T.primary;
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      border: checked ? `none` : `1.75px solid ${T.outline}`,
      background: checked ? c : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: checked ? `0 2px 6px ${c}33` : 'none',
    }}>
      {checked && (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.3 L5.6 9.9 L11 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function RecurringIcon({ size = 12, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || T.primary} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2 L21 6 L17 10"/>
      <path d="M3 12 V11 A6 6 0 0 1 9 5 H21"/>
      <path d="M7 22 L3 18 L7 14"/>
      <path d="M21 12 V13 A6 6 0 0 1 15 19 H3"/>
    </svg>
  );
}

function ItemKnown({ emoji, tint, name, brand, price, recurring, checked }) {
  const op = checked ? 0.45 : 1;
  return (
    <div style={{
      background: T.surface, borderRadius: 16, padding: '11px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 1px 0 rgba(0,0,0,.03), 0 2px 8px rgba(0,0,0,.04)',
      border: `1px solid ${T.outlineVariant}`,
      opacity: op,
      transition: 'opacity .2s',
    }}>
      <Checkbox checked={checked} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: tint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.06))',
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, color: T.onSurface,
          lineHeight: 1.2, textDecoration: checked ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 500, fontSize: 11.5, color: T.onSurfaceVariant,
          letterSpacing: .3, marginTop: 2, textTransform: 'uppercase',
        }}>{brand}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, color: T.onSurface,
          fontVariantNumeric: 'tabular-nums',
        }}>{price}</span>
        {recurring && <RecurringIcon />}
      </div>
    </div>
  );
}

function ItemNew({ name, checked }) {
  const op = checked ? 0.45 : 1;
  return (
    <div style={{
      padding: '13px 12px 13px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: `1px solid ${T.outlineVariant}`,
      opacity: op,
    }}>
      <Checkbox checked={checked} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: 'Urbanist', fontWeight: 500, fontSize: 15, color: T.onSurface,
          textDecoration: checked ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</span>
        <span style={{
          fontFamily: 'Urbanist', fontWeight: 400, fontSize: 12, color: T.onSurfaceVariant,
          flexShrink: 0,
        }}>(novo)</span>
      </div>
    </div>
  );
}

function ItemSuggested({ emoji, tint, name, brand, price, reason, checked }) {
  const op = checked ? 0.45 : 1;
  return (
    <div style={{
      background: `linear-gradient(180deg, ${T.warningContainer}, rgba(255,152,0,.06))`,
      borderRadius: 16, padding: '11px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      border: `1px solid rgba(255,152,0,.18)`,
      opacity: op,
    }}>
      <Checkbox checked={checked} color={T.warning} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: tint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, color: T.onSurface,
          lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          marginTop: 2, display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Urbanist', fontWeight: 600, fontSize: 11.5, color: '#B16800',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L22 20 H2 Z" stroke="#B16800" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 10 V14" stroke="#B16800" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="17" r="1" fill="#B16800"/>
          </svg>
          <span>{reason}</span>
        </div>
      </div>
      <span style={{
        fontFamily: 'Urbanist', fontWeight: 700, fontSize: 14, color: T.onSurface,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>{price}</span>
    </div>
  );
}

/* ============ Add-item input ============ */
function AddInput({ placeholder = 'Adicionar item…' }) {
  return (
    <div style={{
      margin: '8px 0', display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 12px', border: `1.5px dashed ${T.outline}`, borderRadius: 14,
      background: T.surface,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: `1.5px solid ${T.outline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.onSurfaceVariant,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5 V19 M5 12 H19"/>
        </svg>
      </div>
      <span style={{ fontFamily: 'Urbanist', fontSize: 14, color: T.onSurfaceVariant }}>{placeholder}</span>
    </div>
  );
}

function SectionHeader({ children, count }) {
  return (
    <div style={{
      padding: '12px 4px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    }}>
      <div style={{
        fontFamily: 'Urbanist', fontWeight: 700, fontSize: 11, letterSpacing: .8,
        textTransform: 'uppercase', color: T.onSurfaceVariant,
      }}>{children}</div>
      {typeof count === 'number' && (
        <div style={{
          fontFamily: 'Urbanist', fontSize: 11, color: T.onSurfaceVariant,
          fontVariantNumeric: 'tabular-nums',
        }}>{count}</div>
      )}
    </div>
  );
}

/* ============ Phone Frame Wrapper ============ */
function Phone({ children, dimmedTabBar }) {
  return (
    <div style={{
      width: 402, height: 874, borderRadius: 50, overflow: 'hidden',
      position: 'relative', background: '#000',
      boxShadow: '0 20px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)',
      isolation: 'isolate',
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 20, background: '#000', zIndex: 50,
      }}></div>
      {/* Screen */}
      <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,.28)', zIndex: 60,
      }}></div>
    </div>
  );
}

/* ============ Empty-state suggestion card ============ */
function SuggestionLine({ emoji, tint, name, reason, big }) {
  return (
    <button style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: big ? '14px 14px' : '11px 12px',
      background: T.surface, borderRadius: 16,
      border: `1px solid ${T.outlineVariant}`,
      boxShadow: '0 1px 0 rgba(0,0,0,.02), 0 2px 8px rgba(0,0,0,.04)',
      textAlign: 'left', cursor: 'pointer', fontFamily: 'Urbanist',
    }}>
      <div style={{
        width: big ? 48 : 40, height: big ? 48 : 40, borderRadius: 12, background: tint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: big ? 28 : 22, flexShrink: 0,
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: big ? 15 : 14, color: T.onSurface, lineHeight: 1.2 }}>{name}</div>
        <div style={{
          marginTop: 3, fontSize: 12, fontWeight: 500, color: '#B16800',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L22 20 H2 Z" stroke="#B16800" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 10 V14" stroke="#B16800" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="17" r="1" fill="#B16800"/>
          </svg>
          <span>{reason}</span>
        </div>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: T.primaryContainer,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.primary,
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5 V19 M5 12 H19"/>
        </svg>
      </div>
    </button>
  );
}

/* ============ Artboard 1 — Lista vazia (Padrão B) ============ */
function ScreenEmpty() {
  return (
    <Phone>
      <StatusBar />
      <ListaHeader count={0} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '4px 16px 0' }}>
        {/* Icon stack */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          marginTop: 12, marginBottom: 14, color: T.onSurfaceVariant,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: T.surface,
            border: `1px solid ${T.outlineVariant}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="3" width="12" height="3.5" rx="1.5"/>
              <rect x="3.5" y="5.5" width="17" height="15.5" rx="2.5"/>
              <path d="M7 12 L9 14 L12 11"/>
              <path d="M13.5 13 L17 13"/>
              <path d="M7 16.5 L9 18.5 L12 15.5"/>
              <path d="M13.5 17.5 L17 17.5"/>
            </svg>
          </div>
        </div>

        <div style={{
          textAlign: 'center', fontFamily: 'Urbanist', fontWeight: 700, fontSize: 19,
          color: T.onSurface, letterSpacing: -.3, lineHeight: 1.25, marginBottom: 4,
          padding: '0 8px',
        }}>Comece pelos itens que estão acabando</div>
        <div style={{
          textAlign: 'center', fontFamily: 'Urbanist', fontWeight: 500, fontSize: 13,
          color: T.onSurfaceVariant, lineHeight: 1.45, marginBottom: 18,
          padding: '0 16px',
        }}>Sugestões com base no seu estoque atual</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SuggestionLine emoji="🥛" tint="linear-gradient(135deg,#EAF4FB,#C9DEEE)"
            name="Leite Integral" reason="Está acabando · 1 un" big />
          <SuggestionLine emoji="☕" tint="linear-gradient(135deg,#E8D9C9,#B89274)"
            name="Café Torrado" reason="Última compra: há 14 dias" big />
          <SuggestionLine emoji="🧴" tint="linear-gradient(135deg,#E8F6EC,#BEDDC7)"
            name="Sabão Líquido" reason="Quase no fim · 1 un" big />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 10px',
        }}>
          <div style={{ flex: 1, height: 1, background: T.outlineVariant }}></div>
          <span style={{ fontFamily: 'Urbanist', fontSize: 12, color: T.onSurfaceVariant, fontWeight: 500 }}>
            Ou adicione manualmente
          </span>
          <div style={{ flex: 1, height: 1, background: T.outlineVariant }}></div>
        </div>

        <AddInput placeholder="Digitar nome do produto…" />
      </div>
      <TabBar4 active="lista" />
    </Phone>
  );
}

/* ============ Artboard 2 — Lista com itens (mix) ============ */
function ScreenWithItems() {
  return (
    <Phone>
      <StatusBar />
      <ListaHeader count={5} suggestions={0} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }}>
        <SectionHeader count={2}>🔁 Itens recorrentes</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemKnown emoji="🥛" tint="linear-gradient(135deg,#EAF4FB,#C9DEEE)"
            name="Leite Integral" brand="Piracanjuba" price="R$ 6,49" recurring />
          <ItemKnown emoji="☕" tint="linear-gradient(135deg,#E8D9C9,#B89274)"
            name="Café Torrado" brand="Pilão" price="R$ 18,90" recurring />
        </div>

        <SectionHeader count={3}>Outros itens</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemSuggested emoji="🧴" tint="linear-gradient(135deg,#E8F6EC,#BEDDC7)"
            name="Sabão Líquido" brand="Ypê" price="R$ 12,99" reason="Está acabando" />
          <ItemKnown emoji="🍚" tint="linear-gradient(135deg,#F5E6D0,#E8C99F)"
            name="Arroz Branco" brand="Tio João" price="R$ 28,90" />
          <ItemNew name="pão de queijo" />
        </div>

        <div style={{ marginTop: 4 }}>
          <AddInput />
        </div>
      </div>
      <TabBar4 active="lista" />
    </Phone>
  );
}

/* ============ Artboard 3 — 6+ itens, sugestões viraram pill ============ */
function ScreenDense() {
  return (
    <Phone>
      <StatusBar />
      <ListaHeader count={7} suggestions={3} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }}>
        <SectionHeader count={2}>🔁 Itens recorrentes</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemKnown emoji="🥛" tint="linear-gradient(135deg,#EAF4FB,#C9DEEE)"
            name="Leite Integral" brand="Piracanjuba" price="R$ 6,49" recurring />
          <ItemKnown emoji="☕" tint="linear-gradient(135deg,#E8D9C9,#B89274)"
            name="Café Torrado" brand="Pilão" price="R$ 18,90" recurring />
        </div>

        <SectionHeader count={5}>Outros itens</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemKnown emoji="🍚" tint="linear-gradient(135deg,#F5E6D0,#E8C99F)"
            name="Arroz Branco" brand="Tio João" price="R$ 28,90" />
          <ItemKnown emoji="🫘" tint="linear-gradient(135deg,#E8D4C9,#C49B85)"
            name="Feijão Carioca" brand="Camil" price="R$ 9,49" />
          <ItemNew name="pão de queijo" />
          <ItemNew name="tampa de panela" />
          <ItemKnown emoji="🫒" tint="linear-gradient(135deg,#F3F0D9,#D4CB8A)"
            name="Óleo de Soja" brand="Liza" price="R$ 7,99" />
        </div>
      </div>
      <TabBar4 active="lista" />
    </Phone>
  );
}

/* ============ Artboard 4 — Lista 100% riscada ============ */
function ScreenCompleted() {
  return (
    <Phone>
      <StatusBar />
      <ListaHeader count={5} allChecked />
      <div style={{ flex: 1, overflow: 'hidden', padding: '4px 16px 0' }}>
        {/* Completion card */}
        <div style={{
          background: T.surface, borderRadius: 22, padding: '22px 20px 18px',
          textAlign: 'center', position: 'relative',
          border: `1px solid ${T.outlineVariant}`,
          boxShadow: '0 1px 0 rgba(0,0,0,.02), 0 4px 16px rgba(0,0,0,.05)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 12px',
            background: T.primaryContainer,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3 H14 L18 7 V21 H6 Z"/>
              <path d="M14 3 V7 H18"/>
              <path d="M9 11 H15"/>
              <path d="M9 14 H15"/>
              <path d="M9 17 H13"/>
            </svg>
          </div>
          <div style={{
            fontFamily: 'Urbanist', fontWeight: 800, fontSize: 22, color: T.onSurface,
            letterSpacing: -.3, marginBottom: 6,
          }}>Compra concluída?</div>
          <div style={{
            fontFamily: 'Urbanist', fontWeight: 500, fontSize: 14, color: T.onSurfaceVariant,
            lineHeight: 1.45, marginBottom: 18, padding: '0 8px',
          }}>Escaneie a nota fiscal pra atualizar seu estoque.</div>

          <button style={{
            width: '100%', height: 50, borderRadius: 14, background: T.primary,
            color: '#fff', border: 'none', fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', boxShadow: '0 6px 18px rgba(245,72,68,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7 V5 A2 2 0 0 1 5 3 H7"/>
              <path d="M21 7 V5 A2 2 0 0 0 19 3 H17"/>
              <path d="M3 17 V19 A2 2 0 0 0 5 21 H7"/>
              <path d="M21 17 V19 A2 2 0 0 1 19 21 H17"/>
              <path d="M3 12 H21"/>
            </svg>
            Escanear agora
          </button>
          <button style={{
            width: '100%', height: 36, background: 'transparent', border: 'none',
            marginTop: 6, fontFamily: 'Urbanist', fontWeight: 600, fontSize: 13,
            color: T.onSurfaceVariant, cursor: 'pointer', textDecoration: 'underline',
            textDecorationThickness: 1, textUnderlineOffset: 3,
          }}>Concluir sem escanear</button>
        </div>

        {/* Inline summary */}
        <div style={{ padding: '20px 4px 8px' }}>
          <div style={{
            fontFamily: 'Urbanist', fontWeight: 700, fontSize: 11, letterSpacing: .8,
            textTransform: 'uppercase', color: T.onSurfaceVariant, marginBottom: 7,
          }}>Itens marcados (5)</div>
          <div style={{
            fontFamily: 'Urbanist', fontSize: 13.5, color: T.onSurfaceVariant,
            lineHeight: 1.6,
          }}>
            <span style={{ color: T.success, fontWeight: 700, marginRight: 4 }}>✓</span>
            leite, café, sabão líquido, arroz, pão de queijo
          </div>
        </div>
      </div>
      <TabBar4 active="lista" />
    </Phone>
  );
}

/* ============ Artboard 5 — Card riscado em detalhe ============ */
function ScreenChecked() {
  return (
    <Phone>
      <StatusBar />
      <ListaHeader count={5} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }}>
        <SectionHeader count={2}>🔁 Itens recorrentes</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemKnown emoji="🥛" tint="linear-gradient(135deg,#EAF4FB,#C9DEEE)"
            name="Leite Integral" brand="Piracanjuba" price="R$ 6,49" recurring checked />
          <ItemKnown emoji="☕" tint="linear-gradient(135deg,#E8D9C9,#B89274)"
            name="Café Torrado" brand="Pilão" price="R$ 18,90" recurring />
        </div>

        <SectionHeader count={3}>Outros itens</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ItemSuggested emoji="🧴" tint="linear-gradient(135deg,#E8F6EC,#BEDDC7)"
            name="Sabão Líquido" brand="Ypê" price="R$ 12,99" reason="Está acabando" checked />
          <ItemKnown emoji="🍚" tint="linear-gradient(135deg,#F5E6D0,#E8C99F)"
            name="Arroz Branco" brand="Tio João" price="R$ 28,90" />
          <ItemNew name="pão de queijo" checked />
        </div>

        {/* Toast (post-tap feedback) */}
        <div style={{
          position: 'absolute', left: 16, right: 16, top: 90, zIndex: 40,
        }}>
          <div style={{
            borderRadius: 14, padding: '11px 14px',
            background: '#E3F6EC',
            border: '1px solid rgba(18,209,142,.22)',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 6px 16px rgba(0,0,0,.06)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: T.success,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.3 L5.6 9.9 L11 4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: 13, color: '#0E6E4A' }}>
              Marcado como comprado
            </span>
          </div>
        </div>
      </div>
      <TabBar4 active="lista" />
    </Phone>
  );
}

/* ============ Artboard 6 — Tab bar isolada (2 estados) ============ */
function TabBarShowcase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
      <div>
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 12, letterSpacing: .6,
          textTransform: 'uppercase', color: '#757575', textAlign: 'center', marginBottom: 12,
        }}>Default · Estoque ativa</div>
        <div style={{
          width: 402, height: 110, position: 'relative',
          background: '#F5F5F5', borderRadius: 28,
          overflow: 'hidden',
        }}>
          <TabBar4 active="estoque" />
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: 12, letterSpacing: .6,
          textTransform: 'uppercase', color: '#757575', textAlign: 'center', marginBottom: 12,
        }}>Lista selecionada</div>
        <div style={{
          width: 402, height: 110, position: 'relative',
          background: '#F5F5F5', borderRadius: 28,
          overflow: 'hidden',
        }}>
          <TabBar4 active="lista" />
        </div>
      </div>
    </div>
  );
}

/* ============ Simple gallery wrapper (no canvas auto-fit) ============ */
function Section({ title, subtitle, children }) {
  return (
    <div style={{ padding: '40px 32px 8px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'Urbanist', fontWeight: 800, fontSize: 22, letterSpacing: -.4,
        color: 'rgba(40,30,20,0.85)',
      }}>{title}</div>
      {subtitle && (
        <div style={{
          fontFamily: 'Urbanist', fontWeight: 500, fontSize: 14, color: 'rgba(60,50,40,0.6)',
          marginTop: 4, lineHeight: 1.5, maxWidth: 720,
        }}>{subtitle}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 22, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  );
}

function Artboard({ label, children, w = 402, h = 874 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontFamily: 'Urbanist', fontWeight: 600, fontSize: 12,
        letterSpacing: .3, color: 'rgba(60,50,40,0.7)',
      }}>{label}</div>
      <div style={{ width: w, height: h, position: 'relative' }}>{children}</div>
    </div>
  );
}

function App() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <Section title="Tab Bar 4-slot"
        subtitle="Adaptação de 3 → 4 slots. Lista entra entre Estoque e Scan. Engrenagem (Settings) continua só na Estoque.">
        <Artboard label="Tab Bar · Default + Lista ativa" w={460} h={300}>
          <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.06)' }}>
            <TabBarShowcase />
          </div>
        </Artboard>
      </Section>

      <Section title="Lista — Estados principais"
        subtitle="Vazia (Padrão B · hand-holding) · com itens · densa (Padrão D · pill) · concluída · feedback de tap.">
        <Artboard label="01 · Lista vazia (Padrão B)"><ScreenEmpty /></Artboard>
        <Artboard label="02 · Com itens (mix de variants)"><ScreenWithItems /></Artboard>
        <Artboard label="03 · 6+ itens (Padrão D · pill)"><ScreenDense /></Artboard>
        <Artboard label="04 · 100% riscada"><ScreenCompleted /></Artboard>
        <Artboard label="05 · Card riscado + toast"><ScreenChecked /></Artboard>
      </Section>

      <Section title="Sheet · Adicionar item"
        subtitle="Detent .medium → .large quando teclado abre. Lista de sugestões em memória, sem spinner. Botão 'Adicionar como novo' sempre presente — secondary quando há matches, primary quando não há.">
        <Artboard label="06 · Sheet recém-aberto (sugestões pra você)"><ScreenSheetEmpty /></Artboard>
        <Artboard label="07 · Digitando 'leite' (3 matches)"><ScreenSheetMatches /></Artboard>
        <Artboard label="08 · Digitando 'tampa de panela' (0 matches)"><ScreenSheetNoMatch /></Artboard>
      </Section>

      <Section title="Sheet · Tornar recorrente"
        subtitle="Detent .medium fixo. Sem calendar picker — frequência é intervalo. Personalizado em dias. Modo edição adiciona link destrutivo 'Remover recorrência'.">
        <Artboard label="09 · Novo · 'Todo mês' default"><ScreenRecurrenceDefault /></Artboard>
        <Artboard label="10 · Novo · 'Personalizado' ativo"><ScreenRecurrenceCustom /></Artboard>
        <Artboard label="11 · Editar (com 'Remover recorrência')"><ScreenRecurrenceEditing /></Artboard>
      </Section>

      <Section title="Sheet · Lista atualizada? (auto-clear pós-scan)"
        subtitle="Aparece automaticamente após NF processada, quando há ≥1 match (confidence ≥ 0.75). Backdrop é o Estoque — usuário acabou de escanear. Sem toast silencioso.">
        <Artboard label="12 · 3 matches pré-marcados"><ScreenAutoClear3 /></Artboard>
        <Artboard label="13 · 6 matches (.large + scroll interno)"><ScreenAutoClear6 /></Artboard>
        <Artboard label="14 · 1 desmarcado · 'Escolher quais' some"><ScreenAutoClearSel /></Artboard>
        <Artboard label="15 · Auto-promote · '↗ Vira conhecido'"><ScreenAutoClearPromote /></Artboard>
      </Section>

      <Section title="Histórico · Segmented Control (Notas / Listas)"
        subtitle="Segmented nativo iOS no header. 4 seções cronológicas em Listas. Estado vazio sem CTA — tab Lista está ao lado. Detalhe é read-only (modelo Y).">
        <Artboard label="16 · Listas (com items, 4 seções)"><ScreenHistoricoListas /></Artboard>
        <Artboard label="17 · Listas · estado vazio"><ScreenHistoricoListasEmpty /></Artboard>
        <Artboard label="18 · Notas Fiscais ativa (continuidade)"><ScreenHistoricoNotas /></Artboard>
        <Artboard label="19 · Detalhe · 5 marcados + 3 não + NF vinculada"><ScreenListaConcluida /></Artboard>
      </Section>

      <Section title="Refinamentos Fase 2 · ProductDetail + InventoryList"
        subtitle="Pequenos incrementos: badge de recorrência + chart de preço no detalhe do produto · badge 'Aguardando NF' no grid do estoque.">
        <Artboard label="20 · Produto recorrente + chart 6 pontos"><ScreenProductRecurring /></Artboard>
        <Artboard label="21 · Produto sem recorrência + 1 ponto"><ScreenProductNonRecurring /></Artboard>
        <Artboard label="22 · Grid com 2 cards 'Aguardando NF'"><ScreenInventoryWithWaiting /></Artboard>
        <Artboard label="23 · Card zoom · Volume + Aguardando NF + tooltip"><ScreenCardZoom /></Artboard>
      </Section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
