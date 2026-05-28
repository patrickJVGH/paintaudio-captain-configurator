import type { PedalConfig, KeyConfig, KeyState, LedColor, LedMode, GlobalConfig, PageConfig, LineMapping } from '@/types/midi';

function parseLedColor(value: string): LedColor {
  const hexPattern = /\[?(0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6})\]?/g;
  const matches = [...value.matchAll(hexPattern)].map(m => m[1].replace('#', '0x'));
  return {
    seg1: matches[0] || '0x000000',
    seg2: matches[1] || '0x000000',
    seg3: matches[2] || '0x000000',
  };
}

function extractBracketValue(value: string): string {
  const m = value.match(/\[([^\]]*)\]/);
  return m ? m[1] : value.trim();
}

function normalizeCommandValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  // We export empty commands as [] so the file keeps the field,
  // but the UI should treat it as an empty command.
  if (/^\[\s*\]$/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

export function parsePage1(text: string): PedalConfig {
  const lines = text.split('\n');
  const originalLines = [...lines];
  const lineMap: LineMapping[] = [];
  const global: GlobalConfig = {};
  const page: PageConfig = {};
  const keys: KeyConfig[] = Array.from({ length: 6 }, (_, i) => ({
    index: i,
    keytimes: 1,
    ledmode: 'normal' as LedMode,
    states: [createEmptyState()],
    existingFields: new Set<string>(),
  }));

  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Section header
    const sectionMatch = line.match(/^\[(\w+)\]\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) continue;

    // Key=value
    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const [, key, rawValue] = kvMatch;

    lineMap.push({ lineIndex: i, section: currentSection, field: key });

    if (currentSection === 'globalsetup') {
      global[key] = extractBracketValue(rawValue);
    } else if (currentSection === 'PAGE') {
      page[key] = extractBracketValue(rawValue);
    } else {
      const keyMatch = currentSection.match(/^key(\d)$/);
      if (keyMatch) {
        const keyIdx = parseInt(keyMatch[1]);
        if (keyIdx >= 0 && keyIdx < 6) {
          const keyConfig = keys[keyIdx];
          keyConfig.existingFields.add(key);

          if (key === 'keytimes') {
            keyConfig.keytimes = parseInt(extractBracketValue(rawValue)) || 1;
          } else if (key === 'ledmode') {
            keyConfig.ledmode = extractBracketValue(rawValue) as LedMode;
          } else if (key.startsWith('ledcolor')) {
            const stateNum = parseInt(key.replace('ledcolor', '')) - 1;
            while (keyConfig.states.length <= stateNum) {
              keyConfig.states.push(createEmptyState());
            }
            keyConfig.states[stateNum].ledColor = parseLedColor(rawValue);
          } else if (key.startsWith('short_dw')) {
            const stateNum = parseInt(key.replace('short_dw', '')) - 1;
            while (keyConfig.states.length <= stateNum) {
              keyConfig.states.push(createEmptyState());
            }
            keyConfig.states[stateNum].shortDw = normalizeCommandValue(rawValue);
          } else if (key.startsWith('short_up')) {
            const stateNum = parseInt(key.replace('short_up', '')) - 1;
            while (keyConfig.states.length <= stateNum) {
              keyConfig.states.push(createEmptyState());
            }
            keyConfig.states[stateNum].shortUp = normalizeCommandValue(rawValue);
          } else if (key.match(/^long\d+$/) && !key.startsWith('long_up')) {
            const stateNum = parseInt(key.replace('long', '')) - 1;
            while (keyConfig.states.length <= stateNum) {
              keyConfig.states.push(createEmptyState());
            }
            keyConfig.states[stateNum].longDw = normalizeCommandValue(rawValue);
          } else if (key.startsWith('long_up')) {
            const stateNum = parseInt(key.replace('long_up', '')) - 1;
            while (keyConfig.states.length <= stateNum) {
              keyConfig.states.push(createEmptyState());
            }
            keyConfig.states[stateNum].longUp = normalizeCommandValue(rawValue);
          }
        }
      }
    }
  }

  // Ensure each key has at least keytimes states
  keys.forEach(k => {
    while (k.states.length < k.keytimes) {
      k.states.push(createEmptyState());
    }
  });

  return { originalLines, global, page, keys, lineMap };
}

