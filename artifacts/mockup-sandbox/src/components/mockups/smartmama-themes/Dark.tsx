export function Dark() {
  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "linear-gradient(160deg, #1a1228 0%, #221633 30%, #1c1f3a 65%, #12202e 100%)",
      minHeight: "100vh",
      color: "#f0e8ff",
      overflow: "hidden",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Glow blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,80,220,0.18) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 200, right: -80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(80,120,220,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 100, left: 40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,80,160,0.12) 0%, transparent 70%)" }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px", position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 18, color: "#d4a8ff" }}>
            Смарт <span style={{ color: "#f0e8ff" }}>Мама</span>
          </span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #7b3fa0, #3a5ab5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 16px rgba(150,80,220,0.4)",
        }}>👩</div>
      </div>

      {/* Child tabs */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          background: "linear-gradient(135deg, #7b3fa0, #3a5ab5)",
          boxShadow: "0 2px 16px rgba(120,60,200,0.4)",
          color: "#fff",
        }}>малыш</div>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#9080b0",
        }}>+ Добавь малыша</div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 }}>

        {/* Diary */}
        <div style={{
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)",
          borderRadius: 20, padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #3a7bd5, #2ec4b6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 16px rgba(58,123,213,0.5)",
          }}>📓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f0e8ff" }}>Дневник ребёнка</div>
            <div style={{ fontSize: 12, color: "#8070a0", marginTop: 2 }}>История малыша · Заметки</div>
          </div>
        </div>

        {/* AI Chat */}
        <div style={{
          background: "linear-gradient(135deg, rgba(120,60,200,0.25), rgba(60,80,200,0.2))",
          backdropFilter: "blur(20px)", borderRadius: 20, padding: "14px 16px",
          border: "1px solid rgba(180,120,255,0.2)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #9b59d4, #5b7ee8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 16px rgba(155,89,212,0.5)",
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f0e8ff" }}>AI Smart Mama чат</div>
            <div style={{ fontSize: 12, color: "#8070a0", marginTop: 2 }}>Спроси всё о своём малыше</div>
          </div>
          <div style={{ color: "#9b59d4", fontSize: 18, fontWeight: 300 }}>›</div>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {[["🗣️","Речь"],["🎮","Игры"],["💊","Здоровье"],["🥗","Рецепты"],["💡","Советы"]].map(([icon, label]) => (
            <div key={label} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: "rgba(255,255,255,0.07)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap",
              color: "#c0b0e0",
            }}>{icon} {label}</div>
          ))}
        </div>

        {/* Trackers */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#6050a0", textTransform: "uppercase", paddingTop: 2 }}>Трекеры</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🍼", label: "Трекер питания", sub: "Кормления и нормы", grad: "linear-gradient(135deg, rgba(255,140,80,0.2), rgba(255,80,120,0.15))", accent: "#ff8040", glow: "rgba(255,140,80,0.4)" },
            { icon: "😴", label: "Трекер сна", sub: "Нормы и статистика", grad: "linear-gradient(135deg, rgba(80,120,255,0.2), rgba(120,80,220,0.15))", accent: "#5078ff", glow: "rgba(80,120,255,0.4)" },
          ].map(c => (
            <div key={c.label} style={{
              background: c.grad, backdropFilter: "blur(16px)", borderRadius: 18, padding: "14px 14px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: `linear-gradient(135deg, ${c.accent}, rgba(255,255,255,0.1))`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10,
                boxShadow: `0 4px 16px ${c.glow}`,
              }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f0e8ff" }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#7060a0", marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(20,14,36,0.85)", backdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px", zIndex: 10,
      }}>
        {[["🏠","Главная",true],["🤖","AI Чат",false],["🎵","Звуки",false],["💎","Тарифы",false]].map(([icon, label, active]) => (
          <div key={String(label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? "#d4a8ff" : "#5040a0" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
