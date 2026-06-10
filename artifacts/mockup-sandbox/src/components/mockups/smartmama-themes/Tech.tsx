export function Tech() {
  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "#f5eef8",
      minHeight: "100vh",
      color: "#3D2E39",
      overflow: "hidden",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(201,184,240,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(201,184,240,0.12) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px",
      }} />

      {/* Gradient layer */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "linear-gradient(160deg, rgba(201,184,240,0.35) 0%, rgba(248,193,204,0.2) 40%, rgba(168,218,220,0.25) 80%, transparent 100%)",
      }} />

      {/* Geometric accent shapes */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 200, height: 200,
          border: "2px solid rgba(201,184,240,0.3)", borderRadius: "50%",
          boxShadow: "inset 0 0 40px rgba(201,184,240,0.1)",
        }} />
        <div style={{
          position: "absolute", top: 20, right: 20, width: 100, height: 100,
          border: "1px solid rgba(168,218,220,0.35)", borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", bottom: 120, left: -30, width: 160, height: 160,
          border: "1.5px solid rgba(248,193,204,0.3)", borderRadius: "30px",
          transform: "rotate(15deg)",
        }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px", position: "relative", zIndex: 2,
        background: "rgba(245,238,248,0.85)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(201,184,240,0.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Logo mark */}
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #c9b8f0, #f8c1cc)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            boxShadow: "0 2px 10px rgba(201,184,240,0.5)",
          }}>✦</div>
          <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 17, letterSpacing: "0.01em" }}>
            <span style={{ color: "#9b7dd4" }}>Смарт</span>
            <span style={{ color: "#3D2E39" }}> Мама</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Status indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(168,218,220,0.2)", border: "1px solid rgba(168,218,220,0.5)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5bbfc0", boxShadow: "0 0 6px #a8dadc" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4aabac", fontFamily: "'Space Mono', monospace" }}>ОНЛАЙН</span>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #c9b8f0 0%, #f8c1cc 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            boxShadow: "0 2px 12px rgba(201,184,240,0.45)",
          }}>👩</div>
        </div>
      </div>

      {/* Child selector — chip style */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 8, position: "relative", zIndex: 2 }}>
        <div style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800,
          background: "linear-gradient(135deg, #c9b8f0, #b8a8e8)",
          color: "#fff", letterSpacing: "0.03em",
          boxShadow: "0 3px 14px rgba(201,184,240,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}>МАЛЫШ ▾</div>
        <div style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: "rgba(255,255,255,0.5)", border: "1px solid rgba(201,184,240,0.4)",
          color: "#9b7dd4",
        }}>+ ДОБАВИТЬ</div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 2 }}>

        {/* Diary — wide card with stat bar */}
        <div style={{
          background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)",
          borderRadius: 16, padding: "14px 16px",
          border: "1px solid rgba(201,184,240,0.35)",
          boxShadow: "0 4px 20px rgba(100,60,140,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #a8dadc, #c9b8f0)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              boxShadow: "0 4px 12px rgba(168,218,220,0.45)",
              flexShrink: 0,
            }}>📓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.01em" }}>Дневник ребёнка</div>
              <div style={{ fontSize: 11, color: "#8A7A85", marginTop: 1 }}>История малыша · Заметки</div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(201,184,240,0.2)", border: "1px solid rgba(201,184,240,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9b7dd4",
            }}>›</div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#8A7A85" }}>ЗАМЕТОК</span>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#9b7dd4", fontWeight: 700 }}>12/20</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: "rgba(201,184,240,0.2)", overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #c9b8f0, #f8c1cc)", boxShadow: "0 0 8px rgba(201,184,240,0.6)" }} />
            </div>
          </div>
        </div>

        {/* AI Chat — hero button */}
        <div style={{
          background: "linear-gradient(135deg, #c9b8f0 0%, #e8b4d8 50%, #a8dadc 100%)",
          borderRadius: 18, padding: "18px 18px",
          boxShadow: "0 8px 32px rgba(180,120,240,0.35), 0 2px 8px rgba(168,218,220,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Shine overlay */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
            borderRadius: "18px 18px 0 0", pointerEvents: "none",
          }} />
          {/* Subtle grid on card */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
            {/* Pulsing icon */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: -5, borderRadius: 18,
                background: "rgba(255,255,255,0.25)", animation: "pulse 2s ease-in-out infinite",
              }} />
              <div style={{
                width: 52, height: 52, borderRadius: 15,
                background: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(10px)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                border: "1.5px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 16px rgba(180,120,240,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}>✦</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.01em" }}>AI Smart Mama чат</span>
                <span style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 5,
                  background: "rgba(255,255,255,0.3)",
                  backdropFilter: "blur(8px)",
                  color: "#fff", fontWeight: 800, letterSpacing: "0.06em",
                  fontFamily: "'Space Mono', monospace",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}>GPT-4o</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Спроси всё о своём малыше</div>
            </div>

            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.28)",
              backdropFilter: "blur(8px)",
              border: "1.5px solid rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#fff", fontWeight: 700,
            }}>›</div>
          </div>
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.08)} }`}</style>

        {/* Category chips — more geometric */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {[
            { icon: "🗣️", label: "Речь", active: false },
            { icon: "🎮", label: "Игры", active: false },
            { icon: "💊", label: "Здоровье", active: false },
            { icon: "🥗", label: "Рецепты", active: false },
            { icon: "💡", label: "Советы", active: false },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800,
              background: "rgba(255,255,255,0.65)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(201,184,240,0.3)", whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}>{icon} {label}</div>
          ))}
        </div>

        {/* Section header with line */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#8A7A85", fontFamily: "'Space Mono', monospace" }}>ТРЕКЕРЫ</span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(201,184,240,0.5), transparent)" }} />
        </div>

        {/* Tracker cards with data visualization */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* Nutrition tracker */}
          <div style={{
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)",
            borderRadius: 16, padding: "14px 12px",
            border: "1px solid rgba(253,201,160,0.4)",
            boxShadow: "0 4px 16px rgba(100,60,140,0.07)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Top accent line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #fdc9a0, #f8c1cc)", borderRadius: "16px 16px 0 0" }} />
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: "linear-gradient(135deg, #fdc9a0, #f8c1cc)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8,
              boxShadow: "0 4px 12px rgba(253,201,160,0.5)",
            }}>🍼</div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Трекер питания</div>
            <div style={{ fontSize: 10, color: "#8A7A85", marginTop: 2 }}>Кормления и нормы</div>
            {/* Mini bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginTop: 10, height: 22 }}>
              {[60, 85, 45, 90, 70, 55, 80].map((h, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: "3px 3px 0 0",
                  height: `${h}%`,
                  background: i === 6
                    ? "linear-gradient(180deg, #fdc9a0, #f8c1cc)"
                    : "rgba(253,201,160,0.35)",
                }} />
              ))}
            </div>
          </div>

          {/* Sleep tracker */}
          <div style={{
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)",
            borderRadius: 16, padding: "14px 12px",
            border: "1px solid rgba(201,184,240,0.4)",
            boxShadow: "0 4px 16px rgba(100,60,140,0.07)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Top accent line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #c9b8f0, #a8dadc)", borderRadius: "16px 16px 0 0" }} />
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: "linear-gradient(135deg, #c9b8f0, #a8dadc)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8,
              boxShadow: "0 4px 12px rgba(201,184,240,0.5)",
            }}>😴</div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Трекер сна</div>
            <div style={{ fontSize: 10, color: "#8A7A85", marginTop: 2 }}>Нормы и статистика</div>
            {/* Ring indicator */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(201,184,240,0.25)" strokeWidth="3" />
                <circle cx="16" cy="16" r="12" fill="none" stroke="url(#g)" strokeWidth="3"
                  strokeDasharray="62" strokeDashoffset="20" strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                <defs>
                  <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c9b8f0" />
                    <stop offset="100%" stopColor="#a8dadc" />
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Space Mono', monospace", color: "#9b7dd4" }}>10.5h</div>
                <div style={{ fontSize: 9, color: "#8A7A85" }}>сегодня</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#8A7A85", fontFamily: "'Space Mono', monospace" }}>ИНСТРУМЕНТЫ</span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(168,218,220,0.5), transparent)" }} />
        </div>

        {/* Tools row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🥗", label: "Питание", sub: "AI рецепты", accent: "#a8dadc", grad: "linear-gradient(135deg, #a8dadc, #c9f0e8)" },
            { icon: "💰", label: "Выплаты", sub: "По региону", accent: "#f8c1cc", grad: "linear-gradient(135deg, #f8c1cc, #fdc9a0)" },
          ].map(c => (
            <div key={c.label} style={{
              background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)",
              borderRadius: 16, padding: "14px 12px",
              border: `1px solid ${c.accent}60`,
              boxShadow: "0 4px 16px rgba(100,60,140,0.06)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.grad, borderRadius: "16px 16px 0 0" }} />
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: c.grad,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8,
                boxShadow: `0 4px 12px ${c.accent}60`,
              }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{c.label}</div>
              <div style={{ fontSize: 10, color: "#8A7A85", marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        background: "rgba(245,238,248,0.88)", backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(201,184,240,0.35)",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px",
      }}>
        {[
          { icon: "⊞", label: "Главная", active: true },
          { icon: "✦", label: "AI Чат", active: false },
          { icon: "♫", label: "Звуки", active: false },
          { icon: "◈", label: "Тарифы", active: false },
        ].map(({ icon, label, active }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: active ? "linear-gradient(135deg, #c9b8f0, #f8c1cc)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: active ? 16 : 18,
              boxShadow: active ? "0 3px 12px rgba(201,184,240,0.45)" : "none",
              color: active ? "#fff" : "#3D2E39",
            }}>{icon}</div>
            <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? "#9b7dd4" : "#8A7A85", letterSpacing: "0.04em" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
