/**
 * PEA Charting Engine
 * High-performance, zero-dependency HTML5 Canvas charting engine
 * Designed for PEA Corporate Theme (Official Purple & Gold) with High-DPI support,
 * smooth animations, interactive hover tooltips, and crisp typography.
 */

class PeaChart {
  constructor(canvasId, options = {}) {
    this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      type: 'bar', // 'bar', 'line', 'donut', 'radar'
      data: { labels: [], datasets: [] },
      padding: { top: 30, right: 25, bottom: 40, left: 65 },
      colors: ['#A855F7', '#FFB81C', '#10B981', '#06B6D4', '#EF4444', '#EC4899'],
      showLegend: true,
      showGrid: true,
      animated: true,
      formatY: (v) => v.toLocaleString('th-TH')
    }, options);

    this.init();
  }

  init() {
    this.resize();
    this.setupHover();
    this._resizeHandler = () => {
      this.resize();
      this.render();
    };
    window.addEventListener('resize', this._resizeHandler);
  }

  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 400;
    this.height = rect.height || 280;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  update(data, options = {}) {
    if (data) this.options.data = data;
    if (options) Object.assign(this.options, options);
    this.resize();
    this.render();
  }

  setupHover() {
    this.mouse = { x: -1, y: -1, active: false };
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
      this.render();
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.active = false;
      this.render();
    });
    this.canvas.addEventListener('click', (e) => {
      // คลิกแท่งกราฟ หรือคลิกชื่อหน่วยงานบนแกน X (ทำงานเหมือนกัน)
      const clickedItem = this.lastHoveredItem || this.lastHoveredLabelItem;
      if (typeof this.options.onClick === 'function' && clickedItem) {
        this.options.onClick(clickedItem, e);
      }
    });
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    switch (this.options.type) {
      case 'bar':
        this.renderBarChart();
        break;
      case 'line':
        this.renderLineChart();
        break;
      case 'donut':
        this.renderDonutChart();
        break;
      case 'radar':
        this.renderRadarChart();
        break;
      default:
        this.renderBarChart();
    }

    if (typeof this.options.onRender === 'function') {
      try {
        this.options.onRender(this);
      } catch (err) {
        console.error('PeaChart onRender error:', err);
      }
    }
  }

  // ==========================================
  // BAR CHART
  // ==========================================
  renderBarChart() {
    const { ctx, width, height, options } = this;
    const { labels, datasets } = options.data;
    if (!labels || !labels.length || !datasets || !datasets.length) return;
    this.renderedBars = [];
    this.renderedXLabels = [];

    const rotateLabels = options.rotateXLabels !== undefined ? options.rotateXLabels : (labels.length > 7);
    const defaultBottomPad = height < 70 ? (rotateLabels ? 24 : 10) : (height < 100 ? (rotateLabels ? 34 : 14) : (rotateLabels ? 132 : 22));
    const defaultTopPad = options.showBarValues ? (height < 100 ? 18 : 36) : (height < 70 ? 4 : (height < 100 ? 6 : 10));
    const defaultLeftPad = height < 70 ? 28 : (height < 100 ? 32 : 36);
    const defaultRightPad = height < 70 ? 8 : 12;
    const pad = Object.assign({ top: defaultTopPad, right: defaultRightPad, bottom: defaultBottomPad, left: defaultLeftPad }, options.padding || {});

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Calculate max value
    let maxVal = options.yMax || 0;
    if (!maxVal) {
      datasets.forEach(ds => {
        ds.data.forEach(v => {
          if (v > maxVal) maxVal = v;
        });
      });
      if (maxVal === 0) maxVal = 100;
      maxVal = maxVal * 1.15; // padding top
    }

    // Draw Grid Lines (when height > 15px)
    if (options.showGrid && height > 15) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.14)';
      ctx.lineWidth = 1;
      const steps = options.gridSteps || (height < 90 ? 1 : 2); // 0%, 50%, 100%
      for (let i = 0; i <= steps; i++) {
        const y = pad.top + (plotH / steps) * i;
        const val = maxVal * (1 - i / steps);
        if (options.showGridLines !== false) {
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(width - pad.right, y);
          ctx.stroke();
        }

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const defaultYColor = isDark ? '#D4BBE8' : '#4B5563';
        const yFontSize = options.yFontSize || 11;
        ctx.fillStyle = options.yLabelColor || defaultYColor;
        ctx.font = `${options.yFontWeight || '600'} ${yFontSize}px Prompt, Sarabun, sans-serif`;
        const yAlign = options.yLabelAlign || 'right';
        ctx.textAlign = yAlign;
        const textX = (yAlign === 'left')
          ? (options.yLabelLeftOffset !== undefined ? options.yLabelLeftOffset : 3)
          : (pad.left - (options.yLabelRightGap !== undefined ? options.yLabelRightGap : 8));
        
        // If it's the 0% mark (i === steps) and labels are rotated, position the 0% label slightly above the baseline
        // so it never collides with the first rotated office name
        const isZeroStep = (i === steps);
        const yOffset = (isZeroStep && rotateLabels) ? -3 : 3.5;
        ctx.textBaseline = (isZeroStep && rotateLabels) ? 'bottom' : 'middle';
        ctx.fillText(options.formatY(Math.round(val)), textX, y + yOffset);
      }
    }

    const groupCount = labels.length;
    const groupW = plotW / groupCount;
    const barCount = datasets.length;
    const barRatio = options.barRatio || (groupCount > 20 ? 0.88 : (groupCount > 10 ? 0.82 : 0.78));
    const maxBarW = options.maxBarWidth || (groupCount > 20 ? 48 : (groupCount > 10 ? 58 : 72));
    const barW = Math.max(options.minBarWidth || 3, Math.min(maxBarW, (groupW * barRatio) / barCount));
    const gap = options.barGap !== undefined ? options.barGap : (groupCount > 25 ? 1 : 2);

    let hoveredBar = null;
    const kfgIdx = datasets[0] && datasets[0].extra ? datasets[0].extra.findIndex(e => e && e.isKfg3Total) : -1;

    labels.forEach((label, gIdx) => {
      const gX = pad.left + gIdx * groupW + groupW / 2;
      const totalBarsW = barCount * barW + (barCount - 1) * gap;
      let startX = gX - totalBarsW / 2;

      datasets.forEach((ds, dIdx) => {
        const val = ds.data[gIdx] || 0;
        const barH = Math.max(2, (Math.min(val, maxVal) / maxVal) * plotH);
        const x = startX + dIdx * (barW + gap);
        const y = pad.top + plotH - barH;

        const ext = ds.extra && ds.extra[gIdx];
        const isNoWork = ext && ext.isNoWork;
        const isKfg = ext && ext.isKfg3Total;

        const currentBarW = isKfg ? Math.min(groupW - 2, Math.max(barW, barW + 2)) : barW;
        const currentX = isKfg ? (x + barW / 2 - currentBarW / 2) : x;

        // Support array of colors per bar (e.g. green for 100%, yellow for >=80%, red for <50%)
        const color = (ds.colors && ds.colors[gIdx]) || ds.color || options.colors[dIdx % options.colors.length];
        const isDimmed = (ext && ext.isDimmed) || (typeof color === 'string' && color.includes('rgba(') && !color.includes(', 1)') && !color.includes(',1)'));

        this.renderedBars.push({
          gIdx: gIdx,
          dIdx: dIdx,
          label: label,
          value: val,
          x: currentX,
          y: y,
          barW: currentBarW,
          barH: barH,
          centerX: currentX + currentBarW / 2,
          topY: y,
          color: color,
          ext: ext
        });

        const isGoodKpi = ext ? (ext.kpi >= 5) : (val >= 100);
        const badgeH = 12.5;
        let currentBarSortedBadges = [];

        // Draw Bar
        let grad;
        if (isKfg && !isDimmed) {
          grad = ctx.createLinearGradient(0, y, 0, y + barH);
          if (isGoodKpi) {
            // สีเขียวเรืองแสง (Luminous Neon Green)
            grad.addColorStop(0, '#D1FAE5');   // Glowing light mint top
            grad.addColorStop(0.2, '#6EE7B7'); // Luminous mint green
            grad.addColorStop(0.55, '#10B981'); // Vibrant emerald green (KPI 5)
            grad.addColorStop(0.85, '#059669'); // Rich deep emerald
            grad.addColorStop(1, '#064E3B');   // Dark forest green base
          } else {
            // สีแดงเรืองแสง (Luminous Neon Red)
            grad.addColorStop(0, '#FEE2E2');   // Glowing light coral top
            grad.addColorStop(0.2, '#FCA5A5'); // Luminous neon red
            grad.addColorStop(0.55, '#EF4444'); // Vibrant crimson (KPI 1-4)
            grad.addColorStop(0.85, '#DC2626'); // Deep rich red
            grad.addColorStop(1, '#7F1D1D');   // Dark maroon base
          }
        } else if (isKfg && isDimmed) {
          grad = ctx.createLinearGradient(0, y, 0, y + barH);
          if (isGoodKpi) {
            grad.addColorStop(0, 'rgba(110, 231, 183, 0.25)');
            grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.18)');
            grad.addColorStop(1, 'rgba(6, 78, 59, 0.12)');
          } else {
            grad.addColorStop(0, 'rgba(252, 165, 165, 0.25)');
            grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.18)');
            grad.addColorStop(1, 'rgba(127, 29, 29, 0.12)');
          }
        } else {
          grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0, color);
          grad.addColorStop(1, this.adjustAlpha(color, 0.6));
        }

        ctx.save();
        if (isKfg && !isDimmed) {
          ctx.shadowColor = isGoodKpi ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = -1;
        } else if (!isDimmed && color === '#10B981') {
          ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = -1;
        } else if (!isDimmed && color === '#EF4444') {
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = -1;
        }
        ctx.fillStyle = grad;
        this.roundRect(ctx, currentX, y, currentBarW, barH, Math.min(4, currentBarW / 2));
        ctx.fill();
        ctx.restore();

        // Distinct styling for กฟก.3 (ทั้งหมด): Illuminated outline & metallic shimmer texture
        if (isKfg) {
          ctx.save();
          if (!isDimmed) {
            ctx.strokeStyle = isGoodKpi ? '#A7F3D0' : '#FECACA';
            ctx.lineWidth = 2.0;
          } else {
            ctx.strokeStyle = isGoodKpi ? 'rgba(167, 243, 208, 0.22)' : 'rgba(254, 202, 202, 0.22)';
            ctx.lineWidth = 1.0;
          }
          this.roundRect(ctx, currentX, y, currentBarW, barH, Math.min(4, currentBarW / 2));
          ctx.stroke();
          ctx.restore();

          // Elegant diagonal shimmer texture/stripes inside bar
          ctx.save();
          ctx.beginPath();
          this.roundRect(ctx, currentX, y, currentBarW, barH, Math.min(4, currentBarW / 2));
          ctx.clip();
          ctx.strokeStyle = isDimmed ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = isDimmed ? 0.9 : 1.6;
          for (let dy = -currentBarW; dy < barH + currentBarW; dy += 7) {
            ctx.beginPath();
            ctx.moveTo(currentX, y + dy);
            ctx.lineTo(currentX + currentBarW, y + dy - currentBarW);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw benchmark line notch on bar if ext.targetBenchmark is set and requested
        if (options.showBenchmarkNotch && ext && typeof ext.targetBenchmark === 'number' && ext.targetBenchmark > 0) {
          const tY = pad.top + plotH - (Math.min(ext.targetBenchmark, maxVal) / maxVal) * plotH;
          ctx.save();
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 2.0;
          ctx.shadowColor = 'rgba(253, 224, 71, 0.85)';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.moveTo(currentX - 2, tY);
          ctx.lineTo(currentX + currentBarW + 2, tY);
          ctx.stroke();
          ctx.restore();
        }

        // Draw independent target lines & badges on each bar (per criteria)
        let hasDrawnUnifiedKpi = false;
        if (ext && Array.isArray(ext.barTargetLines) && ext.barTargetLines.length > 0 && height > 25) {
          const barTargets = ext.barTargetLines.map(tl => {
            const targetVal = Number(tl.value);
            const targetY = pad.top + plotH - (Math.min(targetVal, maxVal) / maxVal) * plotH;
            return { ...tl, targetVal, targetY };
          }).filter(tl => tl.targetY >= pad.top - 2 && tl.targetY <= pad.top + plotH + 2);

          if (barTargets.length > 0) {
            // 1. Draw horizontal dashed line across the bar for each target (exact mathematical height)
            if (options.showBarTargetLines !== false) {
              barTargets.forEach(tl => {
                ctx.save();
                ctx.strokeStyle = tl.color || '#FFB81C';
                ctx.lineWidth = 1.4;
                ctx.shadowColor = tl.color || '#FFB81C';
                ctx.shadowBlur = 3;
                ctx.setLineDash([4, 2.5]);
                ctx.beginPath();
                ctx.moveTo(currentX - 5, tl.targetY);
                ctx.lineTo(currentX + currentBarW + 5, tl.targetY);
                ctx.stroke();
                ctx.restore();
              });
            }

            // 2. Prepare items for unified non-overlapping vertical layout: Target Badges + Bar %KPI Badge
            const bFontSize = options.targetBadgeFontSize || (currentBarW < 36 ? 7 : (currentBarW < 48 ? 7.6 : 8.2));
            const badgeH = options.targetBadgeHeight || (currentBarW < 36 ? 12 : (currentBarW < 48 ? 13 : 13.5));
            const barItems = [];

            // Add Target Badges
            barTargets.forEach(tl => {
              let prefTargetBadgeY = tl.targetY - badgeH / 2;
              if (tl.targetVal >= 100 || tl.targetY <= pad.top + 2) {
                prefTargetBadgeY = pad.top + 3;
              }
              barItems.push({
                type: 'target',
                targetY: tl.targetY,
                badgeY: prefTargetBadgeY,
                h: badgeH,
                label: tl.label || `${tl.targetVal.toFixed(2)}%`,
                color: tl.color || '#FFB81C',
                textColor: tl.textColor || tl.color || '#FFD25A',
                isPass: tl.isPass,
                isLatestMonth: tl.isLatestMonth
              });
            });

            // Add Bar's %KPI Value Badge (VIP Priority)
            const isBottomKpi = (options.barValuePosition === 'bottom');
            if (options.showBarValues && !isKfg && !isBottomKpi) {
              hasDrawnUnifiedKpi = true;
              let valText = isNoWork
                ? 'ไม่มีงาน'
                : (options.formatBarValue ? options.formatBarValue(val, gIdx) : `${Math.round(val)}%`);
              valText = valText.replace(/^★\s*/, '');

              const kpiH = 17;
              // Preferred position:
              // If bar is 100% or reaches ceiling: sit in headroom above 100% line
              // Otherwise: sit right at the bar top (y - kpiH - 2)
              let prefKpiY = (val >= 100 || y <= pad.top + 4) ? (pad.top - kpiH - 4) : (y - kpiH - 2);

              barItems.push({
                type: 'kpi',
                targetY: y,
                badgeY: prefKpiY,
                h: kpiH,
                valText: valText,
                val: val,
                isGoodKpi: isGoodKpi,
                isNoWork: isNoWork
              });
            }

            // 3. Multi-pass bidirectional relaxation so items NEVER overlap each other
            barItems.sort((a, b) => a.badgeY - b.badgeY);

            const minGap = 3.5; // Guaranteed visual gap between badges
            for (let pass = 0; pass < 15; pass++) {
              for (let i = 1; i < barItems.length; i++) {
                const prev = barItems[i - 1];
                const curr = barItems[i];
                const overlap = (prev.badgeY + prev.h + minGap) - curr.badgeY;
                if (overlap > 0) {
                  let prevShift = overlap / 2;
                  let currShift = overlap / 2;
                  // If colliding with KPI badge, target yields slightly more to preserve bar-top clarity
                  if (prev.type === 'kpi') {
                    prevShift = overlap * 0.15;
                    currShift = overlap * 0.85;
                  } else if (curr.type === 'kpi') {
                    prevShift = overlap * 0.85;
                    currShift = overlap * 0.15;
                  }
                  prev.badgeY -= prevShift;
                  curr.badgeY += currShift;
                }
              }
              const minAllowedY = (val >= 100 || y <= pad.top + 6) ? (pad.top - 25) : (pad.top + 2);
              const maxAllowedY = isBottomKpi ? (pad.top + plotH - 42) : (pad.top + plotH - badgeH - 2);
              if (barItems.length > 0) {
                if (barItems[0].badgeY < minAllowedY) barItems[0].badgeY = minAllowedY;
                if (barItems[barItems.length - 1].badgeY + barItems[barItems.length - 1].h > maxAllowedY) {
                  barItems[barItems.length - 1].badgeY = maxAllowedY - barItems[barItems.length - 1].h;
                }
              }
            }

            // Strict forward guarantee pass
            for (let i = 1; i < barItems.length; i++) {
              const minPos = barItems[i - 1].badgeY + barItems[i - 1].h + minGap;
              if (barItems[i].badgeY < minPos) {
                barItems[i].badgeY = minPos;
              }
            }
            // Strict backward guarantee pass if pushed beyond bottom
            const maxAllowedBottom = isBottomKpi ? (pad.top + plotH - 42) : (pad.top + plotH - 2);
            if (barItems.length > 0 && barItems[barItems.length - 1].badgeY + barItems[barItems.length - 1].h > maxAllowedBottom) {
              barItems[barItems.length - 1].badgeY = maxAllowedBottom - barItems[barItems.length - 1].h;
              for (let i = barItems.length - 2; i >= 0; i--) {
                const maxPos = barItems[i + 1].badgeY - minGap - barItems[i].h;
                if (barItems[i].badgeY > maxPos) {
                  barItems[i].badgeY = maxPos;
                }
              }
            }

            // 4. Render all items with clean, high-contrast badges
            barItems.forEach(item => {
              ctx.save();
              if (item.type === 'target') {
                const isFullW = options.targetBadgeFullWidth !== false;
                const badgeInset = options.badgeInset !== undefined ? options.badgeInset : (currentBarW < 40 ? 4 : 6);
                const maxAllowedBadgeW = Math.max(24, currentBarW - badgeInset);
                let currentFontSize = bFontSize;
                ctx.font = `700 ${currentFontSize}px 'Prompt', 'Sarabun', sans-serif`;
                let textW = ctx.measureText(item.label).width;
                const badgeW = isFullW ? maxAllowedBadgeW : Math.min(maxAllowedBadgeW, textW + 6);
                let badgeX = currentX + (currentBarW - badgeW) / 2;
                badgeX = Math.max(pad.left + 1, Math.min(width - pad.right - badgeW - 1, badgeX));

                if (textW + 6 > badgeW) {
                  currentFontSize = Math.max(6.5, currentFontSize * ((badgeW - 6) / textW));
                  ctx.font = `700 ${currentFontSize}px 'Prompt', 'Sarabun', sans-serif`;
                  textW = ctx.measureText(item.label).width;
                }

                ctx.setLineDash([]);
                let bgCol = 'rgba(22, 7, 34, 0.95)';
                let glowCol = 'rgba(0, 0, 0, 0.85)';
                let glowBlur = 3;
                if (item.isPass) {
                  // ผ่านเกณฑ์ (สีเขียวทับทิม สว่าง / Radiant Jewel Emerald Theme)
                  bgCol = 'rgba(2, 32, 18, 0.96)';
                  glowCol = 'rgba(0, 255, 136, 0.75)';
                  glowBlur = 5;
                } else if (item.isPass === false) {
                  // ต้องเร่งรัด (Ruby Red / Electric Crimson Theme - คงไว้ตามที่ผู้ใช้กำหนด)
                  bgCol = 'rgba(38, 5, 15, 0.96)';
                  glowCol = 'rgba(255, 45, 85, 0.75)';
                  glowBlur = 5;
                } else if (item.color === '#FFB81C' || item.isLatestMonth) {
                  // เป้าเดือนล่าสุด (PEA Gold Theme)
                  bgCol = 'rgba(28, 18, 4, 0.96)';
                  glowCol = 'rgba(255, 184, 28, 0.65)';
                  glowBlur = 4;
                }

                ctx.fillStyle = bgCol;
                ctx.strokeStyle = item.color || '#FFB81C';
                ctx.lineWidth = 1.3;
                ctx.shadowColor = glowCol;
                ctx.shadowBlur = glowBlur;
                this.roundRect(ctx, badgeX, item.badgeY, badgeW, item.h, 3);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = item.textColor || item.color || '#FFD25A';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetY = 0.5;
                ctx.fillText(item.label, badgeX + badgeW / 2, item.badgeY + item.h / 2 + 0.5);
              } else if (item.type === 'kpi') {
                const kpiFontSize = currentBarW < 32 ? 7.5 : (currentBarW < 42 ? 8.5 : (currentBarW < 55 ? 9.5 : 10.5));
                ctx.font = `800 ${kpiFontSize}px 'Prompt', 'Sarabun', sans-serif`;
                const textW = ctx.measureText(item.valText).width;
                const isFullW = options.barValueFullWidth !== false;
                const badgeInset = options.badgeInset !== undefined ? options.badgeInset : (currentBarW < 40 ? 4 : 6);
                const maxBadgeW = Math.max(24, currentBarW - badgeInset);
                const pillW = isFullW ? maxBadgeW : Math.min(maxBadgeW, textW + 10);
                const pillX = currentX + (currentBarW - pillW) / 2;
                const pillY = item.badgeY;
                const pillH = item.h;

                // Glowing VIP Pill Background
                ctx.setLineDash([]);
                const isGoldTheme = (options.barValueTheme === 'gold' || !!options.barValueColor);
                const bgCol = item.isNoWork
                  ? 'rgba(30, 41, 59, 0.96)'
                  : (isGoldTheme ? 'rgba(20, 6, 34, 0.95)' : (item.isGoodKpi ? 'rgba(6, 78, 59, 0.96)' : 'rgba(127, 29, 29, 0.96)'));
                const strokeCol = item.isNoWork
                  ? '#94A3B8'
                  : (isGoldTheme ? (options.barValueBorderColor || '#FFB81C') : (item.isGoodKpi ? '#34D399' : '#F87171'));
                const glowCol = item.isNoWork
                  ? 'transparent'
                  : (isGoldTheme ? 'rgba(255, 184, 28, 0.75)' : (item.isGoodKpi ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'));
                const textCol = item.isNoWork
                  ? '#94A3B8'
                  : (isGoldTheme ? (options.barValueTextColor || options.barValueColor || '#FFD25A') : '#FFFFFF');

                ctx.fillStyle = bgCol;
                ctx.strokeStyle = strokeCol;
                ctx.lineWidth = 1.6;
                ctx.shadowColor = glowCol;
                ctx.shadowBlur = 6;
                this.roundRect(ctx, pillX, pillY, pillW, pillH, 4);
                ctx.fill();
                ctx.stroke();

                // Text
                ctx.fillStyle = textCol;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetY = 0.5;
                ctx.fillText(item.valText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
              }
              ctx.restore();
            });

            // 5. If isBottomKpi, render Bar's %KPI Value Badge at the very bottom of the bar
            if (options.showBarValues && isBottomKpi && !isKfg) {
              hasDrawnUnifiedKpi = true;
              let valText = isNoWork
                ? 'ไม่มีงาน'
                : (options.formatBarValue ? options.formatBarValue(val, gIdx) : `${Math.round(val)}%`);
              valText = valText.replace(/^★\s*/, '');

              const kpiH = options.barValueHeight || 16;
              const kpiFontSize = options.barValueFontSize || (currentBarW < 32 ? 8 : (currentBarW < 42 ? 8.8 : (currentBarW < 55 ? 9.5 : 10.5)));
              ctx.save();
              ctx.font = `800 ${kpiFontSize}px 'Prompt', 'Sarabun', sans-serif`;
              const textW = ctx.measureText(valText).width;
              const isFullW = options.barValueFullWidth !== false;
              const badgeInset = options.badgeInset !== undefined ? options.badgeInset : (currentBarW < 40 ? 4 : 6);
              const maxBadgeW = Math.max(24, currentBarW - badgeInset);
              const pillW = isFullW ? maxBadgeW : Math.min(maxBadgeW, textW + 8);
              let pillX = currentX + (currentBarW - pillW) / 2;
              pillX = Math.max(pad.left + 1, Math.min(width - pad.right - pillW - 1, pillX));
              const pillY = pad.top + plotH - kpiH - 6;

              // Glowing VIP Pill Background
              ctx.setLineDash([]);
              const isGoldTheme = (options.barValueTheme === 'gold' || !!options.barValueColor);
              const bgCol = isNoWork
                ? 'rgba(30, 41, 59, 0.96)'
                : (isGoldTheme ? 'rgba(20, 6, 34, 0.95)' : (isGoodKpi ? 'rgba(6, 78, 59, 0.96)' : 'rgba(127, 29, 29, 0.96)'));
              const strokeCol = isNoWork
                ? '#94A3B8'
                : (isGoldTheme ? (options.barValueBorderColor || '#FFB81C') : (isGoodKpi ? '#34D399' : '#F87171'));
              const glowCol = isNoWork
                ? 'transparent'
                : (isGoldTheme ? 'rgba(255, 184, 28, 0.75)' : (isGoodKpi ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'));
              const textCol = isNoWork
                ? '#94A3B8'
                : (isGoldTheme ? (options.barValueTextColor || options.barValueColor || '#FFD25A') : '#FFFFFF');

              ctx.fillStyle = bgCol;
              ctx.strokeStyle = strokeCol;
              ctx.lineWidth = 1.6;
              ctx.shadowColor = glowCol;
              ctx.shadowBlur = 6;
              this.roundRect(ctx, pillX, pillY, pillW, kpiH, 4);
              ctx.fill();
              ctx.stroke();

              // Text
              ctx.fillStyle = textCol;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetY = 0.5;
              ctx.fillText(valText, pillX + pillW / 2, pillY + kpiH / 2 + 0.5);
              ctx.restore();

              // วาดดาว KPI ระดับ 5 เหนือป้าย % ปิดงาน ("ไว้ด้านบน %ปิดงาน")
              // ผ่านเกณฑ์ KPI 1 เดือน ให้ 1 ดาว, 2 เดือน ให้ 2 ดาว ตามลำดับ
              let starCount = (ext && typeof ext.starCount === 'number') ? ext.starCount : 0;
              if (starCount === 0 && isGoodKpi && !isNoWork) {
                starCount = 1;
              }
              if (starCount > 0 && !isNoWork) {
                const starStr = '★'.repeat(starCount);
                const maxW = Math.max(26, currentBarW - 4);
                const rawSize = starCount >= 4 ? 9.5 : (starCount === 3 ? 11 : 12.5);
                const starFSize = Math.min(rawSize, Math.max(8.5, maxW / (starCount * 1.12)));
                const centerX = currentX + currentBarW / 2;
                const starY = pillY - 2.5;

                ctx.save();
                ctx.font = `900 ${starFSize}px 'Prompt', 'Sarabun', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                // Luminous golden glow layer
                ctx.shadowColor = 'rgba(255, 184, 28, 0.9)';
                ctx.shadowBlur = 7;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#FFD25A';
                ctx.fillText(starStr, centerX, starY);

                // Sharp foreground highlight with dark drop shadow for high contrast against bar
                ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetY = 1;
                ctx.fillStyle = '#FFF8C7';
                ctx.fillText(starStr, centerX, starY);
                ctx.restore();
              }
            }
          }
        }

        // Draw % value on / above bar if requested and height is sufficient (for bars without unified barTargetLines or special kfg)
        if (options.showBarValues && height > 25 && !hasDrawnUnifiedKpi) {
          ctx.save();
          let valText = isNoWork
            ? 'ไม่มีงาน'
            : (options.formatBarValue ? options.formatBarValue(val, gIdx) : `${Math.round(val)}%`);

          // Strip any leading star from formatting so it doesn't duplicate
          valText = valText.replace(/^★\s*/, '');

          if (options.barValuePosition === 'bottom' && !isKfg) {
            const kpiH = 17;
            const kpiFontSize = currentBarW < 32 ? 7.5 : (currentBarW < 42 ? 8.5 : (currentBarW < 55 ? 9.5 : 10.5));
            ctx.font = `800 ${kpiFontSize}px 'Prompt', 'Sarabun', sans-serif`;
            const textW = ctx.measureText(valText).width;
            const isFullW = options.barValueFullWidth !== false;
            const badgeInset = options.badgeInset !== undefined ? options.badgeInset : (currentBarW < 40 ? 4 : 6);
            const maxBadgeW = Math.max(24, currentBarW - badgeInset);
            const pillW = isFullW ? maxBadgeW : Math.min(maxBadgeW, textW + 10);
            const pillX = currentX + (currentBarW - pillW) / 2;
            const pillY = pad.top + plotH - kpiH - 6;

            const isGoldTheme = (options.barValueTheme === 'gold' || !!options.barValueColor);
            const bgCol = isNoWork
              ? 'rgba(30, 41, 59, 0.96)'
              : (isGoldTheme ? 'rgba(20, 6, 34, 0.95)' : (isGoodKpi ? 'rgba(6, 78, 59, 0.96)' : 'rgba(127, 29, 29, 0.96)'));
            const strokeCol = isNoWork
              ? '#94A3B8'
              : (isGoldTheme ? (options.barValueBorderColor || '#FFB81C') : (isGoodKpi ? '#34D399' : '#F87171'));
            const glowCol = isNoWork
              ? 'transparent'
              : (isGoldTheme ? 'rgba(255, 184, 28, 0.75)' : (isGoodKpi ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'));
            const textCol = isNoWork
              ? '#94A3B8'
              : (isGoldTheme ? (options.barValueTextColor || options.barValueColor || '#FFD25A') : '#FFFFFF');

            ctx.setLineDash([]);
            ctx.fillStyle = bgCol;
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 1.6;
            ctx.shadowColor = glowCol;
            ctx.shadowBlur = 6;
            this.roundRect(ctx, pillX, pillY, pillW, kpiH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = textCol;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetY = 0.5;
            ctx.fillText(valText, pillX + pillW / 2, pillY + kpiH / 2 + 0.5);

            // วาดดาว KPI ระดับ 5 เหนือป้าย % ปิดงาน ("ไว้ด้านบน %ปิดงาน")
            // ผ่านเกณฑ์ KPI 1 เดือน ให้ 1 ดาว, 2 เดือน ให้ 2 ดาว ตามลำดับ
            const starCount = (ext && typeof ext.starCount === 'number') ? ext.starCount : 0;
            if (starCount > 0 && !isNoWork) {
              const starStr = '★'.repeat(starCount);
              const maxW = Math.max(26, currentBarW - 4);
              const rawSize = starCount >= 4 ? 9 : (starCount === 3 ? 10.5 : 12);
              const starFSize = Math.min(rawSize, Math.max(8, maxW / (starCount * 1.12)));
              const centerX = currentX + currentBarW / 2;
              const starY = pillY - 2.5;

              ctx.save();
              ctx.font = `900 ${starFSize}px 'Prompt', 'Sarabun', sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';

              // Luminous golden glow layer
              ctx.shadowColor = 'rgba(255, 184, 28, 0.9)';
              ctx.shadowBlur = 7;
              ctx.shadowOffsetY = 0;
              ctx.fillStyle = '#FFD25A';
              ctx.fillText(starStr, centerX, starY);

              // Sharp foreground highlight with dark drop shadow for high contrast against bar
              ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetY = 1;
              ctx.fillStyle = '#FFF8C7';
              ctx.fillText(starStr, centerX, starY);
              ctx.restore();
            }
          } else {
            // Compact font size calculated from bar width to guarantee zero horizontal collision
            const fSize = options.barFontSize || (height < 70 ? 8 : (height < 100 ? 8.5 : (groupCount <= 10 ? 11.5 : (groupW < 22 ? 8.8 : (groupW < 27 ? 9.8 : 11)))));
            const textY = Math.max(fSize + 3, y - 3);

            if (isKfg) {
              // Distinct VIP label for กฟก.3 (ทั้งหมด):
              // Level 1 (upper level): Glowing Star ★
              // Level 2 (same level above bar): Percentage value (e.g. 86.5%)
              const kfgTextY = Math.max(fSize + 15, y - 3);
              const centerX = currentX + currentBarW / 2;

              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';

              // 1. Draw Star ★ on upper level (ระดับบน)
              if (!isNoWork) {
                const starSize = Math.max(11, fSize + 2.5);
                const starY = kfgTextY - fSize - 1.5;
                ctx.font = `900 ${starSize}px 'Prompt', 'Sarabun', sans-serif`;
                if (!isDimmed) {
                  ctx.fillStyle = options.barValueColor || (isGoodKpi ? '#34D399' : '#F87171');
                  ctx.shadowColor = options.barValueColor ? 'rgba(255, 184, 28, 0.95)' : (isGoodKpi ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)');
                  ctx.shadowBlur = 8;
                  ctx.shadowOffsetY = 0;
                } else {
                  ctx.fillStyle = isGoodKpi ? 'rgba(52, 211, 153, 0.35)' : 'rgba(248, 113, 113, 0.35)';
                  ctx.shadowBlur = 0;
                  ctx.shadowColor = 'transparent';
                }
                ctx.fillText('★', centerX, starY);
              }

              // 2. Draw % value below star on same uniform level above bar
              ctx.font = `800 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
              if (!isDimmed) {
                ctx.fillStyle = options.barValueColor || (isGoodKpi ? '#A7F3D0' : '#FECACA');
                ctx.shadowColor = options.barValueColor ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetY = 1;
              } else {
                ctx.fillStyle = isGoodKpi ? 'rgba(167, 243, 208, 0.45)' : 'rgba(254, 202, 202, 0.45)';
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
              }
              ctx.fillText(valText, centerX, kfgTextY);
            } else if ((groupCount > 20 && groupW < 16) || (isNoWork && groupW < 45)) {
              // Rotated vertical value for very narrow screens (< 16px per bar) or compact 'ไม่มีงาน'
              const rotFSize = isNoWork ? Math.min(fSize, 8.5) : fSize;
              ctx.font = `700 ${rotFSize}px 'Prompt', 'Sarabun', sans-serif`;
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 3;
              ctx.fillStyle = isNoWork ? '#94A3B8' : (options.barValueColor || '#FFD25A');
              if (barH >= 28 && !options.forceBarValueAbove && !isNoWork) {
                // Inside top of bar
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.translate(x + barW / 2, y + 6);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(valText, 0, 0);
              } else {
                // Above bar (including 0%)
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.translate(x + barW / 2, Math.max(rotFSize + 4, y - 4));
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(valText, 0, 0);
              }
            } else {
              // Horizontal value at uniform level above bar (ระดับเดียวกัน ไม่สลับฟันปลา ไม่ซ้อนทับกัน)
              let adjustedTextY = textY;
              let isInsideBar = false;

              if (!options.forceBarValueAbove && barH >= fSize + 14 && y <= pad.top + 6) {
                adjustedTextY = y + fSize + 4;
                isInsideBar = true;
              }

              if (isInsideBar) {
                ctx.font = `800 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
                ctx.fillStyle = options.barValueColor || '#FFFFFF';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                ctx.shadowBlur = 4;
              } else {
                ctx.font = `800 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
                if (isNoWork) {
                  ctx.fillStyle = '#94A3B8';
                } else if (options.barValueColor) {
                  ctx.fillStyle = options.barValueColor;
                } else if (color === '#10B981') {
                  ctx.fillStyle = '#A7F3D0';
                } else if (color === '#EF4444') {
                  ctx.fillStyle = '#FECACA';
                } else {
                  ctx.fillStyle = '#FFD25A';
                }
                ctx.shadowColor = options.barValueColor ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = options.barValueColor ? 3.5 : 2.5;
              }

              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.shadowOffsetY = 1;
              ctx.fillText(valText, x + barW / 2, adjustedTextY);
            }
          }
          ctx.restore();
        }

        // Draw "✓ บรรลุเป้าหมาย" (Goal Achieved) badge if bar exceeds December KPI target
        if (ext && ext.isExceedDecKpi && !isNoWork && height > 25) {
          const badgeInset = options.badgeInset !== undefined ? options.badgeInset : (currentBarW < 40 ? 4 : 6);
          const achieveBadgeW = Math.max(24, currentBarW - badgeInset);
          const achieveBadgeH = 16.5;
          const achieveBadgeX = currentX + (currentBarW - achieveBadgeW) / 2;

          // Position sitting right on top of the bar (or in top padding headroom if bar is at ceiling)
          let achieveBadgeY = (val >= 100 || y <= pad.top + 6)
            ? (pad.top - achieveBadgeH - 5)
            : (y - achieveBadgeH - 5);
          if (achieveBadgeY < 2) achieveBadgeY = 2;

          ctx.save();
          ctx.setLineDash([]);

          // Luminous Radiant Emerald Gradient Badge Background
          const achieveGrad = ctx.createLinearGradient(achieveBadgeX, achieveBadgeY, achieveBadgeX, achieveBadgeY + achieveBadgeH);
          achieveGrad.addColorStop(0, 'rgba(4, 60, 36, 0.98)');
          achieveGrad.addColorStop(1, 'rgba(1, 32, 18, 0.98)');
          ctx.fillStyle = achieveGrad;

          // Glowing Electric Neon Green Border & Shadow
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1.6;
          ctx.shadowColor = 'rgba(0, 255, 136, 0.95)';
          ctx.shadowBlur = 9;
          this.roundRect(ctx, achieveBadgeX, achieveBadgeY, achieveBadgeW, achieveBadgeH, 3.5);
          ctx.fill();
          ctx.stroke();

          // High-contrast Success Text: "✓ บรรลุเป้าหมาย"
          const achieveText = '✓ บรรลุเป้าหมาย';
          let fSize = currentBarW < 45 ? 7.2 : (currentBarW < 60 ? 8 : 8.8);
          ctx.font = `800 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
          let textW = ctx.measureText(achieveText).width;
          if (textW > achieveBadgeW - 6) {
            fSize = Math.max(6.5, fSize * ((achieveBadgeW - 8) / textW));
            ctx.font = `800 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#E8FFF4';
          ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 0;
          ctx.fillText(achieveText, achieveBadgeX + achieveBadgeW / 2, achieveBadgeY + achieveBadgeH / 2 + 0.5);
          ctx.restore();
        }

        // Check hover
        if (this.mouse.active &&
          this.mouse.x >= (isKfg ? currentX : x) && this.mouse.x <= (isKfg ? currentX + currentBarW : x + barW) &&
          (this.mouse.y >= y - 6 && this.mouse.y <= pad.top + plotH)) {
          hoveredBar = {
            label,
            datasetLabel: ds.label,
            value: val,
            x: (isKfg ? currentX : x) + (isKfg ? currentBarW : barW) / 2,
            y: y,
            color,
            gIdx: gIdx,
            extra: (ds.extra && ds.extra[gIdx]) || null
          };
        }
      });

      // Draw vertical separator line after special summary bar (e.g. กฟก.3 ทั้งหมด)
      const extFirst = datasets[0] && datasets[0].extra && datasets[0].extra[gIdx];
      if (extFirst && extFirst.showDividerAfter) {
        ctx.save();
        const isGood = extFirst.kpi >= 5;
        const isDivDimmed = extFirst.isDimmed;
        ctx.strokeStyle = isDivDimmed
          ? (isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
          : (isGood ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)');
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const divX = pad.left + (gIdx + 1) * groupW;
        ctx.moveTo(divX, pad.top);
        ctx.lineTo(divX, pad.top + plotH);
        ctx.stroke();
        ctx.restore();
      }

      // X Label (Rotated if many offices) - High legibility bold font, 100% full text visible
      if (height > 25) {
        ctx.save();
        const ext = datasets[0] && datasets[0].extra && datasets[0].extra[gIdx];
        const isKfg = ext && ext.isKfg3Total;
        const color = (datasets[0] && datasets[0].colors && datasets[0].colors[gIdx]) || (datasets[0] && datasets[0].color) || '';
        const isKfgDimmed = ext && (ext.isDimmed || (typeof color === 'string' && color.includes('rgba(') && !color.includes(', 1)') && !color.includes(',1)')));
        let labelFontSize = 13;

        if (isKfg) {
          const isGood = ext.kpi >= 5;
          const kfgFontSize = groupCount > 30 ? 13 : 14;
          labelFontSize = kfgFontSize;
          if (!isKfgDimmed) {
            ctx.fillStyle = isGood ? '#34D399' : '#F87171'; // Luminous Neon Green or Red
            ctx.font = `800 ${kfgFontSize}px 'Prompt', 'Sarabun', sans-serif`;
            ctx.shadowColor = isGood ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = isGood ? 'rgba(52, 211, 153, 0.45)' : 'rgba(248, 113, 113, 0.45)';
            ctx.font = `800 ${kfgFontSize}px 'Prompt', 'Sarabun', sans-serif`;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
        } else {
          ctx.fillStyle = options.xLabelColor || '#FFFFFF';
          const fontSize = options.xLabelFontSize || (height < 70 ? 10 : (height < 100 ? 11 : (groupCount > 35 ? 12 : (groupCount > 20 ? 12.5 : 13.5))));
          const fontWeight = options.xLabelFontWeight || '600';
          labelFontSize = fontSize;
          ctx.font = `${fontWeight} ${fontSize}px 'Prompt', 'Sarabun', sans-serif`;
        }

        const displayLabel = isKfg && !label.includes('★') ? `★ ${label}` : label;
        const labelTextW = ctx.measureText(displayLabel).width;

        if (rotateLabels) {
          ctx.translate(gX, height - pad.bottom + 8);
          // Angle -60 degrees (-Math.PI / 3) for clean vertical clearance and zero overlap
          const rotAngle = options.xLabelAngle !== undefined ? options.xLabelAngle : (groupCount > 20 ? -Math.PI / 3 : -Math.PI / 3.4);
          ctx.rotate(rotAngle);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayLabel, 0, 0); // Always show FULL office name without cutting off!
          // เก็บพิกัดป้ายชื่อหน่วยงาน เพื่อให้คลิกที่ชื่อได้เหมือนคลิกแท่งกราฟ
          this.renderedXLabels.push({ gIdx, label, rotated: true, ox: gX, oy: height - pad.bottom + 8, angle: rotAngle, w: labelTextW, fs: labelFontSize });
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(displayLabel, gX, height - pad.bottom + 6);
          this.renderedXLabels.push({ gIdx, label, rotated: false, ox: gX, oy: height - pad.bottom + 6, angle: 0, w: labelTextW, fs: labelFontSize });
        }
        ctx.restore();
      }
    });

    // ตรวจว่าเมาส์อยู่บนชื่อหน่วยงานบนแกน X หรือไม่ (คำนวณในพิกัดที่หมุนตามมุมของป้าย)
    let hoveredLabelItem = null;
    if (this.mouse.active && !hoveredBar) {
      let bestDist = Infinity;
      this.renderedXLabels.forEach(L => {
        const dx = this.mouse.x - L.ox;
        const dy = this.mouse.y - L.oy;
        const cos = Math.cos(L.angle);
        const sin = Math.sin(L.angle);
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        let inside;
        let dist;
        if (L.rotated) {
          // ข้อความชิดขวา (textAlign right) กึ่งกลางแนวตั้ง (textBaseline middle)
          inside = lx >= -L.w - 4 && lx <= 4 && Math.abs(ly) <= L.fs * 0.7;
          dist = Math.abs(ly);
        } else {
          inside = lx >= -L.w / 2 - 3 && lx <= L.w / 2 + 3 && ly >= -2 && ly <= L.fs * 1.4;
          dist = Math.abs(lx);
        }
        if (inside && dist < bestDist) {
          bestDist = dist;
          hoveredLabelItem = {
            label: L.label,
            datasetLabel: datasets[0].label,
            value: datasets[0].data[L.gIdx] || 0,
            gIdx: L.gIdx,
            color: (datasets[0].colors && datasets[0].colors[L.gIdx]) || datasets[0].color,
            extra: (datasets[0].extra && datasets[0].extra[L.gIdx]) || null,
            fromXLabel: true
          };
        }
      });
    }

    // Draw Target Benchmark Lines on FRONT-MOST LAYER (above bars and labels)
    let targetLines = [];
    if (Array.isArray(options.targetLines)) {
      targetLines = options.targetLines.filter(tl => tl && tl.value !== undefined && tl.value !== null && !isNaN(tl.value));
    } else if (options.targetLine !== undefined && options.targetLine !== null && !isNaN(options.targetLine)) {
      targetLines = [{
        value: Number(options.targetLine),
        label: options.targetLineLabel || `${Number(options.targetLine)}%`,
        color: options.targetLineColor || '#FFB81C',
        textColor: options.targetLineTextColor || '#FFD25A',
        lineWidth: options.targetLineWidth || 1.0,
        lineDash: options.targetLineDash || [5, 4]
      }];
    }

    if (targetLines.length > 0 && height > 15) {
      // Calculate targetY for each line
      const renderedLines = targetLines.map(tl => {
        const targetVal = Number(tl.value);
        const targetY = pad.top + plotH - (targetVal / maxVal) * plotH;
        return { ...tl, targetVal, targetY };
      }).filter(tl => tl.targetY >= pad.top - 2 && tl.targetY <= pad.top + plotH + 2);

      // Draw all dashed lines (thin, crisp, sleek)
      renderedLines.forEach(tl => {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        const lineColor = tl.color || '#FFB81C';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = tl.lineWidth || 1.0;
        ctx.setLineDash(tl.lineDash || [5, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, tl.targetY);
        ctx.lineTo(width - pad.right, tl.targetY);
        ctx.stroke();
        ctx.restore();
      });

      // Position badges in left margin with vertical collision avoidance
      const badgeH = 16;
      const sortedForBadges = [...renderedLines].sort((a, b) => a.targetY - b.targetY);
      let lastBadgeBottom = -Infinity;

      sortedForBadges.forEach(tl => {
        ctx.save();
        const labelText = tl.label || `${tl.targetVal}%`;
        ctx.font = '700 10px Prompt, Sarabun, sans-serif';
        const textW = ctx.measureText(labelText).width;
        const badgeW = textW + 6;

        let badgeX = pad.left - badgeW - 3;
        if (badgeX < 2) badgeX = 2;

        let badgeY = tl.targetY - badgeH / 2;
        if (badgeY < 2) badgeY = 2;
        if (badgeY < lastBadgeBottom + 2) {
          badgeY = lastBadgeBottom + 2;
        }
        if (badgeY + badgeH > height - pad.bottom + 6) {
          badgeY = height - pad.bottom + 6 - badgeH;
        }
        lastBadgeBottom = badgeY + badgeH;

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(26, 7, 42, 0.96)';
        ctx.strokeStyle = tl.color || '#FFB81C';
        ctx.lineWidth = 1.2;
        this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = tl.textColor || tl.color || '#FFD25A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, badgeX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();
      });
    }

    // Draw Legend
    if (options.showLegend && (options.customLegend || datasets.some(d => d.label))) {
      this.drawLegend(datasets);
    }

    // Draw Tooltip
    if (hoveredBar) {
      const isNoWork = hoveredBar.extra && hoveredBar.extra.isNoWork;
      const isKfg = hoveredBar.extra && hoveredBar.extra.isKfg3Total;
      const isGoodKpi = hoveredBar.extra ? (hoveredBar.extra.kpi >= 5) : true;
      const kfgColor = isGoodKpi ? '#10B981' : '#EF4444';
      const tooltipTitle = (hoveredBar.extra && hoveredBar.extra.fullTitle)
        ? hoveredBar.extra.fullTitle
        : (isKfg
          ? `👑 ${hoveredBar.label} [${isGoodKpi ? 'KPI 5 ยอดเยี่ยม' : 'KPI 1-4 ต้องเร่งรัด'}]`
          : hoveredBar.label);
      const valFormatted = isNoWork
        ? 'ไม่มีงาน'
        : (options.formatBarValue ? options.formatBarValue(hoveredBar.value, hoveredBar.gIdx || 0) : options.formatY(hoveredBar.value));
      const tooltipItems = [
        {
          label: isKfg ? 'ความสำเร็จภาพรวม' : (hoveredBar.datasetLabel || 'ผลงาน'),
          value: valFormatted,
          color: isKfg ? kfgColor : (isNoWork ? '#94A3B8' : hoveredBar.color)
        }
      ];
      if (hoveredBar.extra) {
        if (isNoWork) {
          tooltipItems.push({ label: 'สถานะ', value: 'ไม่มีงาน (รวมงาน AUC = 0)', color: '#94A3B8' });
        } else {
          if (isKfg) {
            tooltipItems.push({
              label: 'สถานะภาพรวม',
              value: isGoodKpi ? 'ผ่านเกณฑ์ภาพรวม (KPI 5 ★)' : 'ต้องเร่งรัดภาพรวม (KPI 1-4)',
              color: kfgColor
            });
          }
          if (hoveredBar.extra.closed !== undefined) {
            tooltipItems.push({ label: isKfg ? 'ปิดงานรวมทั้งเขต' : 'ปิดงานแล้ว', value: hoveredBar.extra.closed, color: '#FFB81C' });
          }
          if (hoveredBar.extra.total !== undefined) {
            tooltipItems.push({ label: isKfg ? 'ยอดรวมทั้งเขต' : 'ยอดรวม', value: hoveredBar.extra.total, color: '#A855F7' });
          }
          if (hoveredBar.extra.kpi !== undefined) {
            tooltipItems.push({ label: isKfg ? 'คะแนน KPI ภาพรวม' : 'คะแนน KPI', value: `★ ${hoveredBar.extra.kpi}`, color: kfgColor });
          }
          if (typeof hoveredBar.extra.starCount === 'number' && hoveredBar.extra.starCount > 0) {
            const stars = '★'.repeat(hoveredBar.extra.starCount);
            tooltipItems.push({
              label: 'ผ่านเกณฑ์ต่อเนื่อง',
              value: `${stars} (${hoveredBar.extra.starCount} เดือน)`,
              color: '#FFD25A'
            });
          }
          if (hoveredBar.extra.isExceedDecKpi) {
            tooltipItems.push({
              label: 'สถานะสิ้นปี 69',
              value: '✨ บรรลุเป้าหมาย ธ.ค. 69 ✨',
              color: '#00FF88'
            });
          }
          if (Array.isArray(hoveredBar.extra.kpiTargets) && hoveredBar.extra.kpiTargets.length > 0) {
            tooltipItems.push({
              isSeparator: true,
              label: '🎯 เกณฑ์วัด % KPI ระดับ 5',
              value: '',
              color: '#FDE047'
            });
            hoveredBar.extra.kpiTargets.forEach(t => {
              tooltipItems.push({
                label: t.label,
                value: t.value,
                color: t.color || '#38BDF8'
              });
            });
          }
        }
      }
      this.drawTooltip(hoveredBar.x, hoveredBar.y, tooltipTitle, tooltipItems, isKfg, isGoodKpi);
    }
    this.lastHoveredItem = hoveredBar || null;
    this.lastHoveredLabelItem = hoveredLabelItem;
    if (typeof this.options.onClick === 'function') {
      this.canvas.style.cursor = (hoveredBar || hoveredLabelItem) ? 'pointer' : 'default';
    }
  }

  // ==========================================
  // LINE CHART (Timeline & Gap)
  // ==========================================
  renderLineChart() {
    const { ctx, width, height, options } = this;
    const { labels, datasets } = options.data;
    if (!labels || !labels.length || !datasets || !datasets.length) return;

    const pad = options.padding;
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    let maxVal = options.yMax !== undefined ? options.yMax : 0;
    let minVal = options.yMin !== undefined ? options.yMin : 0;

    datasets.forEach(ds => {
      if (ds.hidden) return;
      ds.data.forEach(v => {
        if (v !== null && v !== undefined && !isNaN(v)) {
          if (v > maxVal) maxVal = v;
          if (v < minVal) minVal = v;
        }
      });
    });

    if (options.yMax === undefined) {
      if (maxVal === 0 && minVal === 0) maxVal = 100;
      if (minVal < 0) {
        const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
        maxVal = absMax * 1.15;
        minVal = -absMax * 1.15;
      } else {
        maxVal = maxVal * 1.15;
      }
    }

    const valRange = maxVal - minVal || 100;

    // Draw Grid
    if (options.showGrid) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.14)';
      ctx.lineWidth = 1;
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const y = pad.top + (plotH / steps) * i;
        const val = maxVal - (valRange / steps) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        ctx.fillStyle = '#A692BA';
        ctx.font = '10px Sarabun, Prompt, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(options.formatY(val), pad.left - 8, y + 3);
      }
    }

    const stepX = plotW / (labels.length - 1 || 1);
    let nearestIndex = -1;
    let minDistance = Infinity;

    if (this.mouse.active) {
      labels.forEach((_, i) => {
        const px = pad.left + i * stepX;
        const dist = Math.abs(this.mouse.x - px);
        if (dist < minDistance && dist < stepX) {
          minDistance = dist;
          nearestIndex = i;
        }
      });
    }

    // Draw Lines & Area
    datasets.forEach((ds, dIdx) => {
      if (ds.hidden) return;
      const color = ds.color || options.colors[dIdx % options.colors.length];

      const validPoints = [];
      ds.data.forEach((val, i) => {
        if (val !== null && val !== undefined && !isNaN(val)) {
          const x = pad.left + i * stepX;
          const normalized = (val - minVal) / valRange;
          const y = pad.top + plotH - (normalized * plotH);
          validPoints.push({ x, y, val, index: i });
        }
      });

      if (!validPoints.length) return;

      // Area gradient
      if (ds.fill && validPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(validPoints[0].x, pad.top + plotH);
        validPoints.forEach((p) => {
          ctx.lineTo(p.x, p.y);
        });
        ctx.lineTo(validPoints[validPoints.length - 1].x, pad.top + plotH);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, this.adjustAlpha(color, 0.35));
        grad.addColorStop(1, this.adjustAlpha(color, 0.0));
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw Path
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = ds.borderWidth || 2.5;
      if (ds.dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      validPoints.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Points
      validPoints.forEach((p) => {
        const isHovered = (p.index === nearestIndex);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#FFFFFF' : color;
        ctx.fill();
        ctx.strokeStyle = '#200832';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Track drawn badge boxes to prevent overlap/stacking collisions
    const drawnBadges = [];

    // Draw Point Value Labels (e.g. % per month)
    datasets.forEach((ds, dIdx) => {
      if (ds.hidden) return;
      if (!options.showPointValues && !ds.showValues) return;
      if (ds.showValues === false) return;

      const color = ds.color || options.colors[dIdx % options.colors.length];
      const isDashed = !!ds.dashed;
      const pos = ds.valuePosition || (isDashed ? 'below' : 'above');
      const fSize = ds.valueFontSize || (width < 650 ? 9 : 10);

      // Find last non-null index if showLastValueOnly is enabled
      let lastValidIndex = -1;
      if (ds.showLastValueOnly) {
        for (let i = ds.data.length - 1; i >= 0; i--) {
          const v = ds.data[i];
          if (v !== null && v !== undefined && !isNaN(v)) {
            lastValidIndex = i;
            break;
          }
        }
      }

      ctx.save();
      ctx.font = `700 ${fSize}px 'Prompt', 'Sarabun', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ds.data.forEach((val, i) => {
        if (val === null || val === undefined || isNaN(val)) return;
        if (ds.showLastValueOnly && i !== lastValidIndex) return;

        const x = pad.left + i * stepX;
        const normalized = (val - minVal) / valRange;
        const y = pad.top + plotH - (normalized * plotH);

        const valText = ds.formatValue
          ? ds.formatValue(val)
          : (options.formatPointValue
            ? options.formatPointValue(val)
            : `${Number(val).toFixed(2)}%`);

        // Compute badge dimension with clean padding
        const textW = ctx.measureText(valText).width;
        const badgeW = Math.round(textW + 10);
        const badgeH = Math.round(fSize + 6.5);

        // Center coordinates of the badge (cx, cy)
        let cx = x;
        // Clamp cx inside chart frame
        if (cx - badgeW / 2 < pad.left + 2) cx = pad.left + 2 + badgeW / 2;
        if (cx + badgeW / 2 > width - pad.right - 2) cx = width - pad.right - 2 - badgeW / 2;

        // Position badge center cy: above point or below point
        let cy = pos === 'below' ? (y + badgeH / 2 + 6) : (y - badgeH / 2 - 6);
        // Smart flip if near chart borders
        if (cy - badgeH / 2 < pad.top + 2) {
          cy = y + badgeH / 2 + 6; // Flip below if clipping top
        }
        if (cy + badgeH / 2 > pad.top + plotH - 2) {
          cy = y - badgeH / 2 - 6; // Flip above if clipping bottom
        }

        // Collision avoidance with already drawn badges at or near this point
        for (const b of drawnBadges) {
          if (Math.abs(b.cx - cx) < (badgeW + b.w) / 2 && Math.abs(b.cy - cy) < (badgeH + b.h) / 2 + 2) {
            if (pos === 'below') {
              cy = b.cy + (badgeH + b.h) / 2 + 3;
            } else {
              cy = b.cy - (badgeH + b.h) / 2 - 3;
            }
          }
        }
        // Keep within plot area if shifted
        if (cy - badgeH / 2 < pad.top + 2) cy = pad.top + 2 + badgeH / 2;
        if (cy + badgeH / 2 > pad.top + plotH - 2) cy = pad.top + plotH - 2 - badgeH / 2;

        drawnBadges.push({ cx, cy, w: badgeW, h: badgeH });

        const bgX = Math.round(cx - badgeW / 2);
        const bgY = Math.round(cy - badgeH / 2);

        // Draw crisp background pill
        ctx.fillStyle = 'rgba(20, 5, 34, 0.94)';
        ctx.strokeStyle = ds.valueBorderColor || this.adjustAlpha(color, 0.85);
        ctx.lineWidth = 1.2;
        this.roundRect(ctx, bgX, bgY, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        // Draw text dead-center inside the pill
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ds.valueColor || (isDashed ? '#FFD25A' : '#34D399');
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 3;
        ctx.fillText(valText, cx, cy);
      });
      ctx.restore();
    });

    // Draw X Labels
    labels.forEach((label, i) => {
      const x = pad.left + i * stepX;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '300 11px Prompt, Sarabun, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - pad.bottom + 16);
    });

    // Draw Legend
    if (options.showLegend) {
      this.drawLegend(datasets);
    }

    // Draw Tooltip for Nearest Point
    if (nearestIndex !== -1) {
      const x = pad.left + nearestIndex * stepX;
      const label = labels[nearestIndex];
      const items = [];
      let pointY = pad.top + plotH / 2;
      const isMultiSeries = datasets.length > 2;

      datasets.forEach((ds, dIdx) => {
        if (ds.hidden) return;
        const val = ds.data[nearestIndex];
        const ext = ds.extra && ds.extra[nearestIndex];
        const isNoWork = ext && ext.isNoWork;
        const itemColor = ds.color || options.colors[dIdx % options.colors.length];

        if (isNoWork) {
          items.push({
            label: ds.label,
            value: 'ไม่มีงาน',
            color: itemColor
          });
        } else if (val !== null && val !== undefined && !isNaN(val)) {
          let itemVal = (ext && ext.tooltipText)
            ? ext.tooltipText
            : (ds.formatTooltipValue
              ? ds.formatTooltipValue(val, nearestIndex)
              : (ds.formatValue
                ? ds.formatValue(val)
                : (options.formatY ? options.formatY(val) : `${Number(val).toFixed(2)}%`)));

          if (ext && ext.closed && !ext.tooltipText) {
            itemVal += ` (${ext.closed})`;
          }

          items.push({
            label: ds.label,
            value: itemVal,
            color: itemColor
          });

          if (dIdx === 0) {
            const normalized = (val - minVal) / valRange;
            pointY = pad.top + plotH - (normalized * plotH);
          }
        }
      });
      if (items.length > 0) {
        this.drawTooltip(x, pointY, label, items);
      }
    }
  }

  // ==========================================
  // DONUT CHART
  // ==========================================
  renderDonutChart() {
    const { ctx, width, height, options } = this;
    const { labels, datasets } = options.data;
    if (!datasets || !datasets.length) return;

    const data = datasets[0].data || [];
    const total = data.reduce((acc, v) => acc + (v || 0), 0);

    const centerX = width / 2;
    const centerY = height / 2 - (options.centerOffsetY !== undefined ? options.centerOffsetY : 10);
    const radius = Math.min(centerX, centerY + 10) * (options.radiusRatio || 0.75);
    const innerRadius = radius * (options.cutout || 0.6);

    // If total is 0, render complete / empty ring gracefully
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.closePath();
      ctx.fillStyle = options.emptyRingColor || 'rgba(16, 185, 129, 0.18)';
      ctx.fill();
      ctx.strokeStyle = options.emptyRingStroke || '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = options.centerTextColor || '#10B981';
      ctx.font = options.centerFont || '700 16px Prompt, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.centerText || '0.00', centerX, centerY - 8);

      ctx.fillStyle = options.centerSubTextColor || '#A692BA';
      ctx.font = options.centerSubFont || '10px Sarabun, sans-serif';
      ctx.fillText(options.centerSubText || 'ครบตามเกณฑ์', centerX, centerY + 12);
      return;
    }

    let startAngle = -Math.PI / 2;
    let hoveredSlice = null;

    data.forEach((val, idx) => {
      if (val <= 0) return;
      const sliceAngle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const color = (datasets[0].colors && datasets[0].colors[idx]) || options.colors[idx % options.colors.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = options.strokeColor || '#200832';
      ctx.lineWidth = options.strokeWidth || 2;
      ctx.stroke();

      // Check Hover
      if (this.mouse && this.mouse.active) {
        const dx = this.mouse.x - centerX;
        const dy = this.mouse.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;

        if (dist >= innerRadius && dist <= radius && angle >= startAngle && angle <= endAngle) {
          const ext = (datasets[0].extra && datasets[0].extra[idx]) || {};
          hoveredSlice = {
            label: labels[idx] || `Item ${idx + 1}`,
            value: val,
            pct: ((val / total) * 100).toFixed(1) + '%',
            color,
            extra: ext
          };
        }
      }

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = options.centerTextColor || '#FFD25A';
    ctx.font = options.centerFont || '700 16px Prompt, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.centerText || `${((datasets[0].data[0] || 0) / total * 100).toFixed(0)}%`, centerX, centerY - 8);

    ctx.fillStyle = options.centerSubTextColor || '#A692BA';
    ctx.font = options.centerSubFont || '10px Sarabun, sans-serif';
    ctx.fillText(options.centerSubText || 'ความสำเร็จ', centerX, centerY + 12);

    // Tooltip
    if (hoveredSlice) {
      const tooltipItems = [
        { label: options.valueLabel || 'มูลค่า / จำนวน', value: options.formatY(hoveredSlice.value), color: hoveredSlice.color },
        { label: 'สัดส่วนเป้าหมาย', value: hoveredSlice.pct, color: hoveredSlice.color }
      ];
      if (hoveredSlice.extra && hoveredSlice.extra.kpiTarget) {
        tooltipItems.push({ label: 'เป้าหมายระดับ 5', value: hoveredSlice.extra.kpiTarget, color: '#FFB81C' });
      }
      if (hoveredSlice.extra && hoveredSlice.extra.statusText) {
        tooltipItems.push({ label: 'สถานะ', value: hoveredSlice.extra.statusText, color: '#6EE7B7' });
      }
      this.drawTooltip(this.mouse.x, this.mouse.y, hoveredSlice.label, tooltipItems);
    }
  }

  // ==========================================
  // RADAR CHART (Multi-dimensional criteria)
  // ==========================================
  renderRadarChart() {
    const { ctx, width, height, options } = this;
    const { labels, datasets } = options.data;
    if (!labels || !labels.length || !datasets || !datasets.length) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    const numAxes = labels.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Draw Web Grid (circles/polygons)
    const levels = 4;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.lineWidth = 1;

    for (let l = 1; l <= levels; l++) {
      const r = (radius / levels) * l;
      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const a = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(a) * r;
        const y = centerY + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw Axes & Labels
    for (let i = 0; i < numAxes; i++) {
      const a = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(a) * radius;
      const y = centerY + Math.sin(a) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Axis Label
      const lx = centerX + Math.cos(a) * (radius + 18);
      const ly = centerY + Math.sin(a) * (radius + 18);
      ctx.fillStyle = '#E2D4F0';
      ctx.font = '10px Prompt, sans-serif';
      ctx.textAlign = Math.abs(Math.cos(a)) < 0.1 ? 'center' : (Math.cos(a) > 0 ? 'left' : 'right');
      ctx.textBaseline = 'middle';
      const txt = labels[i].length > 15 ? labels[i].substring(0, 14) + '..' : labels[i];
      ctx.fillText(txt, lx, ly);
    }

    let hoveredPoint = null;

    // Draw Datasets
    datasets.forEach((ds, dIdx) => {
      const color = ds.color || options.colors[dIdx % options.colors.length];
      const max = ds.max || 5;

      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const r = (Math.min(val, max) / max) * radius;
        const a = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(a) * r;
        const y = centerY + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.fillStyle = this.adjustAlpha(color, 0.25);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points
      ds.data.forEach((val, i) => {
        const r = (Math.min(val, max) / max) * radius;
        const a = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(a) * r;
        const y = centerY + Math.sin(a) * r;

        ctx.beginPath();
        ctx.arc(x, y, datasets.length <= 2 ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Check hover
        if (this.mouse && this.mouse.active) {
          const dist = Math.hypot(this.mouse.x - x, this.mouse.y - y);
          if (dist < 12) {
            hoveredPoint = {
              x,
              y,
              title: labels[i],
              items: [{ label: ds.label, value: `คะแนน KPI ${val}` }]
            };
          }
        }
      });
    });

    if (hoveredPoint) {
      this.drawTooltip(hoveredPoint.x, hoveredPoint.y, hoveredPoint.title, hoveredPoint.items);
    }

    // Legend
    if (options.showLegend) {
      this.drawLegend(datasets);
    }
  }

  // ==========================================
  // HELPERS: Tooltip, Legend, Rects
  // ==========================================
  drawLegend(datasets) {
    const { ctx, width, options } = this;
    const items = (options.customLegend && options.customLegend.length) ? options.customLegend : datasets;
    const pad = options.padding;
    let startX = pad.left;
    let curY = 14;
    const lineHeight = 18;

    ctx.font = '500 11px Prompt, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    items.forEach((ds, idx) => {
      const color = ds.color || options.colors[idx % options.colors.length];
      const textW = ctx.measureText(ds.label).width;
      const itemW = 16 + textW + 16;

      // Wrap if exceeding width
      if (startX + itemW > width - pad.right && startX > pad.left) {
        startX = pad.left;
        curY += lineHeight;
      }

      if (ds.hidden) {
        ctx.save();
        ctx.globalAlpha = 0.35;
      }

      if (ds.dashed) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(startX, curY);
        ctx.lineTo(startX + 14, curY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = (color === '#FF2D55' || color === '#FFB81C' || color === '#00FF88') ? 5 : 0;
        ctx.beginPath();
        this.roundRect(ctx, startX, curY - 4, 12, 8, 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = ds.hidden ? '#7E6B91' : '#E2D4F0';
      ctx.fillText(ds.label, startX + 18, curY);

      if (ds.hidden) {
        ctx.restore();
      }
      startX += itemW;
    });
  }

  drawTooltip(x, y, title, items, isSpecial = false, isGoodKpi = true) {
    const { ctx, width, height } = this;
    const pad = 8;
    const isManyItems = items.length > 5;
    const itemLineH = isManyItems ? 15 : 17;
    const itemFontSize = isManyItems ? 9.5 : 10.5;

    ctx.font = isSpecial ? '800 12px Prompt, sans-serif' : '700 11px Prompt, sans-serif';
    let maxW = ctx.measureText(title).width;

    ctx.font = `${itemFontSize}px Sarabun, sans-serif`;
    items.forEach(it => {
      const w = it.isSeparator
        ? ctx.measureText(it.label).width + 12
        : ctx.measureText(`${it.label}: ${it.value}`).width + 18;
      if (w > maxW) maxW = w;
    });

    const boxW = Math.max(160, maxW + pad * 2);
    const boxH = 18 + items.length * itemLineH + pad;

    let posX;
    if (x > width * 0.55) {
      posX = x - boxW - 14;
    } else {
      posX = x + 14;
    }

    let posY = y - boxH / 2;
    if (posX < 8) posX = 8;
    if (posX + boxW > width - 8) posX = width - boxW - 8;
    if (posY < 8) posY = 8;
    if (posY + boxH > height - 8) posY = height - boxH - 8;

    // Background
    ctx.save();
    ctx.fillStyle = 'rgba(28, 8, 44, 0.95)';
    const strokeCol = isSpecial ? (isGoodKpi ? '#34D399' : '#F87171') : '#FFB81C';
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = isSpecial ? 2 : 1;
    if (isSpecial) {
      ctx.shadowColor = isGoodKpi ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.shadowBlur = 10;
    }
    this.roundRect(ctx, posX, posY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.fillStyle = isSpecial ? (isGoodKpi ? '#A7F3D0' : '#FECACA') : '#FFD25A';
    ctx.font = isSpecial ? '800 12px Prompt, sans-serif' : '700 11px Prompt, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, posX + pad, posY + pad);

    // Items
    ctx.font = `${itemFontSize}px Sarabun, sans-serif`;
    items.forEach((it, i) => {
      const itemY = posY + pad + 15 + i * itemLineH;
      if (it.isSeparator) {
        ctx.fillStyle = it.color || '#FDE047';
        ctx.font = `700 ${itemFontSize}px 'Prompt', sans-serif`;
        ctx.fillText(it.label, posX + pad, itemY);
        ctx.font = `${itemFontSize}px Sarabun, sans-serif`;
      } else {
        ctx.fillStyle = it.color || '#A855F7';
        ctx.fillRect(posX + pad, itemY + 2, 8, 8);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${it.label}: ${it.value}`, posX + pad + 12, itemY);
      }
    });
  }

  roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  adjustAlpha(color, alpha) {
    if (color.startsWith('#')) {
      const c = color.substring(1);
      const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
}

window.PeaChart = PeaChart;