function createEmptyState(): KeyState {
  return {
    ledColor: { seg1: '0x000000', seg2: '0x000000', seg3: '0x000000' },
    shortDw: '',
    shortUp: '',
    longDw: '',
    longUp: '',
  };
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace('0x', '').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbInputToHex(input: string): string {
  // Convert #RRGGBB or 0xRRGGBB to 0xRRGGBB
  if (input.startsWith('#')) return '0x' + input.slice(1).toUpperCase();
  if (input.startsWith('0x')) return '0x' + input.slice(2).toUpperCase();
  return '0x000000';
}

export function hexToInput(hex: string): string {
  // Convert 0xRRGGBB to #rrggbb for color input
  return '#' + hex.replace('0x', '').toLowerCase();
}

export function parseMidiCommand(raw: string): string {
  // Try to parse [ch][CC|PC|NT][-params][value]
  const m = raw.match(/\[(\d+)\]\[?(CC|PC|NT)\]?\[?(\d+)?\]?\[?(\d+)?\]?/i);
  if (m) {
    const ch = m[1];
    const type = m[2].toUpperCase();
    const param = m[3] || '?';
    const val = m[4] || '?';
    if (type === 'CC') return `CC ch${ch} #${param} val=${val}`;
    if (type === 'PC') return `PC ch${ch} #${param}`;
    if (type === 'NT') return `Note ch${ch} #${param} vel=${val}`;
  }
  return raw || '(vazio)';
}

export function exportPage1(config: PedalConfig): string {
  const lines = [...config.originalLines];
  const lineEndingSuffix = lines.some((line) => line.endsWith('\r')) ? '\r' : '';

  for (const mapping of config.lineMap) {
    const { lineIndex, section, field } = mapping;
    const originalLine = lines[lineIndex];

    if (section === 'globalsetup' && config.global[field] !== undefined) {
      lines[lineIndex] = replaceValue(originalLine, field, `[${config.global[field]}]`);
    } else if (section === 'PAGE' && config.page[field] !== undefined) {
      lines[lineIndex] = replaceValue(originalLine, field, `[${config.page[field]}]`);
    } else {
      const keyMatch = section.match(/^key(\d)$/);
      if (keyMatch) {
        const keyIdx = parseInt(keyMatch[1]);
        const keyConfig = config.keys[keyIdx];
        if (!keyConfig) continue;

        if (field === 'keytimes') {
          lines[lineIndex] = replaceValue(originalLine, field, `[${keyConfig.keytimes}]`);
        } else if (field === 'ledmode') {
          lines[lineIndex] = replaceValue(originalLine, field, `[${keyConfig.ledmode}]`);
        } else if (field.startsWith('ledcolor')) {
          const stateNum = parseInt(field.replace('ledcolor', '')) - 1;
          const state = keyConfig.states[stateNum];
          if (state) {
            const { seg1, seg2, seg3 } = state.ledColor;
            lines[lineIndex] = replaceValue(originalLine, field, `[${seg1}][${seg2}][${seg3}]`);
          }
        } else if (field.startsWith('short_dw')) {
          const stateNum = parseInt(field.replace('short_dw', '')) - 1;
          const state = keyConfig.states[stateNum];
          if (state) lines[lineIndex] = replaceValue(originalLine, field, formatCommandForExport(state.shortDw));
        } else if (field.startsWith('short_up')) {
          const stateNum = parseInt(field.replace('short_up', '')) - 1;
          const state = keyConfig.states[stateNum];
          if (state) lines[lineIndex] = replaceValue(originalLine, field, formatCommandForExport(state.shortUp));
        } else if (field.match(/^long\d+$/) && !field.startsWith('long_up')) {
          const stateNum = parseInt(field.replace('long', '')) - 1;
          const state = keyConfig.states[stateNum];
          if (state) lines[lineIndex] = replaceValue(originalLine, field, formatCommandForExport(state.longDw));
        } else if (field.startsWith('long_up')) {
          const stateNum = parseInt(field.replace('long_up', '')) - 1;
          const state = keyConfig.states[stateNum];
          if (state) lines[lineIndex] = replaceValue(originalLine, field, formatCommandForExport(state.longUp));
        }
      }
    }
  }

  insertMissingKeyStateFields(lines, config, lineEndingSuffix);

  return lines.join('\n');
}

export function cleanupPage1Text(text: string): string {
  const usesCrlf = text.includes('\r\n');
  const lineBreak = usesCrlf ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const cleaned: string[] = [];

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[(\w+)\]\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
    }

    const isKeySection = /^key\d$/.test(currentSection);
    const isEmptyCommandPlaceholder =
      /^\s*(short_dw\d+|short_up\d+|long\d+|long_up\d+)\s*=\s*\[\s*\]\s*$/i.test(trimmed);

    if (isKeySection && isEmptyCommandPlaceholder) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join(lineBreak);
}

function formatCommandForExport(value: string): string {
  const trimmed = (value || '').trim();
  return trimmed || '[]';
}

