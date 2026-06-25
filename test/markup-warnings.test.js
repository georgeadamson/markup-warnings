'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

const compiledCss = readProjectFile('assets/dist/css/app.css');

function cssAttrSelectorPattern(selector, attr, value) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (value === '') {
    return new RegExp(`${escapedSelector}\\[${escapedAttr}=(["'])\\1\\]:after`);
  }

  return new RegExp(
    `${escapedSelector}\\[${escapedAttr}=(["'])?${escapedValue}\\1?\\]:after`
  );
}

function assertCompiledRules(expectedRules) {
  for (const [selectorPattern, message] of expectedRules) {
    assert.match(compiledCss, selectorPattern);
    assert.ok(compiledCss.includes(message));
  }
}

test('package metadata exposes the compiled stylesheet for unpkg', () => {
  const pkg = JSON.parse(readProjectFile('package.json'));
  const exposedPath = path.join(rootDir, pkg.unpkg);

  assert.match(pkg.description, /CSS-only development helper/);
  assert.ok(pkg.keywords.includes('accessibility'));
  assert.ok(pkg.keywords.includes('a11y'));
  assert.equal(pkg.style, 'assets/dist/css/app.css');
  assert.equal(pkg.unpkg, 'assets/dist/css/app.css');
  assert.ok(pkg.files.includes('assets/dist/css/app.css'));
  assert.ok(pkg.repository.url.includes('github.com/georgeadamson/markup-warnings'));
  assert.equal(pkg.bugs.url, 'https://github.com/georgeadamson/markup-warnings/issues');
  assert.equal(pkg.homepage, 'https://github.com/georgeadamson/markup-warnings#readme');
  assert.equal(pkg.author, 'George Adamson');
  assert.equal(pkg.engines.node, '>=18');
  assert.ok(fs.existsSync(exposedPath), `${pkg.unpkg} should exist`);
});

test('package scripts use Sass and PostCSS instead of Gulp', () => {
  const pkg = JSON.parse(readProjectFile('package.json'));
  const scriptText = Object.values(pkg.scripts).join(' ');
  const devDependencies = pkg.devDependencies;

  assert.doesNotMatch(scriptText, /\bgulp\b/);
  assert.equal(pkg.main, 'assets/dist/css/app.css');
  assert.match(pkg.scripts['build:css'], /\bsass\b/);
  assert.match(pkg.scripts['build:css'], /\bpostcss\b/);
  assert.ok(!fs.existsSync(path.join(rootDir, 'Gulpfile.js')));
  assert.ok(devDependencies.sass);
  assert.ok(devDependencies.postcss);
  assert.ok(devDependencies.autoprefixer);
  assert.ok(!devDependencies.gulp);
});

test('Sass entrypoint uses every rule group in order', () => {
  const appScss = readProjectFile('assets/scss/app.scss');
  const uses = [...appScss.matchAll(/@use '\.\/([^']+)';/g)].map(
    match => match[1]
  );

  assert.deepEqual(uses, [
    'attr-empty',
    'attr-null',
    'attr-title',
    'aria-role',
    'aria-label',
    'aria-describedby',
    'aria-hidden',
    'aria-idref',
    'aria-native',
    'elem-document',
    'elem-a',
    'elem-iframe',
    'elem-img',
    'elem-input',
    'elem-label',
    'elem-button',
    'elem-table',
    'focus',
    'interaction'
  ]);
});

