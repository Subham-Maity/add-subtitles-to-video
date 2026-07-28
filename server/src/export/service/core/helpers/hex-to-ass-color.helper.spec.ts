import { hexToAssColor } from './hex-to-ass-color.helper';

describe('hexToAssColor', () => {
  it('converts white #FFFFFF to ASS &H00FFFFFF', () => {
    expect(hexToAssColor('#FFFFFF')).toBe('&H00FFFFFF');
  });

  it('converts red #FF0000 to ASS &H000000FF (RGB to BGR swap)', () => {
    expect(hexToAssColor('#FF0000')).toBe('&H000000FF');
  });

  it('converts blue #0000FF to ASS &H00FF0000', () => {
    expect(hexToAssColor('#0000FF')).toBe('&H00FF0000');
  });

  it('applies alpha byte based on opacity', () => {
    expect(hexToAssColor('#000000', 0.5)).toBe('&H80000000');
  });
});
