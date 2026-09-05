// 모서리가 각지지 않고 통통하고 귀여운 젤리 별(Rounded Soft Star) 그리기 함수
export function drawRoundedStar(ctx, cx, cy, spikes, outerRadius, innerRadius, cornerRadius, fillColor, strokeColor, lineWidth = 2) {
  ctx.save();
  ctx.fillStyle = fillColor;
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
  }

  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  // 외경 및 내경 좌표점 계산
  const points = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    const x = cx + Math.cos(rot) * r;
    const y = cy + Math.sin(rot) * r;
    points.push({ x, y });
    rot += step;
  }

  // 둥근 모서리로 연결 (곡선 패스)
  ctx.beginPath();
  const len = points.length;
  for (let i = 0; i < len; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % len];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (i === 0) {
      ctx.moveTo(midX, midY);
    } else {
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
  }
  // 마지막 닫기
  const p1 = points[0];
  const p2 = points[1];
  ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  ctx.closePath();

  ctx.fill();
  if (strokeColor) {
    ctx.stroke();
  }

  // 귀여운 반짝 하이라이트 (빛 반사점)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.arc(cx - outerRadius * 0.25, cy - outerRadius * 0.25, outerRadius * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
