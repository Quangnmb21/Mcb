const express = require('express');
const mysql = require('mysql2');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Để phân tích JSON từ body request

// Thiết lập kết nối đến MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Quang',
    database: 'quang'
});

// Kết nối đến MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Kết nối với MQTT broker
const mqttClient = mqtt.connect('mqtt://192.168.1.12', {
    port: 1997,
    username: 'quang',
    password: '123'
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
});

// Endpoint để điều khiển LED
app.post('/control', (req, res) => {
    const message = req.body.message; // Nhận tin nhắn từ yêu cầu

    // Kiểm tra nhiệt độ từ cơ sở dữ liệu trước khi gửi lệnh MQTT
    const query = 'SELECT * FROM datasensor ORDER BY Thoi_gian DESC LIMIT 1';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
            return;
        }

        const latestData = results[0];
        if (latestData && latestData.Temperature > 28) {
            // Nếu nhiệt độ > 28, gửi lệnh off khi bấm icon
            mqttClient.publish('control', 'led1_off');
            mqttClient.publish('control', 'led2_off');
            mqttClient.publish('control', 'led3_off');
            console.log('Temperature > 28: All LEDs OFF via icon click');
        } else {
            // Nếu nhiệt độ <= 28, gửi lệnh on khi bấm icon
            mqttClient.publish('control', 'led1_on');
            mqttClient.publish('control', 'led2_on');
            mqttClient.publish('control', 'led3_on');
            console.log('Temperature <= 28: All LEDs ON via icon click');
        }
        res.status(200).send({ message: 'LEDs toggled based on temperature' });
    });
});

// Endpoint để lấy dữ liệu mới nhất
app.get('/api/latest-sensor-data', (req, res) => {
    const query = 'SELECT * FROM datasensor ORDER BY Thoi_gian DESC LIMIT 1';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results[0]);
    });
});

// Endpoint để lấy 15 dữ liệu mới nhất cho biểu đồ
app.get('/api/latest-15-sensor-data', (req, res) => {
    const query = 'SELECT * FROM datasensor ORDER BY Thoi_gian DESC LIMIT 15';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results);
    });
});

// API để lấy dữ liệu với hỗ trợ phân trang cho tab DataSensor
app.get('/api/data', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    const query = `SELECT * FROM datasensor LIMIT ${limit} OFFSET ${offset}`;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
            return;
        }

        const countQuery = 'SELECT COUNT(*) AS total FROM datasensor';
        connection.query(countQuery, (err, countResults) => {
            if (err) {
                console.error('Error counting records:', err);
                res.status(500).send('Error counting records');
                return;
            }
            const totalRecords = countResults[0].total;
            const totalPages = Math.ceil(totalRecords / limit);

            res.json({
                results,
                totalPages,
                currentPage: page
            });
        });
    });
});

// API để lấy dữ liệu với hỗ trợ phân trang cho tab Device
app.get('/api/device', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    const query = `SELECT * FROM device LIMIT ${limit} OFFSET ${offset}`;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching device data:', err);
            res.status(500).send('Error fetching device data');
            return;
        }

        const countQuery = 'SELECT COUNT(*) AS total FROM device';
        connection.query(countQuery, (err, countResults) => {
            if (err) {
                console.error('Error counting device records:', err);
                res.status(500).send('Error counting device records');
                return;
            }
            const totalRecords = countResults[0].total;
            const totalPages = Math.ceil(totalRecords / limit);

            res.json({
                results,
                totalPages,
                currentPage: page
            });
        });
    });
});

// API tìm kiếm cho DataSensor
app.get('/api/search/datasensor', (req, res) => {
    const searchTerm = req.query.term; // Nhận từ khóa tìm kiếm từ yêu cầu

    if (!searchTerm) {
        return res.status(400).json({ message: 'No search term provided' });
    }

    const query = `SELECT * FROM datasensor WHERE 
                    id LIKE ? OR 
                    Humidity LIKE ? OR 
                    Temperature LIKE ? OR 
                    Light LIKE ? OR 
                    Thoi_gian LIKE ?`;
    const searchLikeTerm = `%${searchTerm}%`;

    connection.query(query, [searchLikeTerm, searchLikeTerm, searchLikeTerm, searchLikeTerm, searchLikeTerm], (err, results) => {
        if (err) {
            console.error('Error fetching search results:', err);
            return res.status(500).send('Error fetching search results');
        }

        // Nếu không có kết quả
        if (results.length === 0) {
            return res.send('No_Have_Data_You_Want');
        }

        // Tạo bảng HTML với tiêu đề và từng hàng dữ liệu
        let html = '<table border="1"><tr><th>id</th><th>Temperature</th><th>Humidity</th><th>Light</th><th>Thoi_gian</th></tr>';
        results.forEach(row => {
            html += `<tr>
                        <td>${row.id}</td>
                        <td>${row.Temperature}</td>
                        <td>${row.Humidity}</td>
                        <td>${row.Light}</td>
                        <td>${row.times}</td>
                    </tr>`;
        });
        html += '</table>';

        res.send(html);
    });
});


// Hàm định dạng thời gian
function formatDateTime(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// API tìm kiếm cho Device
app.get('/api/search/device', (req, res) => {
    const searchTerm = req.query.term; 

    if (!searchTerm) {
        return res.status(400).json({ message: 'No search term provided' });
    }

    const query = `SELECT * FROM device WHERE 
                    id LIKE ? OR 
                    device LIKE ? OR 
                    action LIKE ? OR  
                    Thoi_gian LIKE ?`;
    const searchLikeTerm = `%${searchTerm}%`;

    connection.query(query, [searchLikeTerm, searchLikeTerm, searchLikeTerm, searchLikeTerm], (err, results) => {
        if (err) {
            console.error('Error fetching search results:', err);
            return res.status(500).send('Error fetching search results');
        }

        if (results.length === 0) {
            return res.send('No_Have_Data_You_Want');
        }

        // Format lại thời gian trước khi trả kết quả về
        results.forEach(row => {
            if (row.Thoi_gian) {
                row.Thoi_gian = formatDateTime(new Date(row.Thoi_gian));
            }
        });

        // Tạo bảng HTML với tiêu đề và từng hàng dữ liệu
        let html = '<table border="1"><tr><th>id</th><th>Device</th><th>Action</th><th>Thoi_gian</th></tr>';
        results.forEach(row => {
            html += `<tr>
                        <td>${row.id}</td>
                        <td>${row.device}</td>
                        <td>${row.action}</td>
                        <td>${row.Thoi_gian}</td>
                    </tr>`;
        });
        html += '</table>';

        res.send(html);
    });
});

// Khởi động server
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});