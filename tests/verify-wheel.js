const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

class FakeElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toLowerCase();
    this.id = id;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = '';
    this.style = {};
    this.disabled = false;
    this.animations = [];
    this.open = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    return Promise.all(
      (this.listeners.get('click') || []).map((listener) =>
        listener({ type: 'click', currentTarget: this }),
      ),
    );
  }

  animate(keyframes, options) {
    let resolveFinished;
    let finished = false;
    const animation = {
      keyframes,
      options,
      finished: new Promise((resolve) => {
        resolveFinished = resolve;
      }),
      finish() {
        if (finished) return;
        finished = true;
        resolveFinished();
      },
      cancel() {},
    };
    this.animations.push(animation);
    return animation;
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }

  querySelectorAll(selector) {
    const [tagName, className] = selector.split('.');
    const matches = [];

    const visit = (node) => {
      const classes = (node.getAttribute('class') || '').split(/\s+/);
      if (
        node.tagName === tagName.toLowerCase() &&
        (!className || classes.includes(className))
      ) {
        matches.push(node);
      }
      node.children.forEach(visit);
    };

    this.children.forEach(visit);
    return matches;
  }
}

function buildHarness(randomValues = [], { reducedMotion = false } = {}) {
  const startButton = new FakeElement('button');
  startButton.setAttribute('class', 'start-button');
  const topResult = new FakeElement('dd', 'top-result');
  const middleResult = new FakeElement('dd', 'middle-result');
  const baseResult = new FakeElement('dd', 'base-result');
  const feedbackOneButton = new FakeElement('button', 'feedback-1-button');
  feedbackOneButton.setAttribute(
    'data-feedback-src',
    'assets/feedback-group-1.webp',
  );
  feedbackOneButton.setAttribute('data-feedback-alt', 'OC调香师产品体验群1二维码');
  const feedbackTwoButton = new FakeElement('button', 'feedback-2-button');
  feedbackTwoButton.setAttribute(
    'data-feedback-src',
    'assets/feedback-group-2.webp',
  );
  feedbackTwoButton.setAttribute('data-feedback-alt', 'OC调香师产品体验群2二维码');
  const feedbackDialog = new FakeElement('dialog', 'feedback-dialog');
  const feedbackDialogImage = new FakeElement('img', 'feedback-dialog-image');
  const feedbackDialogClose = new FakeElement('button', 'feedback-dialog-close');
  topResult.textContent = '——';
  middleResult.textContent = '——';
  baseResult.textContent = '——';

  const elements = new Map([
    ['base-ring', new FakeElement('g', 'base-ring')],
    ['middle-ring', new FakeElement('g', 'middle-ring')],
    ['top-ring', new FakeElement('g', 'top-ring')],
    ['start-button', startButton],
    ['top-result', topResult],
    ['middle-result', middleResult],
    ['base-result', baseResult],
    ['feedback-1-button', feedbackOneButton],
    ['feedback-2-button', feedbackTwoButton],
    ['feedback-dialog', feedbackDialog],
    ['feedback-dialog-image', feedbackDialogImage],
    ['feedback-dialog-close', feedbackDialogClose],
  ]);
  const logs = [];
  const errors = [];
  let randomIndex = 0;
  const fakeMath = Object.create(Math);
  fakeMath.random = () =>
    randomValues[randomIndex++] ?? Math.random();

  const document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElementNS(_namespace, tagName) {
      return new FakeElement(tagName);
    },
    querySelector(selector) {
      if (!selector.startsWith('.')) return null;
      const className = selector.slice(1);
      return (
        [...elements.values()].find((element) =>
          (element.getAttribute('class') || '')
            .split(/\s+/)
            .includes(className),
        ) || null
      );
    },
    querySelectorAll(selector) {
      const match = selector.match(/^#([\w-]+)\s+(.+)$/);
      if (!match) return [];
      return elements.get(match[1])?.querySelectorAll(match[2]) || [];
    },
  };

  const window = {
    matchMedia() {
      return { matches: reducedMotion };
    },
  };
  const context = vm.createContext({
    window,
    document,
    console: {
      log: (...values) => logs.push(values.join(' ')),
      error: (...values) => errors.push(values.join(' ')),
    },
    Object,
    Math: fakeMath,
  });

  return { context, window, document, elements, logs, errors };
}

