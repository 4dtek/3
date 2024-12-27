// تهيئة مشغل الفيديو
const player = videojs('videoPlayer');

// دالة لتغيير مصدر الفيديو
function changeSource(url) {
    const timeout = setTimeout(() => {
        alert('يستغرق التحميل وقتًا أطول من المتوقع. يرجى التحقق من اتصالك.');
    }, 10000); // مؤقت لمدة 10 ثوانٍ

    fetch(url, { method: 'HEAD' })
        .then(response => {
            clearTimeout(timeout); // إلغاء المؤقت عند الاستجابة

            const contentType = response.headers.get('Content-Type');
            if (contentType) {
                if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL')) {
                    player.src({ src: url, type: 'application/x-mpegURL' });
                } else if (contentType.includes('video/mp4') || contentType.includes('application/mp4')) {
                    player.src({ src: url, type: 'video/mp4' });
                } else if (contentType.includes('video/webm')) {
                    player.src({ src: url, type: 'video/webm' });
                } else {
                    console.warn('نوع المحتوى غير معروف، قد لا يعمل الفيديو:', contentType);
                    player.src({ src: url, type: 'video/mp4' }); // كإجراء احتياطي
                }
                player.play();
            } else {
                console.error('تعذر تحديد نوع المحتوى. يرجى التحقق من الرابط.');
                alert('تعذر تشغيل الفيديو. نوع المحتوى غير معروف.');
            }
        })
        .catch(error => {
            clearTimeout(timeout); // إلغاء المؤقت عند حدوث خطأ
            console.error('خطأ أثناء تغيير المصدر:', error);
            alert('تعذر تشغيل الفيديو. الرجاء المحاولة مرة أخرى.');
        });
}

// دالة لتحليل محتوى ملف M3U
function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            const channelInfo = lines[i].split(',');
            const channelName = channelInfo[1]?.trim();
            const channelUrl = lines[i + 1]?.trim();
            const logoUrlMatch = channelInfo[0].match(/tvg-logo="([^"]+)"/);
            const logoUrl = logoUrlMatch ? logoUrlMatch[1] : '';

            if (channelUrl && channelUrl.startsWith('http')) {
                channels.push({ name: channelName, logo: logoUrl, url: channelUrl });
            }
        }
    }
    return channels;
}

// دالة لعرض القنوات في الصفحة
function displayChannels(channels, searchQuery = '') {
    const list = document.getElementById('channelsList');
    const loadingMessage = document.getElementById('loadingMessage');
    list.innerHTML = ''; // تنظيف القائمة
    loadingMessage.style.display = 'none'; // إخفاء رسالة التحميل

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filteredChannels.forEach(channel => {
        const li = document.createElement('li');
        li.classList.add('channel-item');
        li.innerHTML = `
            <img src="${channel.logo || 'https://via.placeholder.com/30'}" alt="${channel.name}" class="channel-logo" />
            <span class="channel-name">${channel.name}</span>
        `;
        li.onclick = () => changeSource(channel.url);
        list.appendChild(li);
    });

    if (filteredChannels.length === 0) {
        const noResultsMessage = document.createElement('li');
        noResultsMessage.textContent = 'لا توجد قنوات تطابق البحث.';
        list.appendChild(noResultsMessage);
    }
}

// جلب ملفات M3U بشكل متوازي
let channels = []; // تخزين القنوات بشكل عام لاستخدامها في البحث
Promise.all([
    fetch('https://iptv-org.github.io/iptv/index.m3u').then(response => response.text()),
    fetch('https://iptv-org.github.io/iptv/index.m3u8').then(response => response.text()),
    fetch('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8').then(response => response.text())
])
.then(contents => {
    contents.forEach(content => {
        channels = [...channels, ...parseM3U(content)];
    });
    displayChannels(channels);
})
.catch(error => {
    console.error('حدث خطأ أثناء تحميل ملفات M3U:', error);
    document.getElementById('loadingMessage').textContent = 'حدث خطأ أثناء تحميل القنوات.';
});

// البحث عن القنوات أثناء الكتابة
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', event => {
    const query = event.target.value;
    displayChannels(channels, query);
});

// إضافة زر تحويل الشاشة الكاملة يدويًا
const fullscreenButton = document.createElement('button');
fullscreenButton.textContent = 'شاشة كاملة';
fullscreenButton.classList.add('vjs-fullscreen-control');
fullscreenButton.onclick = () => {
    if (player.isFullscreen()) {
        player.exitFullscreen();
    } else {
        player.requestFullscreen();
    }
};

// إدراج الزر في واجهة المشغل
const controlBar = document.querySelector('.vjs-control-bar'); // شريط التحكم بالمشغل
controlBar.appendChild(fullscreenButton);
