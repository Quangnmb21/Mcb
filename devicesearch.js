document.getElementById('searchButton').addEventListener('click', function() {
    const searchTerm = document.getElementById('searchInput').value;
    const selectedTab = document.getElementById('sub-tab-select').value;

    if (!searchTerm) {
        alert("Please enter a search term.");
        return;
    }

    // Gọi API tìm kiếm dựa trên tab đang được chọn
    let apiUrl = selectedTab === 'divece' ? 
        `http://localhost:3000/api/search/datasensor?term=${encodeURIComponent(searchTerm)}` : 
        `http://localhost:3000/api/search/device?term=${encodeURIComponent(searchTerm)}`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            // Thay thế nội dung của bảng hiện tại bằng kết quả tìm kiếm
            document.getElementById('results').innerHTML = html; // Hiển thị kết quả trong #results
        })
        .catch(error => {   
            console.error('There was a problem with the fetch operation:', error);
        });
});

// Cập nhật hiển thị nội dung dựa trên tab được chọn
document.getElementById('sub-tab-select').addEventListener('change', function() {
    const selectedTab = this.value;
    document.querySelectorAll('.sub-tab-content').forEach(tab => {
        tab.style.display = tab.id === 'content-' + selectedTab ? 'block' : 'none';
    });
    document.getElementById('results').innerHTML = ''; // Xóa kết quả tìm kiếm khi đổi tab
    document.getElementById('searchInput').value = ''; // Xóa ô tìm kiếm
});
