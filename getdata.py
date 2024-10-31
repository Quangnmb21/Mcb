import paho.mqtt.client as mqtt
import mysql.connector
import json

# Cấu hình kết nối tới MySQL
db = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="Quang",
    database="quang"
)

cursor = db.cursor()

# Hàm lưu dữ liệu vào bảng 'datasensor'
def save_data_to_datass(Temperature, Humidity, Light):
    try:
        sql = "INSERT INTO datasensor (Temperature, Humidity, Light) VALUES (%s, %s, %s)"
        values = (Temperature, Humidity, Light)
        cursor.execute(sql, values)
        db.commit()
        print(f"Data saved to datasensor: Temp={Temperature}, Hum={Humidity}, Light={Light}")
    except mysql.connector.Error as err:
        print(f"Error: {err}")

# Hàm lưu trạng thái LED vào bảng 'devices'
def save_data_to_devices(led, ledact):
    try:
        sql = "INSERT INTO device (device, action) VALUES (%s, %s)"
        values = (led, ledact)
        cursor.execute(sql, values)
        db.commit()
        print(f"Data saved to device: device={led}, actions={ledact}")
    except mysql.connector.Error as err:
        print(f"Error: {err}")

# Hàm lưu trạng thái cả 3 LED cùng một lúc vào bảng 'devices'
def save_data(check):
    ledact = "on" if check == 1 else "off"
    
    for led in ["led1", "led2", "led3"]:
        try:
            sql = "INSERT INTO device (device, action) VALUES (%s, %s)"
            values = (led, ledact)
            cursor.execute(sql, values)
            db.commit()
            print(f"Data saved to device: device={led}, action={ledact}")
        except mysql.connector.Error as err:
            print(f"Error: {err}")

# Hàm callback khi nhận được tin nhắn từ MQTT
def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    print(f"Received message from topic `{topic}`: {payload}")

    if topic == "data":
        try:
            # Nhận dữ liệu cảm biến từ ESP8266 và lưu vào bảng 'datasensor'
            data_parts = payload.split(', ')
            temperature = None
            humidity = None
            light = None

            for part in data_parts:
                key, value = part.split(': ')
                if key == 'Temperature':
                    temperature = float(value.replace(' C', '').strip())
                elif key == 'Humidity':
                    humidity = float(value.replace('%', '').strip())
                elif key == 'Light':
                    light = int(value.replace(' Lux', '').strip())

            save_data_to_datass(temperature, humidity, light)

        except Exception as e:
            print(f"Error processing data message: {e}")

    elif topic == "control":
        if payload == "led1_on":
            save_data_to_devices("led1", "on")
        elif payload == "led1_off":
            save_data_to_devices("led1", "off")
        elif payload == "led2_on":
            save_data_to_devices("led2", "on")
        elif payload == "led2_off":
            save_data_to_devices("led2", "off")
        elif payload == "led3_on":
            save_data_to_devices("led3", "on")
        elif payload == "led3_off":
            save_data_to_devices("led3", "off")
        elif payload == "led_on":
            save_data(1)
        elif payload == "led_off":
            save_data(0)

# Hàm callback khi kết nối tới MQTT broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker!")
        client.subscribe("data")
        client.subscribe("control")
    else:
        print(f"Failed to connect, return code {rc}")

# Cấu hình MQTT Client
mqtt_client = mqtt.Client()
mqtt_client.username_pw_set("quang", "123")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Kết nối tới MQTT broker
mqtt_client.connect("192.168.1.12", 1997, 60)

# Chạy vòng lặp chính để lắng nghe dữ liệu từ broker
mqtt_client.loop_forever()