function runScript(context, filename) {
  const source = fs.readFileSync(path.join(projectRoot, filename), 'utf8');
  vm.runInContext(source, context, { filename });
}

test('指定 OC 香调词库驱动三层轮盘生成 380 个独立扇区', () => {
  const requiredFiles = ['index.html', 'styles.css', 'data.js', 'app.js'];
  requiredFiles.forEach((filename) => {
    assert.ok(
      fs.existsSync(path.join(projectRoot, filename)),
      `${filename} must exist`,
    );
  });

  const harness = buildHarness();
  runScript(harness.context, 'data.js');

  const notes = harness.window.PERFUME_NOTES;
  assert.ok(notes, 'data.js must expose window.PERFUME_NOTES');
  assert.equal(notes.topNotes.length, 100);
  assert.equal(notes.middleNotes.length, 120);
  assert.equal(notes.baseNotes.length, 160);
  assert.ok(Object.isFrozen(notes));
  assert.ok(Object.isFrozen(notes.topNotes));
  assert.ok(Object.isFrozen(notes.middleNotes));
  assert.ok(Object.isFrozen(notes.baseNotes));

  const allNotes = [
    ...notes.topNotes,
    ...notes.middleNotes,
    ...notes.baseNotes,
  ];
  assert.equal(allNotes.length, 380);
  assert.equal(new Set(allNotes.map((note) => note.id)).size, 380);
  assert.equal(
    new Set(allNotes.map((note) => note.name)).size,
    380,
    'all 380 note names must be globally unique',
  );
  assert.ok(
    allNotes.every(
      (note) =>
        Object.keys(note).sort().join(',') === 'id,name' && note.name.length > 0,
    ),
  );
  assert.ok(
    allNotes.every((note) => !/^(前调|中调|后调)\d+$/.test(note.name)),
    'placeholder note names are forbidden',
  );
  assert.equal(new Set(notes.topNotes.map((note) => note.name)).size, 100);
  assert.equal(new Set(notes.middleNotes.map((note) => note.name)).size, 120);
  assert.equal(new Set(notes.baseNotes.map((note) => note.name)).size, 160);
  assert.equal(notes.topNotes[0].name, '佛手柑');
  assert.deepEqual(
    Array.from(notes.topNotes.slice(93, 100), (note) => note.name),
    ['香蜂草', '牛膝草', '苦橙叶', '香桃木', '柠檬桉', '香茅', '马郁兰'],
  );
  assert.equal(notes.middleNotes[0].name, '大马士革玫瑰');
  assert.deepEqual(
    Array.from(notes.middleNotes.slice(110, 120), (note) => note.name),
    ['橙花醇', '丁香酚', '康乃馨', '菩提花', '石竹', '黄兰', '鸢尾', '茉莉酮', '玫瑰醚', '金雀花'],
  );
  assert.equal(notes.baseNotes[0].name, '檀香木');
  assert.equal(notes.baseNotes[159].name, '快乐鼠尾草');
  const forbiddenConceptNames = [
    '新割草', '海盐', '海风', '露水', '水汽',
    '竹香', '青藤', '八角花香', '蜂巢', '米香', '糯米', '燕麦', '麦芽', '烤面包',
    '玫瑰花瓣', '奶油', '牛奶', '香草奶油', '椰奶', '椰肉',
    '糖蜜', '棉花糖', '焦糖布丁', '炼乳', '奶糖',
    '梨花蜜', '苹果蜜', '桂花蜜', '橙花蜜', '玫瑰蜜', '茉莉蜜',
    '白桃茶', '荔枝茶', '无花果茶', '莓果茶', '雨水', '竹林',
    '漂流木', '干燥木香', '面包皮', '饼干', '烤谷物', '爆米花',
    '湿土', '雨后泥土', '湿木', '森林地表', '新皮革', '旧皮革',
    '羊绒', '羊毛', '亚麻', '棉布', '丝绸', '纸张', '旧书页', '墨水', '铅笔木',
    '烛蜡', '寺庙香', '木烟', '壁炉烟', '灰烬', '焚木', '燧石', '湿石',
    '海盐结晶', '矿物盐', '暖石', '琥珀树脂', '香草木', '檀香奶油',
    '雪松烟香', '苔藓木', '奶香木', '蜜香木', '茶木', '烟熏香草', '柔和皮革',
  ];
  const remainingConceptNames = allNotes
    .map((note) => note.name)
    .filter((name) => forbiddenConceptNames.includes(name));
  assert.deepEqual(remainingConceptNames, []);
  assert.ok(notes.middleNotes.some((note) => note.name === '常春藤叶'));
  assert.ok(notes.baseNotes.some((note) => note.name === '橡木苔原精'));

  runScript(harness.context, 'app.js');

  const expectedRings = [
    ['base-ring', 160, '250', '340', 'base'],
    ['middle-ring', 120, '165', '245', 'middle'],
    ['top-ring', 100, '80', '160', 'top'],
  ];

  expectedRings.forEach(
    ([groupId, expectedCount, innerRadius, outerRadius, ringType]) => {
      const group = harness.elements.get(groupId);
      const paths = group.querySelectorAll('path.segment');
      assert.equal(paths.length, expectedCount);
      assert.equal(group.getAttribute('data-inner-radius'), innerRadius);
      assert.equal(group.getAttribute('data-outer-radius'), outerRadius);
      assert.equal(new Set(paths.map((item) => item.getAttribute('d'))).size, expectedCount);
      paths.forEach((segment, index) => {
        assert.equal(segment.getAttribute('data-ring'), ringType);
        assert.equal(segment.getAttribute('data-index'), String(index));
        assert.ok(segment.getAttribute('data-note-id'));
        assert.match(segment.getAttribute('d'), /^M /);
        assert.doesNotMatch(segment.getAttribute('d'), /NaN|undefined/);
      });
    },
  );

  assert.deepEqual(harness.errors, []);
  assert.deepEqual(harness.logs, [
    '后调 segments: 160',
    '中调 segments: 120',
    '前调 segments: 100',
    '总计: 380',
  ]);
});

