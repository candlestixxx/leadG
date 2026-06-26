import { createCrmConnector, HubSpotConnector, SalesforceConnector, GoHighLevelConnector, WebhookConnector } from './crm-connector';

describe('CRM Connector Factory', () => {
  it('should create a HubSpotConnector when type is hubspot', () => {
    const connector = createCrmConnector('hubspot');
    expect(connector).toBeInstanceOf(HubSpotConnector);
    expect(connector.name).toBe('hubspot');
  });

  it('should create a SalesforceConnector when type is salesforce', () => {
    const connector = createCrmConnector('salesforce');
    expect(connector).toBeInstanceOf(SalesforceConnector);
    expect(connector.name).toBe('salesforce');
  });

  it('should create a GoHighLevelConnector when type is gohighlevel', () => {
    const connector = createCrmConnector('gohighlevel');
    expect(connector).toBeInstanceOf(GoHighLevelConnector);
    expect(connector.name).toBe('gohighlevel');
  });

  it('should create a WebhookConnector when type is webhook', () => {
    const connector = createCrmConnector('webhook');
    expect(connector).toBeInstanceOf(WebhookConnector);
    expect(connector.name).toBe('webhook');
  });

  it('should throw an error for unsupported CRM type', () => {
    expect(() => createCrmConnector('unsupported')).toThrow('Unsupported CRM type: unsupported');
  });
});
