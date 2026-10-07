import { chartScale } from './chartScale';

describe('chartScale', () => {
  it('rounds the top up to 1, 2, 5 or 10 times a power of ten', () => {
    expect(chartScale([14.97])).toEqual({ max: 20, ticks: [0, 5, 10, 15, 20] });
    expect(chartScale([100])).toEqual({ max: 100, ticks: [0, 25, 50, 75, 100] });
    expect(chartScale([101]).max).toBe(200);
    expect(chartScale([7]).max).toBe(10);
    expect(chartScale([0.3, 0.12]).max).toBe(0.5);
  });
  it('draws a sensible empty chart', () => {
    expect(chartScale([0, 0])).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
    expect(chartScale([])).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
  });
});
