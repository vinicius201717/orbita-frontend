import { describe, expect, it } from 'vitest';
import { parseDestinationPoint } from '@/features/orders-address/coordinates';
describe('destination point', () => {
  it('accepts coordinates and explicit place pins', () => {
    expect(parseDestinationPoint('-16.68, -49.25')).toEqual({ latitude: -16.68, longitude: -49.25 });
    expect(
      parseDestinationPoint('https://www.google.com/maps/place/Test/data=!3d-16.68!4d-49.25'),
    ).toEqual({ latitude: -16.68, longitude: -49.25 });
    expect(
      parseDestinationPoint('https://www.google.com/maps/search/?api=1&query=-16.68,-49.25'),
    ).toEqual({ latitude: -16.68, longitude: -49.25 });
  });
  it('does not confuse camera position or an arbitrary website with a delivery pin', () => {
    for (const value of [
      'https://www.google.com/maps/@-16.68,-49.25,12z',
      'https://evil.test/?q=-16.68,-49.25',
      'https://maps.app.goo.gl/test',
      '100,200',
      'NaN,0',
      '',
    ])
      expect(parseDestinationPoint(value)).toBeNull();
  });
});
