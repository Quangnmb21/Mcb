class SensorDashboard {
    constructor() {
        // Gán phương thức cho 'this' để có thể sử dụng trong các sự kiện
        this.updateTime = this.updateTime.bind(this);
        this.showPosition = this.showPosition.bind(this);
        this.initializeTabs = this.initializeTabs.bind(this);
        this.fetchLatestSensorData = this.fetchLatestSensorData.bind(this);
        this.updateDeviceStates = this.updateDeviceStates.bind(this);
        this.initializeDeviceEvents = this.initializeDeviceEvents.bind(this);
        this.fetchSensorDataForChart = this.fetchSensorDataForChart.bind(this);

        // Chạy mã khi tài liệu được tải
        document.addEventListener('DOMContentLoaded', () => {
            this.updateTime();
            setInterval(this.updateTime, 1000); // Cập nhật mỗi giây

            // Lấy vị trí địa lý
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(this.showPosition);
            } else {
                document.getElementById('location').textContent = "Geolocation is not supported by this browser.";
            }

            // Khởi tạo tab và sự kiện chuyển tab
            this.initializeTabs();

            // Cập nhật dữ liệu mới nhất
            this.fetchLatestSensorData();

            // Thêm sự kiện cho thiết bị
            this.initializeDeviceEvents();
        });
    }

    // Cập nhật thời gian
    updateTime() {
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[now.getDay()];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeString = `${dayName}, ${hours}:${minutes}:${seconds}`;
        const dateString = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

        document.getElementById('current-time').textContent = timeString;
        document.getElementById('date-time').textContent = dateString;
    }

    // Hiển thị vị trí địa lý
    showPosition(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('location').textContent = `${data.city}, ${data.countryName}`;
            })
            .catch(error => {
                document.getElementById('location').textContent = "Unable to retrieve location.";
                console.error('Error fetching location:', error);
            });
    }

    // Khởi tạo tab và sự kiện chuyển tab
    initializeTabs() {
        const tabs = document.querySelectorAll('.options button');
        const contents = document.querySelectorAll('.tab-content');
        const unitButtons = document.querySelectorAll('.units button');

        // Kiểm tra và chọn tab đã lưu trong localStorage
        const savedTab = localStorage.getItem('selectedTab');
        if (savedTab) {
            this.activateTab(savedTab, tabs, contents);
            if (savedTab === "Chart") this.fetchSensorDataForChart(); // Tải dữ liệu biểu đồ nếu tab Chart được lưu
        } else {
            this.activateTab(tabs[0].textContent, tabs, contents); // Mặc định là tab đầu tiên
            this.fetchLatestSensorData(); // Lấy dữ liệu ban đầu
        }

        // Sự kiện chuyển tab
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.activateTab(tab.textContent, tabs, contents);
                localStorage.setItem('selectedTab', tab.textContent); // Lưu tab đã chọn vào localStorage
                if (tab.textContent === "Chart") this.fetchSensorDataForChart(); // Gọi hàm vẽ biểu đồ
            });
        });

        unitButtons.forEach(button => {
            button.addEventListener('click', () => {
                unitButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    // Kích hoạt tab
    activateTab(tabName, tabs, contents) {
        tabs.forEach(button => button.classList.remove('active'));
        const targetContent = document.getElementById(`content-${tabName}`);
        contents.forEach(content => content.classList.remove('active'));
        const target = [...tabs].find(tab => tab.textContent === tabName);
        if (target) target.classList.add('active');
        if (targetContent) targetContent.classList.add('active');
    }

    /// Hàm lấy dữ liệu mới nhất và cập nhật lên UI
fetchLatestSensorData() {
    fetch('http://localhost:3000/api/latest-sensor-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched data:', data); // Thêm log để kiểm tra dữ liệu nhận được
            if (data && data.Temperature !== undefined && data.Light !== undefined && data.Humidity !== undefined) {
                document.querySelector('.temperature-text').textContent = `${data.Temperature} ℃`;
                document.querySelector('.light-text').textContent = `${data.Light} lux`;
                document.querySelector('.humidity-text').textContent = `${data.Humidity} %`;
                document.querySelector('.temperature-text-chart').textContent = `${data.Temperature} ℃`;
                document.querySelector('.light-text-chart').textContent = `${data.Light} lux`;
                document.querySelector('.humidity-text-chart').textContent = `${data.Humidity} %`;
                this.updateDeviceStates(data);
            } else {
                console.error('Unexpected data structure:', data); // Log nếu dữ liệu không đúng cấu trúc
            }
        })
       
}


    // Cập nhật trạng thái thiết bị
updateDeviceStates(data) {
    const lampIcon = document.getElementById('lightbulb-icon');
    const lampStatusText = document.getElementById('lamp-status');
    const fanIcon = document.getElementById('fan-icon');
    const fanStatusText = document.getElementById('fan-status');
    const warningIcon = document.getElementById('warning-icon');
    const warningStatusText = document.getElementById('warning-status');
    const alarmSound = document.getElementById('alarm-sound');

    // Cập nhật ngay trạng thái ban đầu
    this.updateDeviceStatesBasedOnTemperature(data, lampIcon, lampStatusText, fanIcon, fanStatusText, warningIcon, warningStatusText, alarmSound);

    // Kiểm tra liên tục
    const intervalId = setInterval(() => {
        // Giả sử 'getLatestTemperature' là hàm lấy nhiệt độ mới nhất từ dữ liệu
        const latestData = { Temperature: data.Temperature }; // Thay đổi để lấy nhiệt độ thực tế
        if (latestData.Temperature <= 28) {
            clearInterval(intervalId); // Dừng kiểm tra nếu nhiệt độ không vi phạm
        } else {
            this.updateDeviceStatesBasedOnTemperature(latestData, lampIcon, lampStatusText, fanIcon, fanStatusText, warningIcon, warningStatusText, alarmSound);
        }
    }, 3000); // Kiểm tra sau mỗi 3 giây
}

// Cập nhật trạng thái thiết bị dựa trên nhiệt độ
updateDeviceStatesBasedOnTemperature(data, lampIcon, lampStatusText, fanIcon, fanStatusText, warningIcon, warningStatusText, alarmSound) {
    if (data.Temperature > 28) {
        this.updateLamp(lampIcon, lampStatusText, true);
        this.updateFan(fanIcon, fanStatusText, true);
        this.updateWarning(warningIcon, warningStatusText, true);
        if (alarmSound.paused) alarmSound.play();
    } else {
        this.updateLamp(lampIcon, lampStatusText, false);
        this.updateFan(fanIcon, fanStatusText, false);
        this.updateWarning(warningIcon, warningStatusText, false);
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
}

// Hàm khởi tạo sự kiện cho thiết bị
initializeDeviceEvents() {
    const lampIcon = document.getElementById('lightbulb-icon');
    const lampStatusText = document.getElementById('lamp-status');
    lampIcon.addEventListener('click', () => this.toggleLamp(lampIcon, lampStatusText));

    const fanIcon = document.getElementById('fan-icon');
    const fanStatusText = document.getElementById('fan-status');
    fanIcon.addEventListener('click', () => this.toggleFan(fanIcon, fanStatusText));

    const warningIcon = document.getElementById('warning-icon');
    const warningStatusText = document.getElementById('warning-status');
    warningIcon.addEventListener('click', () => this.toggleWarning(warningIcon, warningStatusText));
}

// Cập nhật trạng thái của đèn
updateLamp(icon, statusText, isOpen) {
    statusText.textContent = isOpen ? "Open" : "Closed";
    statusText.classList.toggle('open', isOpen);
    statusText.classList.toggle('closed', !isOpen);
    icon.classList.toggle('lightbulb-on', isOpen);
    icon.classList.toggle('lightbulb-off', !isOpen);
}

// Cập nhật trạng thái của quạt
updateFan(icon, statusText, isSpinning) {
    statusText.textContent = isSpinning ? "Open" : "Closed";
    statusText.classList.toggle('open', isSpinning);
    statusText.classList.toggle('closed', !isSpinning);
    icon.classList.toggle('rotate', isSpinning);
    icon.classList.toggle('fan-stopped', !isSpinning);
}

// Cập nhật trạng thái của cảnh báo
updateWarning(icon, statusText, isDangerous) {
    statusText.textContent = isDangerous ? "Dangerous" : "Closed";
    statusText.classList.toggle('open', isDangerous);
    statusText.classList.toggle('closed', !isDangerous);
    icon.classList.toggle('warning-on', isDangerous);
    icon.classList.toggle('warning-off', !isDangerous);
}

// Hàm chuyển đổi trạng thái của đèn
toggleLamp(icon, statusText) {
    const isOpen = statusText.textContent.trim() === "Closed";
    this.updateLamp(icon, statusText, isOpen);
}

// Hàm chuyển đổi trạng thái của quạt
toggleFan(icon, statusText) {
    const isSpinning = statusText.textContent.trim() === "Closed";
    this.updateFan(icon, statusText, isSpinning);
}

// Hàm chuyển đổi trạng thái của cảnh báo
toggleWarning(icon, statusText) {
    const isDangerous = statusText.textContent.trim() === "Closed";
    this.updateWarning(icon, statusText, isDangerous);
}


    // Hàm chuyển đổi trạng thái của cảnh báo
    toggleWarning(icon, statusText) {
        const isDangerous = statusText.textContent.trim() === "Closed";
        this.updateWarning(icon, statusText, isDangerous);
    }

    // Hàm để lấy dữ liệu 15 cái mới nhất cho biểu đồ
    fetchSensorDataForChart() {
        fetch('http://localhost:3000/api/latest-15-sensor-data')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const labels = data.map(record => record.times); // Sử dụng `Thoi_gian` từ MySQL
                const temperatures = data.map(record => record.Temperature);
                const lights = data.map(record => record.Light);
                const humidities = data.map(record => record.Humidity);
    
                // Kiểm tra xem dữ liệu độ ẩm có tồn tại hay không
                if (!humidities.length) {
                    console.error('No humidity data found!');
                    return; // Dừng hàm nếu không có dữ liệu độ ẩm
                }
    
                const ctx = document.getElementById('myChart').getContext('2d');
                const myChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Nhiệt độ (℃)',
                                data: temperatures,
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 2,
                                fill: false
                            },
                            {
                                label: 'Ánh sáng (lux)',
                                data: lights,
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 2,
                                fill: false
                            },
                            {
                                label: 'Độ ẩm (%)',
                                data: humidities,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 2,
                                fill: false
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Thời gian'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Giá trị'
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching sensor data for chart:', error);
            });
    }
}


