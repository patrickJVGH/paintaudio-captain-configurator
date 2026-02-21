import { describe, it, expect } from 'vitest';
import { parsePage1, exportPage1 } from '@/utils/parser';

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
});
