import { connect } from 'https://deno.land/x/mqtt@v0.1.2/mod.ts';

let mqttClient;

async function getMqttClient() {
    if (mqttClient && mqttClient.state === 'connected') {
        return mqttClient;
    }

    try {
        const brokerUrl = Deno.env.get('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
        console.log(`[MQTT] Connecting to broker: ${brokerUrl}`);
        
        mqttClient = await connect({
            url: brokerUrl,
            username: Deno.env.get('MQTT_USERNAME'),
            password: Deno.env.get('MQTT_PASSWORD'),
            clientId: `hydroscan-edge-${Math.random().toString(16).substr(2, 8)}`,
            keepalive: 60,
            clean: true,
        });

        mqttClient.on('connect', () => console.log('[MQTT] Client connected'));
        mqttClient.on('error', (err) => console.error('[MQTT] Client error:', err));
        mqttClient.on('close', () => console.log('[MQTT] Client disconnected'));

        return mqttClient;
    } catch (error) {
        console.error('[MQTT] Connection failed:', error);
        throw error;
    }
}

export async function publishMqtt(topic, payload, options = { qos: 1, retain: false }) {
    try {
        const client = await getMqttClient();
        await client.publish(topic, JSON.stringify(payload), options);
        console.log(`[MQTT] Published to ${topic}`);
        return true;
    } catch (error) {
        console.error(`[MQTT] Failed to publish to ${topic}:`, error);
        return false;
    }
}

export async function disconnectMqtt() {
    if (mqttClient && mqttClient.state === 'connected') {
        await mqttClient.disconnect();
    }
}