// Khởi tạo lớp
const dashboard = new SensorDashboard();


class DataTabManager {
    constructor() {
        this.currentPageDataSensor = 1; // Trang hiện tại cho tab DataSensor
        this.currentPageDevice = 1; // Trang hiện tại cho tab Device
        this.totalPagesDataSensor = 0; // Tổng số trang cho tab DataSensor
        this.totalPagesDevice = 0; // Tổng số trang cho tab Device

        this.initEventListeners(); // Khởi tạo sự kiện
        this.loadData(this.currentPageDataSensor); // Tải dữ liệu lần đầu cho tab DataSensor
    }

    initEventListeners() {
        // Lắng nghe sự kiện thay đổi trên dropdown
        document.getElementById('sub-tab-select').addEventListener('change', (event) => {
            this.toggleTabs(event.target.value);
        });

        // Lắng nghe các nút phân trang cho tab DataSensor
        this.setupPaginationListeners('datasensor', '#next-button', '#previous-button', '#go-button', '#page-input');
        
        // Lắng nghe các nút phân trang cho tab Device
        this.setupPaginationListeners('device', '#next-button-device', '#previous-button-device', '#go-button-device', '#page-input-device');
    }

    setupPaginationListeners(tab, nextBtnSelector, prevBtnSelector, goBtnSelector, pageInputSelector) {
        document.querySelector(nextBtnSelector).addEventListener('click', () => {
            this.changePage(tab, 1);
        });

        document.querySelector(prevBtnSelector).addEventListener('click', () => {
            this.changePage(tab, -1);
        });

        document.querySelector(goBtnSelector).addEventListener('click', () => {
            const pageInput = parseInt(document.querySelector(pageInputSelector).value);
            this.goToPage(tab, pageInput);
        });
    }