test('指定的十个后调名称去掉原精后缀', () => {
  const harness = buildHarness();
  runScript(harness.context, 'data.js');

  assert.deepEqual(
    Array.from(
      harness.window.PERFUME_NOTES.baseNotes.slice(150),
      (note) => note.name,
    ),
    [
      '劳丹脂',
      '岩蔷薇',
      '吐鲁香脂',
      '秘鲁香脂',
      '广藿香',
      '爪哇香根草',
      '波旁香根草',
      '甘松',
      '安息香',
      '快乐鼠尾草',
    ],
  );
});

test('固定长针覆盖圆环并伸入前调区域中部', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const pointerElement = html.match(
    /<path\b[^>]*class="wheel-pointer"[^>]*>/s,
  )?.[0];

  assert.ok(pointerElement, 'wheel pointer must be an SVG path');

  const pathData = pointerElement.match(/\bd="([^"]+)"/)?.[1];
  assert.ok(pathData, 'wheel pointer must contain path geometry');

  const coordinates = pathData.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const yCoordinates = coordinates.filter((_value, index) => index % 2 === 1);
  const needleTipY = Math.max(...yCoordinates);

  assert.ok(
    needleTipY >= 235 && needleTipY <= 245,
    `needle tip must reach y≈240, received y=${needleTipY}`,
  );
  assert.ok(
    html.indexOf(pointerElement) > html.indexOf('id="top-ring"'),
    'pointer must be painted after all ring groups so the needle stays visible',
  );
});

