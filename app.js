(function drawPerfumeWheel(global, document) {
  'use strict';

  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const CENTER = Object.freeze({ x: 360, y: 360 });

  const ringDefinitions = [
    {
      groupId: 'base-ring',
      notesKey: 'baseNotes',
      ringType: 'base',
      innerRadius: 250,
      outerRadius: 340,
      colors: ['#eadcbc', '#f0e5ca'],
      direction: 1,
      fullTurns: 4,
      duration: 4200,
    },
    {
      groupId: 'middle-ring',
      notesKey: 'middleNotes',
      ringType: 'middle',
      innerRadius: 165,
      outerRadius: 245,
      colors: ['#d9c8dd', '#e4d5e6'],
      direction: -1,
      fullTurns: 5,
      duration: 3600,
    },
    {
      groupId: 'top-ring',
      notesKey: 'topNotes',
      ringType: 'top',
      innerRadius: 80,
      outerRadius: 160,
      colors: ['#edc5bc', '#f3d2c8'],
      direction: 1,
      fullTurns: 6,
      duration: 3000,
    },
  ];

  const ringRotations = Object.create(null);

  function formatNumber(value) {
    return Number(value.toFixed(6));
  }

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function calculateTargetRotation({
    selectedIndex,
    noteCount,
    currentRotation,
    direction,
    fullTurns,
  }) {
    const anglePerSegment = 360 / noteCount;
    const selectedCenter = (selectedIndex + 0.5) * anglePerSegment;
    const desiredRotation = normalizeAngle(-selectedCenter);
    const currentNormalized = normalizeAngle(currentRotation);
    const finishingDistance =
      direction > 0
        ? normalizeAngle(desiredRotation - currentNormalized)
        : normalizeAngle(currentNormalized - desiredRotation);

    return formatNumber(
      currentRotation +
        direction * (fullTurns * 360 + finishingDistance),
    );
  }

  function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    return {
      x: formatNumber(cx + radius * Math.cos(angleInRadians)),
      y: formatNumber(cy + radius * Math.sin(angleInRadians)),
    };
  }

  function createAnnularSectorPath(
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
  ) {
    const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  }

  function createRing({
    group,
    notes,
    innerRadius,
    outerRadius,
    colors,
    ringType,
  }) {
    group.replaceChildren();
    group.setAttribute('data-inner-radius', innerRadius);
    group.setAttribute('data-outer-radius', outerRadius);

    const anglePerSegment = 360 / notes.length;

    notes.forEach((note, index) => {
      const startAngle = -90 + index * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;
      const segment = document.createElementNS(SVG_NAMESPACE, 'path');

      segment.setAttribute('class', 'segment');
      segment.setAttribute('data-ring', ringType);
      segment.setAttribute('data-index', index);
      segment.setAttribute('data-note-id', note.id);
      segment.setAttribute('data-note', note.name);
      segment.setAttribute('fill', colors[index % colors.length]);
      segment.setAttribute(
        'd',
        createAnnularSectorPath(
          CENTER.x,
          CENTER.y,
          innerRadius,
          outerRadius,
          startAngle,
          endAngle,
        ),
      );

      group.appendChild(segment);
    });
  }

  function renderWheel() {
    const notes = global.PERFUME_NOTES;
    if (!notes) {
      console.error('无法生成轮盘：未找到 PERFUME_NOTES 数据。');
      return;
    }

    for (const definition of ringDefinitions) {
      const group = document.getElementById(definition.groupId);
      if (!group) {
        console.error(`无法生成轮盘：未找到 #${definition.groupId}。`);
        return;
      }

      ringRotations[definition.ringType] = 0;
      group.setAttribute('data-rotation', 0);
      group.style.transform = 'rotate(0deg)';

      createRing({
        group,
        notes: notes[definition.notesKey],
        innerRadius: definition.innerRadius,
        outerRadius: definition.outerRadius,
        colors: definition.colors,
        ringType: definition.ringType,
      });
    }

    const baseCount = document.querySelectorAll(
      '#base-ring path.segment',
    ).length;
    const middleCount = document.querySelectorAll(
      '#middle-ring path.segment',
    ).length;
    const topCount = document.querySelectorAll(
      '#top-ring path.segment',
    ).length;
    const totalCount = baseCount + middleCount + topCount;

    console.log(`后调 segments: ${baseCount}`);
    console.log(`中调 segments: ${middleCount}`);
    console.log(`前调 segments: ${topCount}`);
    console.log(`总计: ${totalCount}`);

    if (
      baseCount !== notes.baseNotes.length ||
      middleCount !== notes.middleNotes.length ||
      topCount !== notes.topNotes.length ||
      totalCount !== 380
    ) {
      console.error('轮盘扇区数量校验失败。');
    }
  }

  function selectRandomNote(notes, random = Math.random) {
    const index = Math.floor(random() * notes.length);
    return {
      index,
      note: notes[index],
    };
  }

  function updateResult(element, selection) {
    element.textContent = selection.note.name;
  }

  function prefersReducedMotion() {
    return (
      typeof global.matchMedia === 'function' &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function animateRing(group, fromRotation, toRotation, duration) {
    group.setAttribute('data-rotation', toRotation);

    if (duration === 0 || typeof group.animate !== 'function') {
      group.style.transform = `rotate(${toRotation}deg)`;
      return Promise.resolve();
    }

    const animation = group.animate(
      [
        { transform: `rotate(${fromRotation}deg)` },
        { transform: `rotate(${toRotation}deg)` },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.16, 0.72, 0.16, 1)',
        fill: 'forwards',
      },
    );

    return animation.finished
      .catch(() => undefined)
      .then(() => {
        group.style.transform = `rotate(${toRotation}deg)`;
        animation.cancel();
      });
  }

  function setupSelection() {
    const notes = global.PERFUME_NOTES;
    const startButton = document.querySelector('.start-button');
    const topResult = document.getElementById('top-result');
    const middleResult = document.getElementById('middle-result');
    const baseResult = document.getElementById('base-result');
    const ringGroups = Object.fromEntries(
      ringDefinitions.map((definition) => [
        definition.ringType,
        document.getElementById(definition.groupId),
      ]),
    );

    if (
      !notes ||
      !Array.isArray(notes.topNotes) ||
      !Array.isArray(notes.middleNotes) ||
      !Array.isArray(notes.baseNotes) ||
      notes.topNotes.length === 0 ||
      notes.middleNotes.length === 0 ||
      notes.baseNotes.length === 0
    ) {
      console.error('无法启用抽取：香料数据不存在或为空。');
      return;
    }

    if (
      !startButton ||
      !topResult ||
      !middleResult ||
      !baseResult ||
      Object.values(ringGroups).some((group) => !group)
    ) {
      console.error('无法启用抽取：页面缺少按钮或结果元素。');
      return;
    }

    let isSpinning = false;

    startButton.addEventListener('click', async () => {
      if (isSpinning) return;

      isSpinning = true;
      startButton.disabled = true;
      startButton.setAttribute('aria-busy', 'true');
      topResult.textContent = '——';
      middleResult.textContent = '——';
      baseResult.textContent = '——';

      const topSelection = selectRandomNote(notes.topNotes);
      const middleSelection = selectRandomNote(notes.middleNotes);
      const baseSelection = selectRandomNote(notes.baseNotes);
      const selections = {
        top: topSelection,
        middle: middleSelection,
        base: baseSelection,
      };
      const reduceMotion = prefersReducedMotion();

      try {
        await Promise.all(
          ringDefinitions.map((definition) => {
            const currentRotation = ringRotations[definition.ringType];
            const targetRotation = calculateTargetRotation({
              selectedIndex: selections[definition.ringType].index,
              noteCount: notes[definition.notesKey].length,
              currentRotation,
              direction: definition.direction,
              fullTurns: reduceMotion ? 0 : definition.fullTurns,
            });

            ringRotations[definition.ringType] = targetRotation;
            return animateRing(
              ringGroups[definition.ringType],
              currentRotation,
              targetRotation,
              reduceMotion ? 0 : definition.duration,
            );
          }),
        );

        updateResult(topResult, topSelection);
        updateResult(middleResult, middleSelection);
        updateResult(baseResult, baseSelection);
      } finally {
        isSpinning = false;
        startButton.disabled = false;
        startButton.removeAttribute('aria-busy');
      }
    });
  }

  renderWheel();
  setupSelection();
})(window, document);
