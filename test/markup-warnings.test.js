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
    'attr-null',
    'attr-title',
    'aria-role',
    'aria-label',
    'aria-describedby',
    'elem-a',
    'elem-img',
    'elem-label',
    'elem-button'
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

  for (const [selectorPattern, message] of expectedRules) {
    assert.match(compiledCss, selectorPattern);
    assert.ok(compiledCss.includes(message));
  }
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