function assertSelectedSegmentAtPointer(rotation, selectedIndex, noteCount) {
  const anglePerSegment = 360 / noteCount;
  const selectedCenterAfterRotation =
    rotation + (selectedIndex + 0.5) * anglePerSegment;
  const normalized =
    ((selectedCenterAfterRotation % 360) + 360) % 360;
  assert.ok(
    Math.min(normalized, 360 - normalized) < 1e-6,
    `selected segment must stop at 12 o'clock, received ${normalized}°`,
  );
}

test('点击开始后锁定按钮，三圈独立旋转并在停稳后揭晓结果', async () => {
  const harness = buildHarness([
    0,
    0.5,
    0.999999,
    0.999999,
    0,
    0.5,
  ]);
  runScript(harness.context, 'data.js');

  const notes = harness.window.PERFUME_NOTES;
  const originalData = JSON.stringify(notes);
  runScript(harness.context, 'app.js');

  const startButton = harness.elements.get('start-button');
  const topResult = harness.elements.get('top-result');
  const middleResult = harness.elements.get('middle-result');
  const baseResult = harness.elements.get('base-result');

  assert.equal(topResult.textContent, '——');
  assert.equal(middleResult.textContent, '——');
  assert.equal(baseResult.textContent, '——');

  const firstSpin = startButton.click();

  assert.equal(startButton.disabled, true);
  assert.equal(startButton.getAttribute('aria-busy'), 'true');
  assert.equal(topResult.textContent, '——');
  assert.equal(middleResult.textContent, '——');
  assert.equal(baseResult.textContent, '——');

  const baseRing = harness.elements.get('base-ring');
  const middleRing = harness.elements.get('middle-ring');
  const topRing = harness.elements.get('top-ring');
  assert.equal(baseRing.animations.length, 1);
  assert.equal(middleRing.animations.length, 1);
  assert.equal(topRing.animations.length, 1);
  assert.equal(baseRing.animations[0].options.duration, 4200);
  assert.equal(middleRing.animations[0].options.duration, 3600);
  assert.equal(topRing.animations[0].options.duration, 3000);

  const baseRotation = Number(baseRing.getAttribute('data-rotation'));
  const middleRotation = Number(middleRing.getAttribute('data-rotation'));
  const topRotation = Number(topRing.getAttribute('data-rotation'));
  assert.ok(baseRotation > 0);
  assert.ok(middleRotation < 0);
  assert.ok(topRotation > 0);
  assertSelectedSegmentAtPointer(baseRotation, 159, 160);
  assertSelectedSegmentAtPointer(middleRotation, 60, 120);
  assertSelectedSegmentAtPointer(topRotation, 0, 100);

  await startButton.click();
  assert.equal(baseRing.animations.length, 1);
  assert.equal(middleRing.animations.length, 1);
  assert.equal(topRing.animations.length, 1);

  baseRing.animations[0].finish();
  middleRing.animations[0].finish();
  topRing.animations[0].finish();
  await firstSpin;

  assert.equal(topResult.textContent, notes.topNotes[0].name);
  assert.equal(middleResult.textContent, notes.middleNotes[60].name);
  assert.equal(baseResult.textContent, notes.baseNotes[159].name);
  assert.equal(startButton.disabled, false);
  assert.equal(startButton.getAttribute('aria-busy'), null);
  assert.equal(baseRing.style.transform, `rotate(${baseRotation}deg)`);
  assert.equal(middleRing.style.transform, `rotate(${middleRotation}deg)`);
  assert.equal(topRing.style.transform, `rotate(${topRotation}deg)`);
  assert.equal(
    harness.document.querySelectorAll('#base-ring path.segment').length,
    160,
  );
  assert.equal(
    harness.document.querySelectorAll('#middle-ring path.segment').length,
    120,
  );
  assert.equal(
    harness.document.querySelectorAll('#top-ring path.segment').length,
    100,
  );

  const secondSpin = startButton.click();
  assert.equal(topResult.textContent, '——');
  assert.equal(middleResult.textContent, '——');
  assert.equal(baseResult.textContent, '——');
  baseRing.animations[1].finish();
  middleRing.animations[1].finish();
  topRing.animations[1].finish();
  await secondSpin;

  assert.equal(topResult.textContent, notes.topNotes[99].name);
  assert.equal(middleResult.textContent, notes.middleNotes[0].name);
  assert.equal(baseResult.textContent, notes.baseNotes[80].name);
  assert.equal(JSON.stringify(notes), originalData);
  assert.deepEqual(harness.errors, []);
});

