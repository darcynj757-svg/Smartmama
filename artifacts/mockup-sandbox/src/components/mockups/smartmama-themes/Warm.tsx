export function Warm() {
  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif",
      background: "linear-gradient(160deg, #c9b8f0 0%, #e8b4d8 25%, #f8cfe0 45%, #b8dff5 70%, #d4f0e8 100%)",
      minHeight: "100vh",
      color: "#3D2E39",
      overflow: "hidden",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px",
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🌸</span>
          <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 18, color: "#e06080" }}>
            Смарт <span style={{ color: "#3D2E39" }}>Мама</span>
          </span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #f8c1cc, #c9b8f0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 12px rgba(200,100,150,0.3)",
        }}>👩</div>
      </div>

      {/* Child tabs */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 8 }}>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
          background: "rgba(255,255,255,0.85)", boxShadow: "0 2px 12px rgba(200,100,150,0.2)",
          border: "1.5px solid rgba(255,255,255,0.9)",
        }}>малыш</div>
        <div style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: "rgba(255,255,255,0.35)", border: "1.5px solid rgba(255,255,255,0.6)",
          color: "#7a6575",
        }}>+ Добавь малыша</div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Diary */}
        <div style={{
          background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)",
          borderRadius: 20, padding: "14px 16px",
          border: "1.5px solid rgba(255,255,255,0.75)",
          boxShadow: "0 4px 24px rgba(100,60,120,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #a8dadc, #c9b8f0)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 12px rgba(168,218,220,0.4)",
          }}>📓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Дневник ребёнка</div>
            <div style={{ fontSize: 12, color: "#8A7A85", marginTop: 2 }}>История малыша · Заметки</div>
          </div>
        </div>

        {/* AI Chat */}
        <div style={{
          background: "linear-gradient(135deg, rgba(248,193,204,0.5), rgba(201,184,240,0.4))",
          backdropFilter: "blur(20px)", borderRadius: 20, padding: "14px 16px",
          border: "1.5px solid rgba(255,255,255,0.65)",
          boxShadow: "0 4px 24px rgba(100,60,120,0.1), inset 0 1px 0 rgba(255,255,255,0.7)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: "linear-gradient(135deg, #e8b4d8, #c9b8f0)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            boxShadow: "0 4px 12px rgba(201,184,240,0.5)",
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>AI Smart Mama чат</div>
            <div style={{ fontSize: 12, color: "#8A7A85", marginTop: 2 }}>Спроси всё о своём малыше</div>
          </div>
          <div style={{ color: "#c9b8f0", fontSize: 18, fontWeight: 300 }}>›</div>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {[["🗣️","Речь"],["🎮","Игры"],["💊","Здоровье"],["🥗","Рецепты"],["💡","Советы"]].map(([icon, label]) => (
            <div key={label} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: "rgba(255,255,255,0.55)", backdropFilter: "blur(10px)",
              border: "1.5px solid rgba(255,255,255,0.75)", whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(100,60,120,0.07)",
            }}>{icon} {label}</div>
          ))}
        </div>

        {/* Trackers */}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#8A7A85", textTransform: "uppercase", paddingTop: 2 }}>Трекеры</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🍼", label: "Трекер питания", sub: "Кормления и нормы", grad: "linear-gradient(135deg, rgba(253,201,160,0.5), rgba(248,193,204,0.4))", accent: "#fdc9a0" },
            { icon: "😴", label: "Трекер сна", sub: "Нормы и статистика", grad: "linear-gradient(135deg, rgba(201,184,240,0.5), rgba(184,223,245,0.4))", accent: "#c9b8f0" },
          ].map(c => (
            <div key={c.label} style={{
              background: c.grad, backdropFilter: "blur(16px)", borderRadius: 18, padding: "14px 14px",
              border: "1.5px solid rgba(255,255,255,0.65)",
              boxShadow: "0 4px 20px rgba(100,60,120,0.08), inset 0 1px 0 rgba(255,255,255,0.65)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: `linear-gradient(135deg, ${c.accent}, rgba(255,255,255,0.6))`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10,
                boxShadow: `0 4px 12px ${c.accent}60`,
              }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#8A7A85", marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.85)",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px",
      }}>
        {[["🏠","Главная",true],["🤖","AI Чат",false],["🎵","Звуки",false],["💎","Тарифы",false]].map(([icon, label, active]) => (
          <div key={String(label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? "#e06080" : "#8A7A85" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