    toggleTabs(selectedTab) {
        const dataSensorTab = document.getElementById('content-Datasensor');
        const deviceTab = document.getElementById('content-Device');

        if (selectedTab === 'datasensor') {
            dataSensorTab.style.display = 'block';
            deviceTab.style.display = 'none';
        } else {
            dataSensorTab.style.display = 'none';
            deviceTab.style.display = 'block';
            this.loadDeviceData(this.currentPageDevice); // Tải dữ liệu cho tab Device khi hiển thị
        }
    }

    async loadData(page) {
        try {
            const response = await fetch(`http://localhost:3000/api/data?page=${page}`);
            const data = await response.json();
            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = ''; // Xóa nội dung cũ

            data.results.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.id}</td>
                    <td>${row.Temperature}</td>
                    <td>${row.Humidity}</td>
                    <td>${row.Light}</td>
                    <td>${this.formatDate(row.Thoi_gian)}</td>
                `;
                tableBody.appendChild(tr);
            });

            // Cập nhật tổng số trang
            this.totalPagesDataSensor = data.totalPages;

            // Cập nhật trạng thái của nút Next và Previous
            document.querySelector('#next-button').disabled = this.currentPageDataSensor >= this.totalPagesDataSensor;
            document.querySelector('#previous-button').disabled = this.currentPageDataSensor <= 1;

            // Cập nhật số trang hiển thị
            document.querySelector('#page-input').value = this.currentPageDataSensor;
            document.querySelector('#page-info').textContent = `Page ${this.currentPageDataSensor} of ${this.totalPagesDataSensor}`;

        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadDeviceData(page) {
        try {
            const response = await fetch(`http://localhost:3000/api/device?page=${page}`);
            const data = await response.json();
            const tableBody = document.querySelector('#device-table tbody');
            tableBody.innerHTML = ''; // Xóa nội dung cũ

            data.results.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.id}</td>
                    <td>${row.device}</td>
                    <td>${row.action}</td>
                    <td>${this.formatDate(row.Thoi_gian)}</td>
                `;
                tableBody.appendChild(tr);
            });

            // Cập nhật tổng số trang
            this.totalPagesDevice = data.totalPages;

            // Cập nhật trạng thái của nút Next và Previous
            document.querySelector('#next-button-device').disabled = this.currentPageDevice >= this.totalPagesDevice;
            document.querySelector('#previous-button-device').disabled = this.currentPageDevice <= 1;

            // Cập nhật số trang hiển thị
            document.querySelector('#page-input-device').value = this.currentPageDevice;
            document.querySelector('#page-info-device').textContent = `Page ${this.currentPageDevice} of ${this.totalPagesDevice}`;

        } catch (error) {
            console.error('Error loading device data:', error);
        }
    }

    changePage(tab, direction) {
        if (tab === 'datasensor') {
            if (direction === 1 && this.currentPageDataSensor < this.totalPagesDataSensor) {
                this.currentPageDataSensor++;
            } else if (direction === -1 && this.currentPageDataSensor > 1) {
                this.currentPageDataSensor--;
            }
            this.loadData(this.currentPageDataSensor);
        } else if (tab === 'device') {
            if (direction === 1 && this.currentPageDevice < this.totalPagesDevice) {
                this.currentPageDevice++;
            } else if (direction === -1 && this.currentPageDevice > 1) {
                this.currentPageDevice--;
            }
            this.loadDeviceData(this.currentPageDevice);
        }
    }

    goToPage(tab, page) {
        if (tab === 'datasensor' && page > 0 && page <= this.totalPagesDataSensor) {
            this.currentPageDataSensor = page;
            this.loadData(this.currentPageDataSensor);
        } else if (tab === 'device' && page > 0 && page <= this.totalPagesDevice) {
            this.currentPageDevice = page;
            this.loadDeviceData(this.currentPageDevice);
        } else {
            alert("Please enter a valid page number");
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}




document.addEventListener('DOMContentLoaded', () => {
    new DataTabManager();
});

// Trạng thái LED
let ledStates = {
    led1: false,
    led2: false,
    led3: false
};

// Hàm toggle LED và gửi lệnh tới server
function toggleLed(led) {
    ledStates[led] = !ledStates[led];
    const message = ledStates[led] ? `${led}_on` : `${led}_off`;
    fetch('http://localhost:3000/control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        console.log(`LED status updated for ${led}:`, data);
        updateStatusText(led); // Cập nhật UI
    })
    .catch((error) => console.error('Error:', error));
}

// Cập nhật trạng thái LED trên UI
function updateStatusText(led) {
    const statusElement = document.getElementById(`${led}-status`);
    statusElement.textContent = ledStates[led] ? 'Opened' : 'Closed';

    // Gửi lệnh MQTT cho LED khi trạng thái LED thay đổi
    sendMqttCommand(ledStates[led] ? `${led}_on` : `${led}_off`);
}

// Cấu hình MQTT
const mqtt = require('mqtt');
const options = {
    host: '192.168.1.3',
    port: 1997,
    username: 'quang',
    password: '123',
};
const client = mqtt.connect(options);
client.on('connect', () => {
    console.log('Connected to MQTT broker');
});

// Gửi lệnh MQTT
function sendMqttCommand(command) {
    const topic = 'control';
    client.publish(topic, command, (err) => {
        if (err) {
            console.error('Error publishing command:', err);
        } else {
            console.log(`Command sent via MQTT: ${command}`);
        }
    });
}

// Thêm các nút điều khiển vào UI
document.addEventListener('DOMContentLoaded', () => {
    const lampOnButton = document.createElement('button');
    lampOnButton.id = 'lamp-on';
    lampOnButton.textContent = 'Turn On Lamp';
    document.body.appendChild(lampOnButton);

    const lampOffButton = document.createElement('button');
    lampOffButton.id = 'lamp-off';
    lampOffButton.textContent = 'Turn Off Lamp';
    document.body.appendChild(lampOffButton);

    const fanOnButton = document.createElement('button');
    fanOnButton.id = 'fan-on';
    fanOnButton.textContent = 'Turn On Fan';
    document.body.appendChild(fanOnButton);

    const fanOffButton = document.createElement('button');
    fanOffButton.id = 'fan-off';
    fanOffButton.textContent = 'Turn Off Fan';
    document.body.appendChild(fanOffButton);

    const warningOnButton = document.createElement('button');
    warningOnButton.id = 'warning-on';
    warningOnButton.textContent = 'Turn On Warning';
    document.body.appendChild(warningOnButton);

    const warningOffButton = document.createElement('button');
    warningOffButton.id = 'warning-off';
    warningOffButton.textContent = 'Turn Off Warning';
    document.body.appendChild(warningOffButton);

    lampOnButton.addEventListener('click', () => {
        toggleLed('led1');
    });
    lampOffButton.addEventListener('click', () => {
        toggleLed('led1');
    });
    fanOnButton.addEventListener('click', () => {
        toggleLed('led2');
    });
    fanOffButton.addEventListener('click', () => {
        toggleLed('led2');
    });
    warningOnButton.addEventListener('click', () => {
        toggleLed('led3');
    });
    warningOffButton.addEventListener('click', () => {
        toggleLed('led3');
    });

    // Khi 3 icon đều On thì bật cả 3 LED
    document.getElementById('lamp-on').addEventListener('click', checkAllIcons);
    document.getElementById('fan-on').addEventListener('click', checkAllIcons);
    document.getElementById('warning-on').addEventListener('click', checkAllIcons);
});

// Hàm kiểm tra và bật tất cả các LED khi tất cả icon đều on
function checkAllIcons() {
    const lampStatus = ledStates.led1;
    const fanStatus = ledStates.led2;
    const warningStatus = ledStates.led3;

    if (lampStatus && fanStatus && warningStatus) {
        toggleLed('led1');
        toggleLed('led2');
        toggleLed('led3');
    }
}

// Endpoint để điều khiển LED với kiểm tra giá trị message
const express = require('express');
const app = express();

app.use(express.json());

app.post('/control', (req, res) => {
    const message = req.body.message;
    const validMessages = ['led1_on', 'led1_off', 'led2_on', 'led2_off', 'led3_on', 'led3_off'];
    if (validMessages.includes(message)) {
        client.publish('control', message, (err) => {
            if (err) {
                console.error('Publish error:', err);
                return res.status(500).send({ error: 'Publish error' });
            }
            console.log(`Message sent: ${message}`);
            res.status(200).send({ message: 'Message sent' });
        });
    } else {
        res.status(400).send({ error: 'Invalid message' });
    }
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});


// Endpoint để điều khiển LED qua MQTT
app.post('/control', (req, res) => {
    const message = req.body.message; // Nhận tin nhắn từ yêu cầu
    const validMessages = [
        'led1_on', 'led1_off', 'led2_on', 'led2_off',
        'led3_on', 'led3_off', 'led_on', 'led_off'
    ];

    if (!validMessages.includes(message)) {
        return res.status(400).send({ error: 'Invalid message' });
    }

    if (mqttClient.connected) { // Kiểm tra kết nối MQTT
        console.log(`Publishing message: ${message}`); // Log lệnh đang gửi
        mqttClient.publish('control', message, err => {
            if (err) {
                console.error('Publish error:', err);
                return res.status(500).send({ error: 'Publish error' });
            }
            console.log(`Message sent: ${message}`);
            res.status(200).send({ message: 'Message sent' });
        });
    } else {
        res.status(500).send({ error: 'MQTT client not connected' });
    }
});



// Hàm kiểm tra nhiệt độ và điều khiển LED
function checkTemperatureAndControlLEDs() {
    const query = 'SELECT * FROM datasensor ORDER BY Thoi_gian DESC LIMIT 1';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return;
        }

        const latestData = results[0];
        if (latestData && latestData.Temperature > 28) {
            // Nếu nhiệt độ > 28, bật cả 3 LED
            mqttClient.publish('control', 'led1_on');
            mqttClient.publish('control', 'led2_on');
            mqttClient.publish('control', 'led3_on');
            console.log('Temperature > 28: All LEDs ON');
        } else {
            // Nếu nhiệt độ <= 28, tắt cả 3 LED
            mqttClient.publish('control', 'led1_off');
            mqttClient.publish('control', 'led2_off');
            mqttClient.publish('control', 'led3_off');
            console.log('Temperature <= 28: All LEDs OFF');
        }
    });
}

// Gọi hàm kiểm tra nhiệt độ mỗi 3 giây
setInterval(checkTemperatureAndControlLEDs, 3000);

document.getElementById('searchButton').addEventListener('click', function () {
    const searchTerm = document.getElementById('searchInput').value;

    fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`)
        .then(response => response.text())
        .then(data => {
            const resultContainer = document.getElementById('resultTable');

            // Kiểm tra xem có dữ liệu trả về hay không
            if (data === 'No_Have_Data_You_Want') {
                resultContainer.innerHTML = '<p>Không có dữ liệu bạn muốn</p>';
            } else {
                // Hiển thị dữ liệu trong bảng
                resultContainer.innerHTML = data;
            }
        })
        .catch(error => console.error('Error fetching search results:', error));
});