test('减少动态效果时直接停靠并立即揭晓结果', async () => {
  const harness = buildHarness([0, 0, 0], { reducedMotion: true });
  runScript(harness.context, 'data.js');
  runScript(harness.context, 'app.js');

  const notes = harness.window.PERFUME_NOTES;
  const startButton = harness.elements.get('start-button');
  await startButton.click();

  assert.equal(harness.elements.get('base-ring').animations.length, 0);
  assert.equal(harness.elements.get('middle-ring').animations.length, 0);
  assert.equal(harness.elements.get('top-ring').animations.length, 0);
  for (const [groupId, noteCount] of [
    ['base-ring', 160],
    ['middle-ring', 120],
    ['top-ring', 100],
  ]) {
    const group = harness.elements.get(groupId);
    const rotation = Number(group.getAttribute('data-rotation'));
    assertSelectedSegmentAtPointer(rotation, 0, noteCount);
    assert.equal(group.style.transform, `rotate(${rotation}deg)`);
  }
  assert.equal(harness.elements.get('top-result').textContent, notes.topNotes[0].name);
  assert.equal(harness.elements.get('middle-result').textContent, notes.middleNotes[0].name);
  assert.equal(harness.elements.get('base-result').textContent, notes.baseNotes[0].name);
  assert.equal(startButton.disabled, false);
});

test('页面底部提供作者入口、两个用户反馈二维码和关联项目链接', async () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const expectedLinks = [
    'https://www.xiaohongshu.com/user/profile/6151d3d2000000000202785e',
    'https://www.bilibili.com/video/BV1FJNq6XE7u/?spm_id_from=333.1387.upload.video_card.click&amp;vd_source=4571484f37ed879be3f8169716e9d649',
    'https://oc-neon-six.vercel.app/',
    'https://oc-gemstone-dossier.vercel.app/',
  ];

  for (const href of expectedLinks) {
    assert.ok(html.includes(`href="${href}"`), `missing link: ${href}`);
  }

  for (const label of [
    '作者：@逃逸平庸的重力，小红书ID：6368607025',
    'B站UID：3546791257574032',
    '用户反馈1',
    '用户反馈2',
  ]) {
    assert.ok(html.includes(label), `missing footer label: ${label}`);
  }

  assert.match(
    html,
    /id="feedback-dialog-image"\s+class="feedback-dialog-image"/,
    'feedback image must receive the responsive dialog image class',
  );

  for (const filename of [
    'assets/feedback-group-1.webp',
    'assets/feedback-group-2.webp',
  ]) {
    const imagePath = path.join(projectRoot, filename);
    assert.ok(fs.existsSync(imagePath), `${filename} must exist`);
    assert.ok(
      fs.statSync(imagePath).size < 250_000,
      `${filename} should stay below 250 KB for fast loading`,
    );
  }

  const harness = buildHarness();
  runScript(harness.context, 'data.js');
  runScript(harness.context, 'app.js');

  const dialog = harness.elements.get('feedback-dialog');
  const dialogImage = harness.elements.get('feedback-dialog-image');

  await harness.elements.get('feedback-1-button').click();
  assert.equal(dialog.open, true);
  assert.equal(dialogImage.getAttribute('src'), 'assets/feedback-group-1.webp');
  assert.equal(dialogImage.getAttribute('alt'), 'OC调香师产品体验群1二维码');

  await harness.elements.get('feedback-dialog-close').click();
  assert.equal(dialog.open, false);

  await harness.elements.get('feedback-2-button').click();
  assert.equal(dialog.open, true);
  assert.equal(dialogImage.getAttribute('src'), 'assets/feedback-group-2.webp');
  assert.equal(dialogImage.getAttribute('alt'), 'OC调香师产品体验群2二维码');
});
