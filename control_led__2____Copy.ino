#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

#define DPIN 4        // GPIO ket noi cam bien DHT (D2)
#define DTYPE DHT11 

DHT dht(DPIN, DTYPE);

// Cau hinh cam bien
#define ANALOG_INPUT_PIN A0  // Chan analog (A0 tren ESP8266)
#define DIGITAL_INPUT_PIN 5   // Chan digital (D1 tren ESP8266 tuong ung voi GPIO5)

#define D5 14  // LED1 cho Lamp
#define D6 12  // LED2 cho Fan
#define D7 13  // LED3 cho Warning

const char* ssid = "Quang Tuan C5 2.4G";
const char* password = "quangtuan";
const char* mqtt_server = "192.168.1.12";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
#define MSG_BUFFER_SIZE (100)
char msg[MSG_BUFFER_SIZE];

// Biến để kiểm soát nhấp nháy LED
bool led3State = LOW;        // Trạng thái hiện tại của LED3
unsigned long led3PreviousMillis = 0; // Thời gian trước đó LED3 được nhấp nháy
const long led3Interval = 500; // Thời gian nhấp nháy (mili giây)

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
    Serial.print("Message arrived [");
    Serial.print(topic);
    Serial.print("] ");
  
    String message;
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    Serial.println(message);

    if (message == "led1_off") {
        digitalWrite(D5, LOW);   // Tắt LED1 (Lamp)
    } else if (message == "led1_on") {
        digitalWrite(D5, HIGH);  // Bật LED1 (Lamp)
    } else if (message == "led2_off") {
        digitalWrite(D6, LOW);   // Tắt LED2 (Fan)
    } else if (message == "led2_on") {
        digitalWrite(D6, HIGH);  // Bật LED2 (Fan)
    } else if (message == "led3_off") {
        digitalWrite(D7, LOW);   // Tắt LED3 (Warning)
        led3State = LOW; // Đặt trạng thái LED3 về tắt
    } else if (message == "led3_on") {
        digitalWrite(D7, HIGH);  // Bật LED3 (Warning)
        led3State = HIGH; // Đặt trạng thái LED3 về bật
    } else if (message == "led_on") {
      digitalWrite(D5, HIGH);
      digitalWrite(D6, HIGH);
      digitalWrite(D7, HIGH);
      led3State = HIGH;  // Bật tất cả các LED
    } else if (message == "led_off") {
      digitalWrite(D5, LOW);
      digitalWrite(D6, LOW);
      digitalWrite(D7, LOW);
      led3State = LOW;  // Tắt tất cả các LED
    }
}



void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), "quang", "123", "will_topic", 0, false, "Client disconnected")) {
      Serial.println("connected");
      client.subscribe("control"); // Đăng ký nhận tin nhắn từ topic control
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  pinMode(BUILTIN_LED, OUTPUT);  // Khoi tao chan LED
  pinMode(D5, OUTPUT); // LED1 cho Lamp
  pinMode(D6, OUTPUT); // LED2 cho Fan
  pinMode(D7, OUTPUT); // LED3 cho Warning  
  pinMode(DIGITAL_INPUT_PIN, INPUT);  // digital
  dht.begin();

  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1997);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 10000) {
    lastMsg = now;

    // Đọc dữ liệu từ cảm biến DHT
    float temp = dht.readTemperature(false);  // Đọc nhiệt độ (°C)
    float humi = dht.readHumidity();          // Đọc độ ẩm

    // Đọc giá trị từ các chân analog và digital
    int analogValue = analogRead(ANALOG_INPUT_PIN); // Đọc giá trị từ chân A0 (cảm biến ánh sáng)
    int digitalValue = digitalRead(DIGITAL_INPUT_PIN); // Đọc giá trị từ GPIO5 (chân digital)

    // Kiểm tra lỗi đọc cảm biến DHT
    if (isnan(temp) || isnan(humi)) {
      Serial.println("Failed to read from DHT sensor!");
    } else {
      snprintf(msg, MSG_BUFFER_SIZE, "Temperature: %.2f C, Humidity: %.0f%%, Light: %d Lux", temp, humi, analogValue);
    }

    Serial.print("Publish message: ");
    Serial.println(msg);
    client.publish("data", msg);
    delay(50);
  }

  // Nhấp nháy LED3 (Warning) nếu nó đang được bật
  if (led3State == HIGH) {
    unsigned long currentMillis = millis();
    if (currentMillis - led3PreviousMillis >= led3Interval) {
      led3PreviousMillis = currentMillis;
      // Thay đổi trạng thái của LED3
      digitalWrite(D7, !digitalRead(D7)); // Đổi trạng thái LED3
    }
  }
}
