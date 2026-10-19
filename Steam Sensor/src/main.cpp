#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// Pin Definitions
constexpr uint8_t POT_PIN   = 4;  
constexpr uint8_t SERVO_PIN = 18; 
constexpr uint8_t LED_PIN   = 10; 

// HiveMQ Public Broker Details
const char* WIFI_SSID   = "Wokwi-GUEST";
const char* WIFI_PASS   = "";
const char* MQTT_SERVER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883; // Standard non-TLS TCP Port

// Topic Definitions
const char* TOPIC_TELEMETRY = "esp32/telemetry";
const char* TOPIC_COMMAND   = "esp32/cmd/servo";

WiFiClient espClient;
PubSubClient mqttClient(espClient);
Servo myservo;

void setupWiFi() {
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi! IP: ");
  Serial.println(WiFi.localIP());
}

// Callback function to receive incoming MQTT messages from HiveMQ Web Client
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Message arrived on topic [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  // If a command is sent to esp32/cmd/servo, override the servo angle directly
  int requestedAngle = message.toInt();
  if (requestedAngle >= 0 && requestedAngle <= 180) {
    myservo.write(requestedAngle);
    Serial.print("Servo manually overridden to: ");
    Serial.println(requestedAngle);
  }
}

void reconnectMQTT() {
  static unsigned long lastAttempt = 0;
  if (!mqttClient.connected() && millis() - lastAttempt > 3000) {
    lastAttempt = millis();
    Serial.print("Connecting to HiveMQ Broker... ");
    
    // Unique Client ID is required for public brokers to avoid disconnect collisions
    String clientId = "ESP32S3-Wokwi-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("CONNECTED!");
      mqttClient.publish(TOPIC_TELEMETRY, "{\"status\":\"online\"}");
      mqttClient.subscribe(TOPIC_COMMAND);
    } else {
      Serial.print("Failed, rc=");
      Serial.println(mqttClient.state());
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  analogReadResolution(12);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  myservo.setPeriodHertz(50);
  myservo.attach(SERVO_PIN, 500, 2400);

  setupWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("System initialized successfully.");
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Read Potentiometer and map angle
  int potValue = analogRead(POT_PIN);
  int servoAngle = map(potValue, 0, 4095, 0, 180);

  // Control LED based on threshold
  if (potValue > 2047) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  // Publish telemetry data every 1 second
  static unsigned long lastPub = 0;
  if (millis() - lastPub > 1000) {
    lastPub = millis();
    
    char payload[100];
    snprintf(payload, sizeof(payload), "{\"pot_raw\":%d,\"servo_deg\":%d}", potValue, servoAngle);
    
    if (mqttClient.connected()) {
      mqttClient.publish(TOPIC_TELEMETRY, payload);
    }

    Serial.print("POT RAW: ");
    Serial.print(potValue);
    Serial.print(" | Servo Angle: ");
    Serial.println(servoAngle);
  }

  delay(20);
}