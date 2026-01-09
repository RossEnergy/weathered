import { Client } from './';
import 'jest-date';

describe('Client', () => {
  it('uses the default userAgent', () => {
    const client = new Client();
    expect(client.getOptions().userAgent).toBe('weathered package');
  });

  it('uses a custom userAgent', () => {
    const client = new Client({ userAgent: 'secret agent' });
    expect(client.getOptions().userAgent).toBe('secret agent');
  });

  it('can change userAgent', () => {
    const client = new Client();
    client.setOptions({ userAgent: 'a new userAgent' });
    expect(client.getOptions().userAgent).toBe('a new userAgent');
  });
});

describe('Client.getStationObservations', () => {
  it('can query observations', async () => {
    const client = new Client();
    const response = await client.getStationObservations('KSEA');
    expect(response.features.length).toBeGreaterThan(0);
  });

  it('can query observations with date range', async () => {
    const client = new Client();
    // the endpoint only returns up to the last 7 days of data. so calculate a start and end date within that range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2);
    startDate.setHours(0, 0, 0, 0);
    const start = startDate.toISOString();
    const endDate = new Date();
    // set end date to day after start date at 23:59:59
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
    const end = endDate.toISOString();
    const response = await client.getStationObservations('KSEA', { start, end });
    expect(response.features.length).toBeGreaterThan(0);
    // verify all observations are within the date range
    for (const observation of response.features) {
      const obsDate = new Date(observation.properties.timestamp);
      expect(obsDate).toBeAfter(startDate);
      expect(obsDate).toBeBefore(endDate);
    }
  });

  it('can query observations with pagination (limit, cursor)', async () => {
    const client = new Client();
    const response = await client.getStationObservations('KSEA', { limit: 5 });
    expect(response.features.length).toBe(5);
    const nexturl = response.pagination?.next;
    expect(nexturl).toBeDefined();
    if (!nexturl) return;
    const url = new URL(nexturl);
    const cursor = url.searchParams.get('cursor');
    expect(cursor).toBeDefined();
    if (!cursor) return;
    // fetch the next page
    const nextResponse = await client.getStationObservations('KSEA', { limit: 5, cursor });
    expect(nextResponse.features.length).toBe(5);
  });
});

describe("Client.getStationByStationId", () => {
  it('fetches station details by stationId', async () => {
    const client = new Client();

    const response = await client.getStationByStationId('KSEA');

    expect(response).toBeDefined();

    expect(response).toHaveProperty('id');
    expect(response.properties).toHaveProperty('stationIdentifier', 'KSEA');
    expect(response.properties).toHaveProperty('name');
    expect(response.properties).toHaveProperty('timeZone');
    expect(response.properties).toHaveProperty('elevation');
  });

  it("returns a 404 error object for an invalid stationId", async () => {
    const client = new Client();

    const response = await client.getStationByStationId("INVALID_STATION");

    expect(response).toHaveProperty('status', 404);
    expect(response).toHaveProperty('title', 'Not Found');
    expect(response).toHaveProperty('detail');
  });

});
