export function Fresh() {
  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "linear-gradient(160deg, #d4f0e0 0%, #b8e8d0 25%, #e8f5e0 50%, #d0eef8 75%, #e0f4ec 100%)",
      minHeight: "100vh",
      color: "#1e3a2e",
      overflow: "hidden",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px",
        background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 18, color: "#2e8b57" }}>
            Смарт <span style={{ color: "#1e3a2e" }}>Мама</span>
          </span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #7ec8a0, #56b090)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 12px rgba(80,180,120,0.35)",
        }}>👩</div>
      </div>

      {/* Child tabs */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 8 }}>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 12px rgba(80,180,120,0.2)",
          border: "1.5px solid rgba(255,255,255,0.95)", color: "#1e3a2e",
        }}>малыш</div>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: "rgba(255,255,255,0.4)", border: "1.5px solid rgba(255,255,255,0.65)",
          color: "#5a8070",
        }}>+ Добавь малыша</div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Diary */}
        <div style={{
          background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)",
          borderRadius: 20, padding: "14px 16px",
          border: "1.5px solid rgba(255,255,255,0.8)",
          boxShadow: "0 4px 24px rgba(40,120,80,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #56b090, #a8e6c8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 12px rgba(86,176,144,0.4)",
          }}>📓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Дневник ребёнка</div>
            <div style={{ fontSize: 12, color: "#6a9080", marginTop: 2 }}>История малыша · Заметки</div>
          </div>
        </div>

        {/* AI Chat */}
        <div style={{
          background: "linear-gradient(135deg, rgba(86,176,144,0.2), rgba(100,180,220,0.15))",
          backdropFilter: "blur(20px)", borderRadius: 20, padding: "14px 16px",
          border: "1.5px solid rgba(255,255,255,0.65)",
          boxShadow: "0 4px 24px rgba(40,120,80,0.1), inset 0 1px 0 rgba(255,255,255,0.75)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #3aab80, #5cc0b0)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 12px rgba(58,171,128,0.45)",
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>AI Smart Mama чат</div>
            <div style={{ fontSize: 12, color: "#6a9080", marginTop: 2 }}>Спроси всё о своём малыше</div>
          </div>
          <div style={{ color: "#3aab80", fontSize: 18, fontWeight: 300 }}>›</div>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {[["🗣️","Речь"],["🎮","Игры"],["💊","Здоровье"],["🥗","Рецепты"],["💡","Советы"]].map(([icon, label]) => (
            <div key={label} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: "rgba(255,255,255,0.65)", backdropFilter: "blur(10px)",
              border: "1.5px solid rgba(255,255,255,0.8)", whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(40,120,80,0.07)",
            }}>{icon} {label}</div>
          ))}
        </div>

        {/* Trackers */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#6a9080", textTransform: "uppercase", paddingTop: 2 }}>Трекеры</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🍼", label: "Трекер питания", sub: "Кормления и нормы", grad: "linear-gradient(135deg, rgba(255,200,100,0.35), rgba(255,160,80,0.25))", accent: "#f0a830", glow: "rgba(240,168,48,0.4)" },
            { icon: "😴", label: "Трекер сна", sub: "Нормы и статистика", grad: "linear-gradient(135deg, rgba(100,180,220,0.3), rgba(86,176,144,0.2))", accent: "#5ab8d8", glow: "rgba(90,184,216,0.4)" },
          ].map(c => (
            <div key={c.label} style={{
              background: c.grad, backdropFilter: "blur(16px)", borderRadius: 18, padding: "14px 14px",
              border: "1.5px solid rgba(255,255,255,0.7)",
              boxShadow: "0 4px 20px rgba(40,120,80,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: `linear-gradient(135deg, ${c.accent}, rgba(255,255,255,0.5))`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10,
                boxShadow: `0 4px 12px ${c.glow}`,
              }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#6a9080", marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Bottom nav */}
      </div>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(240,252,246,0.8)", backdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.9)",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px",
      }}>
        {[["🏠","Главная",true],["🤖","AI Чат",false],["🎵","Звуки",false],["💎","Тарифы",false]].map(([icon, label, active]) => (
          <div key={String(label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? "#2e8b57" : "#7aaa90" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
