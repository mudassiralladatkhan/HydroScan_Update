export const generatePostmanCollection = (supabaseUrl, apiKey) => {
  const collection = {
    info: {
      name: "HydroScan API Collection",
      description: "Complete API collection for HydroScan water quality monitoring platform",
      version: "1.0.0",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: apiKey || "{{API_KEY}}",
          type: "string"
        }
      ]
    },
    variable: [
      {
        key: "baseUrl",
        value: `${supabaseUrl}/rest/v1`,
        type: "string"
      },
      {
        key: "functionsUrl", 
        value: `${supabaseUrl}/functions/v1`,
        type: "string"
      },
      {
        key: "API_KEY",
        value: apiKey || "your_api_key_here",
        type: "string"
      }
    ],
    item: [
      {
        name: "Devices",
        item: [
          {
            name: "Get All Devices",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/devices",
                host: ["{{baseUrl}}"],
                path: ["devices"]
              },
              description: "Retrieve all registered devices"
            }
          },
          {
            name: "Get Device by ID",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/devices?id=eq.device_id",
                host: ["{{baseUrl}}"],
                path: ["devices"],
                query: [
                  {
                    key: "id",
                    value: "eq.device_id",
                    description: "Replace 'device_id' with actual device ID"
                  }
                ]
              },
              description: "Get details for a specific device"
            }
          },
          {
            name: "Create Device",
            request: {
              method: "POST",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text"
                }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  name: "New Device",
                  serial_number: "WS001",
                  location: "Test Location",
                  firmware_version: "2.1.0",
                  status: "offline"
                }, null, 2)
              },
              url: {
                raw: "{{baseUrl}}/devices",
                host: ["{{baseUrl}}"],
                path: ["devices"]
              },
              description: "Register a new device"
            }
          }
        ]
      },
      {
        name: "Sensor Readings",
        item: [
          {
            name: "Get All Readings",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/sensor_readings?limit=10",
                host: ["{{baseUrl}}"],
                path: ["sensor_readings"],
                query: [
                  {
                    key: "limit",
                    value: "10",
                    description: "Limit number of results"
                  }
                ]
              },
              description: "Get recent sensor readings"
            }
          },
          {
            name: "Get Readings by Device",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/sensor_readings?device_id=eq.device_id&limit=50",
                host: ["{{baseUrl}}"],
                path: ["sensor_readings"],
                query: [
                  {
                    key: "device_id",
                    value: "eq.device_id",
                    description: "Replace 'device_id' with actual device ID"
                  },
                  {
                    key: "limit",
                    value: "50"
                  }
                ]
              },
              description: "Get readings for a specific device"
            }
          },
          {
            name: "Submit Sensor Data",
            request: {
              method: "POST",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text"
                }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  topic: "hydroscan/devices/WS001/data",
                  device_id: "WS001",
                  message_type: "data",
                  payload: {
                    device_id: "WS001",
                    timestamp: new Date().toISOString(),
                    ph: 7.2,
                    turbidity: 1.5,
                    tds: 320,
                    temperature: 22.5,
                    battery_level: 85,
                    signal_strength: -45
                  }
                }, null, 2)
              },
              url: {
                raw: "{{functionsUrl}}/mqtt-handler",
                host: ["{{functionsUrl}}"],
                path: ["mqtt-handler"]
              },
              description: "Submit sensor data via MQTT handler"
            }
          }
        ]
      },
      {
        name: "Alerts",
        item: [
          {
            name: "Get All Alerts",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/alerts?order=created_at.desc&limit=20",
                host: ["{{baseUrl}}"],
                path: ["alerts"],
                query: [
                  {
                    key: "order",
                    value: "created_at.desc"
                  },
                  {
                    key: "limit",
                    value: "20"
                  }
                ]
              },
              description: "Get recent alerts"
            }
          },
          {
            name: "Get Alerts by Device",
            request: {
              method: "GET",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                }
              ],
              url: {
                raw: "{{baseUrl}}/alerts?device_id=eq.device_id&order=created_at.desc",
                host: ["{{baseUrl}}"],
                path: ["alerts"],
                query: [
                  {
                    key: "device_id",
                    value: "eq.device_id",
                    description: "Replace 'device_id' with actual device ID"
                  },
                  {
                    key: "order",
                    value: "created_at.desc"
                  }
                ]
              },
              description: "Get alerts for a specific device"
            }
          }
        ]
      },
      {
        name: "Device Commands",
        item: [
          {
            name: "Send Device Command",
            request: {
              method: "POST",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text"
                }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  action: "send_command",
                  device_id: "WS001",
                  command_type: "diagnostics",
                  payload: {
                    test_sensors: true,
                    test_connectivity: true,
                    full_report: false
                  }
                }, null, 2)
              },
              url: {
                raw: "{{functionsUrl}}/device-commander",
                host: ["{{functionsUrl}}"],
                path: ["device-commander"]
              },
              description: "Send command to a device"
            }
          },
          {
            name: "Reboot Device",
            request: {
              method: "POST",
              header: [
                {
                  key: "apikey",
                  value: "{{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text"
                }
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  action: "send_command",
                  device_id: "WS001",
                  command_type: "reboot",
                  payload: {
                    reason: "manual_reboot"
                  }
                }, null, 2)
              },
              url: {
                raw: "{{functionsUrl}}/device-commander",
                host: ["{{functionsUrl}}"],
                path: ["device-commander"]
              },
              description: "Reboot a device"
            }
          }
        ]
      },
      {
        name: "API Proxy",
        item: [
          {
            name: "Proxy - Get Sensor Readings",
            request: {
              method: "GET",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer {{API_KEY}}",
                  type: "text"
                },
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text"
                }
              ],
              url: {
                raw: "{{functionsUrl}}/api-proxy/sensor_readings?limit=5",
                host: ["{{functionsUrl}}"],
                path: ["api-proxy", "sensor_readings"],
                query: [
                  {
                    key: "limit",
                    value: "5"
                  }
                ]
              },
              description: "Get sensor readings via API proxy"
            }
          }
        ]
      }
    ]
  };

  return collection;
};

export const downloadPostmanCollection = (collection, filename = 'hydroscan-api-collection.json') => {
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
