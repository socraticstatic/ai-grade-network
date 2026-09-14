// AT&T NetBond Advanced — All Flows
// Figma Plugin: creates editable frames for every major flow
// Run via Plugins › Development › Open console (paste + run)
// or link manifest.json as a Development plugin and run.

(async function main() {

  // ─── FONTS ─────────────────────────────────────────────────────────────
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Extra Bold" }),
  ]);

  // ─── COLOR TOKENS ──────────────────────────────────────────────────────
  const C = {
    white:         '#ffffff',
    wash:          '#f8fafb',
    neutral:       '#f3f4f6',
    border:        '#dcdfe3',
    borderMuted:   '#eceef1',
    disabled:      '#bdc2c7',
    muted:         '#878c94',
    bodyLight:     '#686e74',
    body:          '#454b52',
    heading:       '#1d2329',
    link:          '#0057b8',
    linkHover:     '#00388f',
    accent:        '#e6f6fd',
    attBlue:       '#009fdb',
    cobalt100:     '#e6f0fa',
    cobalt400:     '#3374cc',
    cobalt600:     '#0057b8',
    cobalt700:     '#00388f',
    cobalt800:     '#00235a',
    success:       '#2d7e24',
    successLight:  '#e8f5e4',
    warn:          '#ea712f',
    warnLight:     '#fef2e8',
    error:         '#c70032',
    errorLight:    '#fce8ee',
    purple:        '#af29bb',
    purpleLight:   '#f5e8f6',
    black:         '#000000',
  };

  // ─── HELPERS ───────────────────────────────────────────────────────────
  function rgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0,2), 16) / 255,
      g: parseInt(h.slice(2,4), 16) / 255,
      b: parseInt(h.slice(4,6), 16) / 255,
    };
  }

  function solid(hex, opacity = 1) {
    return [{ type: 'SOLID', color: rgb(hex), opacity }];
  }

  function noFill() { return []; }

  function stroke(hex, weight = 1) {
    return [{ type: 'SOLID', color: rgb(hex) }];
  }

  function shadow(y = 4, blur = 12, opacity = 0.08) {
    return [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: opacity },
      offset: { x: 0, y },
      radius: blur,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }

  // Text node
  function txt(chars, size = 14, weight = 'Regular', hex = C.heading, opts = {}) {
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: weight };
    t.fontSize = size;
    t.characters = chars;
    t.fills = solid(hex);
    if (opts.ls !== undefined) t.letterSpacing = { unit: 'PERCENT', value: opts.ls };
    if (opts.lh) t.lineHeight = { unit: 'PIXELS', value: opts.lh };
    if (opts.w) { t.textAutoResize = 'HEIGHT'; t.resize(opts.w, 20); }
    if (opts.align) t.textAlignHorizontal = opts.align;
    if (opts.truncate) { t.textTruncation = 'ENDING'; t.maxLines = 1; }
    return t;
  }

  // Frame (fixed size)
  function frm(name, w, h, bg = C.white, radius = 0) {
    const f = figma.createFrame();
    f.name = name;
    f.resize(w, h);
    f.fills = solid(bg);
    if (radius > 0) f.cornerRadius = radius;
    f.clipsContent = true;
    return f;
  }

  // Auto-layout frame
  function auto(name, dir = 'VERTICAL', gap = 0, padL = 0, padR = 0, padT = 0, padB = 0, bg = C.white, radius = 0) {
    const f = figma.createFrame();
    f.name = name;
    f.layoutMode = dir;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    f.itemSpacing = gap;
    f.paddingLeft = padL;
    f.paddingRight = padR;
    f.paddingTop = padT;
    f.paddingBottom = padB;
    f.fills = solid(bg);
    if (radius > 0) f.cornerRadius = radius;
    f.clipsContent = false;
    return f;
  }

  // Rect
  function rect(w, h, hex, radius = 0, name = '') {
    const r = figma.createRectangle();
    r.name = name || 'Rect';
    r.resize(w, h);
    r.fills = solid(hex);
    if (radius > 0) r.cornerRadius = radius;
    return r;
  }

  // Line / divider
  function divider(w = 1440, hex = C.border) {
    const r = figma.createRectangle();
    r.name = 'Divider';
    r.resize(w, 1);
    r.fills = solid(hex);
    return r;
  }

  // Absolute position helper
  function pos(node, x, y) { node.x = x; node.y = y; return node; }

  // Badge pill
  function badge(label, bg, textColor, radius = 24) {
    const f = auto('Badge', 'HORIZONTAL', 0, 8, 8, 4, 4, bg, radius);
    f.appendChild(txt(label, 11, 'Medium', textColor));
    return f;
  }

  // Icon placeholder (circle or square)
  function iconBox(size = 40, bg = C.wash, radius = 8, iconColor = C.link) {
    const f = frm('Icon', size, size, bg, radius);
    // Draw a simple cross/plus as a stand-in icon
    const h = rect(size * 0.4, 2, iconColor);
    const v = rect(2, size * 0.4, iconColor);
    h.x = size * 0.3; h.y = size / 2 - 1;
    v.x = size / 2 - 1; v.y = size * 0.3;
    f.appendChild(h); f.appendChild(v);
    return f;
  }

  // Progress bar
  function progressBar(w, pct, hex = C.success) {
    const track = frm('ProgressTrack', w, 6, C.neutral, 3);
    if (pct > 0) {
      const fill = frm('ProgressFill', Math.round(w * pct / 100), 6, hex, 3);
      fill.x = 0; fill.y = 0;
      track.appendChild(fill);
    }
    return track;
  }

  // ─── REUSABLE COMPONENT BUILDERS ───────────────────────────────────────

  function buildButton(label, variant = 'primary', w = 160, h = 36) {
    const bg = variant === 'primary' ? C.cobalt600
      : variant === 'outline' ? C.white
      : C.wash;
    const tc = variant === 'primary' ? C.white : C.link;
    const f = frm('Button/' + label, w, h, bg, 999);
    if (variant === 'outline') {
      f.strokes = stroke(C.border);
      f.strokeWeight = 1;
    }
    const label_node = txt(label, 14, 'Semi Bold', tc);
    label_node.x = Math.round((w - label_node.width) / 2);
    label_node.y = Math.round((h - 14) / 2) - 1;
    f.appendChild(label_node);
    return f;
  }

  function buildNavBar(activeItem = 'Manage') {
    const bar = frm('NavBar', 1440, 64, C.white);
    bar.strokes = stroke(C.border);
    bar.strokeAlign = 'INSIDE';
    bar.strokeWeight = 1;

    // AT&T logo text
    const att = txt('AT&T', 14, 'Bold', C.attBlue);
    att.x = 24; att.y = 24;
    bar.appendChild(att);

    const brand = txt('NetBond® Advanced', 14, 'Bold', C.heading);
    brand.x = 58; brand.y = 24;
    bar.appendChild(brand);

    // Nav items
    const navItems = ['Create', 'Manage', 'Monitor', 'Configure'];
    let nx = 280;
    navItems.forEach(item => {
      const isActive = item === activeItem;
      const navTxt = txt(item, 14, isActive ? 'Semi Bold' : 'Regular', isActive ? C.link : C.bodyLight);
      navTxt.x = nx; navTxt.y = 24;
      bar.appendChild(navTxt);

      if (isActive) {
        const indicator = rect(navTxt.width + 8, 2, C.link, 1);
        indicator.x = nx - 4; indicator.y = 62;
        bar.appendChild(indicator);
      }
      nx += navTxt.width + 32;
    });

    // Right: search icon + bell + avatar
    const searchBox = frm('SearchBox', 160, 32, C.wash, 16);
    searchBox.strokes = stroke(C.border);
    searchBox.strokeWeight = 1;
    const searchTxt = txt('Search...', 12, 'Regular', C.muted);
    searchTxt.x = 12; searchTxt.y = 9;
    searchBox.appendChild(searchTxt);
    searchBox.x = 1168; searchBox.y = 16;
    bar.appendChild(searchBox);

    const avatar = frm('Avatar', 32, 32, C.cobalt100, 16);
    const avatarTxt = txt('E', 13, 'Semi Bold', C.link);
    avatarTxt.x = 10; avatarTxt.y = 8;
    avatar.appendChild(avatarTxt);
    avatar.x = 1392; avatar.y = 16;
    bar.appendChild(avatar);

    return bar;
  }

  function buildConnectionCard(opts = {}) {
    const {
      name = 'AWS Max — San Jose Metro',
      type = 'Internet to Cloud',
      status = 'Active',     // Active | Inactive | Pending | Provisioning
      bandwidth = '1 Gbps',
      location = 'San Jose, CA',
      utilization = 15,
      planLabel = '12 Months',
      isLmcc = false,
      width = 340,
    } = opts;

    const cardH = status === 'Pending' ? 370 : 390;
    const card = frm('ConnectionCard/' + name, width, cardH, C.white, 16);
    card.strokes = stroke(C.border);
    card.strokeWeight = 1;
    card.effects = shadow(2, 8, 0.06);

    // Header
    const header = frm('Header', width, 72, C.white);
    const icon = iconBox(40, C.wash, 8, C.link);
    icon.x = 20; icon.y = 16;
    header.appendChild(icon);

    const nameT = txt(name, 15, 'Semi Bold', C.heading, { truncate: true, w: width - 96 });
    nameT.x = 68; nameT.y = 16;
    header.appendChild(nameT);

    const typeT = txt(type, 12, 'Regular', C.bodyLight);
    typeT.x = 68; typeT.y = 36;
    header.appendChild(typeT);

    if (isLmcc) {
      const lmccBadge = badge('AWS Max', C.cobalt100, C.link, 6);
      lmccBadge.x = 68; lmccBadge.y = 52;
      header.appendChild(lmccBadge);

      if (status === 'Pending') {
        const awaitBadge = badge('Awaiting Setup', C.warnLight, C.warn, 6);
        awaitBadge.x = 68 + lmccBadge.width + 4; awaitBadge.y = 52;
        header.appendChild(awaitBadge);
      } else {
        const pathsBadge = badge('4/4 paths', C.successLight, C.success, 6);
        pathsBadge.x = 68 + lmccBadge.width + 4; pathsBadge.y = 52;
        header.appendChild(pathsBadge);
      }
    }

    const divH = divider(width);
    divH.y = 72;
    header.appendChild(divH);
    card.appendChild(header);

    // Status bar
    const statusBar = frm('StatusBar', width, 52, C.white);
    statusBar.y = 72;

    const statusColors = {
      Active:       { bg: C.successLight, tc: C.success },
      Inactive:     { bg: C.neutral,      tc: C.bodyLight },
      Pending:      { bg: C.warnLight,    tc: C.warn },
      Provisioning: { bg: C.accent,       tc: C.link },
    };
    const sc = statusColors[status] || statusColors.Inactive;
    const statusLabel = status === 'Pending' ? 'Setup Required' : status;

    const statusBtn = frm('StatusBtn', 120, 32, sc.bg, 24);
    statusBtn.strokes = stroke(status === 'Active' ? C.success : status === 'Pending' ? C.warn : C.border);
    statusBtn.strokeWeight = 1;
    const statusTxt = txt(statusLabel, 13, 'Medium', sc.tc);
    statusTxt.x = 12; statusTxt.y = 8;
    statusBtn.appendChild(statusTxt);
    statusBtn.x = 20; statusBtn.y = 10;
    statusBar.appendChild(statusBtn);

    // Health badge
    const healthLabel = status === 'Active'
      ? (utilization > 90 ? 'CRITICAL' : utilization > 80 ? 'WARNING' : 'GOOD')
      : status === 'Pending' ? 'SETUP REQUIRED'
      : status === 'Provisioning' ? 'PROVISIONING'
      : 'INACTIVE';
    const healthBg = status === 'Active'
      ? (utilization > 90 ? C.errorLight : C.accent)
      : status === 'Pending' ? C.warnLight
      : C.neutral;
    const healthTc = status === 'Active'
      ? (utilization > 90 ? C.error : C.link)
      : status === 'Pending' ? C.warn
      : C.bodyLight;

    const healthBadge = frm('HealthBadge', 80, 24, healthBg, 6);
    const healthT = txt(healthLabel, 10, 'Semi Bold', healthTc, { ls: 4 });
    healthT.x = 6; healthT.y = 6;
    healthBadge.appendChild(healthT);
    healthBadge.x = width - 100; healthBadge.y = 14;
    statusBar.appendChild(healthBadge);
    card.appendChild(statusBar);

    // Body: bandwidth util bar + metrics
    if (status !== 'Pending') {
      const body = frm('Body', width, 148, C.white);
      body.y = 124;

      const bwLabel = txt('Bandwidth Utilization', 13, 'Medium', C.body);
      bwLabel.x = 20; bwLabel.y = 20;
      body.appendChild(bwLabel);

      const bwPct = txt(utilization + '%', 13, 'Semi Bold', C.heading);
      bwPct.x = width - 20 - bwPct.width; bwPct.y = 20;
      body.appendChild(bwPct);

      const bar = progressBar(width - 40, utilization, utilization > 80 ? C.warn : C.success);
      bar.x = 20; bar.y = 44;
      body.appendChild(bar);

      // Metrics grid
      const metricBw = frm('MetricBw', (width - 52) / 2, 64, C.wash, 8);
      metricBw.x = 20; metricBw.y = 66;
      const mBwTitle = txt('Bandwidth', 12, 'Medium', C.body);
      mBwTitle.x = 12; mBwTitle.y = 12;
      metricBw.appendChild(mBwTitle);
      const mBwVal = txt(bandwidth, 15, 'Semi Bold', C.heading);
      mBwVal.x = 12; mBwVal.y = 30;
      metricBw.appendChild(mBwVal);
      body.appendChild(metricBw);

      const metricLoc = frm('MetricLoc', (width - 52) / 2, 64, C.wash, 8);
      metricLoc.x = 20 + (width - 52) / 2 + 12; metricLoc.y = 66;
      const mLocTitle = txt('Location', 12, 'Medium', C.body);
      mLocTitle.x = 12; mLocTitle.y = 12;
      metricLoc.appendChild(mLocTitle);
      const mLocVal = txt(location, 12, 'Semi Bold', C.heading, { truncate: true, w: (width - 52) / 2 - 24 });
      mLocVal.x = 12; mLocVal.y = 30;
      metricLoc.appendChild(mLocVal);
      body.appendChild(metricLoc);

      card.appendChild(body);
    }

    // Footer CTA
    const footerY = status === 'Pending' ? 200 : 272;
    const divF = divider(width);
    divF.y = footerY;
    card.appendChild(divF);

    const footer = frm('Footer', width, cardH - footerY, C.white);
    footer.y = footerY + 1;

    if (isLmcc && status === 'Pending') {
      const cta = buildButton('Complete AWS Setup', 'primary', width - 40, 36);
      cta.x = 20; cta.y = 14;
      footer.appendChild(cta);
    } else if (status === 'Pending') {
      const cta = buildButton('Complete Setup', 'outline', width - 40, 36);
      cta.x = 20; cta.y = 14;
      footer.appendChild(cta);
    } else {
      const manage = txt('Manage Connection', 13, 'Medium', C.link, { align: 'CENTER', w: width - 40 });
      manage.x = 20; manage.y = 18;
      footer.appendChild(manage);
    }
    card.appendChild(footer);

    return card;
  }

  function buildWizardPhaseIndicator(currentStep = 1, totalSteps = 8) {
    const f = frm('PhaseIndicator', 1440, 52, C.white);
    f.strokes = stroke(C.border);
    f.strokeWeight = 1;

    const steps = ['Type', 'Provider', 'Resiliency', 'Locations', 'Bandwidth', 'Network', 'Billing', 'Review'];
    const stepW = 160;
    const startX = (1440 - steps.length * stepW) / 2;

    steps.forEach((s, i) => {
      const stepNum = i + 1;
      const isActive = stepNum === currentStep;
      const isDone = stepNum < currentStep;

      const dotColor = isActive ? C.link : isDone ? C.success : C.muted;
      const textColor = isActive ? C.link : isDone ? C.success : C.muted;

      const dot = frm(`Step${stepNum}Dot`, 20, 20, dotColor, 10);
      dot.x = startX + i * stepW + (stepW - 20) / 2;
      dot.y = 6;
      f.appendChild(dot);

      const numT = txt(String(stepNum), 10, 'Bold', C.white);
      numT.x = dot.x + 6; numT.y = dot.y + 4;
      f.appendChild(numT);

      const labelT = txt(s, 11, isActive ? 'Semi Bold' : 'Regular', textColor);
      labelT.x = startX + i * stepW + (stepW - labelT.width) / 2;
      labelT.y = 30;
      f.appendChild(labelT);

      if (i < steps.length - 1) {
        const connector = rect(stepW - 20, 1, isDone ? C.success : C.border);
        connector.x = startX + i * stepW + stepW / 2 + 10;
        connector.y = 15;
        f.appendChild(connector);
      }
    });

    return f;
  }

  function buildSidebarSummary(config = {}) {
    const {
      type = 'Internet to Cloud',
      provider = 'AWS',
      resiliency = 'Maximum Resiliency',
      locations = 2,
      bandwidth = '—',
    } = config;

    const card = frm('WizardSummary', 280, 320, C.wash, 12);
    card.strokes = stroke(C.border); card.strokeWeight = 1;

    const heading = txt('Configuration Summary', 14, 'Semi Bold', C.heading);
    heading.x = 20; heading.y = 20;
    card.appendChild(heading);

    const rows = [
      { label: 'Type', value: type },
      { label: 'Provider', value: provider },
      { label: 'Resiliency', value: resiliency },
      { label: 'Locations', value: String(locations) },
      { label: 'Bandwidth', value: bandwidth },
    ];
    let ry = 52;
    rows.forEach(row => {
      const div = divider(240); div.x = 20; div.y = ry - 4;
      card.appendChild(div);
      const lbl = txt(row.label, 12, 'Regular', C.muted); lbl.x = 20; lbl.y = ry + 4;
      const val = txt(row.value, 12, 'Semi Bold', C.heading); val.x = 280 - 20 - val.width; val.y = ry + 4;
      card.appendChild(lbl); card.appendChild(val);
      ry += 36;
    });

    return card;
  }

  // ─── PAGE HELPERS ──────────────────────────────────────────────────────

  function getOrCreatePage(name) {
    let pg = figma.root.children.find(p => p.name === name);
    if (!pg) {
      pg = figma.createPage();
      pg.name = name;
    }
    return pg;
  }

  // ─── PAGE 1: DESIGN SYSTEM ─────────────────────────────────────────────

  function buildDesignSystemPage() {
    const pg = getOrCreatePage('🎨 Design System');
    figma.currentPage = pg;

    // Color swatches
    const colorSection = frm('Colors', 1200, 560, C.white, 0);
    colorSection.x = 40; colorSection.y = 40;

    const sectionTitle = txt('AT&T Flywheel Design Tokens', 24, 'Bold', C.heading);
    sectionTitle.x = 0; sectionTitle.y = 0;
    colorSection.appendChild(sectionTitle);

    const colorGroups = [
      {
        name: 'Brand Blue',
        colors: [
          { name: 'AT&T Blue', hex: '#009fdb' },
          { name: 'Functional Blue', hex: '#0074b3' },
          { name: 'Blue Light', hex: '#e6f6fd' },
        ]
      },
      {
        name: 'Cobalt — Primary Interactive',
        colors: [
          { name: 'Cobalt 100', hex: '#e6f0fa' },
          { name: 'Cobalt 400', hex: '#3374cc' },
          { name: 'Cobalt 600 (Primary)', hex: '#0057b8' },
          { name: 'Cobalt 700', hex: '#00388f' },
          { name: 'Cobalt 800', hex: '#00235a' },
        ]
      },
      {
        name: 'Gray Scale',
        colors: [
          { name: 'Gray 100', hex: '#f8fafb' },
          { name: 'Gray 200', hex: '#f3f4f6' },
          { name: 'Gray 300', hex: '#dcdfe3' },
          { name: 'Gray 400', hex: '#bdc2c7' },
          { name: 'Gray 500', hex: '#878c94' },
          { name: 'Gray 600', hex: '#686e74' },
          { name: 'Gray 700', hex: '#454b52' },
          { name: 'Gray 800', hex: '#1d2329' },
        ]
      },
      {
        name: 'Semantic',
        colors: [
          { name: 'Success', hex: '#2d7e24' },
          { name: 'Warning', hex: '#ea712f' },
          { name: 'Error', hex: '#c70032' },
          { name: 'Purple', hex: '#af29bb' },
        ]
      },
    ];

    let gx = 0; let gy = 52;
    colorGroups.forEach(group => {
      const gLabel = txt(group.name, 13, 'Semi Bold', C.bodyLight);
      gLabel.x = gx; gLabel.y = gy;
      colorSection.appendChild(gLabel);

      group.colors.forEach((col, i) => {
        const swatch = frm(col.name, 80, 80, col.hex, 8);
        swatch.x = gx + i * 92; swatch.y = gy + 24;
        colorSection.appendChild(swatch);

        const swatchLabel = txt(col.name, 10, 'Regular', C.bodyLight);
        swatchLabel.x = gx + i * 92; swatchLabel.y = gy + 112;
        colorSection.appendChild(swatchLabel);

        const hexLabel = txt(col.hex.toUpperCase(), 10, 'Medium', C.muted);
        hexLabel.x = gx + i * 92; hexLabel.y = gy + 126;
        colorSection.appendChild(hexLabel);
      });

      gy += 168;
    });

    pg.appendChild(colorSection);

    // Typography scale
    const typeSection = frm('Typography', 800, 560, C.white, 0);
    typeSection.x = 1300; typeSection.y = 40;

    const typeTitle = txt('Type Scale (Inter / ATT Aleck Sans fallback)', 24, 'Bold', C.heading);
    typeTitle.x = 0; typeTitle.y = 0;
    typeSection.appendChild(typeTitle);

    const typeScale = [
      { name: 'figma-5xl', size: 58, weight: 'Bold', lh: 66 },
      { name: 'figma-4xl', size: 50, weight: 'Bold', lh: 58 },
      { name: 'figma-3xl', size: 42, weight: 'Bold', lh: 50 },
      { name: 'figma-2xl', size: 34, weight: 'Bold', lh: 42 },
      { name: 'figma-xl',  size: 26, weight: 'Semi Bold', lh: 34 },
      { name: 'figma-lg',  size: 18, weight: 'Semi Bold', lh: 26 },
      { name: 'figma-base',size: 16, weight: 'Regular', lh: 24 },
      { name: 'figma-sm',  size: 14, weight: 'Regular', lh: 20 },
      { name: 'figma-xs',  size: 12, weight: 'Regular', lh: 18 },
    ];

    let ty = 52;
    typeScale.forEach(ts => {
      const label = txt(ts.name, 11, 'Regular', C.muted);
      label.x = 0; label.y = ty + 4;
      typeSection.appendChild(label);

      const sample = txt('AT&T NetBond Advanced', ts.size, ts.weight, C.heading);
      sample.x = 120; sample.y = ty;
      typeSection.appendChild(sample);

      const meta = txt(`${ts.size}px / ${ts.lh}px lh / -3% ls`, 11, 'Regular', C.muted);
      meta.x = 120; meta.y = ty + ts.size + 4;
      typeSection.appendChild(meta);

      ty += ts.size + 36;
    });

    pg.appendChild(typeSection);

    figma.viewport.scrollAndZoomIntoView([colorSection, typeSection]);
  }

  // ─── PAGE 2: DASHBOARD ─────────────────────────────────────────────────

  function buildDashboardPage() {
    const pg = getOrCreatePage('📊 Dashboard');
    figma.currentPage = pg;

    // Screen A: Default loaded state
    const screenA = frm('Dashboard — Default', 1440, 960, C.wash);
    screenA.x = 0; screenA.y = 0;

    const nav = buildNavBar('Manage');
    nav.x = 0; nav.y = 0;
    screenA.appendChild(nav);

    // SubNav
    const subNav = frm('SubNav', 1440, 56, C.white);
    subNav.strokes = stroke(C.border); subNav.strokeWeight = 1; subNav.y = 64;
    const subTitle = txt('Networks', 22, 'Bold', C.heading);
    subTitle.x = 48; subTitle.y = 14;
    subNav.appendChild(subTitle);
    const subDesc = txt('Manage your network connections across clouds and data centers', 13, 'Regular', C.bodyLight);
    subDesc.x = 180; subDesc.y = 20;
    subNav.appendChild(subDesc);
    screenA.appendChild(subNav);

    // Connection Tabs
    const tabs = frm('ConnectionTabs', 1440, 48, C.white);
    tabs.y = 120;
    const tabItems = ['Marketplace', 'Connections  4', 'Groups  2'];
    let tx = 48;
    tabItems.forEach((tab, i) => {
      const isActive = i === 1;
      const tabT = txt(tab, 14, isActive ? 'Semi Bold' : 'Regular', isActive ? C.link : C.bodyLight);
      tabT.x = tx; tabT.y = 14;
      tabs.appendChild(tabT);
      if (isActive) {
        const ind = rect(tabT.width + 8, 2, C.link, 1);
        ind.x = tx - 4; ind.y = 46;
        tabs.appendChild(ind);
      }
      tx += tabT.width + 36;
    });
    screenA.appendChild(tabs);

    // Search + controls row
    const searchRow = frm('SearchRow', 1440, 56, C.wash);
    searchRow.y = 168;
    const search = frm('Search', 400, 36, C.white, 18);
    search.strokes = stroke(C.border); search.strokeWeight = 1;
    const searchT = txt('Search connections...', 13, 'Regular', C.muted);
    searchT.x = 16; searchT.y = 10;
    search.appendChild(searchT);
    search.x = 48; search.y = 10;
    searchRow.appendChild(search);

    const createBtn = buildButton('Create Connection', 'primary', 168, 36);
    createBtn.x = 1440 - 48 - 168; createBtn.y = 10;
    searchRow.appendChild(createBtn);
    screenA.appendChild(searchRow);

    // Connection cards grid
    const cards = [
      { name: 'AWS Max — San Jose Metro', type: 'Internet to Cloud', status: 'Active',   bandwidth: '1 Gbps',   location: 'San Jose, CA',    utilization: 15, isLmcc: true },
      { name: 'Azure ExpressRoute — NY',  type: 'Dedicated',        status: 'Active',   bandwidth: '500 Mbps', location: 'New York, NY',     utilization: 42 },
      { name: 'AWS Max — Los Angeles',    type: 'Internet to Cloud', status: 'Pending',  bandwidth: '1 Gbps',   location: 'Los Angeles, CA',  utilization: 0,  isLmcc: true },
      { name: 'GCP Interconnect — Dallas',type: 'Dedicated',        status: 'Inactive', bandwidth: '200 Mbps', location: 'Dallas, TX',       utilization: 0 },
    ];

    let cx = 48; let cy = 240;
    cards.forEach((cardOpts, i) => {
      const card = buildConnectionCard(Object.assign({}, cardOpts, { width: 320 }));
      card.x = cx; card.y = cy;
      if ((i + 1) % 4 === 0) { cx = 48; cy += card.height + 20; }
      else { cx += 340; }
      screenA.appendChild(card);
    });

    pg.appendChild(screenA);

    // Screen B: With "Introducing" banner
    const screenB = frm('Dashboard — NetBond Max Banner', 1440, 960, C.wash);
    screenB.x = 1500; screenB.y = 0;

    // Clone the base dashboard (same content)
    const nav2 = buildNavBar('Manage');
    nav2.x = 0; nav2.y = 0;
    screenB.appendChild(nav2);

    // Re-use same structure
    const subNav2 = frm('SubNav', 1440, 56, C.white);
    subNav2.strokes = stroke(C.border); subNav2.strokeWeight = 1; subNav2.y = 64;
    const subTitle2 = txt('Networks', 22, 'Bold', C.heading);
    subTitle2.x = 48; subTitle2.y = 14;
    subNav2.appendChild(subTitle2);
    screenB.appendChild(subNav2);

    // Dim overlay
    const overlay = rect(1440, 960, C.black);
    overlay.opacity = 0.5;
    overlay.x = 0; overlay.y = 0;
    screenB.appendChild(overlay);

    // NetBond Max Banner modal
    const banner = frm('NetBondMaxBanner', 560, 340, C.white, 20);
    banner.effects = shadow(16, 48, 0.2);
    banner.x = (1440 - 560) / 2;
    banner.y = (960 - 340) / 2;

    const bannerHeader = frm('BannerHeader', 560, 72, C.wash, 0);
    const newChip = frm('NewChip', 40, 18, C.attBlue, 4);
    const newT = txt('NEW', 9, 'Bold', C.white); newT.x = 8; newT.y = 4;
    newChip.appendChild(newT); newChip.x = 20; newChip.y = 16;
    bannerHeader.appendChild(newChip);

    const dots = frm('Dots', 32, 10, C.white, 0);
    dots.x = 20; dots.y = 40;
    bannerHeader.appendChild(dots);
    banner.appendChild(bannerHeader);

    const introdLabel = txt('INTRODUCING', 11, 'Semi Bold', C.link, { ls: 8 });
    introdLabel.x = 24; introdLabel.y = 80;
    banner.appendChild(introdLabel);

    const bannerTitle = txt('AT&T NetBond® Advanced Max', 28, 'Bold', C.heading, { lh: 34 });
    bannerTitle.x = 24; bannerTitle.y = 100;
    banner.appendChild(bannerTitle);

    const bannerSub = txt('Maximum resiliency · AWS Direct Connect', 14, 'Regular', C.bodyLight);
    bannerSub.x = 24; bannerSub.y = 138;
    banner.appendChild(bannerSub);

    const featureLine = txt('Four private paths · Two diverse sites · One activation key · Auto-negotiated L3', 13, 'Regular', C.body, { lh: 20, w: 512 });
    featureLine.x = 24; featureLine.y = 168;
    banner.appendChild(featureLine);

    const chips = frm('Chips', 512, 28, C.white, 0);
    chips.x = 24; chips.y = 210;
    const chip1 = badge('4-Path Max Resiliency', C.cobalt100, C.link, 6);
    chip1.x = 0; chip1.y = 0; chips.appendChild(chip1);
    const chip2 = badge('Auto-negotiated L3', C.successLight, C.success, 6);
    chip2.x = chip1.width + 8; chip2.y = 0; chips.appendChild(chip2);
    banner.appendChild(chips);

    const buildBtn = buildButton('Build it for me →', 'primary', 176, 40);
    buildBtn.x = 24; buildBtn.y = 256;
    banner.appendChild(buildBtn);

    const notNow = txt('Not now', 13, 'Regular', C.bodyLight);
    notNow.x = 220; notNow.y = 264;
    banner.appendChild(notNow);

    screenB.appendChild(banner);
    pg.appendChild(screenB);

    figma.viewport.scrollAndZoomIntoView([screenA, screenB]);
  }

  // ─── PAGE 3: WIZARD FLOWS ──────────────────────────────────────────────

  function buildWizardPage() {
    const pg = getOrCreatePage('🔌 Wizard — All Steps');
    figma.currentPage = pg;

    const wizardSteps = [
      {
        title: 'What type of connection do you need?',
        subtitle: 'Choose the connection type that fits your architecture.',
        options: [
          { label: 'Internet to Cloud', desc: 'Secure internet path to public cloud services', badge: 'Most popular' },
          { label: 'Dedicated', desc: 'Private physical connection with guaranteed SLA', badge: null },
        ],
        step: 1,
        hasOptions: true,
      },
      {
        title: 'Which cloud provider?',
        subtitle: 'Select all providers you need to connect.',
        options: [
          { label: 'AWS', desc: 'Amazon Web Services' },
          { label: 'Azure', desc: 'Microsoft Azure' },
          { label: 'Google Cloud', desc: 'Google Cloud Platform' },
          { label: 'Oracle', desc: 'Oracle Cloud Infrastructure' },
        ],
        step: 2,
        hasOptions: true,
      },
      {
        title: 'Select your resiliency level',
        subtitle: 'Higher resiliency means more redundant paths and failover.',
        options: [
          { label: 'Standard', desc: 'Single path, best-effort. For non-critical workloads.' },
          { label: 'Geodiversity', desc: 'Two paths across different geographic locations.' },
          { label: 'Maximum Resiliency', desc: '4 diverse paths. Highest uptime guarantee. (AWS Max)', badge: 'Recommended' },
        ],
        step: 3,
        hasOptions: true,
      },
    ];

    let sx = 0; let sy = 0;

    wizardSteps.forEach(stepData => {
      const screen = frm(`Wizard — Step ${stepData.step}`, 1440, 900, C.wash);
      screen.x = sx; screen.y = sy;

      const nav = buildNavBar('Create');
      nav.x = 0; nav.y = 0;
      screen.appendChild(nav);

      const phase = buildWizardPhaseIndicator(stepData.step, 8);
      phase.x = 0; phase.y = 64;
      screen.appendChild(phase);

      const content = frm('Content', 800, 680, C.wash);
      content.x = 320; content.y = 140;

      const titleT = txt(stepData.title, 28, 'Bold', C.heading, { lh: 36, w: 760 });
      titleT.x = 0; titleT.y = 0;
      content.appendChild(titleT);

      const subT = txt(stepData.subtitle, 16, 'Regular', C.bodyLight, { w: 640 });
      subT.x = 0; subT.y = 52;
      content.appendChild(subT);

      if (stepData.hasOptions) {
        let oy = 96;
        stepData.options.forEach((opt, i) => {
          const isSelected = i === 0;
          const optCard = frm(`Option/${opt.label}`, 760, 72, isSelected ? C.accent : C.white, 12);
          optCard.strokes = stroke(isSelected ? C.link : C.border);
          optCard.strokeWeight = isSelected ? 2 : 1;
          optCard.x = 0; optCard.y = oy;

          const radio = frm('Radio', 20, 20, isSelected ? C.link : C.white, 10);
          radio.strokes = stroke(isSelected ? C.link : C.border); radio.strokeWeight = 2;
          radio.x = 20; radio.y = 26;
          optCard.appendChild(radio);

          const optTitle = txt(opt.label, 16, 'Semi Bold', C.heading);
          optTitle.x = 52; optTitle.y = 14;
          optCard.appendChild(optTitle);

          const optDesc = txt(opt.desc, 13, 'Regular', C.bodyLight);
          optDesc.x = 52; optDesc.y = 36;
          optCard.appendChild(optDesc);

          if (opt.badge) {
            const b = badge(opt.badge, C.attBlue, C.white, 4);
            b.x = 760 - b.width - 16; b.y = 24;
            optCard.appendChild(b);
          }

          content.appendChild(optCard);
          oy += 84;
        });
      }

      // Next button
      const nextBtn = buildButton('Next →', 'primary', 140, 44);
      nextBtn.x = 760 - 140; nextBtn.y = 580;
      content.appendChild(nextBtn);

      const backBtn = buildButton('← Back', 'outline', 100, 44);
      backBtn.x = 0; backBtn.y = 580;
      content.appendChild(backBtn);

      screen.appendChild(content);
      pg.appendChild(screen);

      sx += 1500;
    });

    // Step 4: Locations
    const locScreen = frm('Wizard — Step 4 — Locations', 1440, 900, C.wash);
    locScreen.x = sx; locScreen.y = sy;
    const nav4 = buildNavBar('Create');
    locScreen.appendChild(nav4);
    const phase4 = buildWizardPhaseIndicator(4, 8);
    phase4.x = 0; phase4.y = 64;
    locScreen.appendChild(phase4);

    const sidebar4 = buildSidebarSummary({ type: 'Internet to Cloud', provider: 'AWS', resiliency: 'Maximum', locations: 0, bandwidth: '—' });
    sidebar4.x = 48; sidebar4.y = 160;
    locScreen.appendChild(sidebar4);

    const locContent = frm('LocContent', 1060, 680, C.wash);
    locContent.x = 340; locContent.y = 140;
    const locTitle = txt('Select your access locations', 26, 'Bold', C.heading);
    locTitle.x = 0; locTitle.y = 0;
    locContent.appendChild(locTitle);
    const locSub = txt('Choose metro areas where AT&T will establish your access points.', 15, 'Regular', C.bodyLight);
    locSub.x = 0; locSub.y = 44;
    locContent.appendChild(locSub);

    const metroGrid = frm('MetroGrid', 1040, 400, C.wash);
    metroGrid.x = 0; metroGrid.y = 84;
    const metros = ['San Jose, CA', 'Los Angeles, CA', 'New York, NY', 'Dallas, TX', 'Chicago, IL', 'Ashburn, VA', 'Atlanta, GA', 'Seattle, WA'];
    metros.forEach((m, i) => {
      const isSelected = i < 2;
      const mCard = frm(m, 244, 56, isSelected ? C.accent : C.white, 8);
      mCard.strokes = stroke(isSelected ? C.link : C.border); mCard.strokeWeight = isSelected ? 2 : 1;
      mCard.x = (i % 4) * 260; mCard.y = Math.floor(i / 4) * 72;
      const checkBox = frm('Check', 18, 18, isSelected ? C.link : C.white, 4);
      checkBox.strokes = stroke(isSelected ? C.link : C.border); checkBox.strokeWeight = 2;
      checkBox.x = 16; checkBox.y = 19;
      mCard.appendChild(checkBox);
      const mTxt = txt(m, 13, 'Semi Bold', isSelected ? C.link : C.heading);
      mTxt.x = 44; mTxt.y = 20;
      mCard.appendChild(mTxt);
      metroGrid.appendChild(mCard);
    });
    locContent.appendChild(metroGrid);

    const nextBtn4 = buildButton('Next →', 'primary', 140, 44);
    nextBtn4.x = 1040 - 140; nextBtn4.y = 560;
    locContent.appendChild(nextBtn4);
    locScreen.appendChild(locContent);
    pg.appendChild(locScreen);
    sx += 1500;

    // Step 5: Bandwidth
    const bwScreen = frm('Wizard — Step 5 — Bandwidth', 1440, 900, C.wash);
    bwScreen.x = sx; bwScreen.y = sy;
    bwScreen.appendChild(buildNavBar('Create'));
    const phase5 = buildWizardPhaseIndicator(5, 8);
    phase5.x = 0; phase5.y = 64;
    bwScreen.appendChild(phase5);

    const sidebar5 = buildSidebarSummary({ type: 'Internet to Cloud', provider: 'AWS', resiliency: 'Maximum', locations: 2, bandwidth: '—' });
    sidebar5.x = 48; sidebar5.y = 160;
    bwScreen.appendChild(sidebar5);

    const bwContent = frm('BWContent', 1060, 600, C.wash);
    bwContent.x = 340; bwContent.y = 140;
    const bwTitle = txt('Configure your bandwidth', 26, 'Bold', C.heading);
    bwTitle.x = 0; bwTitle.y = 0;
    bwContent.appendChild(bwTitle);

    const bwOptions = ['100 Mbps', '500 Mbps', '1 Gbps', '10 Gbps'];
    bwOptions.forEach((bw, i) => {
      const isSelected = i === 2;
      const bwChip = frm(bw, 200, 52, isSelected ? C.accent : C.white, 8);
      bwChip.strokes = stroke(isSelected ? C.link : C.border); bwChip.strokeWeight = isSelected ? 2 : 1;
      bwChip.x = i * 216; bwChip.y = 56;
      const bwLabel = txt(bw, 16, 'Semi Bold', isSelected ? C.link : C.heading);
      bwLabel.x = 20; bwLabel.y = 16;
      bwChip.appendChild(bwLabel);
      bwContent.appendChild(bwChip);
    });

    const nextBtn5 = buildButton('Next →', 'primary', 140, 44);
    nextBtn5.x = 1060 - 140; nextBtn5.y = 460;
    bwContent.appendChild(nextBtn5);
    bwScreen.appendChild(bwContent);
    pg.appendChild(bwScreen);
    sx += 1500;

    // Step 6: Network Config
    const netScreen = frm('Wizard — Step 6 — Network Config', 1440, 900, C.wash);
    netScreen.x = sx; netScreen.y = sy;
    netScreen.appendChild(buildNavBar('Create'));
    const phase6 = buildWizardPhaseIndicator(6, 8);
    phase6.x = 0; phase6.y = 64;
    netScreen.appendChild(phase6);

    const sidebar6 = buildSidebarSummary({ type: 'Internet to Cloud', provider: 'AWS', resiliency: 'Maximum', locations: 2, bandwidth: '1 Gbps' });
    sidebar6.x = 48; sidebar6.y = 160;
    netScreen.appendChild(sidebar6);

    const netContent = frm('NetContent', 1060, 600, C.wash);
    netContent.x = 340; netContent.y = 140;
    const netTitle = txt('Network Configuration', 26, 'Bold', C.heading);
    netTitle.x = 0; netTitle.y = 0;
    netContent.appendChild(netTitle);

    const netFields = [
      { label: 'Cloud Router Name', placeholder: 'e.g. prod-aws-router-01' },
      { label: 'Subnet (CIDR)', placeholder: 'e.g. 10.0.0.0/24' },
      { label: 'BGP Peer ASN', placeholder: 'e.g. 65001' },
    ];
    netFields.forEach((field, i) => {
      const lbl = txt(field.label, 12, 'Medium', C.body);
      lbl.x = 0; lbl.y = 56 + i * 80;
      netContent.appendChild(lbl);
      const input = frm(field.label, 600, 40, C.white, 8);
      input.strokes = stroke(C.border); input.strokeWeight = 1;
      const ph = txt(field.placeholder, 14, 'Regular', C.muted);
      ph.x = 14; ph.y = 12;
      input.appendChild(ph);
      input.x = 0; input.y = 76 + i * 80;
      netContent.appendChild(input);
    });

    const nextBtn6 = buildButton('Next →', 'primary', 140, 44);
    nextBtn6.x = 1060 - 140; nextBtn6.y = 460;
    netContent.appendChild(nextBtn6);
    netScreen.appendChild(netContent);
    pg.appendChild(netScreen);
    sx += 1500;

    // Step 7: Billing
    const billScreen = frm('Wizard — Step 7 — Billing', 1440, 900, C.wash);
    billScreen.x = sx; billScreen.y = sy;
    billScreen.appendChild(buildNavBar('Create'));
    const phase7 = buildWizardPhaseIndicator(7, 8);
    phase7.x = 0; phase7.y = 64;
    billScreen.appendChild(phase7);

    const sidebar7 = buildSidebarSummary({ type: 'Internet to Cloud', provider: 'AWS', resiliency: 'Maximum', locations: 2, bandwidth: '1 Gbps' });
    sidebar7.x = 48; sidebar7.y = 160;
    billScreen.appendChild(sidebar7);

    const billContent = frm('BillContent', 1060, 600, C.wash);
    billContent.x = 340; billContent.y = 140;
    const billTitle = txt('Select your billing plan', 26, 'Bold', C.heading);
    billTitle.x = 0; billTitle.y = 0;
    billContent.appendChild(billTitle);

    const plans = [
      { label: 'Pay As You Go', price: '$2,499/mo', desc: 'No commitment. Cancel anytime.', badge: null },
      { label: '12 Months', price: '$2,099/mo', desc: 'Save 16% vs month-to-month.', badge: 'Popular' },
      { label: '24 Months', price: '$1,799/mo', desc: 'Save 28% with longer term.', badge: null },
      { label: '36 Months', price: '$1,499/mo', desc: 'Best value. Save 40%.', badge: 'Best Value' },
    ];
    plans.forEach((plan, i) => {
      const isSelected = i === 1;
      const planCard = frm(plan.label, 490, 80, isSelected ? C.accent : C.white, 12);
      planCard.strokes = stroke(isSelected ? C.link : C.border); planCard.strokeWeight = isSelected ? 2 : 1;
      planCard.x = (i % 2) * 520; planCard.y = 56 + Math.floor(i / 2) * 96;

      const planTitle = txt(plan.label, 16, 'Semi Bold', isSelected ? C.link : C.heading);
      planTitle.x = 20; planTitle.y = 12;
      planCard.appendChild(planTitle);

      const planPrice = txt(plan.price, 18, 'Bold', C.heading);
      planPrice.x = 490 - planPrice.width - 20; planPrice.y = 12;
      planCard.appendChild(planPrice);

      const planDesc = txt(plan.desc, 12, 'Regular', C.bodyLight);
      planDesc.x = 20; planDesc.y = 38;
      planCard.appendChild(planDesc);

      if (plan.badge) {
        const b = badge(plan.badge, C.cobalt600, C.white, 4);
        b.x = 490 - b.width - 20; b.y = 42;
        planCard.appendChild(b);
      }
      billContent.appendChild(planCard);
    });

    const nextBtn7 = buildButton('Next →', 'primary', 140, 44);
    nextBtn7.x = 1060 - 140; nextBtn7.y = 460;
    billContent.appendChild(nextBtn7);
    billScreen.appendChild(billContent);
    pg.appendChild(billScreen);
    sx += 1500;

    // Step 8: Review (Standard)
    const reviewScreen = frm('Wizard — Step 8 — Review (Standard)', 1440, 960, C.wash);
    reviewScreen.x = sx; reviewScreen.y = sy;
    reviewScreen.appendChild(buildNavBar('Create'));
    const phase8 = buildWizardPhaseIndicator(8, 8);
    phase8.x = 0; phase8.y = 64;
    reviewScreen.appendChild(phase8);

    const reviewContent = frm('ReviewContent', 1344, 780, C.wash);
    reviewContent.x = 48; reviewContent.y = 136;

    // Success header
    const successCard = frm('SuccessHeader', 1344, 120, C.white, 16);
    successCard.strokes = stroke(C.border); successCard.strokeWeight = 1;
    const checkCircle = frm('CheckCircle', 56, 56, C.link, 28);
    checkCircle.x = (1344 - 56) / 2; checkCircle.y = 16;
    successCard.appendChild(checkCircle);
    const successTitle = txt('Network Configuration Complete', 24, 'Bold', C.heading);
    successTitle.x = (1344 - successTitle.width) / 2; successTitle.y = 80;
    successCard.appendChild(successTitle);
    reviewContent.appendChild(successCard);

    // Two-column layout
    const reviewGrid = frm('ReviewGrid', 1344, 620, C.wash);
    reviewGrid.x = 0; reviewGrid.y = 140;

    // Left column: config details
    const leftCol = frm('LeftCol', 860, 620, C.wash);
    leftCol.x = 0;

    const sections = [
      { title: 'Connection Type', rows: [{ l: 'Type', v: 'Internet to Cloud' }, { l: 'Provider', v: 'AWS' }] },
      { title: 'Locations', rows: [{ l: 'Metro 1', v: 'San Jose, CA' }, { l: 'Metro 2', v: 'Los Angeles, CA' }] },
      { title: 'Network', rows: [{ l: 'Router Name', v: 'prod-aws-router-01' }, { l: 'Bandwidth', v: '1 Gbps' }, { l: 'Subnet', v: '10.0.0.0/24' }] },
    ];
    let secY = 0;
    sections.forEach(sec => {
      const secCard = frm(sec.title, 860, 40 + sec.rows.length * 44, C.white, 12);
      secCard.strokes = stroke(C.border); secCard.strokeWeight = 1;
      secCard.x = 0; secCard.y = secY;

      const secTitle = txt(sec.title, 15, 'Semi Bold', C.heading);
      secTitle.x = 20; secTitle.y = 12;
      secCard.appendChild(secTitle);

      sec.rows.forEach((row, ri) => {
        const rowD = divider(820); rowD.x = 20; rowD.y = 40 + ri * 44;
        secCard.appendChild(rowD);
        const lbl = txt(row.l, 13, 'Regular', C.bodyLight); lbl.x = 20; lbl.y = 50 + ri * 44;
        const val = txt(row.v, 13, 'Semi Bold', C.heading); val.x = 860 - 20 - val.width; val.y = 50 + ri * 44;
        secCard.appendChild(lbl); secCard.appendChild(val);
      });

      leftCol.appendChild(secCard);
      secY += secCard.height + 16;
    });
    reviewGrid.appendChild(leftCol);

    // Right column: topology + billing preview
    const rightCol = frm('RightCol', 460, 620, C.wash);
    rightCol.x = 884;

    // Topology
    const topoCard = frm('Topology', 460, 180, C.white, 12);
    topoCard.strokes = stroke(C.border); topoCard.strokeWeight = 1;
    const topoTitle = txt('Network Topology', 14, 'Semi Bold', C.heading);
    topoTitle.x = 20; topoTitle.y = 16;
    topoCard.appendChild(topoTitle);

    const nodeAtt = frm('ATTCore', 48, 48, C.cobalt100, 12);
    nodeAtt.strokes = stroke(C.cobalt400); nodeAtt.strokeWeight = 2;
    nodeAtt.x = 40; nodeAtt.y = 60;
    const attT = txt('AT&T', 9, 'Semi Bold', C.link); attT.x = 6; attT.y = 18;
    nodeAtt.appendChild(attT);
    topoCard.appendChild(nodeAtt);
    const attLabel = txt('AT&T Core', 10, 'Regular', C.bodyLight);
    attLabel.x = 40 + (48 - attLabel.width) / 2; attLabel.y = 112;
    topoCard.appendChild(attLabel);

    const line1 = rect(32, 1, C.border); line1.x = 96; line1.y = 83;
    topoCard.appendChild(line1);

    const nodeRouter = frm('CloudRouter', 48, 48, C.wash, 12);
    nodeRouter.strokes = stroke(C.border); nodeRouter.strokeWeight = 2;
    nodeRouter.x = 136; nodeRouter.y = 60;
    const routerT = txt('Router', 9, 'Semi Bold', C.bodyLight); routerT.x = 2; routerT.y = 18;
    nodeRouter.appendChild(routerT);
    topoCard.appendChild(nodeRouter);
    const routerLabel = txt('Cloud Router', 10, 'Regular', C.bodyLight);
    routerLabel.x = 136 + (48 - routerLabel.width) / 2; routerLabel.y = 112;
    topoCard.appendChild(routerLabel);

    const line2 = rect(32, 1, C.success); line2.x = 192; line2.y = 83;
    topoCard.appendChild(line2);

    const nodeProvider = frm('Provider/AWS', 48, 48, C.successLight, 12);
    nodeProvider.strokes = stroke(C.success); nodeProvider.strokeWeight = 2;
    nodeProvider.x = 232; nodeProvider.y = 60;
    const awsT = txt('AWS', 10, 'Semi Bold', C.success); awsT.x = 9; awsT.y = 18;
    nodeProvider.appendChild(awsT);
    topoCard.appendChild(nodeProvider);
    const awsLabel = txt('AWS', 10, 'Regular', C.bodyLight);
    awsLabel.x = 232 + (48 - awsLabel.width) / 2; awsLabel.y = 112;
    topoCard.appendChild(awsLabel);

    rightCol.appendChild(topoCard);

    // Billing summary
    const billCard = frm('BillingSummary', 460, 200, C.white, 12);
    billCard.strokes = stroke(C.border); billCard.strokeWeight = 1;
    billCard.y = 200;
    const billCardTitle = txt('Billing Summary', 14, 'Semi Bold', C.heading);
    billCardTitle.x = 20; billCardTitle.y = 16;
    billCard.appendChild(billCardTitle);

    const billRows = [
      { l: '1 Gbps · Maximum Resiliency', v: '$2,099/mo' },
      { l: '12 Month term', v: 'Save 16%' },
      { l: 'Estimated Total', v: '$2,099/mo', bold: true },
    ];
    billRows.forEach((row, i) => {
      const d = divider(420); d.x = 20; d.y = 44 + i * 44;
      billCard.appendChild(d);
      const l = txt(row.l, 13, row.bold ? 'Semi Bold' : 'Regular', row.bold ? C.heading : C.bodyLight);
      l.x = 20; l.y = 54 + i * 44;
      billCard.appendChild(l);
      const v = txt(row.v, 13, row.bold ? 'Bold' : 'Medium', row.bold ? C.link : C.heading);
      v.x = 460 - 20 - v.width; v.y = 54 + i * 44;
      billCard.appendChild(v);
    });
    rightCol.appendChild(billCard);
    reviewGrid.appendChild(rightCol);
    reviewContent.appendChild(reviewGrid);

    // Deploy button
    const deployBtn = buildButton('Deploy Connection', 'primary', 200, 44);
    deployBtn.x = (1344 - 200) / 2; deployBtn.y = 720;
    reviewContent.appendChild(deployBtn);

    reviewScreen.appendChild(reviewContent);
    pg.appendChild(reviewScreen);
    sx += 1500;

    figma.viewport.scrollAndZoomIntoView(pg.children);
  }

  // ─── PAGE 4: AWS MAX FLOW ──────────────────────────────────────────────

  function buildAWSMaxPage() {
    const pg = getOrCreatePage('🟠 AWS Max Flow');
    figma.currentPage = pg;

    // AWS Max: Centered layout for steps 4-5
    const centerScreen = frm('AWS Max — Step 4 — Locations (Centered)', 1440, 900, C.wash);
    centerScreen.x = 0;

    centerScreen.appendChild(buildNavBar('Create'));
    const phaseAws = buildWizardPhaseIndicator(4, 8);
    phaseAws.x = 0; phaseAws.y = 64;
    centerScreen.appendChild(phaseAws);

    const awsContent = frm('AWSLocContent', 720, 640, C.wash);
    awsContent.x = (1440 - 720) / 2; awsContent.y = 140;

    const awsTitle = txt('Select your AWS Direct Connect metro', 26, 'Bold', C.heading, { w: 720, lh: 34 });
    awsTitle.x = 0; awsTitle.y = 0;
    awsContent.appendChild(awsTitle);

    const awsSub = txt('AT&T NetBond Advanced Max connects via 4 hosted connections per metro.', 15, 'Regular', C.bodyLight);
    awsSub.x = 0; awsSub.y = 52;
    awsContent.appendChild(awsSub);

    // AWS Max info card
    const infoCard = frm('AwsMaxInfo', 720, 72, C.accent, 12);
    infoCard.strokes = stroke(C.link, 0.3); infoCard.strokeWeight = 1;
    infoCard.x = 0; infoCard.y = 90;
    const infoT = txt('AWS Max uses 4 hosted connections per metro for Maximum Resiliency. AT&T auto-negotiates all BGP, VLAN, and IP parameters.', 13, 'Regular', C.link, { w: 680, lh: 20 });
    infoT.x = 20; infoT.y = 16;
    infoCard.appendChild(infoT);
    awsContent.appendChild(infoCard);

    const awsMetros = ['San Jose, CA', 'Los Angeles, CA', 'New York, NY', 'Dallas, TX'];
    awsMetros.forEach((m, i) => {
      const isSelected = i === 0;
      const mCard = frm(m, 344, 64, isSelected ? C.accent : C.white, 10);
      mCard.strokes = stroke(isSelected ? C.link : C.border); mCard.strokeWeight = isSelected ? 2 : 1;
      mCard.x = (i % 2) * 376; mCard.y = 186 + Math.floor(i / 2) * 80;
      const mT = txt(m, 14, 'Semi Bold', isSelected ? C.link : C.heading);
      mT.x = 20; mT.y = 22;
      mCard.appendChild(mT);
      const pathsT = txt('4 hosted connections · Auto-provisioned', 11, 'Regular', isSelected ? C.link : C.muted);
      pathsT.x = 20; pathsT.y = 40;
      mCard.appendChild(pathsT);
      awsContent.appendChild(mCard);
    });

    const nextBtnAws = buildButton('Next →', 'primary', 140, 44);
    nextBtnAws.x = 720 - 140; nextBtnAws.y = 520;
    awsContent.appendChild(nextBtnAws);

    centerScreen.appendChild(awsContent);
    pg.appendChild(centerScreen);

    // AWS Max: Step 8 with Activation Key
    const keyScreen = frm('AWS Max — Step 8 — Review + Activation Key', 1440, 1000, C.wash);
    keyScreen.x = 1500;

    keyScreen.appendChild(buildNavBar('Create'));
    const phase8aws = buildWizardPhaseIndicator(8, 8);
    phase8aws.x = 0; phase8aws.y = 64;
    keyScreen.appendChild(phase8aws);

    const keyContent = frm('KeyContent', 1344, 820, C.wash);
    keyContent.x = 48; keyContent.y = 140;

    // Success header with Activation Key
    const keyHeader = frm('KeyHeader', 1344, 280, C.white, 16);
    keyHeader.strokes = stroke(C.border); keyHeader.strokeWeight = 1;

    const keyCircle = frm('KeyCircle', 56, 56, C.link, 28);
    keyCircle.x = (1344 - 56) / 2; keyCircle.y = 16;
    keyHeader.appendChild(keyCircle);

    const keyTitle = txt('Network Configuration Complete', 24, 'Bold', C.heading);
    keyTitle.x = (1344 - keyTitle.width) / 2; keyTitle.y = 84;
    keyHeader.appendChild(keyTitle);

    const keySubT = txt('Your cloud router is configured and ready for deployment.', 15, 'Regular', C.bodyLight);
    keySubT.x = (1344 - keySubT.width) / 2; keySubT.y = 114;
    keyHeader.appendChild(keySubT);

    // Activation Key box
    const keyBox = frm('ActivationKey', 640, 160, C.cobalt800, 16);
    keyBox.x = (1344 - 640) / 2; keyBox.y = 144;

    const keyLabel = txt('Your Activation Key', 16, 'Bold', C.white);
    keyLabel.x = (640 - keyLabel.width) / 2; keyLabel.y = 16;
    keyBox.appendChild(keyLabel);

    const keyDesc = txt('Copy this key and take it to your AWS Direct Connect console.', 12, 'Regular', C.white);
    keyDesc.opacity = 0.8;
    keyDesc.x = 20; keyDesc.y = 42;
    keyBox.appendChild(keyDesc);

    const keyCodeBox = frm('KeyCode', 600, 40, C.white, 8);
    keyCodeBox.opacity = 0.12;
    keyCodeBox.x = 20; keyCodeBox.y = 68;
    keyBox.appendChild(keyCodeBox);

    const keyCodeT = txt('eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6Im...', 11, 'Regular', C.white);
    keyCodeT.x = 24; keyCodeT.y = 80;
    keyBox.appendChild(keyCodeT);

    const copyBtn = frm('CopyBtn', 290, 36, C.white, 10);
    copyBtn.opacity = 0.2;
    copyBtn.x = 20; copyBtn.y = 116;
    keyBox.appendChild(copyBtn);
    const copyT = txt('Copy Key', 13, 'Semi Bold', C.white);
    copyT.x = 115; copyT.y = 128;
    keyBox.appendChild(copyT);

    const consoleBtn = frm('ConsoleBtn', 290, 36, C.white, 10);
    consoleBtn.opacity = 0.2;
    consoleBtn.x = 330; consoleBtn.y = 116;
    keyBox.appendChild(consoleBtn);
    const consoleT = txt('Open AWS Console', 13, 'Semi Bold', C.white);
    consoleT.x = 360; consoleT.y = 128;
    keyBox.appendChild(consoleT);

    keyHeader.appendChild(keyBox);
    keyContent.appendChild(keyHeader);

    // Next steps instructions
    const stepsCard = frm('NextSteps', 1344, 120, C.wash, 12);
    stepsCard.strokes = stroke(C.border); stepsCard.strokeWeight = 1;
    stepsCard.x = 0; stepsCard.y = 300;
    const stepsT = txt('What to do in AWS Direct Connect Console', 13, 'Semi Bold', C.heading);
    stepsT.x = 20; stepsT.y = 16;
    stepsCard.appendChild(stepsT);
    const step1T = txt('1. Go to AWS Direct Connect › Connections   2. Accept each of the 4 pending AT&T connections   3. BGP, VLANs, IPs configured automatically', 13, 'Regular', C.body, { w: 1300, lh: 24 });
    step1T.x = 20; step1T.y = 40;
    stepsCard.appendChild(step1T);
    keyContent.appendChild(stepsCard);

    keyScreen.appendChild(keyContent);
    pg.appendChild(keyScreen);

    figma.viewport.scrollAndZoomIntoView([centerScreen, keyScreen]);
  }

  // ─── PAGE 5: LMCC + MODALS ─────────────────────────────────────────────

  function buildLMCCPage() {
    const pg = getOrCreatePage('🔑 LMCC + Modals');
    figma.currentPage = pg;

    // Dashboard backdrop for context
    const backdrop = frm('BackdropDashboard', 1440, 900, C.wash);
    backdrop.x = 0; backdrop.y = 0;
    backdrop.opacity = 0.4;
    backdrop.appendChild(buildNavBar('Manage'));
    pg.appendChild(backdrop);

    // LMCC Kickoff Modal
    const modalOverlay = rect(1440, 900, C.black);
    modalOverlay.opacity = 0.6;
    modalOverlay.x = 0; modalOverlay.y = 0;
    pg.appendChild(modalOverlay);

    const kickoffModal = frm('LMCCKickoffModal', 560, 480, C.white, 20);
    kickoffModal.effects = shadow(16, 48, 0.2);
    kickoffModal.x = (1440 - 560) / 2;
    kickoffModal.y = (900 - 480) / 2;

    const kHeader = frm('ModalHeader', 560, 72, C.wash, 0);
    const awsLogo = frm('AWSLogoBox', 48, 32, C.white, 8);
    awsLogo.strokes = stroke(C.border); awsLogo.strokeWeight = 1;
    const awsT = txt('aws', 11, 'Bold', C.warn); awsT.x = 14; awsT.y = 10;
    awsLogo.appendChild(awsT);
    awsLogo.x = 20; awsLogo.y = 20;
    kHeader.appendChild(awsLogo);
    const kTitle = txt('AT&T NetBond® Advanced Max', 18, 'Bold', C.heading);
    kTitle.x = 80; kTitle.y = 20;
    kHeader.appendChild(kTitle);
    const kSub = txt('Maximum Resiliency · AWS Direct Connect', 12, 'Regular', C.bodyLight);
    kSub.x = 80; kSub.y = 44;
    kHeader.appendChild(kSub);
    kickoffModal.appendChild(kHeader);
    pg.appendChild(kHeader); // placeholder, will be inside modal

    // Build complete modal
    const kDiv = divider(560); kDiv.y = 72;
    kickoffModal.appendChild(kDiv);

    const kBody = frm('KickoffBody', 520, 280, C.white, 0);
    kBody.x = 20; kBody.y = 88;

    const kBodyTitle = txt('Connection Provisioning Steps', 16, 'Semi Bold', C.heading);
    kBodyTitle.x = 0; kBodyTitle.y = 0;
    kBody.appendChild(kBodyTitle);

    const provSteps = [
      { label: 'Key Generated', desc: 'AT&T has issued your ActivationKey. Take it to AWS Direct Connect Console.' },
      { label: 'Key Accepted', desc: 'AWS received and validated your key. AT&T begins feature negotiation.' },
      { label: 'Negotiating Parameters', desc: 'AT&T and AWS auto-configure BGP, VLANs, MTU across all 4 paths.' },
      { label: 'BGP Forming', desc: 'BGP sessions forming on AT&T hardware across all 4 paths.' },
      { label: 'Live', desc: 'All 4 paths confirmed. Traffic can flow. Billing begins.', isActive: true },
    ];

    let stepY = 32;
    provSteps.forEach((s, i) => {
      const isActive = s.isActive;
      const isDone = i < 4 && !isActive;
      const dotColor = isDone ? C.success : isActive ? C.link : C.border;

      const dot = frm('Dot', 14, 14, dotColor, 7);
      dot.x = 0; dot.y = stepY + 3;
      kBody.appendChild(dot);

      const sLabel = txt(s.label, 13, 'Semi Bold', isDone ? C.bodyLight : isActive ? C.link : C.muted);
      sLabel.x = 24; sLabel.y = stepY;
      kBody.appendChild(sLabel);

      const sDesc = txt(s.desc, 12, 'Regular', C.bodyLight, { w: 480 });
      sDesc.x = 24; sDesc.y = stepY + 18;
      kBody.appendChild(sDesc);

      stepY += 48;
    });
    kickoffModal.appendChild(kBody);

    const kFooter = frm('KickoffFooter', 560, 60, C.wash, 0);
    kFooter.y = 420;
    kFooter.strokes = stroke(C.border); kFooter.strokeWeight = 1;
    const closeBtn = buildButton('Close', 'outline', 100, 36);
    closeBtn.x = 20; closeBtn.y = 12;
    kFooter.appendChild(closeBtn);
    const ackBtn = buildButton('Acknowledge & Track', 'primary', 180, 36);
    ackBtn.x = 560 - 200; ackBtn.y = 12;
    kFooter.appendChild(ackBtn);
    kickoffModal.appendChild(kFooter);

    pg.appendChild(kickoffModal);

    // LMCC Onboarding Drawer (shown on a second screen)
    const drawerScreen = frm('LMCC Onboarding Drawer', 1440, 900, C.wash);
    drawerScreen.x = 1500; drawerScreen.y = 0;
    drawerScreen.appendChild(buildNavBar('Manage'));

    const drawerOverlay = rect(1440, 900, C.black);
    drawerOverlay.opacity = 0.3;
    drawerOverlay.x = 0; drawerOverlay.y = 0;
    drawerScreen.appendChild(drawerOverlay);

    const drawer = frm('OnboardingDrawer', 480, 900, C.white, 0);
    drawer.x = 1440 - 480; drawer.y = 0;
    drawer.effects = shadow(-8, 32, 0.15);

    const dHeader = frm('DrawerHeader', 480, 64, C.white, 0);
    dHeader.strokes = stroke(C.border); dHeader.strokeWeight = 1;
    const dTitle = txt('Connection Setup', 18, 'Semi Bold', C.heading);
    dTitle.x = 24; dTitle.y = 22;
    dHeader.appendChild(dTitle);
    drawer.appendChild(dHeader);

    const dBody = frm('DrawerBody', 432, 760, C.white, 0);
    dBody.x = 24; dBody.y = 80;

    // AWS branding in drawer
    const dAwsRow = frm('DrawerAWSRow', 432, 56, C.white, 0);
    dAwsRow.strokes = stroke(C.border); dAwsRow.strokeWeight = 1;
    const dLogo = frm('Logo', 48, 28, C.white, 6);
    dLogo.strokes = stroke(C.border); dLogo.strokeWeight = 1;
    const dAwsT = txt('aws', 10, 'Bold', C.warn); dAwsT.x = 12; dAwsT.y = 8;
    dLogo.appendChild(dAwsT);
    dLogo.x = 0; dLogo.y = 14;
    dAwsRow.appendChild(dLogo);
    const dProdName = txt('AT&T NetBond Advanced Max — Maximum Resiliency', 13, 'Semi Bold', C.heading);
    dProdName.x = 56; dProdName.y = 12;
    dAwsRow.appendChild(dProdName);
    const dMetro = txt('San Jose Metro · 1 Gbps × 4 paths', 12, 'Regular', C.bodyLight);
    dMetro.x = 56; dMetro.y = 30;
    dAwsRow.appendChild(dMetro);
    dBody.appendChild(dAwsRow);

    // Connection details card
    const dDetails = frm('ConnDetails', 432, 120, C.wash, 10);
    dDetails.strokes = stroke(C.border); dDetails.strokeWeight = 1;
    dDetails.y = 72;
    const dDetailRows = [
      { l: 'AWS Account', v: '987654321098' },
      { l: 'Metro', v: 'San Jose, CA' },
      { l: 'Bandwidth', v: '1 Gbps × 4 paths' },
      { l: 'Transport', v: 'MPLS + Internet' },
    ];
    dDetailRows.forEach((row, i) => {
      const col = Math.floor(i / 2);
      const rowIdx = i % 2;
      const dl = txt(row.l, 11, 'Regular', C.muted);
      dl.x = col * 220 + 12; dl.y = 12 + rowIdx * 48;
      dDetails.appendChild(dl);
      const dv = txt(row.v, 12, 'Semi Bold', C.heading);
      dv.x = col * 220 + 12; dv.y = 28 + rowIdx * 48;
      dDetails.appendChild(dv);
    });
    dBody.appendChild(dDetails);

    // Provisioning status stages
    const dStageTitle = txt('Provisioning Status', 13, 'Semi Bold', C.heading);
    dStageTitle.x = 0; dStageTitle.y = 208;
    dBody.appendChild(dStageTitle);

    const stages2 = [
      { label: 'Key Generated', active: true },
      { label: 'Key Accepted', active: false },
      { label: 'Negotiating Parameters', active: false },
      { label: 'BGP Forming', active: false },
      { label: 'Live', active: false },
    ];
    stages2.forEach((stage, i) => {
      const bg = stage.active ? C.accent : C.wash;
      const bc = stage.active ? C.link : C.border;
      const stageRow = frm(stage.label, 432, 52, bg, 8);
      stageRow.strokes = stroke(bc); stageRow.strokeWeight = stage.active ? 1.5 : 1;
      stageRow.x = 0; stageRow.y = 232 + i * 60;

      const dotColor2 = stage.active ? C.link : C.border;
      const dot2 = frm('Dot', 14, 14, dotColor2, 7);
      dot2.x = 12; dot2.y = 19;
      stageRow.appendChild(dot2);

      const stageL = txt(stage.label, 13, 'Semi Bold', stage.active ? C.link : C.muted);
      stageL.x = 36; stageL.y = 18;
      stageRow.appendChild(stageL);
      dBody.appendChild(stageRow);
    });

    // Billing section
    const billSection = frm('DrawerBilling', 432, 120, C.accent, 10);
    billSection.strokes = stroke(C.link, 0.3); billSection.strokeWeight = 1.5;
    billSection.x = 0; billSection.y = 560;
    const billT = txt('Billing', 15, 'Semi Bold', C.heading); billT.x = 16; billT.y = 16;
    billSection.appendChild(billT);
    const billRows2 = [
      { l: '1 Gbps × 4 paths', v: '$4,996/mo' },
      { l: 'MPLS + Internet', v: 'Included' },
      { l: 'Estimated Monthly', v: '$4,996/mo', bold: true },
    ];
    billRows2.forEach((row, i) => {
      const bl = txt(row.l, 12, row.bold ? 'Semi Bold' : 'Regular', row.bold ? C.heading : C.bodyLight);
      bl.x = 16; bl.y = 44 + i * 24;
      billSection.appendChild(bl);
      const bv = txt(row.v, 12, row.bold ? 'Bold' : 'Medium', row.bold ? C.link : C.heading);
      bv.x = 432 - 16 - bv.width; bv.y = 44 + i * 24;
      billSection.appendChild(bv);
    });
    dBody.appendChild(billSection);

    drawer.appendChild(dBody);

    // Drawer footer
    const dFooter = frm('DrawerFooter', 480, 64, C.white, 0);
    dFooter.y = 836;
    dFooter.strokes = stroke(C.border); dFooter.strokeWeight = 1;
    const dClose = buildButton('Close', 'outline', 90, 36);
    dClose.x = 24; dClose.y = 14;
    dFooter.appendChild(dClose);
    const dAck = buildButton('Acknowledge & Track', 'primary', 180, 36);
    dAck.x = 480 - 204; dAck.y = 14;
    dFooter.appendChild(dAck);
    drawer.appendChild(dFooter);

    drawerScreen.appendChild(drawer);
    pg.appendChild(drawerScreen);

    figma.viewport.scrollAndZoomIntoView(pg.children);
  }

  // ─── PAGE 6: MARKETPLACE ───────────────────────────────────────────────

  function buildMarketplacePage() {
    const pg = getOrCreatePage('🛒 Marketplace');
    figma.currentPage = pg;

    const screen = frm('Marketplace', 1440, 960, C.wash);
    screen.x = 0;
    screen.appendChild(buildNavBar('Manage'));

    // SubNav
    const subNav = frm('SubNav', 1440, 56, C.white);
    subNav.strokes = stroke(C.border); subNav.strokeWeight = 1; subNav.y = 64;
    const subTitle = txt('Marketplace', 22, 'Bold', C.heading);
    subTitle.x = 48; subTitle.y = 14;
    subNav.appendChild(subTitle);
    screen.appendChild(subNav);

    // Featured: AWS Max Partner Zone
    const featured = frm('FeaturedAWSMax', 1344, 200, C.cobalt800, 16);
    featured.x = 48; featured.y = 140;

    const featTitle = txt('AT&T NetBond® Advanced Max', 28, 'Bold', C.white);
    featTitle.x = 32; featTitle.y = 24;
    featured.appendChild(featTitle);

    const featSub = txt('Maximum Resiliency · AWS Direct Connect · 4 Private Paths · Auto-negotiated L3', 15, 'Regular', C.white);
    featSub.opacity = 0.85;
    featSub.x = 32; featSub.y = 64;
    featured.appendChild(featSub);

    const featChips = frm('FeatChips', 600, 28, C.white, 0);
    featChips.x = 32; featChips.y = 96;
    featChips.opacity = 0;
    const fChip1 = badge('4-Path Max Resiliency', C.white, C.cobalt800, 6); fChip1.x = 0;
    const fChip2 = badge('Sub-second BFD Failover', C.white, C.cobalt800, 6); fChip2.x = fChip1.width + 8;
    const fChip3 = badge('Auto-negotiated L3', C.white, C.cobalt800, 6); fChip3.x = fChip1.width + fChip2.width + 16;
    featChips.appendChild(fChip1); featChips.appendChild(fChip2); featChips.appendChild(fChip3);
    featured.appendChild(featChips);

    const featBtn = buildButton('View Plans →', 'outline', 140, 36);
    featBtn.x = 1344 - 160; featBtn.y = 84;
    featured.appendChild(featBtn);

    screen.appendChild(featured);

    // Product grid
    const gridTitle = txt('All Products', 18, 'Semi Bold', C.heading);
    gridTitle.x = 48; gridTitle.y = 372;
    screen.appendChild(gridTitle);

    const products = [
      { name: 'Standard Connectivity',  desc: 'Basic cloud connectivity for non-critical workloads.', provider: 'AWS · Azure · GCP', price: 'From $299/mo' },
      { name: 'Dedicated Connection',   desc: 'Private physical connection with guaranteed SLA.',    provider: 'AWS · Azure',       price: 'From $799/mo' },
      { name: 'Geodiversity Bundle',    desc: 'Two diverse paths for high-availability workloads.',  provider: 'AWS · Azure · GCP', price: 'From $1,299/mo' },
      { name: 'Global Transit',         desc: 'Multi-cloud hub with centralized routing control.',    provider: 'All Providers',     price: 'From $2,499/mo' },
    ];

    products.forEach((p, i) => {
      const pCard = frm('Product/' + p.name, 312, 160, C.white, 12);
      pCard.strokes = stroke(C.border); pCard.strokeWeight = 1;
      pCard.effects = shadow(2, 8, 0.05);
      pCard.x = 48 + (i % 4) * 332; pCard.y = 404;

      const pName = txt(p.name, 15, 'Semi Bold', C.heading, { w: 272 });
      pName.x = 20; pName.y = 16;
      pCard.appendChild(pName);

      const pDesc = txt(p.desc, 12, 'Regular', C.bodyLight, { w: 272, lh: 18 });
      pDesc.x = 20; pDesc.y = 52;
      pCard.appendChild(pDesc);

      const pProv = txt(p.provider, 11, 'Regular', C.muted);
      pProv.x = 20; pProv.y = 102;
      pCard.appendChild(pProv);

      const pPrice = txt(p.price, 13, 'Semi Bold', C.link);
      pPrice.x = 20; pPrice.y = 124;
      pCard.appendChild(pPrice);

      screen.appendChild(pCard);
    });

    pg.appendChild(screen);

    // Marketplace with AWS Drawer open
    const drawerScreen2 = frm('Marketplace — AWS Partner Zone Drawer', 1440, 960, C.wash);
    drawerScreen2.x = 1500; drawerScreen2.y = 0;
    drawerScreen2.appendChild(buildNavBar('Manage'));

    const overlay2 = rect(1440, 960, C.black);
    overlay2.opacity = 0.3; overlay2.x = 0; overlay2.y = 0;
    drawerScreen2.appendChild(overlay2);

    const awsDrawer = frm('AWSPartnerZoneDrawer', 560, 960, C.white, 0);
    awsDrawer.x = 1440 - 560; awsDrawer.y = 0;
    awsDrawer.effects = shadow(-8, 32, 0.15);

    const adHeader = frm('DrawerHeader', 560, 80, C.white, 0);
    adHeader.strokes = stroke(C.border); adHeader.strokeWeight = 1;

    const awsLogo2 = frm('AWSLogo', 56, 32, C.white, 6);
    awsLogo2.strokes = stroke(C.border); awsLogo2.strokeWeight = 1;
    const awsT2 = txt('aws', 11, 'Bold', C.warn); awsT2.x = 14; awsT2.y = 9;
    awsLogo2.appendChild(awsT2);
    awsLogo2.x = 20; awsLogo2.y = 24;
    adHeader.appendChild(awsLogo2);

    const adTitle = txt('AT&T NetBond® Advanced Max · Maximum Resiliency · AWS Direct Connect', 13, 'Semi Bold', C.heading, { w: 460 });
    adTitle.x = 88; adTitle.y = 18;
    adHeader.appendChild(adTitle);
    const adSub = txt('AWS Direct Connect Partner Network', 12, 'Regular', C.bodyLight);
    adSub.x = 88; adSub.y = 50;
    adHeader.appendChild(adSub);
    awsDrawer.appendChild(adHeader);

    // Connections list in drawer
    const connList = frm('ConnList', 520, 760, C.white, 0);
    connList.x = 20; connList.y = 96;

    const mockConns = [
      { metro: 'San Jose, CA',    bw: '1 Gbps',   account: '987654321098', status: 'key-generated' },
      { metro: 'Los Angeles, CA', bw: '500 Mbps', account: '112233445566', status: 'live' },
    ];

    mockConns.forEach((conn, i) => {
      const connRow = frm('Conn/' + conn.metro, 520, 80, i % 2 === 0 ? C.wash : C.white, 8);
      connRow.strokes = stroke(C.border); connRow.strokeWeight = 1;
      connRow.y = i * 96;

      const connMetro = txt(conn.metro, 14, 'Semi Bold', C.heading);
      connMetro.x = 16; connMetro.y = 12;
      connRow.appendChild(connMetro);

      const connBw = txt(conn.bw + ' × 4 paths', 12, 'Regular', C.bodyLight);
      connBw.x = 16; connBw.y = 34;
      connRow.appendChild(connBw);

      const connAcc = txt('Account: ' + conn.account, 11, 'Regular', C.muted);
      connAcc.x = 16; connAcc.y = 52;
      connRow.appendChild(connAcc);

      const statusLabel2 = conn.status === 'live' ? 'Live' : 'Key Generated';
      const statusBg2 = conn.status === 'live' ? C.successLight : C.accent;
      const statusTc2 = conn.status === 'live' ? C.success : C.link;
      const connStatus = badge(statusLabel2, statusBg2, statusTc2, 6);
      connStatus.x = 520 - connStatus.width - 16; connStatus.y = 28;
      connRow.appendChild(connStatus);

      connList.appendChild(connRow);
    });

    awsDrawer.appendChild(connList);

    const adFooter = frm('DrawerFooter', 560, 60, C.white, 0);
    adFooter.y = 900;
    adFooter.strokes = stroke(C.border); adFooter.strokeWeight = 1;
    const addConnBtn = buildButton('Add New Connection', 'primary', 180, 36);
    addConnBtn.x = 560 - 204; addConnBtn.y = 12;
    adFooter.appendChild(addConnBtn);
    awsDrawer.appendChild(adFooter);

    drawerScreen2.appendChild(awsDrawer);
    pg.appendChild(drawerScreen2);

    figma.viewport.scrollAndZoomIntoView([screen, drawerScreen2]);
  }

  // ─── RUN ALL BUILDERS ──────────────────────────────────────────────────

  buildDesignSystemPage();
  buildDashboardPage();
  buildWizardPage();
  buildAWSMaxPage();
  buildLMCCPage();
  buildMarketplacePage();

  // Return to dashboard page and zoom to fit
  const dashPage = figma.root.children.find(p => p.name === '📊 Dashboard');
  if (dashPage) figma.currentPage = dashPage;

  figma.notify('✅ AT&T NetBond Advanced — All flows created!', { timeout: 4000 });
  figma.closePlugin();

})();