function insertMissingKeyStateFields(lines: string[], config: PedalConfig, lineEndingSuffix: string): void {
  const insertions: Array<{ index: number; lines: string[] }> = [];

  for (let keyIdx = 0; keyIdx < config.keys.length; keyIdx++) {
    const keyConfig = config.keys[keyIdx];
    const sectionName = `key${keyIdx}`;
    const sectionRange = findSectionInsertIndex(config.originalLines, sectionName);
    if (!sectionRange) {
      continue;
    }

    const existingFields = new Set(
      config.lineMap.filter((mapping) => mapping.section === sectionName).map((mapping) => mapping.field),
    );
    const missingLines: string[] = [];

    if (!existingFields.has('keytimes')) {
      missingLines.push(`keytimes = [${keyConfig.keytimes}]${lineEndingSuffix}`);
    }

    if (!existingFields.has('ledmode')) {
      missingLines.push(`ledmode = [${keyConfig.ledmode}]${lineEndingSuffix}`);
    }

    for (let stateIdx = 0; stateIdx < keyConfig.keytimes; stateIdx++) {
      const stateNum = stateIdx + 1;
      const state = keyConfig.states[stateIdx] || createEmptyState();
      const ledField = `ledcolor${stateNum}`;
      const shortDwField = `short_dw${stateNum}`;
      const shortUpField = `short_up${stateNum}`;
      const longDwField = `long${stateNum}`;
      const longUpField = `long_up${stateNum}`;

      if (!existingFields.has(ledField)) {
        missingLines.push(
          `${ledField} = [${state.ledColor.seg1}][${state.ledColor.seg2}][${state.ledColor.seg3}]${lineEndingSuffix}`,
        );
      }
      if (!existingFields.has(shortDwField) && hasCommandContent(state.shortDw)) {
        missingLines.push(`${shortDwField} = ${formatCommandForExport(state.shortDw)}${lineEndingSuffix}`);
      }
      if (!existingFields.has(shortUpField) && hasCommandContent(state.shortUp)) {
        missingLines.push(`${shortUpField} = ${formatCommandForExport(state.shortUp)}${lineEndingSuffix}`);
      }
      if (!existingFields.has(longDwField) && hasCommandContent(state.longDw)) {
        missingLines.push(`${longDwField} = ${formatCommandForExport(state.longDw)}${lineEndingSuffix}`);
      }
      if (!existingFields.has(longUpField) && hasCommandContent(state.longUp)) {
        missingLines.push(`${longUpField} = ${formatCommandForExport(state.longUp)}${lineEndingSuffix}`);
      }
    }

    if (missingLines.length > 0) {
      insertions.push({ index: sectionRange.insertIndex, lines: missingLines });
    }
  }

  insertions
    .sort((a, b) => b.index - a.index)
    .forEach((insertion) => {
      lines.splice(insertion.index, 0, ...insertion.lines);
    });
}

function findSectionInsertIndex(originalLines: string[], sectionName: string): { insertIndex: number } | null {
  let headerIndex = -1;

  for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i].trim() === `[${sectionName}]`) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    return null;
  }

  let nextHeaderIndex = originalLines.length;
  for (let i = headerIndex + 1; i < originalLines.length; i++) {
    if (/^\[\w+\]\s*$/.test(originalLines[i].trim())) {
      nextHeaderIndex = i;
      break;
    }
  }

  let insertIndex = nextHeaderIndex;
  while (insertIndex > headerIndex + 1 && originalLines[insertIndex - 1].trim() === '') {
    insertIndex -= 1;
  }

  // Preserve comment separators for the next key block. If the lines before the next
  // section are only comments and blanks, insert new fields before that separator block.
  let separatorStart = insertIndex;
  while (separatorStart > headerIndex + 1 && isBlankOrCommentLine(originalLines[separatorStart - 1])) {
    separatorStart -= 1;
  }

  if (separatorStart < insertIndex) {
    insertIndex = separatorStart;
  }

  return { insertIndex };
}

function hasCommandContent(value: string): boolean {
  return Boolean((value || '').trim());
}

function isBlankOrCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('//');
}

function replaceValue(line: string, field: string, newValue: string): string {
  // Replace everything after "field = " or "field=" keeping the prefix
  // Strip \r for matching, then preserve it if it was there
  const hasCarriageReturn = line.endsWith('\r');
  const cleanLine = hasCarriageReturn ? line.slice(0, -1) : line;
  const regex = new RegExp(`^(\\s*${field}\\s*=\\s*)(.+)$`);
  const match = cleanLine.match(regex);
  if (match) {
    return match[1] + newValue + (hasCarriageReturn ? '\r' : '');
  }
  return line;
}