test('compiled stylesheet keeps the shared warning overlay styles', () => {
  assert.match(compiledCss, /outline\s*:\s*1px dashed #000/);
  assert.match(compiledCss, /position\s*:\s*relative/);
  assert.match(compiledCss, /background\s*:\s*#f6e232/);
  assert.match(compiledCss, /transform\s*:\s*rotate\(-4deg\)/);
  assert.match(compiledCss, /z-index\s*:\s*99999/);
});

test('compiled stylesheet contains core selector warnings', () => {
  const expectedRules = [
    [cssAttrSelectorPattern('a', 'href', ''), '<a> has empty href=""'],
    [cssAttrSelectorPattern('a', 'href', '#'), '<a> has invalid href="#"'],
    [
      /a:empty:not\(\[title\]\):not\(\[aria-label\]\):not\(\[aria-labelledby\]\):after/,
      '<a> has missing text'
    ],
    [/img:not\(\[alt\]\):after/, '<img> missing alt attribute'],
    [
      /img\[alt\]:not\(\[alt=(["'])\1\]\)\[title\]:after/,
      '<img> should not have both alt & title attributes'
    ],
    [/label:empty:after/, '<label> cannot be empty'],
    [
      /button:empty:not\(\[aria-label\]\):not\(\[aria-labelledby\]\):after/,
      '<button> without aria-label or aria-labelledby must contain text'
    ],
    [cssAttrSelectorPattern('*', 'title', ''), 'Tag has empty title attribute'],
    [
      /div\[aria-label\]:not\(\[role\]\):after/,
      "Don't use aria-label on <div> without a role"
    ]
  ];

  assertCompiledRules(expectedRules);
});

test('compiled stylesheet contains document, embedded content, and table warnings', () => {
  assertCompiledRules([
    [/html:not\(\[lang\]\) body:after/, '<html> missing lang attribute'],
    [
      /html\[lang\*=_\] body:after/,
      'Use BCP 47 language tags with hyphens, not underscores'
    ],
    [/iframe:not\(\[title\]\):after/, '<iframe> missing title attribute'],
    [
      /iframe\[title=(["'])\1\]:after/,
      '<iframe> title attribute must not be empty'
    ],
    [
      /table:not\(:has\(th\)\):not\(\[role=presentation\]\):not\(\[role=none\]\):after/,
      '<table> has no header cells'
    ],
    [/caption:empty:after/, '<caption> cannot be empty'],
    [
      /th\[scope\]:not\(\[scope=row\]\):not\(\[scope=col\]\):not\(\[scope=rowgroup\]\):not\(\[scope=colgroup\]\):after/,
      '<th> has an invalid scope attribute'
    ],
    [
      /td\[headers=(["'])\1\]:after/,
      'Table headers attribute must not be empty'
    ]
  ]);
});

test('compiled stylesheet contains additional ARIA and focus warnings', () => {
  assertCompiledRules([
    [/\[aria-label=(["'])\1\]:after/, 'Attribute aria-label must not be empty'],
    [
      /\[aria-labelledby\^="#"\]:after/,
      'aria-labelledby should reference IDs without # or . prefixes'
    ],
    [
      /html\[aria-hidden=true\]:after/,
      'Do not hide the page from assistive technology'
    ],
    [
      /button\[aria-hidden=true\]:after/,
      'Focusable elements should not use aria-hidden="true"'
    ],
    [
      /\[aria-hidden=true\] button:after/,
      'Focusable content inside aria-hidden="true" is hidden from assistive technology'
    ],
    [
      /\[disabled\]\[aria-disabled\]:after/,
      'Use the native [disabled] attribute without aria-disabled'
    ],
    [/\[role=command\]:after/, "role='command' is abstract or deprecated"],
    [/\[role\*=A\]:after/, 'ARIA role values should be lowercase'],
    [
      /\[role=button\]:not\(a\[href\]\):not\(button\):not\(input\):not\(select\):not\(textarea\):not\(summary\):not\(\[tabindex\]\):after/,
      "Custom role='button' should be keyboard focusable"
    ],
    [
      /\[tabindex\]:not\(\[tabindex="0"\]\):not\(\[tabindex="-1"\]\):after/,
      'Avoid positive or invalid tabindex values'
    ]
  ]);
});

test('compiled stylesheet contains additional link, button, and input warnings', () => {
  assertCompiledRules([
    [
      /a:not\(\[href\]\):not\(\[name\]\):after/,
      '<a> without href is not keyboard focusable by default'
    ],
    [
      /a\[href\^="javascript:"\]:after/,
      '<a> with javascript: href should be a button'
    ],
    [
      /a:has\(>img\[alt=(["'])\1\]:only-child\):not\(\[aria-label\]\):not\(\[aria-labelledby\]\):after/,
      '<a> with image-only content needs accessible link text'
    ],
    [
      /button:has\(>svg:only-child\):not\(\[aria-label\]\):not\(\[aria-labelledby\]\):after/,
      '<button> with icon-only content needs aria-label or aria-labelledby'
    ],
    [
      /input\[type=image\]:not\(\[alt\]\):after/,
      '<input type="image"> missing alt attribute'
    ],
    [
      /input\[type=button\]:not\(\[value\]\):not\(\[aria-label\]\):not\(\[aria-labelledby\]\):after/,
      '<input type="button"> needs a value, aria-label, or aria-labelledby'
    ],
    [
      /\[onclick\]:not\(a\[href\]\):not\(button\):not\(input\):not\(select\):not\(textarea\):not\(summary\):not\(\[role\]\):not\(\[tabindex\]\):after/,
      'Elements with onclick should use a semantic control, role, or tabindex'
    ]
  ]);
});

test('compiled stylesheet appends WCAG references where rules map cleanly', () => {
  const expectedMessages = [
    '<img> missing alt attribute (WCAG 1.1.1)',
    '<table> has no header cells (WCAG 1.3.1)',
    '<a> without href is not keyboard focusable by default (WCAG 2.1.1)',
    'Avoid positive or invalid tabindex values (WCAG 2.4.3)',
    '<a> has missing text (WCAG 2.4.4)',
    '<html> missing lang attribute (WCAG 3.1.1)',
    'Use BCP 47 language tags with hyphens, not underscores (WCAG 3.1.2)',
    '<label> cannot be empty (WCAG 3.3.2)',
    'Attribute aria-label must not be empty (WCAG 4.1.2)',
    '<button> without aria-label or aria-labelledby must contain text (WCAG 4.1.2)'
  ];

  for (const message of expectedMessages) {
    assert.ok(
      compiledCss.includes(message),
      `Expected WCAG message: ${message}`
    );
  }

  assert.ok(
    compiledCss.includes('Avoid title attribute because of inconsistent UX"'),
    'Heuristic-only warnings should not receive a WCAG reference'
  );
});

test('compiled stylesheet contains generated invalid attribute warnings', () => {
  const attrs = [
    'title',
    'alt',
    'href',
    'aria-label',
    'aria-labelledby',
    'aria-describedby'
  ];
  const values = ['null', 'undefined', 'true', 'false', 'NaN', '0'];

  for (const attr of attrs) {
    for (const value of values) {
      assert.match(compiledCss, cssAttrSelectorPattern('*', attr, value));
      assert.ok(
        compiledCss.includes(`Attribute ${attr}='${value}' is invalid`),
        `Expected generated message for ${attr}=${value}`
      );
    }
  }
});
