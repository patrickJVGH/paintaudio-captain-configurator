import { describe, it, expect } from 'vitest';
import { cleanupPage1Text, parsePage1, exportPage1 } from '@/utils/parser';

const SAMPLE = `[globalsetup]
display_pc_offset = [0]
ledbright = [5]

[PAGE]
page_name = [TestPage]

[key0]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0xFF0000][0x00FF00][0x0000FF]
short_dw1 = [1][CC][0][127]

[key1]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0x00FF00][0x00FF00][0x00FF00]
short_dw1 = [1][CC][1][127]
`;

describe('export preserves edits', () => {
  it('should export changed LED colors', () => {
    const config = parsePage1(SAMPLE);
    expect(config.keys[0].states[0].ledColor.seg1).toBe('0xFF0000');
    config.keys[0].states[0].ledColor.seg1 = '0xAABBCC';
    const output = exportPage1(config);
    expect(output).toContain('[0xAABBCC][0x00FF00][0x0000FF]');
    expect(output).not.toContain('[0xFF0000][0x00FF00][0x0000FF]');
  });

  it('should work with Windows line endings', () => {
    const windowsSample = SAMPLE.replace(/\n/g, '\r\n');
    const config = parsePage1(windowsSample);
    expect(config.keys[0].states[0].ledColor.seg1).toBe('0xFF0000');
    config.keys[0].states[0].ledColor.seg1 = '0xAABBCC';
    const output = exportPage1(config);
    expect(output).toContain('[0xAABBCC]');
  });

  it('lineMap should have entries', () => {
    const config = parsePage1(SAMPLE);
    expect(config.lineMap.length).toBeGreaterThan(0);
    const ledcolorMappings = config.lineMap.filter(m => m.field.startsWith('ledcolor'));
    expect(ledcolorMappings.length).toBe(2);
  });

  it('should insert missing state fields when keytimes is increased', () => {
    const config = parsePage1(SAMPLE);

    config.keys[0].keytimes = 2;
    config.keys[0].states[1] = {
      ledColor: { seg1: '0x112233', seg2: '0x445566', seg3: '0x778899' },
      shortDw: '[1][CC][69][1]',
      shortUp: '',
      longDw: '',
      longUp: '',
    };

    const output = exportPage1(config);

    expect(output).toContain('keytimes = [2]');
    expect(output).toContain('ledcolor2 = [0x112233][0x445566][0x778899]');
    expect(output).toContain('short_dw2 = [1][CC][69][1]');
    expect(output).not.toContain('short_up2 = []');
    expect(output).not.toContain('long2 = []');
    expect(output).not.toContain('long_up2 = []');
  });

  it('should persist cleared commands as empty placeholders and read back as empty', () => {
    const config = parsePage1(SAMPLE);
    config.keys[0].states[0].shortDw = '';

    const output = exportPage1(config);
    expect(output).toContain('short_dw1 = []');

    const reparsed = parsePage1(output);
    expect(reparsed.keys[0].states[0].shortDw).toBe('');
  });

  it('should insert new fields before comment separators of the next key', () => {
    const sampleWithComments = `[key0]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0x111111][0x111111][0x111111]
short_dw1 = [1][CC][1][127]

# PROXIMO

[key1]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0x222222][0x222222][0x222222]
short_dw1 = [1][CC][2][127]
`;

    const config = parsePage1(sampleWithComments);
    config.keys[0].keytimes = 2;
    config.keys[0].states[1] = {
      ledColor: { seg1: '0x333333', seg2: '0x444444', seg3: '0x555555' },
      shortDw: '[1][CC][69][2]',
      shortUp: '',
      longDw: '',
      longUp: '',
    };

    const output = exportPage1(config);

    const led2Index = output.indexOf('ledcolor2 = [0x333333][0x444444][0x555555]');
    const commentIndex = output.indexOf('# PROXIMO');
    const nextKeyIndex = output.indexOf('[key1]');

    expect(led2Index).toBeGreaterThan(-1);
    expect(commentIndex).toBeGreaterThan(-1);
    expect(nextKeyIndex).toBeGreaterThan(-1);
    expect(led2Index).toBeLessThan(commentIndex);
    expect(commentIndex).toBeLessThan(nextKeyIndex);
    expect(output).not.toContain('short_up1 = []');
    expect(output).not.toContain('long1 = []');
    expect(output).not.toContain('long_up1 = []');
  });

  it('cleanup should remove empty command placeholders while preserving comments', () => {
    const messy = `[key0]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0xFFFFFF][0xFFFFFF][0xFFFFFF]
short_dw1 = [1][CC][69][0]

# SNAPSHOT 2
short_up1 = []
long1 = []
long_up1 = []

[key1]
keytimes = [1]
ledmode = [normal]
ledcolor1 = [0x0000FF][0x0000FF][0x0000FF]
short_dw1 = [1][CC][69][1]
`;

    const cleaned = cleanupPage1Text(messy);

    expect(cleaned).toContain('# SNAPSHOT 2');
    expect(cleaned).not.toContain('short_up1 = []');
    expect(cleaned).not.toContain('long1 = []');
    expect(cleaned).not.toContain('long_up1 = []');
    expect(cleaned).toContain('[key1]');
  });
});
